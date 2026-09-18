# Handoff

## Where this is

Phases 0 and 1 of ROADMAP.md are done. The demo runs as a Vite + TypeScript app on
three.js r169, and every ship-specific fact has moved out of `src/` into `ships/<id>/`.

Two ships load through one loader:

- `ships/asv-07/` — the demo, as `ship.json` + `build.js` (procedural).
- `ships/test-brick/` — a hand-written `.glb` box with three `room_*` empties, the
  proof that the viewer needs nothing but a conforming glTF. Regenerate it with
  `node scripts/make-test-brick.mjs`.

`npm run validate` schema-checks both and cross-checks mesh names against `ship.json`
(procedural ships are executed against a recording stub in `scripts/lib/record-build.mjs`,
so it runs without a GPU).

## Parity with the demo

`npm run shot` waits for the opening fly-to to finish, screenshots at 1600×1000 and
diffs against `reference/golden.png` (which `node scripts/golden.mjs` renders from
`reference/asv07-demo.html` the same way). Currently **1.17%** of pixels differ.

Two deliberate departures, both forced by the three.js upgrade:

1. **Tone mapping is a pass** (`src/render/tonemap.ts`). Modern three only applies the
   renderer's tone mapping when drawing to the canvas, never into a composer target, so
   bloom was thresholding raw HDR and smearing. The pass restores r128's ordering.
2. **Light intensities are scaled by `Math.PI * 0.75`** (`src/render/environment.ts`).
   `useLegacyLights` went away in r165; π is the documented conversion and 0.75 of it is
   where the golden diff bottoms out for this rig.

The planet is the largest remaining diff: it is a raw `ShaderMaterial`, which r128 never
tone mapped and the pass now does, so it reads a little brighter. Left alone on purpose.

## Schema notes worth knowing before ship two

- `view: "radial"` replaces the demo's `ring: true` special case — the fly-to approaches
  outward from the +X spine, following the marker parent's current rotation.
- Interiors may be tagged `int_<ROOM-CODE>_*` or `int_<DECK>_*`; the loader resolves the
  deck from the room when it recognises the token.
- Room markers come from `room_<CODE>` nodes in the model. `rooms[].position` is only the
  fallback for ships whose model does not provide one.
- The planet and starfield scale with `length_m` (300 m is 1.0), so a 30 m ship is not
  swallowed by a gas giant.
- `plan` markers scale with `plan.viewBox` width for the same reason.

## Phase 2

- `ships/bcf-4/`: a 420 m Longhaul-class bulk freighter. Three decks (`Ops`, `Hold`,
  `Eng`), thirteen rooms, four interiors (bridge, galley, reactor hall, machine shop),
  no ring. It exercised multi-letter deck codes and a room marker on an animated node
  (the spine gantry) without any viewer changes.
- No Blender on this machine, so the ship is procedural. The glTF path stays covered by
  `test-brick`.
- `npm run validate` now loads every ship headless and checks the triangle budget
  (150k) and that the model's X extent is within 15% of `length_m`.
  `npm run validate:fast` skips the browser.
- `npm run hero` renders `ships/<id>/hero.webp` from `camera.hero` (falls back to home).

## Phase 3

- Routes: `/` fleet index, `/ship/:id` viewer, `/compare?a=&b=[&layout=overlay]`. Room and
  mode stay in the hash. Old `/#ship=x&room=y` links redirect. Links are plain anchors, so
  every route boots on a fresh page and the viewer never has to tear down.
- Deep links need the host to serve `index.html` for unknown paths. Vite dev and preview
  do this already.
- No UI framework. The index and compare panels are small enough as template strings, and
  the viewer stays framework-free as the roadmap asks.
- Fleet index: true-scale lineup (stern-aligned silhouettes from `plan.shapes`), class and
  role filters, sort, and a search that also matches room names and codes and links
  straight to the room. `listed: false` hides fixtures.
- Compare: both ships in one scene with one orbit camera, side by side on Z or overlaid on
  the same origin with B as an x-ray. The right panel overlays both silhouettes and a stat
  table; differing rows show the delta and bars scaled to the larger value. Clicking a
  room opens it in its own ship.
- `npm run shot [route] [name.png]`: the route defaults to `ship/asv-07`, which is the only
  one diffed against the golden.

## Phase 4

All five items are in, driven by `ship.json`:

- **Systems overlay**: `systems[]` with polylines of room codes and `[x,y,z]` waypoints.
  Drawn as animated dashed `LineSegments2` that follow spinning and exploding modules
  (buffers rewritten in place, no reallocation). While one is shown the hull drops to 22%,
  the ship's own emissives dim, and the route is mirrored in the deck plan. `#sys=<id>`
  in the hash.
- **Cross-links**: `rooms[].links` to a room in the same ship (fly-to) or another ship
  (navigates). `ships/tw-2/` is the Trade-Wind shuttle, 12.5 m, linked from the ASV-07
  hangar and the BCF-4 docking collar and back.
- **Hotspots**: `rooms[].hotspots` in the marker parent's local space. They appear once
  the camera is inside the selected room.
- **Narrated tours**: `tour.segments[].caption` in a caption box with progress; "Narrate"
  reads captions with the browser's speech synthesis, or plays `tour.audio` if a ship ships
  one.
- **Variants**: a `ship.json` with `extends` is a JSON diff: top-level fields replace,
  `roomPatches` merges by code (`null` retires a room), `addRooms` appends. The model is the
  base's. Retired rooms keep tagging the base model's meshes but get no marker, and systems
  and links that pointed at them are pruned. `ships/asv-07r/` is the survey refit.

Viewer constants that were tuned for 300 m ships (marker glow size, explode travel, roam
speed, label fade and occlusion skin) now scale with `length_m`, which the 12.5 m shuttle
needed.

## Phase 5

- **Budgets** are enforced by `npm run validate`: 150k triangles, 300 draw calls, length
  within 15%, glTF under 8 MB. Static batching (`src/ship/batch.ts`) merges tagged meshes by
  batch root, material, kind, deck and room: ASV-07 674 → 112 draws, BCF-4 1270 → 109. The
  pre-batch meshes stay on layer 2 as label-occlusion proxies.
- **Auto quality** (`src/render/quality.ts`): after a 0.6 s warm-up, two seconds under 40 fps
  drops pixel ratio to 1 and bloom off. Display Options has Auto / High / Low, remembered in
  localStorage; `?quality=high` pins it for one visit, which every screenshot script uses.
- **Mobile**: under 900 px both panels become bottom sheets behind a Controls / Rooms tab
  bar; ship poses are pushed back for portrait so the hull fits.
- **CI** (`.github/workflows/ci.yml`): typecheck, build, validate with budgets, and
  `npm run shots` (every ship × solid / x-ray / section vs `reference/goldens/`). Diffs go to
  the job summary and an artifact; only page errors fail the job. The goldens were rendered
  on macOS (ANGLE/Metal); CI renders on SwiftShader, so expect a few percent of drift there.
  Refresh with `npm run shots:update` after an intended visual change.
- Stars are seeded so repeat shots match (about 0.1% noise from animation timing).

Not done: **static deploy**. It needs a hosting account and a decision on where; the build
is static and deep links need the host to serve `index.html` for unknown paths.
