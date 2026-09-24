# Fleet Explorer

Interactive 3D spacecraft explorer. A generic three.js viewer plus a folder of ships as data. See ROADMAP.md for phases; NOTES.md for the last session's handoff.

## Ground rules

- The viewer is generic. Ship-specific facts (names, dimensions, room text, geometry) live in `ships/<id>/`, never in `src/`. If you need a special case for one ship, change the schema instead.
- Behaviour parity with `reference/asv07-demo.html` is the acceptance test until phase 1 is done. Run `npm run shot` and open the image before saying anything is finished. Rendering bugs do not fail tests.
- One commit per task, plain messages. Don't refactor beyond the task.

## Conventions

- Units are metres. +X is forward (bow), +Y is up, origin is mid-length on the ship's spine.
- Deck codes are single tokens: `A`, `B`, `C`, `Ring`. Room codes are `SECTION-NN` (`CMD-01`, `FWD-11`, `RNG-05`).
- Mesh naming (glTF and procedural builders both):
  - `hull_<deck>_<anything>` opaque structure, affected by hull opacity, wireframe and deck isolation
  - `int_<ROOM-CODE>_<anything>` interior fittings, tagged to a room and its deck
  - `glow_<anything>` emissive fixtures (window strips, screens, drive throats)
  - `room_<ROOM-CODE>` an empty marking the label position and click target
  - `spin_<module>` a node the viewer rotates per `ship.json` `spinning`
  - `mod_<id>` top-level module nodes used by exploded view
- Tagged meshes are merged at load by batch root (ship root, `mod_`, `spin_`, or a group made with `{ animated: true }`), material, kind, deck and room. Anything a build script moves every frame must sit under an animated group or it gets baked in place.
- Scale-dependent constants in `src/` are written for the 300 m reference and multiplied by `length_m / 300`.
- Colours in code go through `ColorManagement`; never hand-convert sRGB to linear.
- Post-processing chain is render → tonemap → bloom → output. The tone map is its own pass because modern three skips the renderer's tone mapping whenever the scene renders into a target; without it bloom thresholds raw HDR and turns into haze. Keep bloom selective by threshold, not by layers.

## Commands

- `npm run dev` local server (WebGL); `GPU=1 vite build --outDir dist-gpu` for the node/TSL pipeline
- `npm run build` production build to `dist/`
- `npm run shot [route] [name.png]` Playwright screenshot (default `ship/asv-07`) to `shots/`; the default route is diffed vs `reference/golden.png`
- `npm run shots` every ship × solid/x-ray/section vs `reference/goldens/`; `shots:update` rewrites them
- `npm run validate` schema, mesh names, cross-ship links, and budgets (150k tris, 300 draws, length ±15%) measured headless; `validate:fast` skips the browser
- `npm run hero` renders `ships/<id>/hero.webp` for the fleet index

## Layout

```
src/main.ts    router: / fleet index, /ship/:id viewer, /compare?a=&b=
src/views/     fleet index, viewer (+ viewer.html markup), compare
src/fleet.ts   every ship.json, variants resolved, validated
src/render/    renderer, composer, tonemap, world, environment, planet, stars, auto quality
src/ship/      loader, mesh tagging, static batching, materials, display state, systems overlay, stats, procedural helpers, textures
src/controls/  camera rig (orbit + roam), tour, fly-to, input
src/ui/        panels, labels, deck plan, silhouettes, hotspots, captions, sheets, sky, toasts, room detail
src/state.ts   viewer state + URL hash sync
src/schema.ts  ShipSpec types, validator, variant merge
ships/<id>/    ship.json, build.js or model.glb, hero.webp (a variant has only ship.json with `extends`)
reference/     asv07-demo.html, golden.png, screenshots of the target look
scripts/       shot, shots, golden, validate-ship, hero, make-test-brick; lib/ holds the shared browser launcher
```
