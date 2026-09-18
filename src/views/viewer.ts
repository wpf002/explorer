import { AdditiveBlending, Sprite, SpriteMaterial, Vector3 } from 'three';
import markup from './viewer.html?raw';
import { createWorld } from '../render/world';
import { LAMP_INTENSITY } from '../render/environment';
import { loadShip, roomWorld } from '../ship/loader';
import { getSpec } from '../fleet';
import { ringTex } from '../ship/textures';
import { Display } from '../ship/display';
import { shipStats } from '../ship/stats';
import { CameraRig, roamStep } from '../controls/camera';
import { Tour } from '../controls/tour';
import { bindInput } from '../controls/input';
import { flyToRoom } from '../controls/flyto';
import { Panels } from '../ui/panels';
import { RoomIndex } from '../ui/detail';
import { Labels } from '../ui/labels';
import { DeckPlan } from '../ui/plan';
import { hideToast, showToast } from '../ui/toast';
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
  const stage = createWorld(canvas, spec.length_m / 300, spec.camera.near ?? 0.5, spec.camera.far ?? 8000);
  const { lamp, stars } = stage;

  const ship = await loadShip(stage.renderer, spec);
  stage.scene.add(ship.model.root);

  const S = createState();
  const display = new Display(ship, stage);
  const rig = new CameraRig(new Vector3(...spec.camera.home), new Vector3(...spec.camera.target), spec.camera.range);
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

  const rooms = new RoomIndex(spec, i => pick(i));
  const labels = new Labels(spec, i => pick(i));
  const plan = new DeckPlan(spec, i => pick(i));
  $('#dFly').addEventListener('click', () => S.selected >= 0 && pick(S.selected, true));

  /* ---------- panels ---------- */
  function setMode(m: Mode) {
    rig.fly = null;
    hideToast();
    if (m === 'orbit') {
      if (S.mode === 'roam') rig.target.copy(rig.pos).add(rig.forward().multiplyScalar(Math.max(40, rig.pos.length() * .5)));
      rig.syncOrbit();
    }
    if (m === 'roam') rig.syncYaw();
    if (m === 'tour') tour.reset();
    S.mode = m;
    panels.syncMode(m);
    canvas.classList.toggle('roam', m === 'roam');
    writeHash(S, spec);
  }

  const refresh = () => { display.applyMaterials(S); labels.refreshOccluders(ship.model.meshes); };

  const panels = new Panels(spec, S, {
    mode: m => setMode(m),
    cut: c => { S.cut = c; display.updateCut(S); panels.syncCut(S, display.cutMetres(S)); refresh(); },
    cutPos: v => { S.cutPos = v; display.updateCut(S); panels.syncCut(S, display.cutMetres(S)); },
    flip: v => { S.flip = v; display.updateCut(S); panels.syncCut(S, display.cutMetres(S)); },
    opacity: v => { S.opacity = v; panels.syncOpacity(v); panels.markPreset('none'); refresh(); },
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
  const spinNode = spec.spinning ? ship.model.spinNodes.get(spec.spinning.module) : undefined;
  const spinRate = spec.spinning ? spec.spinning.rpm * Math.PI * 2 / 60 : 0;
  const spinAxis = spec.spinning?.axis ?? 'x';
  const tmp = new Vector3();
  let last = performance.now(), fpsAcc = 0, fpsN = 0, fpsT = 0, frameN = 0;

  function frame(now: number) {
    requestAnimationFrame(frame);
    const dt = Math.min(.1, (now - last) / 1000);
    last = now;
    const T = now / 1000;

    if (spinNode && S.spinNode) {
      S.spinAngle += dt * spinRate;
      spinNode.rotation[spinAxis] = S.spinAngle;
    }

    if (!rig.stepFly(dt)) {
      if (S.mode === 'orbit') {
        if (S.spin) { rig.theta += dt * .12; rig.applyOrbit(); }
      } else if (S.mode === 'roam') {
        roamStep(rig, keys, dt);
      } else {
        const seg = tour.step(dt, rig.pos, rig.target);
        if (seg) {
          const el = document.getElementById('tourSeg');
          if (el) el.textContent = seg.name;
          showToast('Tour · ' + seg.name, 3200);
          select(seg.room ? spec.rooms.findIndex(r => r.code === seg.room) : -1);
        }
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

    if (S.labels && !S.uiHidden) labels.update(ship.markers, stage.camera, rig.pos);
    frameN++;
    if (frameN % 2 === 0 && !S.uiHidden) plan.update(ship.markers, stage.camera, rig.pos, S.selected, S.cut, S.cutPos);

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

  // Opening move: settle in from a wider shot, or go straight to a room named in the URL.
  rig.pos.set(...spec.camera.start);
  const target = new Vector3(...spec.camera.target);
  if (hash.mode && hash.mode !== 'orbit') setMode(hash.mode);
  const roomIndex = hash.room ? spec.rooms.findIndex(r => r.code === hash.room) : -1;
  if (roomIndex >= 0) {
    select(roomIndex);
    flyToRoom(rig, ship, roomIndex, false, 2.6);
  } else {
    rig.flyTo(new Vector3(...spec.camera.home), target, 3.2);
    rig.fly!.t0.copy(target);
  }

  Object.assign(window, { FLEET: { S, rig, ship, spec, stats: () => shipStats(ship),
    /** Jump the camera to a pose with no fly-to; used by the hero render. */
    pose: (p: [number, number, number], t: [number, number, number]) => {
      rig.fly = null; rig.pos.set(...p); rig.target.set(...t); rig.syncOrbit(); rig.syncYaw();
    },
  } });
}
