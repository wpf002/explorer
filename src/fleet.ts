import { applyVariant, isVariant, validateShip, type ShipSpec } from './schema';

/** Every ship.json, bundled eagerly: the index needs them all and they are small. */
const RAW = import.meta.glob<unknown>('/ships/*/ship.json', { eager: true, import: 'default' });
const HEROES = import.meta.glob<string>('/ships/*/hero.webp', { eager: true, query: '?url', import: 'default' });

const idOf = (path: string) => path.split('/')[2];

export interface FleetEntry { spec: ShipSpec; hero?: string; }

let cache: Map<string, FleetEntry> | null = null;

/** Validated specs keyed by id. Invalid ships are logged and left out. */
export function fleet(): Map<string, FleetEntry> {
  if (cache) return cache;
  cache = new Map();
  const raws = new Map(Object.entries(RAW).map(([path, raw]) => [idOf(path), raw]));
  const resolved = new Map<string, unknown>();
  const resolve = (id: string, seen: string[] = []): unknown => {
    if (resolved.has(id)) return resolved.get(id);
    const raw = raws.get(id);
    if (!isVariant(raw)) { resolved.set(id, raw); return raw; }
    if (seen.includes(id)) throw new Error(`variant cycle: ${[...seen, id].join(' → ')}`);
    const base = resolve(raw.extends, [...seen, id]);
    if (!base || validateShip(base).length) throw new Error(`ships/${id}: base "${raw.extends}" is missing or invalid`);
    const out = applyVariant(base as ShipSpec, raw);
    resolved.set(id, out);
    return out;
  };
  for (const id of raws.keys()) {
    let raw: unknown;
    try { raw = resolve(id); } catch (e) { console.error(String(e)); continue; }
    const issues = validateShip(raw);
    if (issues.length) {
      console.error(`ships/${id}/ship.json failed validation:\n` + issues.map(i => `  ${i.path}: ${i.message}`).join('\n'));
      continue;
    }
    const spec = raw as ShipSpec;
    if (spec.id !== id) { console.error(`ships/${id}/ship.json declares id "${spec.id}"`); continue; }
    cache.set(id, { spec, hero: HEROES[`/ships/${id}/hero.webp`] });
  }
  return cache;
}

/** Ships shown in the index and pickers: `listed` is not false. Longest first. */
export function listed(): FleetEntry[] {
  return [...fleet().values()].filter(e => e.spec.listed !== false).sort((a, b) => b.spec.length_m - a.spec.length_m);
}

export function getSpec(id: string): ShipSpec {
  const e = fleet().get(id);
  if (!e) throw new Error(`no ship "${id}" in ships/`);
  return e.spec;
}
