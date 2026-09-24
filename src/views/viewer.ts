import { AdditiveBlending, Object3D, Sprite, SpriteMaterial, Vector3 } from 'three';
import markup from './viewer.html?raw';
import { createWorld } from '../render/world';
import { fitSunShadow, LAMP_INTENSITY } from '../render/environment';

/** Interior fill at the 300 m reference; it scales with the ship so small hulls stay lit. */
const FILL = 6;
import { loadShip, roomWorld } from '../ship/loader';
import { getSpec } from '../fleet';
import { spinners } from '../schema';
import { ringTex } from '../ship/textures';
import { Display } from '../ship/display';
import { shipStats } from '../ship/stats';
import { CameraRig, fitAspect, roamStep } from '../controls/camera';
import { Tour } from '../controls/tour';
import { bindInput } from '../controls/input';
import { flyToRoom, roomPose } from '../controls/flyto';
import { Panels } from '../ui/panels';
import { RoomIndex } from '../ui/detail';
import { Labels } from '../ui/labels';
import { DeckPlan } from '../ui/plan';
import { hideToast, showToast } from '../ui/toast';
import { Hotspots } from '../ui/hotspots';
import { Captions } from '../ui/caption';
import { Systems } from '../ship/systems';
import { Quality, type QualityMode } from '../render/quality';
import { bindSheets, revealOnMobile } from '../ui/sheets';
import { createState, readHash, writeHash, type Mode } from '../state';
import { $, clamp, col } from '../util';

/** The single-ship viewer at /ship/:id. Room and mode ride in the hash. */
export async function mountViewer(app: HTMLElement, id: string) {
  app.innerHTML = markup;
  const hash = readHash();
  const spec = getSpec(id);
  $('#loadingText').textContent = `Loading ${spec.name}`;
  $<HTMLAnchorElement>('#compareLink').href = `/compare?a=${encodeURIComponent(id)}`;

  const canvas = $<HTMLCanvasElement>('#gl');
  const stage = await createWorld(canvas, spec.length_m / 300, spec.camera.near ?? 0.5, spec.camera.far ?? 8000);
  const { lamp, stars, interiorFill } = stage;

  const ship = await loadShip(stage.renderer, spec);
  stage.scene.add(ship.model.root);
  const systems = await Systems.create(ship);
  stage.scene.add(systems.group);
  addEventListener('resize', () => systems.resize(innerWidth, innerHeight));

  const S = createState();
  const display = new Display(ship, stage);
  const bounds = shipStats(ship).bounds;
  fitSunShadow(stage.sun, Math.max(
    (bounds.max[0] - bounds.min[0]) / 2,
    (bounds.max[1] - bounds.min[1]) / 2,
    (bounds.max[2] - bounds.min[2]) / 2) * 1.1);
  const aspect = innerWidth / innerHeight;
  const homePos = fitAspect(new Vector3(...spec.camera.home), new Vector3(...spec.camera.target), aspect);
  const startPos = fitAspect(new Vector3(...spec.camera.start), new Vector3(...spec.camera.target), aspect);
  const rig = new CameraRig(homePos, new Vector3(...spec.camera.target), spec.camera.range);
  rig.scale = spec.length_m / 300;
  const tour = new Tour(spec.tour);

  /* selection ring, drawn over everything at the selected room */
  const selRing = new Sprite(new SpriteMaterial({
    map: ringTex(), color: col('#8fe8f5'), transparent: true, opacity: 0,
    depthWrite: false, depthTest: false, blending: AdditiveBlending,
  }));
  selRing.scale.set(16, 16, 1);
  stage.scene.add(selRing);

  /* ---------- selection ---------- */
  const pick = (i: number, close = false) => {
    select(i);
    if (i >= 0) {
      revealOnMobile('right');
      if (S.mode === 'tour') setMode('orbit');
      flyToRoom(rig, ship, i, close);
      showToast((close ? 'Entering ' : 'Flying to ') + spec.rooms[i].name, 2600);
    }
  };

  function select(i: number) {
    S.selected = i;
    writeHash(S, spec);
    rooms.select(i);
    labels.select(i);
    if (i < 0) { selRing.material.opacity = 0; return; }
    selRing.material.color = col(spec.rooms[i].color);
  }

  const hotspots = new Hotspots(spec);
  const captions = new Captions(spec.tour, spec.model.ship ?? spec.id);
  const rooms = new RoomIndex(spec, i => pick(i), {
    systemsAt: code => systems.systemsAt(code),
    onSystem: sid => setSystem(sid),
    onLink: l => { const k = spec.rooms.findIndex(r => r.code === l.room); if (k >= 0) pick(k); },
    hotspots: i => hotspots.count(i),
  });
  const labels = new Labels(spec, i => pick(i));
  const plan = new DeckPlan(spec, i => pick(i));
  bindSheets(['Controls', 'Rooms']);
  $('#dFly').addEventListener('click', () => S.selected >= 0 && pick(S.selected, true));

  /* ---------- panels ---------- */
  function setMode(m: Mode) {
    rig.fly = null;
    hideToast();
    if (m === 'orbit') {
      if (S.mode === 'roam') rig.target.copy(rig.pos).add(rig.forward().multiplyScalar(Math.max(40 * rig.scale, rig.pos.length() * .5)));
      rig.syncOrbit();
    }
    if (m === 'roam') rig.syncYaw();
    if (m === 'tour') tour.reset();
    captions.show(m === 'tour');
    S.mode = m;
    panels.syncMode(m);
    canvas.classList.toggle('roam', m === 'roam');
    writeHash(S, spec);
  }

  const refresh = () => { display.applyMaterials(S); labels.refreshOccluders(ship.model.meshes, ship.model.proxies); };

  /* Systems overlay drops the hull to x-ray while shown, and puts it back after. */
  let opacityBeforeSystem: number | null = null;
  function setSystem(id: string | null) {
    S.system = id;
    writeHash(S, spec);
    systems.set(id);
    panels.syncSystem(id);
    if (id && opacityBeforeSystem === null && S.opacity > .4) {
      opacityBeforeSystem = S.opacity;
      S.opacity = .22;
    } else if (!id && opacityBeforeSystem !== null) {
      S.opacity = opacityBeforeSystem;
      opacityBeforeSystem = null;
    }
    panels.syncOpacity(S.opacity);
    refresh();
    if (id) {
      const sy = spec.systems!.find(x => x.id === id)!;
      showToast(`${sy.name} · ${systems.roomsOf(id).length} rooms`, 2000);
    }
  }

  const panels = new Panels(spec, S, {
    mode: m => setMode(m),
    cut: c => { S.cut = c; display.updateCut(S); panels.syncCut(S, display.cutMetres(S)); refresh(); },
    cutPos: v => { S.cutPos = v; display.updateCut(S); panels.syncCut(S, display.cutMetres(S)); },
    flip: v => { S.flip = v; display.updateCut(S); panels.syncCut(S, display.cutMetres(S)); },
    opacity: v => { S.opacity = v; opacityBeforeSystem = null; panels.syncOpacity(v); panels.markPreset('none'); refresh(); },
    system: id => setSystem(id),
    explode: v => { S.explode = v; panels.syncExplode(v); display.applyExplode(S); },
    deck: code => { S.deck = code; refresh(); rooms.dim(code); labels.dim(code); },
    preset: p => {
      if (p === 'solid') { S.opacity = 1; S.wire = false; S.cut = 'off'; }
      if (p === 'xray') { S.opacity = .2; S.wire = false; }
      if (p === 'section') { S.opacity = 1; S.wire = false; S.cut = 'hlay'; S.cutPos = 0.04; S.flip = false; }
      if (p === 'frame') { S.wire = true; S.opacity = 1; }
      panels.syncOpacity(S.opacity);
      panels.syncWire(S.wire);
      display.updateCut(S);
      panels.syncCut(S, display.cutMetres(S));
      panels.markPreset(p);
      refresh();
    },
    option: (key, v) => {
      (S[key] as boolean) = v;
      if (key === 'stars') stars.visible = v;
      if (key === 'lamp') { lamp.visible = v; lamp.intensity = v ? LAMP_INTENSITY : 0; }
      if (key === 'labels') labels.setVisible(v);
      if (key === 'wire' || key === 'bloom') { refresh(); if (key === 'wire') panels.markPreset('none'); }
    },
  });

  /* ---------- quality ---------- */
  const quality = new Quality(stage, (low, reason) => {
    S.bloom = !low;
    $<HTMLInputElement>('#optBloom').checked = S.bloom;
    refresh();
    $('#qualVal').textContent = quality.mode === 'auto' ? (low ? 'AUTO · LOW' : 'AUTO') : quality.mode.toUpperCase();
    if (reason === 'auto' && low) showToast('Low-power mode · bloom off', 2600);
  });
  const markQuality = () => $('#qualSeg').querySelectorAll<HTMLButtonElement>('button').forEach(b => b.classList.toggle('on', b.dataset.q === quality.mode));
  $('#qualSeg').addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button'); if (!b) return;
    quality.choose(b.dataset.q as QualityMode); markQuality();
  });
  markQuality();

  /* ---------- input ---------- */
  const keys = bindInput(canvas, stage.camera, rig, S, { objects: ship.hitTargets }, {
    takeOver: () => setMode('orbit'),
    pickRoom: i => pick(i),
    jumpTo: i => { if (i < spec.rooms.length) pick(i); },
    toggleUi: () => { S.uiHidden = !S.uiHidden; document.body.classList.toggle('hideui', S.uiHidden); },
    clearSelection: () => select(-1),
    setMode: m => setMode(m),
  });

  /* ---------- frame loop ---------- */
  const spins = spinners(spec)
    .map(sp => ({ node: ship.model.spinNodes.get(sp.module), rate: sp.rpm * Math.PI * 2 / 60, axis: sp.axis }))
    .filter((s): s is { node: Object3D; rate: number; axis: 'x' | 'y' | 'z' } => !!s.node);
  const tmp = new Vector3();
  let last = performance.now(), fpsAcc = 0, fpsN = 0, fpsT = 0, frameN = 0;

  function frame(now: number) {
    requestAnimationFrame(frame);
    const dt = Math.min(.1, (now - last) / 1000);
    last = now;
    const T = now / 1000;
    quality.tick(dt);

    if (S.spinNode) {
      S.spinAngle += dt;
      for (const s of spins) s.node.rotation[s.axis] = S.spinAngle * s.rate;
    }

    if (!rig.stepFly(dt)) {
      if (S.mode === 'orbit') {
        if (S.spin) { rig.theta += dt * .12; rig.applyOrbit(); }
      } else if (S.mode === 'roam') {
        roamStep(rig, keys, dt, rig.scale);
      } else {
        const seg = tour.step(dt, rig.pos, rig.target);
        if (seg) {
          const el = document.getElementById('tourSeg');
          if (el) el.textContent = seg.name;
          if (!seg.caption) showToast('Tour · ' + seg.name, 3200);
          captions.segment(tour.seg, tour.t);
          select(seg.room ? spec.rooms.findIndex(r => r.code === seg.room) : -1);
        }
        captions.progress(tour.t);
      }
    }
    rig.apply(stage.camera);

    for (const fn of ship.model.animators) fn(T, dt);
    ship.plumeTime(T);

    if (S.selected >= 0) {
      const p = roomWorld(ship, S.selected, tmp);
      selRing.position.copy(p);
      const s = p.distanceTo(rig.pos) * .045 * (1 + .08 * Math.sin(now * .004));
      selRing.scale.set(s, s, 1);
      selRing.material.opacity = clamp(.85 - (rig.fly ? .3 : 0), .3, .9);
    } else selRing.material.opacity = 0;

    if (S.labels && !S.uiHidden) labels.update(ship.markers, stage.camera, rig.pos, S.selected);
    systems.update(T, rig.pos);
    display.updateSprites(S, rig.pos);
    // Measured against the room's own interior pose, since a label marker often sits
    // outside the hull where the label has to be readable.
    const room = S.selected >= 0 ? spec.rooms[S.selected] : null;
    const anchor = room?.close && S.selected >= 0
      ? roomPose(ship, S.selected, true).pos
      : S.selected >= 0 ? roomWorld(ship, S.selected, tmp) : null;
    const inside = !!anchor && !rig.fly
      && anchor.distanceTo(rig.pos) < (room?.close ? Math.max(3 * rig.scale, room.dist * .3) : Math.max(12 * rig.scale, room!.dist * .4));
    hotspots.update(ship.markers, S.selected, inside && !S.uiHidden, stage.camera);
    // Fade in and out rather than snapping at the threshold. The intensity follows the
    // light's own decay, so a 12 m shuttle and a 1.2 km hull both land in the same place.
    const wantFill = inside ? FILL * Math.pow(Math.max(.4, rig.scale), 1.1) : 0;
    interiorFill.intensity += (wantFill - interiorFill.intensity) * Math.min(1, dt * 4);
    interiorFill.distance = Math.max(26, 70 * rig.scale);
    // Strip lights a metre from the lens bloom into a white wash, so pull the bloom back
    // while inside and let it open up again outside.
    if (S.bloom) {
      const want = inside ? .3 : .72;
      stage.bloomPass.strength += (want - stage.bloomPass.strength) * Math.min(1, dt * 3);
      stage.bloomPass.radius = inside ? .35 : .55;
    }
    frameN++;
    if (frameN % 2 === 0 && !S.uiHidden) {
      plan.update(ship.markers, stage.camera, rig.pos, S.selected, S.cut, S.cutPos);
      plan.drawSystem(systems.planPaths(), systems.color);
    }

    stage.renderer.info.reset();
    stage.composer.render();

    fpsAcc += dt; fpsN++;
    if (now - fpsT > 500) {
      $('#fps').textContent = String(Math.round(fpsN / fpsAcc));
      fpsAcc = 0; fpsN = 0; fpsT = now;
      const t = stage.renderer.info.render.triangles;
      $('#tris').textContent = t > 999 ? (t / 1000).toFixed(t > 99999 ? 0 : 1) + 'k' : String(t);
    }
  }

  /* ---------- boot ---------- */
  display.updateCut(S);
  panels.syncCut(S, display.cutMetres(S));
  panels.syncOpacity(S.opacity);
  panels.syncExplode(S.explode);
  refresh();
  display.applyExplode(S);
  setMode('orbit');
  requestAnimationFrame(frame);
  setTimeout(() => $('#loading').classList.add('done'), 350);
  quality.start();

  // Opening move: settle in from a wider shot, or go straight to a room named in the URL.
  rig.pos.copy(startPos);
  const target = new Vector3(...spec.camera.target);
  if (hash.mode && hash.mode !== 'orbit') setMode(hash.mode);
  if (hash.system && spec.systems?.some(x => x.id === hash.system)) setSystem(hash.system);
  const roomIndex = hash.room ? spec.rooms.findIndex(r => r.code === hash.room) : -1;
  if (roomIndex >= 0) {
    select(roomIndex);
    flyToRoom(rig, ship, roomIndex, false, 2.6);
  } else {
    rig.flyTo(homePos, target, 3.2);
    rig.fly!.t0.copy(target);
  }

  Object.assign(window, { FLEET: { S, rig, ship, spec,  stats: () => shipStats(ship),
    /** Jump the camera to a pose with no fly-to; used by the hero render. */
    pose: (p: [number, number, number], t: [number, number, number]) => {
      rig.fly = null; rig.pos.set(...p); rig.target.set(...t); rig.syncOrbit(); rig.syncYaw();
    },
  } });
}
