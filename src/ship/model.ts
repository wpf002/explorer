import type { Group, Mesh, MeshStandardMaterial, Object3D, Sprite } from 'three';

export interface MeshTag {
  kind: 'hull' | 'interior' | 'glow';
  deck?: string;
  room?: string;
  matKey: string;
  baseOpacity: number;
  baseEmissive: number;
}

export type TaggedMesh = Mesh<Mesh['geometry'], MeshStandardMaterial> & { userData: MeshTag };

/** Per-frame hook a ship's build script can register for its own moving parts. */
export type Animator = (t: number, dt: number) => void;

export interface ShipModel {
  root: Group;
  meshes: TaggedMesh[];
  sprites: Sprite[];
  /** `mod_<id>` nodes, keyed by id. */
  modules: Map<string, Object3D>;
  /** `spin_<id>` nodes, keyed by id. */
  spinNodes: Map<string, Object3D>;
  /** `room_<CODE>` nodes, keyed by room code. */
  roomNodes: Map<string, Object3D>;
  animators: Animator[];
}
