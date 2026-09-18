import * as THREE from 'three';
import {
  AdditiveBlending, CircleGeometry, CylinderGeometry, Group, IcosahedronGeometry, Mesh,
  MeshBasicMaterial, Object3D, SphereGeometry, Sprite, SpriteMaterial, TorusGeometry, Vector3,
} from 'three';
import type { ShipSpec, Vec3 } from '../schema';
import { col } from '../util';
import { glowTex } from './textures';
import type { MaterialSet } from './materials';
import type { Animator, MeshTag, ShipModel, TaggedMesh } from './model';
import { box, coneX, cylX, plumeGeometry, plumeMaterial, spanTo, trussPoints, Y_UP } from './geometry';

/**
 * The API a ship's `build.js` receives. It imports nothing, so procedural ships share
 * one three.js instance and cannot reach into the viewer.
 */
export interface BuildApi {
  THREE: typeof THREE;
  spec: ShipSpec;
  /** Top-level `mod_<id>` node. Ids must appear in ship.json `modules`. */
  module(id: string): Group;
  /** `spin_<id>` node the viewer rotates per ship.json `spinning`. */
  spin(parent: Object3D, id: string): Group;
  /**
   * Plain group for local transforms; not tagged, not exploded. Pass `animated: true`
   * when the build script moves it, so static batching keeps it as its own node.
   */
  group(parent: Object3D, position?: Vec3, opts?: { animated?: boolean }): Group;
  /** `room_<CODE>` marker. `code` must appear in ship.json `rooms`. */
  room(code: string, parent: Object3D, position: Vec3): Object3D;
  /** Tagged mesh. `token` is a deck code for hull, or a room/deck code for interiors. */
  mesh(geo: THREE.BufferGeometry, matKey: string, token: string, kind: MeshTag['kind'], parent: Object3D): TaggedMesh;
  /** Additive glow sprite; hidden when bloom is off. */
  glow(parent: Object3D, x: number, y: number, z: number, size: number, color: string, alpha?: number): Sprite;
  /** Free sprite the ship animates itself (nav strobes and the like). */
  sprite(parent: Object3D, x: number, y: number, z: number, size: number, color: string): Sprite;
  /** Unlit wireframe helper (holograms). Not affected by hull opacity. */
  wireframe(parent: Object3D, geo: THREE.BufferGeometry, color: string, opacity?: number): Mesh;
  animate(fn: Animator): void;

  /* geometry helpers */
  box: typeof box;
  cylX: typeof cylX;
  coneX: typeof coneX;
  ringFrames(parent: Object3D, x0: number, x1: number, step: number, r: number, token: string, matKey?: string): void;
  windowStrip(parent: Object3D, x: number, y: number, z: number, len: number, token: string, matKey?: string): TaggedMesh;
  bar(parent: Object3D, a: Vector3, b: Vector3, r: number, token: string, matKey?: string): TaggedMesh;
  truss(parent: Object3D, x0: number, x1: number, r: number, bays: number, token: string): void;
  pipe(parent: Object3D, x0: number, x1: number, y: number, z: number, r: number, token: string, matKey?: string): TaggedMesh;
  rcs(parent: Object3D, x: number, y: number, z: number, token: string): Group;
  plume(parent: Object3D, x: number, y: number, z: number, r: number, len: number): Mesh;
}

export interface BuildResult { model: ShipModel; plumeTime: (t: number) => void; }

export function createBuilder(spec: ShipSpec, mats: MaterialSet): { api: BuildApi; result: BuildResult } {
  const root = new Group();
  root.name = 'ship';
  const meshes: TaggedMesh[] = [];
  const sprites: Sprite[] = [];
  const modules = new Map<string, Object3D>();
  const spinNodes = new Map<string, Object3D>();
  const roomNodes = new Map<string, Object3D>();
  const animators: Animator[] = [];
  const glowMap = glowTex();
  const plumeMat = plumeMaterial();
  let serial = 0;

  const deckCodes = new Set(spec.decks.map(d => d.code));
  const roomCodes = new Set(spec.rooms.map(r => r.code));
  const deckOfRoom = new Map(spec.rooms.map(r => [r.code, r.deck]));
  const moduleIds = new Set(spec.modules.map(m => m.id));

  const material = (key: string) => {
    const b = mats.base[key];
    if (!b) throw new Error(`ship ${spec.id}: unknown material "${key}"`);
    return b;
  };

  const mesh: BuildApi['mesh'] = (geo, matKey, token, kind, parent) => {
    const base = material(matKey);
    const m = new Mesh(geo, base.clone()) as TaggedMesh;
    m.name = nameFor(kind, token, serial++);
    const room = roomCodes.has(token) ? token : undefined;
    m.userData = {
      kind,
      deck: room ? deckOfRoom.get(room) : deckCodes.has(token) ? token : undefined,
      room,
      matKey,
      baseOpacity: base.opacity,
      baseEmissive: base.emissiveIntensity,
    };
    parent.add(m);
    meshes.push(m);
    return m;
  };

  const glow: BuildApi['glow'] = (parent, x, y, z, size, color, alpha = .8) => {
    const s = new Sprite(new SpriteMaterial({
      map: glowMap, color: col(color), transparent: true, opacity: alpha,
      depthWrite: false, blending: AdditiveBlending,
    }));
    s.name = `glow_sprite_${serial++}`;
    s.position.set(x, y, z);
    s.scale.set(size, size, 1);
    s.userData.baseOpacity = alpha;
    parent.add(s);
    sprites.push(s);
    return s;
  };

  const api: BuildApi = {
    THREE,
    spec,
    module(id) {
      if (!moduleIds.has(id)) throw new Error(`ship ${spec.id}: module "${id}" is not declared in ship.json`);
      const g = new Group();
      g.name = `mod_${id}`;
      root.add(g);
      modules.set(id, g);
      return g;
    },
    spin(parent, id) {
      const g = new Group();
      g.name = `spin_${id}`;
      parent.add(g);
      spinNodes.set(id, g);
      return g;
    },
    group(parent, position, opts) {
      const g = new Group();
      if (position) g.position.set(...position);
      if (opts?.animated) g.userData.animated = true;
      parent.add(g);
      return g;
    },
    room(code, parent, position) {
      if (!roomCodes.has(code)) throw new Error(`ship ${spec.id}: room "${code}" is not declared in ship.json`);
      const o = new Object3D();
      o.name = `room_${code}`;
      o.position.set(...position);
      parent.add(o);
      roomNodes.set(code, o);
      return o;
    },
    mesh,
    glow,
    sprite(parent, x, y, z, size, color) {
      const s = new Sprite(new SpriteMaterial({
        map: glowMap, color: col(color), transparent: true, opacity: 1,
        depthWrite: false, blending: AdditiveBlending,
      }));
      s.name = `glow_point_${serial++}`;
      s.position.set(x, y, z);
      s.scale.set(size, size, 1);
      parent.add(s);
      return s;
    },
    wireframe(parent, geo, color, opacity = .55) {
      const m = new Mesh(geo, new MeshBasicMaterial({ color: col(color), wireframe: true, transparent: true, opacity, depthWrite: false }));
      m.name = `glow_wire_${serial++}`;
      parent.add(m);
      return m;
    },
    animate(fn) { animators.push(fn); },

    box, cylX, coneX,

    ringFrames(parent, x0, x1, step, r, token, matKey = 'dark') {
      for (let x = x0; x <= x1; x += step) {
        mesh(new TorusGeometry(r, .45, 8, 48).rotateY(Math.PI / 2), matKey, token, 'hull', parent).position.x = x;
      }
    },
    windowStrip(parent, x, y, z, len, token, matKey = 'strip') {
      const m = mesh(box(len, .5, .35), matKey, token, 'glow', parent);
      m.position.set(x, y, z);
      return m;
    },
    bar(parent, a, b, r, token, matKey = 'bare') {
      const len = b.clone().sub(a).length();
      const m = mesh(new CylinderGeometry(r, r, len, 6), matKey, token, 'hull', parent);
      spanTo(m, a, b);
      return m;
    },
    truss(parent, x0, x1, r, bays, token) {
      const bay = (x1 - x0) / bays, rr = .38;
      for (let k = 0; k < 4; k++) api.bar(parent, trussPoints(x0, r, k), trussPoints(x1, r, k), rr, token);
      for (let i = 0; i <= bays; i++) {
        const x = x0 + i * bay;
        for (let k = 0; k < 4; k++) {
          api.bar(parent, trussPoints(x, r, k), trussPoints(x, r, k + 1), rr * .75, token);
          if (i < bays) api.bar(parent, trussPoints(x, r, k), trussPoints(x + bay, r, k + 1), rr * .6, token);
        }
      }
    },
    pipe(parent, x0, x1, y, z, r, token, matKey = 'bare') {
      const m = mesh(cylX(r, r, x1 - x0, 10), matKey, token, 'hull', parent);
      m.position.set((x0 + x1) / 2, y, z);
      return m;
    },
    rcs(parent, x, y, z, token) {
      const g = new Group();
      g.position.set(x, y, z);
      parent.add(g);
      mesh(box(1.6, 1.2, 1.6), 'bare', token, 'hull', g);
      ([[0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]] as Vec3[]).forEach(([a, b, c]) => {
        const n = mesh(new CylinderGeometry(.55, .25, .9, 10), 'bare', token, 'hull', g);
        n.position.set(a * 1.1, b * 1.1, c * 1.1);
        n.quaternion.setFromUnitVectors(Y_UP, new Vector3(a, b, c));
      });
      return g;
    },
    plume(parent, x, y, z, r, len) {
      const m = new Mesh(plumeGeometry(r, len), plumeMat);
      m.name = `glow_plume_${serial++}`;
      m.position.set(x, y, z);
      parent.add(m);
      return m;
    },
  };

  // Geometry classes a build script commonly reaches for beyond the helpers above.
  void CircleGeometry; void IcosahedronGeometry; void SphereGeometry;

  return {
    api,
    result: {
      model: { root, meshes, sprites, modules, spinNodes, roomNodes, animators },
      plumeTime: (t: number) => { plumeMat.uniforms.t.value = t; },
    },
  };
}

function nameFor(kind: MeshTag['kind'], token: string, n: number) {
  const prefix = kind === 'hull' ? 'hull' : kind === 'interior' ? 'int' : 'glow';
  return kind === 'glow' ? `glow_${token}_${n}` : `${prefix}_${token}_${n}`;
}
