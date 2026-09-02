import {
  AdditiveBlending, Group, Mesh, MeshBasicMaterial, Object3D, SphereGeometry, Sprite, SpriteMaterial,
  Vector3, WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { validateShip, type ShipSpec } from '../schema';
import { col } from '../util';
import { buildMaterials, type MaterialSet } from './materials';
import { createBuilder, type BuildApi } from './builder';
import { tagFromNames } from './tagging';
import type { ShipModel } from './model';
import { glowTex } from './textures';

const SHIP_JSON = import.meta.glob<{ default: unknown }>('/ships/*/ship.json');
const BUILD_JS = import.meta.glob<{ default: (api: BuildApi) => void }>('/ships/*/build.js');
const MODELS = import.meta.glob<string>('/ships/*/*.glb', { query: '?url', import: 'default' });

export const shipIds = (): string[] =>
  Object.keys(SHIP_JSON).map(p => p.split('/')[2]).sort();

export async function loadSpec(id: string): Promise<ShipSpec> {
  const loader = SHIP_JSON[`/ships/${id}/ship.json`];
  if (!loader) throw new Error(`no ship "${id}" in ships/`);
  const raw = (await loader()).default;
  const issues = validateShip(raw);
  if (issues.length) {
    throw new Error(`ships/${id}/ship.json failed validation:\n` + issues.map(i => `  ${i.path}: ${i.message}`).join('\n'));
  }
  const spec = raw as ShipSpec;
  if (spec.id !== id) throw new Error(`ships/${id}/ship.json declares id "${spec.id}"`);
  return spec;
}

export interface LoadedShip {
  spec: ShipSpec;
  model: ShipModel;
  materials: MaterialSet;
  /** Marker node per room, in the same order as spec.rooms. */
  markers: Object3D[];
  /** Click targets on layer 1, tagged with their room index. */
  hitTargets: Mesh[];
  plumeTime: (t: number) => void;
}

export async function loadShip(renderer: WebGLRenderer, spec: ShipSpec): Promise<LoadedShip> {
  const materials = buildMaterials(renderer, spec);
  let model: ShipModel;
  let plumeTime: (t: number) => void = () => {};

  if (spec.model.type === 'procedural') {
    const entry = BUILD_JS[`/ships/${spec.id}/${spec.model.entry}`];
    if (!entry) throw new Error(`ships/${spec.id}/${spec.model.entry} not found`);
    const { api, result } = createBuilder(spec, materials);
    (await entry()).default(api);
    model = result.model;
    plumeTime = result.plumeTime;
  } else {
    const url = MODELS[`/ships/${spec.id}/${spec.model.url}`];
    if (!url) throw new Error(`ships/${spec.id}/${spec.model.url} not found`);
    const gltf = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    gltf.setDRACOLoader(draco);
    const asset = await gltf.loadAsync(await url());
    const root = new Group();
    root.name = 'ship';
    root.add(asset.scene);
    model = tagFromNames(root, spec);
  }

  // Rooms without a marker in the model fall back to ship.json `position`.
  const markers: Object3D[] = [];
  const hitTargets: Mesh[] = [];
  const hitMat = new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const glowMap = glowTex();

  spec.rooms.forEach((room, i) => {
    let node = model.roomNodes.get(room.code);
    if (!node) {
      node = new Object3D();
      node.name = `room_${room.code}`;
      node.position.set(...(room.position ?? [0, 0, 0]));
      model.root.add(node);
      model.roomNodes.set(room.code, node);
    }
    markers.push(node);

    const hit = new Mesh(new SphereGeometry(room.radius ?? 5.5, 12, 8), hitMat);
    hit.name = `glow_hit_${room.code}`;
    hit.layers.set(1);
    hit.userData.room = i;
    node.add(hit);
    hitTargets.push(hit);

    // Marker glow, in the room's own colour.
    const s = new Sprite(new SpriteMaterial({
      map: glowMap, color: col(room.color), transparent: true, opacity: .7,
      depthWrite: false, blending: AdditiveBlending,
    }));
    s.name = `glow_marker_${room.code}`;
    s.scale.set(7, 7, 1);
    s.userData.baseOpacity = .7;
    node.add(s);
    model.sprites.push(s);
  });

  return { spec, model, materials, markers, hitTargets, plumeTime };
}

/** World-space centre of a room marker. */
export const roomWorld = (ship: LoadedShip, i: number, out = new Vector3()) =>
  ship.markers[i].getWorldPosition(out);
