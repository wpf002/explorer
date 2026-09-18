import { Mesh, MeshStandardMaterial, Object3D, Sprite } from 'three';
import type { ShipSpec } from '../schema';
import type { MeshTag, ShipModel, TaggedMesh } from './model';

/**
 * Derive deck, kind and room from mesh names so glTF and procedural ships hit one code path:
 *   hull_<deck>_*   int_<room|deck>_*   glow_*   room_<CODE>   spin_<id>   mod_<id>
 */
export function tagFromNames(root: Object3D, spec: ShipSpec): ShipModel {
  const meshes: TaggedMesh[] = [];
  const sprites: Sprite[] = [];
  const modules = new Map<string, Object3D>();
  const spinNodes = new Map<string, Object3D>();
  const roomNodes = new Map<string, Object3D>();

  const deckOf = new Map([...spec.rooms, ...(spec.retired ?? [])].map(r => [r.code, r.deck]));
  const deckCodes = new Set(spec.decks.map(d => d.code));

  root.traverse(o => {
    const [prefix, token] = o.name.split('_');
    if (prefix === 'mod' && token) modules.set(o.name.slice(4), o);
    if (prefix === 'spin' && token) spinNodes.set(o.name.slice(5), o);
    if (prefix === 'room' && token) roomNodes.set(o.name.slice(5), o);
    if (o instanceof Sprite) sprites.push(o);
    if (!(o instanceof Mesh)) return;

    const kind: MeshTag['kind'] | null =
      prefix === 'hull' ? 'hull' : prefix === 'int' ? 'interior' : prefix === 'glow' ? 'glow' : null;
    if (!kind) return;

    const mat = o.material as MeshStandardMaterial;
    if (!(mat instanceof MeshStandardMaterial)) return;
    o.material = mat.clone();
    const room = deckOf.has(token) ? token : undefined;
    const deck = room ? deckOf.get(room) : deckCodes.has(token) ? token : undefined;
    (o as TaggedMesh).userData = {
      kind, deck, room,
      matKey: (o.material as MeshStandardMaterial).name || prefix,
      matId: mat.uuid,
      baseOpacity: mat.opacity,
      baseEmissive: mat.emissiveIntensity,
    };
    meshes.push(o as TaggedMesh);
  });

  return { root: root as ShipModel['root'], meshes, sprites, modules, spinNodes, roomNodes, animators: [] };
}
