/**
 * Schema-checks every ships/<id>/ship.json and cross-checks the model's mesh names:
 * every room_* in the model must exist in ship.json and vice versa, and every mesh
 * must carry a hull_/int_/glow_ prefix with a known deck or room token.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateShip, applyVariant, isVariant } from './lib/schema-node.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shipsDir = join(root, 'ships');
const ids = readdirSync(shipsDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort();

const BUDGET = { triangles: 150_000, drawCalls: 300, scale: 0.15 };
const fast = process.argv.includes('--fast');

if (!ids.length) { console.error('no ships found under ships/'); process.exit(1); }
const problems = {};
for (const id of ids) problems[id] = await checkShip(id);

// Geometry budgets need the real model, so they run in a headless browser.
const stats = {};
if (!fast) {
  const { measureShips } = await import('./lib/measure.mjs');
  const ok = ids.filter(id => !problems[id].length);
  Object.assign(stats, await measureShips(root, ok));
  for (const id of ok) problems[id].push(...checkBudgets(id, stats[id]));
}

let failed = 0;
for (const id of ids) {
  const s = stats[id];
  const info = s && !s.error ? `  ${fmt(s.triangles)} tris · ${s.drawCalls} draws · ${s.meshes} meshes` : '';
  if (problems[id].length) {
    failed++;
    console.error(`✗ ${id}${info}`);
    for (const p of problems[id]) console.error(`    ${p}`);
  } else {
    console.log(`✓ ${id}${info}`);
  }
}
process.exit(failed ? 1 : 0);

function fmt(n) { return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n); }

function checkBudgets(id, s) {
  if (!s) return ['not measured'];
  if (s.error) return [`viewer failed to load: ${s.error}`];
  const out = [];
  const spec = resolveSpec(id);
  if (s.triangles > BUDGET.triangles) out.push(`${fmt(s.triangles)} triangles, over the ${fmt(BUDGET.triangles)} budget`);
  if (s.drawCalls > BUDGET.drawCalls) out.push(`${s.drawCalls} draw calls, over the ${BUDGET.drawCalls} budget`);
  const len = s.bounds.max[0] - s.bounds.min[0];
  if (Math.abs(len - spec.length_m) / spec.length_m > BUDGET.scale) {
    out.push(`model is ${len.toFixed(1)} m along X but ship.json says length_m ${spec.length_m} (±${BUDGET.scale * 100}%)`);
  }
  return out;
}

/** ship.json with variants applied. Throws with a readable message. */
function resolveSpec(id, seen = []) {
  const jsonPath = join(shipsDir, id, 'ship.json');
  if (!existsSync(jsonPath)) throw new Error(`missing ships/${id}/ship.json`);
  let raw;
  try { raw = JSON.parse(readFileSync(jsonPath, 'utf8')); }
  catch (e) { throw new Error(`ships/${id}/ship.json is not valid JSON: ${e.message}`); }
  if (!isVariant(raw)) return raw;
  if (seen.includes(id)) throw new Error(`variant cycle: ${[...seen, id].join(' → ')}`);
  const base = resolveSpec(raw.extends, [...seen, id]);
  const issues = validateShip(base);
  if (issues.length) throw new Error(`base "${raw.extends}" is invalid`);
  return applyVariant(base, raw);
}

async function checkShip(id) {
  let spec;
  try { spec = resolveSpec(id); } catch (e) { return [e.message]; }

  const problems = validateShip(spec).map(i => `${i.path}: ${i.message}`);
  if (problems.length) return problems;
  if (spec.id !== id) problems.push(`id "${spec.id}" does not match folder name "${id}"`);

  // Links to other ships must land on a real ship and, if given, a real room.
  for (const r of spec.rooms) for (const l of r.links ?? []) {
    if (!l.ship) continue;
    let other;
    try { other = resolveSpec(l.ship); } catch { problems.push(`${r.code} links to unknown ship "${l.ship}"`); continue; }
    if (l.room && !other.rooms?.some(x => x.code === l.room)) problems.push(`${r.code} links to ${l.ship} room "${l.room}", which does not exist`);
  }

  // Variants use their base's model; its extra room_* nodes are the retired rooms.
  const modelDir = join(shipsDir, spec.model.ship ?? id);
  const deckCodes = new Set(spec.decks.map(d => d.code));
  const roomCodes = new Set([...spec.rooms, ...(spec.retired ?? [])].map(r => r.code));
  const moduleIds = new Set(spec.modules.map(m => m.id));

  const names = spec.model.type === 'gltf'
    ? glbNodeNames(join(modelDir, spec.model.url), problems)
    : await proceduralNames(modelDir, spec, problems);
  if (!names) return problems;

  const seenRooms = new Set();
  for (const name of names) {
    const [prefix, token] = name.split('_');
    if (prefix === 'room') {
      const code = name.slice(5);
      if (!roomCodes.has(code)) problems.push(`model node "${name}" has no matching room in ship.json`);
      seenRooms.add(code);
    } else if (prefix === 'mod') {
      if (!moduleIds.has(name.slice(4))) problems.push(`model node "${name}" has no matching module in ship.json`);
    } else if (prefix === 'hull' || prefix === 'int') {
      if (token && !deckCodes.has(token) && !roomCodes.has(token)) {
        problems.push(`mesh "${name}" is tagged to unknown deck/room "${token}"`);
      }
    } else if (prefix !== 'glow' && prefix !== 'spin' && prefix !== 'ship') {
      problems.push(`node "${name}" does not use a hull_/int_/glow_/room_/spin_/mod_ prefix`);
    }
  }
  for (const { code } of spec.rooms) {
    if (!seenRooms.has(code) && !spec.rooms.find(r => r.code === code).position) {
      problems.push(`room ${code} has neither a room_${code} node in the model nor a position in ship.json`);
    }
  }

  // Budgets (phase 5): keep the numbers visible from the start.
  if (spec.model.type === 'gltf') {
    const bytes = readFileSync(join(modelDir, spec.model.url)).length;
    if (bytes > 8 * 1024 * 1024) problems.push(`${spec.model.url} is ${(bytes / 1048576).toFixed(1)} MB, over the 8 MB budget`);
  }
  return problems;
}

function glbNodeNames(path, problems) {
  if (!existsSync(path)) { problems.push(`model file ${path} not found`); return null; }
  const buf = readFileSync(path);
  if (buf.readUInt32LE(0) !== 0x46546c67) { problems.push('not a .glb file'); return null; }
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  return (gltf.nodes ?? []).map(n => n.name).filter(Boolean);
}

/** Runs the build script against a recording stub so names can be checked without a GPU. */
async function proceduralNames(dir, spec, problems) {
  const entry = join(dir, spec.model.entry);
  if (!existsSync(entry)) { problems.push(`build entry ${spec.model.entry} not found`); return null; }
  const { recordingApi } = await import('./lib/record-build.mjs');
  const { api, names } = recordingApi(spec);
  try {
    const mod = await import(pathToFileURL(entry).href);
    mod.default(api);
  } catch (e) {
    problems.push(`${spec.model.entry} threw: ${e.message}`);
    return null;
  }
  return names;
}
