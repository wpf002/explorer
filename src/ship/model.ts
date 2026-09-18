import type { Group, Mesh, MeshStandardMaterial, Object3D, Sprite } from 'three';

export interface MeshTag {
  kind: 'hull' | 'interior' | 'glow';
  deck?: string;
  room?: string;
  matKey: string;
  /** Identity of the source material, so batching never merges two different ones. */
  matId?: string;
  /** Set on pre-batch meshes kept as occlusion proxies: the mesh they were merged into. */
  batch?: TaggedMesh;
  /** True on a mesh produced by batching. */
  merged?: boolean;
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
  /** Pre-batch meshes on the proxy layer, used only for label occlusion. */
  proxies?: TaggedMesh[];
}
