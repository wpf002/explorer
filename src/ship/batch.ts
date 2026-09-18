import { BufferGeometry, Matrix4, Mesh, Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipModel, TaggedMesh } from './model';

/** Layer that holds the pre-batch meshes kept only as occlusion proxies. Never rendered. */
export const PROXY_LAYER = 2;

const isBatchRoot = (o: Object3D, root: Object3D) =>
  o === root || /^(mod|spin)_/.test(o.name) || o.userData.animated === true;

/**
 * Static batching: merge every tagged mesh that shares a batch root (ship root, module,
 * spin node or animated group), material, kind, deck and room into one mesh. The originals
 * stay behind on PROXY_LAYER so label occlusion keeps its cheap per-part raycasts.
 */
export function batchModel(model: ShipModel): { before: number; after: number } {
  const root = model.root;
  root.updateMatrixWorld(true);
  const groups = new Map<string, { parent: Object3D; meshes: TaggedMesh[] }>();

  for (const m of model.meshes) {
    let parent: Object3D = m.parent ?? root;
    while (!isBatchRoot(parent, root) && parent.parent) parent = parent.parent;
    const g = m.geometry;
    const u = m.userData;
    const attrs = Object.keys(g.attributes).sort().join(',');
    const key = [parent.uuid, u.matId ?? u.matKey, u.kind, u.deck ?? '', u.room ?? '', attrs, g.index ? 'i' : 'n'].join('|');
    let entry = groups.get(key);
    if (!entry) groups.set(key, entry = { parent, meshes: [] });
    entry.meshes.push(m);
  }

  const out: TaggedMesh[] = [];
  const inv = new Matrix4(), rel = new Matrix4();
  let serial = 0;
  for (const { parent, meshes } of groups.values()) {
    if (meshes.length === 1) { out.push(meshes[0]); continue; }
    inv.copy(parent.matrixWorld).invert();
    const geos: BufferGeometry[] = meshes.map(m => {
      rel.multiplyMatrices(inv, m.matrixWorld);
      const g = m.geometry.clone();
      g.applyMatrix4(rel);
      for (const name of Object.keys(g.morphAttributes)) delete g.morphAttributes[name];
      return g;
    });
    const merged = mergeGeometries(geos, false);
    geos.forEach(g => g.dispose());
    if (!merged) { out.push(...meshes); continue; }
    merged.computeBoundingSphere();

    const first = meshes[0];
    const batch = new Mesh(merged, first.material) as TaggedMesh;
    const prefix = first.name.split('_')[0];
    const token = first.userData.room ?? first.userData.deck ?? 'x';
    batch.name = `${prefix}_${token}_batch${serial++}`;
    batch.userData = { ...first.userData, merged: true };
    parent.add(batch);
    out.push(batch);

    // Originals become invisible occlusion proxies pointing at their batch.
    for (const m of meshes) {
      m.layers.set(PROXY_LAYER);
      m.userData.batch = batch;
      if (m.material !== first.material) m.material.dispose();
      m.material = first.material;
    }
  }
  const before = model.meshes.length;
  model.meshes = out;
  model.proxies = groups.size ? [...groups.values()].flatMap(g => g.meshes.filter(m => m.userData.batch)) : [];
  return { before, after: out.length };
}
