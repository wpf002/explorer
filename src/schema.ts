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
  /** Rooms this one connects to: in this ship (`room`) or another (`ship`, optional `room`). */
  links?: LinkSpec[];
  /** Clickable points inside the interior, in the marker parent's local space. */
  hotspots?: HotspotSpec[];
}

export interface LinkSpec { label: string; ship?: string; room?: string; }

export interface HotspotSpec { pos: Vec3; title: string; text: string; }

/**
 * A ship system drawn as glowing routes. Each path is a polyline whose points are room
 * codes (the room marker) or [x,y,z] waypoints in ship space.
 */
export interface SystemSpec {
  id: string;
  name: string;
  color: string;
  description?: string;
  paths: (string | Vec3)[][];
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
  segments: { name: string; room?: string; caption?: string }[];
  /** Optional narration track, relative to the ship folder; plays in step with the tour. */
  audio?: string;
}

export interface CutSpec {
  /** Half-range in metres for each cut axis. */
  cross: number;
  hlay: number;
  long: number;
}

/** `ship` is the folder the model lives in; variants inherit their base's. */
export type ModelSpec =
  | { type: 'procedural'; entry: string; ship?: string }
  | { type: 'gltf'; url: string; ship?: string };

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
  /** Framing for the fleet-index hero render. Defaults to home/target. */
  hero?: { pos: Vec3; target: Vec3 };
}

export interface ShipSpec {
  id: string;
  name: string;
  class: string;
  role: string;
  length_m: number;
  crew: number;
  /** One or two sentences for the fleet index card. */
  summary?: string;
  /** False hides the ship from the fleet index (test fixtures). Defaults to true. */
  listed?: boolean;
  decks: DeckSpec[];
  rooms: RoomSpec[];
  /** Base rooms a variant removed. Kept so the base model's tags still resolve. */
  retired?: RoomSpec[];
  systems?: SystemSpec[];
  modules: ModuleSpec[];
  spinning?: SpinSpec;
  textures?: Record<string, TextureSpec>;
  materials: Record<string, MaterialSpec>;
  plan: PlanSpec;
  tour: TourSpec;
  cut: CutSpec;
  camera: CameraSpec;
  model: ModelSpec;
  /** Set on variants: the ship this one was derived from. */
  extends?: string;
}

/* ---------- variants ---------- */

/**
 * A variant is a JSON diff on a base ship: `extends` names the base, top-level fields
 * replace the base's, `roomPatches` merges into rooms by code (null removes the room),
 * `addRooms` appends. The model is always the base's.
 */
export interface VariantSpec extends Partial<Omit<ShipSpec, 'rooms'>> {
  id: string;
  extends: string;
  roomPatches?: Record<string, Partial<RoomSpec> | null>;
  addRooms?: RoomSpec[];
  rooms?: never;
}

export const isVariant = (raw: unknown): raw is VariantSpec =>
  typeof raw === 'object' && raw !== null && typeof (raw as { extends?: unknown }).extends === 'string';

/** Resolve a variant against its (already resolved) base. Returns a plain ShipSpec-shaped object. */
export function applyVariant(base: ShipSpec, v: VariantSpec): ShipSpec {
  const { roomPatches = {}, addRooms = [], extends: from, ...top } = v;
  const rooms: RoomSpec[] = [];
  const retired: RoomSpec[] = [...(base.retired ?? [])];
  for (const r of base.rooms) {
    if (!(r.code in roomPatches)) { rooms.push(r); continue; }
    const patch = roomPatches[r.code];
    if (patch === null) retired.push(r);
    else rooms.push({ ...r, ...patch, code: r.code });
  }
  rooms.push(...addRooms);
  const live = new Set(rooms.map(r => r.code));
  // Anything that pointed at a removed room loses that point, link or path.
  const keep = (p: string | Vec3) => typeof p !== 'string' || live.has(p);
  const systems = (top.systems ?? base.systems)?.map(sy => ({ ...sy, paths: sy.paths.map(p => p.filter(keep)).filter(p => p.length >= 2) }));
  for (let i = 0; i < rooms.length; i++) {
    const links = rooms[i].links?.filter(l => l.ship || !l.room || live.has(l.room));
    if (links) rooms[i] = { ...rooms[i], links };
  }
  const segments = (top.tour ?? base.tour).segments.map(sg => (sg.room && !live.has(sg.room) ? { ...sg, room: undefined } : sg));
  return {
    ...base,
    ...top,
    tour: { ...(top.tour ?? base.tour), segments },
    model: { ...base.model, ship: base.model.ship ?? base.id },
    rooms,
    retired,
    systems,
    extends: from,
  } as ShipSpec;
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
  if (s.summary !== undefined && !isStr(s.summary)) bad('summary', 'must be a string');
  if (s.listed !== undefined && typeof s.listed !== 'boolean') bad('listed', 'must be a boolean');

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
    if (r?.links !== undefined) {
      if (!Array.isArray(r.links)) bad(`${at}.links`, 'must be an array');
      else r.links.forEach((l: any, k: number) => {
        if (!isStr(l?.label)) bad(`${at}.links[${k}].label`, 'required string');
        if (!isStr(l?.ship) && !isStr(l?.room)) bad(`${at}.links[${k}]`, 'needs a ship, a room, or both');
      });
    }
    if (r?.hotspots !== undefined) {
      if (!Array.isArray(r.hotspots)) bad(`${at}.hotspots`, 'must be an array');
      else r.hotspots.forEach((h: any, k: number) => {
        if (!isVec3(h?.pos)) bad(`${at}.hotspots[${k}].pos`, 'required [x,y,z]');
        if (!isStr(h?.title) || !isStr(h?.text)) bad(`${at}.hotspots[${k}]`, 'required title and text');
      });
    }
  });
  // In-ship links resolve here; links to other ships are checked by the fleet validator.
  if (Array.isArray(s.rooms)) s.rooms.forEach((r: any, i: number) => (r?.links ?? []).forEach((l: any, k: number) => {
    if (isStr(l?.room) && !l.ship && !roomCodes.has(l.room)) bad(`rooms[${i}].links[${k}].room`, `unknown room "${l.room}"`);
  }));

  if (s.systems !== undefined) {
    if (!Array.isArray(s.systems)) bad('systems', 'must be an array');
    else s.systems.forEach((sy: any, i: number) => {
      const at = `systems[${i}]`;
      if (!isStr(sy?.id)) bad(`${at}.id`, 'required string');
      if (!isStr(sy?.name)) bad(`${at}.name`, 'required string');
      if (!isStr(sy?.color)) bad(`${at}.color`, 'required colour string');
      if (!Array.isArray(sy?.paths) || !sy.paths.length) { bad(`${at}.paths`, 'required non-empty array'); return; }
      sy.paths.forEach((p: any, k: number) => {
        if (!Array.isArray(p) || p.length < 2) { bad(`${at}.paths[${k}]`, 'needs at least two points'); return; }
        p.forEach((pt: any, j: number) => {
          if (typeof pt === 'string') { if (roomCodes.size && !roomCodes.has(pt)) bad(`${at}.paths[${k}][${j}]`, `unknown room "${pt}"`); }
          else if (!isVec3(pt)) bad(`${at}.paths[${k}][${j}]`, 'must be a room code or [x,y,z]');
        });
      });
    });
  }

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
      if (sg?.caption !== undefined && !isStr(sg.caption)) bad(`tour.segments[${i}].caption`, 'must be a string');
      if (sg?.room !== undefined && roomCodes.size && !roomCodes.has(sg.room)) bad(`tour.segments[${i}].room`, `unknown room "${sg.room}"`);
    });
  }

  const cut = s.cut as any;
  if (!cut) bad('cut', 'required');
  else for (const k of ['cross', 'hlay', 'long']) if (!isNum(cut[k])) bad(`cut.${k}`, 'required number');

  const cam = s.camera as any;
  if (!cam) bad('camera', 'required');
  else {
    for (const k of ['home', 'target', 'start']) if (!isVec3(cam[k])) bad(`camera.${k}`, 'required [x,y,z]');
    if (cam.hero !== undefined && !(isVec3(cam.hero?.pos) && isVec3(cam.hero?.target))) bad('camera.hero', 'must be {pos,target} of [x,y,z]');
  }

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
