/** ShipSpec — the only contract between the generic viewer and a ship folder. */

export type Vec3 = [number, number, number];

export interface DeckSpec {
  /** Single token used in mesh names: `hull_<code>_*`. */
  code: string;
  name: string;
  /** Short form for the deck-isolation button, e.g. "A · Cmd". Defaults to the code. */
  short?: string;
}

export interface RoomSpec {
  /** `SECTION-NN`, matches `room_<code>` nodes in the model. */
  code: string;
  name: string;
  deck: string;
  color: string;
  /** Fallback marker position when the model has no `room_<code>` node. */
  position?: Vec3;
  /** Approach direction, or "radial" to approach outward from the +X spine. */
  view: Vec3 | 'radial';
  /** Stand-off distance in metres for the wide fly-to. */
  dist: number;
  /** Click/hover target radius in metres. */
  radius?: number;
  /** Interior camera pose, in the marker parent's local space. */
  close?: { pos: Vec3; look: Vec3 };
  description: string;
  stats: [string, string][];
}

export interface ModuleSpec {
  /** Matches a `mod_<id>` node. */
  id: string;
  /** Direction and relative distance the module travels in exploded view. */
  explode: Vec3;
}

export interface SpinSpec {
  /** Matches a `spin_<module>` node. */
  module: string;
  axis: 'x' | 'y' | 'z';
  rpm: number;
  /** Display Options checkbox label. */
  label?: string;
}

export interface TextureSpec {
  type: 'plating';
  seed: number;
  tint: string;
  width?: number;
  height?: number;
  repeat?: [number, number];
}

export interface MaterialSpec {
  color: string;
  metalness?: number;
  roughness?: number;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
  envMapIntensity?: number;
  normalScale?: number;
  doubleSide?: boolean;
  transparent?: boolean;
  /** Key into `textures`. */
  texture?: string;
  /** Excluded from hull opacity, wireframe and bloom dimming. */
  basic?: boolean;
}

export type PlanShape =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; rx?: number; ghost?: boolean }
  | { kind: 'polygon'; points: string; ghost?: boolean }
  | { kind: 'path'; d: string; ghost?: boolean }
  | { kind: 'axis'; x1: number; y1: number; x2: number; y2: number };

export interface PlanSpec {
  viewBox: [number, number, number, number];
  /** Camera chevron and cut line are clamped to this box. */
  bounds: { x: [number, number]; y: [number, number] };
  labels?: { fwd: [number, number]; aft: [number, number] };
  shapes: PlanShape[];
}

export interface TourSpec {
  duration: number;
  path: Vec3[];
  look: Vec3[];
  segments: { name: string; room?: string }[];
}

export interface CutSpec {
  /** Half-range in metres for each cut axis. */
  cross: number;
  hlay: number;
  long: number;
}

export type ModelSpec =
  | { type: 'procedural'; entry: string }
  | { type: 'gltf'; url: string };

export interface CameraSpec {
  /** Where the opening move ends. */
  home: Vec3;
  target: Vec3;
  /** Where the opening move starts. */
  start: Vec3;
  near?: number;
  far?: number;
  /** Orbit radius clamp. */
  range?: [number, number];
}

export interface ShipSpec {
  id: string;
  name: string;
  class: string;
  role: string;
  length_m: number;
  crew: number;
  decks: DeckSpec[];
  rooms: RoomSpec[];
  modules: ModuleSpec[];
  spinning?: SpinSpec;
  textures?: Record<string, TextureSpec>;
  materials: Record<string, MaterialSpec>;
  plan: PlanSpec;
  tour: TourSpec;
  cut: CutSpec;
  camera: CameraSpec;
  model: ModelSpec;
}

/* ---------- validation ---------- */

export interface Issue { path: string; message: string; }

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isVec3 = (v: unknown): v is Vec3 => Array.isArray(v) && v.length === 3 && v.every(isNum);

/** Structural check. Returns every problem found rather than throwing on the first. */
export function validateShip(raw: unknown): Issue[] {
  const out: Issue[] = [];
  const bad = (path: string, message: string) => out.push({ path, message });
  if (typeof raw !== 'object' || raw === null) return [{ path: '', message: 'not an object' }];
  const s = raw as Record<string, unknown>;

  for (const k of ['id', 'name', 'class', 'role'] as const) if (!isStr(s[k])) bad(k, 'required string');
  for (const k of ['length_m', 'crew'] as const) if (!isNum(s[k])) bad(k, 'required number');

  const deckCodes = new Set<string>();
  if (!Array.isArray(s.decks) || s.decks.length === 0) bad('decks', 'required non-empty array');
  else s.decks.forEach((d: any, i) => {
    if (!isStr(d?.code)) bad(`decks[${i}].code`, 'required string');
    else if (/[^A-Za-z0-9]/.test(d.code)) bad(`decks[${i}].code`, 'must be a single alphanumeric token');
    else if (deckCodes.has(d.code)) bad(`decks[${i}].code`, `duplicate deck code "${d.code}"`);
    else deckCodes.add(d.code);
    if (!isStr(d?.name)) bad(`decks[${i}].name`, 'required string');
  });

  const moduleIds = new Set<string>();
  if (!Array.isArray(s.modules)) bad('modules', 'required array');
  else s.modules.forEach((m: any, i) => {
    if (!isStr(m?.id)) bad(`modules[${i}].id`, 'required string');
    else moduleIds.add(m.id);
    if (!isVec3(m?.explode)) bad(`modules[${i}].explode`, 'required [x,y,z]');
  });

  const roomCodes = new Set<string>();
  if (!Array.isArray(s.rooms) || s.rooms.length === 0) bad('rooms', 'required non-empty array');
  else s.rooms.forEach((r: any, i) => {
    const at = `rooms[${i}]`;
    if (!isStr(r?.code)) bad(`${at}.code`, 'required string');
    else if (!/^[A-Z0-9]+-[0-9]{2}$/.test(r.code)) bad(`${at}.code`, `"${r.code}" must look like SECTION-NN`);
    else if (roomCodes.has(r.code)) bad(`${at}.code`, `duplicate room code "${r.code}"`);
    else roomCodes.add(r.code);
    if (!isStr(r?.name)) bad(`${at}.name`, 'required string');
    if (!isStr(r?.deck)) bad(`${at}.deck`, 'required string');
    else if (deckCodes.size && !deckCodes.has(r.deck)) bad(`${at}.deck`, `unknown deck "${r.deck}"`);
    if (!isStr(r?.color)) bad(`${at}.color`, 'required colour string');
    if (r?.view !== 'radial' && !isVec3(r?.view)) bad(`${at}.view`, 'required [x,y,z] or "radial"');
    if (!isNum(r?.dist)) bad(`${at}.dist`, 'required number');
    if (r?.position !== undefined && !isVec3(r.position)) bad(`${at}.position`, 'must be [x,y,z]');
    if (r?.close !== undefined && !(isVec3(r.close?.pos) && isVec3(r.close?.look))) bad(`${at}.close`, 'must be {pos,look} of [x,y,z]');
    if (!isStr(r?.description)) bad(`${at}.description`, 'required string');
    if (!Array.isArray(r?.stats) || r.stats.some((p: any) => !Array.isArray(p) || p.length !== 2 || !isStr(p[0]) || !isStr(p[1])))
      bad(`${at}.stats`, 'required array of [label, value] string pairs');
  });

  if (s.spinning !== undefined) {
    const sp = s.spinning as any;
    if (!isStr(sp?.module)) bad('spinning.module', 'required string');
    if (!['x', 'y', 'z'].includes(sp?.axis)) bad('spinning.axis', 'must be x, y or z');
    if (!isNum(sp?.rpm)) bad('spinning.rpm', 'required number');
  }

  const plan = s.plan as any;
  if (!plan) bad('plan', 'required');
  else {
    if (!(Array.isArray(plan.viewBox) && plan.viewBox.length === 4 && plan.viewBox.every(isNum))) bad('plan.viewBox', 'required [x,y,w,h]');
    if (!Array.isArray(plan.shapes)) bad('plan.shapes', 'required array');
    if (!(plan.bounds && Array.isArray(plan.bounds.x) && Array.isArray(plan.bounds.y))) bad('plan.bounds', 'required {x:[min,max], y:[min,max]}');
  }

  const tour = s.tour as any;
  if (!tour) bad('tour', 'required');
  else {
    if (!isNum(tour.duration)) bad('tour.duration', 'required number');
    if (!(Array.isArray(tour.path) && tour.path.length >= 4 && tour.path.every(isVec3))) bad('tour.path', 'required, at least 4 points');
    if (!(Array.isArray(tour.look) && tour.look.length >= 4 && tour.look.every(isVec3))) bad('tour.look', 'required, at least 4 points');
    if (!Array.isArray(tour.segments) || tour.segments.length === 0) bad('tour.segments', 'required non-empty array');
    else tour.segments.forEach((sg: any, i: number) => {
      if (!isStr(sg?.name)) bad(`tour.segments[${i}].name`, 'required string');
      if (sg?.room !== undefined && roomCodes.size && !roomCodes.has(sg.room)) bad(`tour.segments[${i}].room`, `unknown room "${sg.room}"`);
    });
  }

  const cut = s.cut as any;
  if (!cut) bad('cut', 'required');
  else for (const k of ['cross', 'hlay', 'long']) if (!isNum(cut[k])) bad(`cut.${k}`, 'required number');

  const cam = s.camera as any;
  if (!cam) bad('camera', 'required');
  else for (const k of ['home', 'target', 'start']) if (!isVec3(cam[k])) bad(`camera.${k}`, 'required [x,y,z]');

  if (typeof s.materials !== 'object' || s.materials === null) bad('materials', 'required object');
  else for (const [k, m] of Object.entries(s.materials as Record<string, any>)) {
    if (!isStr(m?.color)) bad(`materials.${k}.color`, 'required colour string');
    if (m?.texture !== undefined && !(s.textures as any)?.[m.texture]) bad(`materials.${k}.texture`, `unknown texture "${m.texture}"`);
  }

  const model = s.model as any;
  if (!model) bad('model', 'required');
  else if (model.type === 'procedural') { if (!isStr(model.entry)) bad('model.entry', 'required string'); }
  else if (model.type === 'gltf') { if (!isStr(model.url)) bad('model.url', 'required string'); }
  else bad('model.type', 'must be "procedural" or "gltf"');

  return out;
}

/** Room codes the model is expected to provide, for the mesh-name validator. */
export function expectedRoomCodes(spec: ShipSpec): string[] {
  return spec.rooms.map(r => r.code);
}
