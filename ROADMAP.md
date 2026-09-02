# Fleet Explorer — build roadmap

Goal: turn the ASV-07 demo into a product where someone can pick any spacecraft from a fleet and deep-dive it: fly around it, cut it open, step into rooms, read what every system does, and compare it to other ships at true scale.

Starting point: `reference/asv07-demo.html`, a single-file Three.js r128 viewer (about 1,400 lines) with orbit/roam/tour modes, section cuts, hull opacity, deck isolation, exploded view, bloom post-processing, a 12-room index with descriptions, interiors, a side-elevation deck plan and URL hash state. Everything in it is hardcoded to one ship. That is the problem each phase below chips away at.

Rule for the whole project: the viewer is generic, ships are data. Any time a ship-specific fact ends up in `src/`, it's a bug.

---

## Phase 0 — Repo bootstrap (half a day)

Get the demo running from a real project without changing what it does.

- Vite + TypeScript, no UI framework yet. `npm run dev`, `npm run build`, `npm run shot` (Playwright screenshot of the running app, used as the "did I break it" check).
- Upgrade three.js to current (r16x) as ES modules. Bloom, RenderPass and GammaCorrection come from `three/addons/postprocessing`; the inlined copies in the demo go away. Note: modern three uses `ColorManagement` and `outputColorSpace`, so the `.convertSRGBToLinear()` calls and the manual gamma pass become unnecessary. Expect one session of colour drift to tune back.
- Split the file into modules with behaviour unchanged:
  - `src/render/` renderer, composer, environment, planet, stars
  - `src/ship/` builder helpers, materials, texture generator
  - `src/controls/` orbit, roam, tour, fly-to
  - `src/ui/` panels, labels, deck plan, toasts, room detail
  - `src/state.ts` the `S` object and hash sync
- Commit the demo screenshot as `reference/golden.png`; `npm run shot` diffs against it.

Done when: the app looks and behaves like the demo, from `npm run dev`, with the golden diff under a few percent.

## Phase 1 — Ship as data (2–3 days)

Make the ASV-07 the first entry in a fleet rather than the whole app.

- Define `ShipSpec` in `src/schema.ts` and validate JSON against it in CI:
  - `id, name, class, role, length_m, crew, decks[] {code, name}`
  - `rooms[] {code, name, deck, color, position, view, dist, close?, description, stats[]}`
  - `modules[] {id, explode:[x,y,z]}` and `spinning?: {module, axis, rpm}`
  - `plan` (side-elevation silhouette as SVG path strings, or `auto` to build from module bounds)
  - `tour {path[], look[], segments[] {name, room?}}`
  - `model: {type:'procedural', entry:'build.js'} | {type:'gltf', url}`
- `ships/asv-07/ship.json` + `ships/asv-07/build.js` hold everything ship-specific that is in the demo today. The room descriptions and stats move out of code into the JSON.
- Mesh tagging by name so the viewer can work on any model without per-ship code: `hull_A_*`, `int_FWD-11_*`, `glow_*`, `room_CMD-01` (an empty marking the label position), `spin_ring`. The loader assigns deck, kind and room from these prefixes. The procedural builder names its meshes the same way, so both paths hit one code path afterwards.
- Coordinate convention, written into CLAUDE.md: metres, +X forward, +Y up, origin at the ship's mid-length on the spine.
- Prove it's generic with `ships/test-brick/`: a glTF of a box with three `room_*` empties. If the viewer shows it with labels, deck plan and fly-to, phase 1 is done.

Done when: no ship-specific strings, numbers or geometry remain in `src/`, and both ships load through the same loader.

## Phase 2 — Second real ship and the asset pipeline (1–2 weeks, mostly content)

This is where the time goes and where the product gets decided.

- Pick a second ship with a different silhouette on purpose: no ring, fewer decks, a different role (a frigate, a freighter, a lander). If the viewer needs a special case for it, that's a schema gap to fix, not a feature to add.
- Blender pipeline: model with named collections/objects using the phase-1 prefixes, export glTF with Draco, run `scripts/validate-ship.mjs` (checks names, that every `room_*` in the model exists in ship.json and vice versa, scale sanity, triangle budget).
- Textures: bake AO and panel lines in Blender, or reuse the procedural plating generator as a no-Blender fallback for hull materials.
- Interiors only for three or four showcase rooms per ship. Everything else gets a marker and a description. Interiors are the expensive part; ration them.
- Writing: 10–14 rooms per ship, 60–90 words each, plus four stats. Draft with Claude Code from a one-paragraph brief per ship, then edit. Keep it in the JSON, not in code.
- Hero render script: Playwright loads each ship, frames it, saves `ships/<id>/hero.webp` at build time. The fleet index uses these.

Done when: two real ships, both from glTF or procedural, both passing validation, both with hero renders.

## Phase 3 — Fleet layer (about a week)

Turn a viewer into a site.

- Routes: `/` fleet index, `/ship/:id` viewer, `/compare?a=&b=`. Room and mode stay in the hash so links keep working.
- Fleet index: cards with hero render, class, role, length, crew; filter by class and role; sort by length. A search box that also matches room names across ships ("hangar" lists every ship with one).
- Compare mode: two ships side by side at true scale on a shared camera, silhouettes overlaid in the deck plan, a stat table that highlights the differences. This is the feature people will screenshot; give it a session of polish.
- Consider a small router and a UI layer now (Svelte or React for the index and detail panels, three.js stays framework-free). Don't do this earlier; the viewer doesn't need it.

Done when: someone can land on `/`, pick a ship, deep-dive it, and compare it to another without touching a URL by hand.

## Phase 4 — Depth (ongoing)

What makes it a deep dive rather than a gallery.

- Systems overlay: power, coolant, atmosphere and data paths drawn as glowing routes through the hull, toggled like deck isolation. Define them in ship.json as polylines between room codes.
- Cross-links: a shuttle in the hangar links to the shuttle's own page; the reactor links to the drive it feeds. Small craft are just small ships in the same schema.
- Room hotspots: clickable points inside interiors with a sentence each.
- Narrated tours: per-ship tour script with captions per segment, optional audio track.
- Variants and refits as JSON diffs on a base ship (same hull, different rooms).

## Phase 5 — Production

- Budgets enforced by the validator: ≤150k triangles and ≤300 draw calls per ship, glTF ≤ 8 MB with Draco.
- Auto quality: measure FPS for the first two seconds; drop bloom and pixel ratio if it's under 40. Manual override stays in Display Options.
- Mobile: touch is already handled; collapse the side panels into a bottom sheet under 900 px.
- Static deploy (Cloudflare Pages or Vercel), glTF and textures served compressed, hero renders as webp.
- CI: schema validation, ship validator, Playwright screenshot per ship per preset (solid, x-ray, section), golden diffs.

---

## Decisions to make before phase 0

1. TypeScript. Yes. The schema types are the documentation.
2. three.js version. Move to current in phase 0, not later. The longer the r128 code lives the more expensive the move.
3. Who writes the room copy. Claude Code drafts from a brief, you edit. Decide the voice now (the demo's copy is terse technical prose, present tense, no adjectives that don't carry a number).
4. Second ship. Pick it before phase 1 ends so the schema is designed against two ships, not one.
5. Hosting. Static is enough for everything above. Nothing here needs a backend until you want accounts or comments.

## Working with Claude Code on this

- One phase per session, one commit per task. Phases 1 and 2 will each take several sessions; end each with a handoff note in `NOTES.md`.
- Give it the demo screenshots as the visual target. Ask it to run `npm run shot` and look at the image before reporting done. Rendering bugs don't show up in tests.
- Keep `ships/asv-07` as the golden reference. Any change to `src/` must still render it correctly.
- When it wants to add a ship-specific branch to the viewer, stop it and fix the schema instead.

### Kickoff prompt for phase 0

> Read CLAUDE.md and ROADMAP.md. Set up a Vite + TypeScript project and move `reference/asv07-demo.html` into it as ES modules under `src/` per the phase 0 layout, upgrading to the current three.js and its addons for post-processing. Behaviour and look must stay the same. Add `npm run shot` (Playwright, 1600×1000, waits 4 s, saves `shots/current.png`) and compare it against `reference/golden.png`. Commit after each of: scaffold, renderer module, ship builder module, controls module, UI module, screenshot script. Show me the final screenshot.
