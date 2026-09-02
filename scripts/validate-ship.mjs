/**
 * Schema-checks every ships/<id>/ship.json and cross-checks the model's mesh names:
 * every room_* in the model must exist in ship.json and vice versa, and every mesh
 * must carry a hull_/int_/glow_ prefix with a known deck or room token.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateShip } from './lib/schema-node.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shipsDir = join(root, 'ships');
const ids = readdirSync(shipsDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort();

let failed = 0;
for (const id of ids) {
  const problems = await checkShip(id);
  if (problems.length) {
    failed++;
    console.error(`✗ ${id}`);
    for (const p of problems) console.error(`    ${p}`);
  } else {
    console.log(`✓ ${id}`);
  }
}
if (!ids.length) { console.error('no ships found under ships/'); process.exit(1); }
process.exit(failed ? 1 : 0);

async function checkShip(id) {
  const dir = join(shipsDir, id);
  const jsonPath = join(dir, 'ship.json');
  if (!existsSync(jsonPath)) return ['missing ship.json'];

  let spec;
  try { spec = JSON.parse(readFileSync(jsonPath, 'utf8')); }
  catch (e) { return [`ship.json is not valid JSON: ${e.message}`]; }

  const problems = validateShip(spec).map(i => `${i.path}: ${i.message}`);
  if (problems.length) return problems;
  if (spec.id !== id) problems.push(`id "${spec.id}" does not match folder name "${id}"`);

  const deckCodes = new Set(spec.decks.map(d => d.code));
  const roomCodes = new Set(spec.rooms.map(r => r.code));
  const moduleIds = new Set(spec.modules.map(m => m.id));

  const names = spec.model.type === 'gltf'
    ? glbNodeNames(join(dir, spec.model.url), problems)
    : await proceduralNames(dir, spec, problems);
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
  for (const code of roomCodes) {
    if (!seenRooms.has(code) && !spec.rooms.find(r => r.code === code).position) {
      problems.push(`room ${code} has neither a room_${code} node in the model nor a position in ship.json`);
    }
  }

  // Budgets (phase 5): keep the numbers visible from the start.
  if (spec.model.type === 'gltf') {
    const bytes = readFileSync(join(dir, spec.model.url)).length;
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
