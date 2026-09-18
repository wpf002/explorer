import { Plane, Vector3 } from 'three';
import type { CutSpec } from '../schema';
import type { Stage } from '../render/renderer';
import type { ViewerState } from '../state';
import type { LoadedShip } from './loader';

export class Display {
  readonly plane = new Plane(new Vector3(-1, 0, 0), 0);

  constructor(private ship: LoadedShip, private stage: Stage) {}

  /** Signed distance of the cut plane from the origin, in metres. */
  cutMetres(S: ViewerState): number {
    const c: CutSpec = this.ship.spec.cut;
    const range = S.cut === 'cross' ? c.cross : S.cut === 'hlay' ? c.hlay : c.long;
    return S.cutPos * range;
  }

  updateCut(S: ViewerState) {
    const n = S.cut === 'cross' ? new Vector3(-1, 0, 0)
      : S.cut === 'hlay' ? new Vector3(0, -1, 0)
      : new Vector3(0, 0, -1);
    const d = this.cutMetres(S);
    if (S.flip) n.negate();
    this.plane.normal.copy(n);
    this.plane.constant = S.flip ? -d : d;
  }

  applyMaterials(S: ViewerState) {
    const planes = S.cut === 'off' ? null : [this.plane];
    const emissive = this.ship.materials.emissive;
    for (const m of this.ship.model.meshes) {
      const u = m.userData, mat = m.material;
      let o = u.baseOpacity;
      if (u.kind === 'hull') o *= S.opacity;
      if (S.deck !== 'All' && u.deck !== S.deck) o *= 0.08;
      const tr = o < .995;
      if (mat.transparent !== tr) { mat.transparent = tr; mat.needsUpdate = true; }
      mat.opacity = o;
      mat.depthWrite = !(tr && u.kind === 'hull');
      mat.wireframe = S.wire && u.kind !== 'interior' && !emissive.has(u.matKey);
      mat.clippingPlanes = planes;
      // A systems overlay dims the ship's own lighting so the routes carry the frame.
      if (emissive.has(u.matKey)) mat.emissiveIntensity = u.baseEmissive * (S.bloom ? 1 : .45) * (S.system ? .3 : 1);
    }
    for (const s of this.ship.model.sprites) s.visible = S.bloom && !S.system;
    this.stage.bloomPass.enabled = S.bloom;
    this.stage.setExposure(S.bloom ? 1.15 : 1.05);
  }

  applyExplode(S: ViewerState) {
    for (const mod of this.ship.spec.modules) {
      const node = this.ship.model.modules.get(mod.id);
      // 70 m of travel at full separation for the 300 m reference, scaled with the ship.
      if (node) node.position.set(...mod.explode).multiplyScalar(S.explode * 70 * this.ship.spec.length_m / 300);
    }
  }
}
