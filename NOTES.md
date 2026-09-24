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

## Fleet build-out

Nine listed ships, 85 rooms. Added after phase 5:

| Ship | Why it exists |
|---|---|
| `kv-9` 95 m frigate | A hull built round one weapon: tests armour-style geometry and a spinal keel |
| `ldr-5` 20 m lander | Legs, ramp, downward plumes; proves the plume helper works off-axis |
| `tug-11` 58 m tug | Animated grapple arms, so batching has to respect `{ animated: true }` groups |
| `srv-4` 68 m probe | Crew 0, no interiors, a 1,900 m² sail; the fleet index has to cope with a zero |
| `gen-1` 1,200 m generation ship | Four spin nodes, two of them counter-rotating |

`spinning` now takes a list as well as a single node (`spinners(spec)` normalises it), which
is what the counter-rotating rings needed. Room codes are still `SECTION-NN`: `RNG-A1` was
rejected by the validator and became `RGA-01`.

Declared `length_m` is the model's X extent, not the hull's: the tug is 58 m over its arms
and the lander 20 m over its legs. The validator enforces the match at ±15%.

## Interiors

Nothing casts shadows, so a compartment is lit by whatever the sun happens to hit; the
inside of a hull is usually the dark side. `interiorFill` (a point light on the camera in
`src/render/environment.ts`) fades in while the camera is inside the selected room and
fades out again, which is what makes the ASV-07 bridge, the BCF-4 galley and the GEN-1 farm
drum readable.

"Inside" is measured against the room's `close` pose when it has one, not against the label
marker: markers often sit outside the hull where the label has to be legible.

Ships carry `close` only for compartments with enough fitted-out geometry to be worth
entering. KV-9's CIC and bridge, LDR-5's flight deck and cabin, and GEN-1's bridge and
foundry are described but not entered — the button reads "Fly Closer" there.

## Rendering pass

- **Sun shadows**: `fitSunShadow` aims the directional light at the ship and sizes its
  frustum to the hull, so a 12 m shuttle and a 1.2 km hull both get a tight 2048 map.
  Batched meshes cast and receive; glow fixtures do neither.
- **Glow sprites** are clipped against the section plane by hand (sprites ignore clipping
  planes) and fade out as the camera closes on them, which is what turned the old markers
  into speckled blobs up close. The glow texture is 256 px with a gaussian-ish falloff.
- **Stars** are screen-space points now, not world-space sprites: pinpoints at any ship
  scale, and no confetti seen through an x-ray hull.
- **Planet** sits further out and a little smaller relative to the ship, so it reads as a
  backdrop behind a 1.2 km hull instead of a wall.
- **Labels declutter**: nearest label keeps its box, anything overlapping it fades out. The
  selected room always keeps its label.
- Tour orbits for BCF-4 and GEN-1 were too tight and have been widened.

`reference/golden.png` is the r128 demo frame; with shadows the diff is now ~2.4% and it is
a historical reference, not a pass/fail gate. `reference/goldens/` is the live check.

## Rendering: what is in, what was tried

In: fitted sun shadows, a clearcoat on textured hull materials (`MeshPhysicalMaterial`
when a material has a texture and metalness above 0.2), bloom that pulls back to 0.3
strength while the camera is inside a room, the interior fill light, hand-clipped and
distance-faded glow sprites, screen-space stars.

Tried and reverted: `GTAOPass` ambient occlusion. With a 0.5–8,000 m depth range the AO
had too little precision at ship distance and read as a global dim rather than contact
shadows, and its full-frame blend multiplied itself into every additive glow. Splitting
the pipeline into a solid pass and an effects layer fixed the glows but lost the depth
buffer for the effects pass. Worth revisiting behind a proper depth-prepass, or after a
WebGPU move, which is a project rather than a patch.

ASV-07's spinal corridor is now fitted out (deck plates, rails, hand rails, wall panels,
hatch rings) and its bulkheads and ring hub are open, so the 180 m run reads end to end.

## Node pipeline (three r186, WebGPU)

`GPU=1 vite build` swaps `three` for `three/webgpu` (exact-match alias) and takes the node
path: `WebGPURenderer` + `PostProcessing` with `pass() → ao() → bloom() → fxaa()`. It runs on
the WebGPU backend and, with `?backend=webgl`, on the WebGL2 backend; both render the whole
app at 120 fps in headless Chromium.

What had to change for it:

- `__GPU__` is a Vite `define`, not a runtime flag, so the unused renderer — and the three.js
  build behind it — is dropped from the bundle.
- The planet and the drive plume are GLSL `ShaderMaterial`s on WebGL and TSL
  `MeshBasicNodeMaterial`s on the node path (`planet-gpu.ts`, `plume-material.ts`).
- Fat lines come from `three/addons/lines/webgpu/` with `Line2NodeMaterial`; the WebGL addon
  imports `UniformsLib`, which the node build does not export.
- `renderer.capabilities.getMaxAnisotropy()` does not exist on the node renderer.
- No MSAA on the node path: the AO node cannot gather from a multisampled depth texture, so
  FXAA covers the edges instead.

Ambient occlusion works here and did not on the composer, because the pass hands the AO node
a real depth and normal buffer through MRT.

Still to check on the node path before it could be the default: section cuts
(`material.clippingPlanes`), the compare view, hero renders and the screenshot suite.

## Real and public-domain ships

Added `apollo-11` (Block II CSM + LM, docked), `sts-orbiter` (Space Shuttle, doors open),
`iss` (assembly complete), `voyager` and `columbiad` (the Verne/Méliès projectile, 1865/1902).
Dimensions and stats come from published vehicle data; the copy is written to the same voice
as the rest of the fleet.

Trademarked ships from film and television are deliberately absent: the hull designs are
protected and this repository is public.

Two build-script lessons from these: the recording stub in `scripts/lib/record-build.mjs`
needed `rotation.set` and the `Shape`/`ExtrudeGeometry` methods, and deck codes are still
single tokens — `DST-01` is a room code and was rejected as a deck.

The orbiter's wings, fin and body flap are `ExtrudeGeometry` planforms rather than boxes,
which is the pattern to use for any aerodynamic hull.
