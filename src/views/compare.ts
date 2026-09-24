import { Group, Vector3 } from 'three';
import { spinners, type ShipSpec } from '../schema';
import { listed, getSpec, fleet } from '../fleet';
import { createWorld } from '../render/world';
import { loadShip, type LoadedShip } from '../ship/loader';
import { Display } from '../ship/display';
import { shipStats, type ShipStats } from '../ship/stats';
import { CameraRig } from '../controls/camera';
import { bindInput } from '../controls/input';
import { createState } from '../state';
import { planBounds, silhouette, svg } from '../ui/silhouette';
import { $, clamp } from '../util';
import { Quality } from '../render/quality';
import { showToast } from '../ui/toast';
import { bindSheets } from '../ui/sheets';

type Layout = 'side' | 'overlay';
const A_COL = '#82e6f2', B_COL = '#f0b64a';
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** `/compare?a=&b=`: two ships in one scene at true scale, one camera, one stat table. */
export async function mountCompare(app: HTMLElement) {
  const q = new URLSearchParams(location.search);
  const ships = listed();
  const known = (id: string | null) => !!id && fleet().has(id);
  const aId = known(q.get('a')) ? q.get('a')! : ships[0].spec.id;
  const bId = known(q.get('b')) && q.get('b') !== aId ? q.get('b')! : ships.find(e => e.spec.id !== aId)?.spec.id ?? aId;
  let layout: Layout = q.get('layout') === 'overlay' ? 'overlay' : 'side';
  const A = getSpec(aId), B = getSpec(bId);
  document.title = `${A.name} vs ${B.name} · Fleet Explorer`;

  const options = (sel: string) => ships.map(e =>
    `<option value="${e.spec.id}" ${e.spec.id === sel ? 'selected' : ''}>${esc(e.spec.name)} · ${esc(e.spec.class)}</option>`).join('');

  app.innerHTML = `
    <div id="loading"><div id="loadingText">Loading ${esc(A.name)} and ${esc(B.name)}</div></div>
    <canvas id="gl"></canvas>
    <div id="vignette"></div>
    <div id="labels"></div>
    <div id="top">
      <a class="navback" href="/" title="Back to the Fleet">◂ Fleet</a>
      <div class="shipname">COMPARE</div>
      <div class="shipclass"><b style="color:${A_COL}">${esc(A.name)}</b> ${esc(A.class)} <i>vs</i> <b style="color:${B_COL}">${esc(B.name)}</b> ${esc(B.class)} <i>|</i> True Scale</div>
      <div id="stats">
        <div class="stat">FPS <span id="fps">—</span></div>
        <div class="stat">Tris <span id="tris">—</span></div>
      </div>
    </div>
    <aside class="panel" id="left" aria-label="Compare controls">
      <div class="panel-scroll">
        <section>
          <h3>Ships</h3>
          <label class="pick"><span class="d" style="background:${A_COL};color:${A_COL}"></span><select id="pickA">${options(aId)}</select></label>
          <label class="pick"><span class="d" style="background:${B_COL};color:${B_COL}"></span><select id="pickB">${options(bId)}</select></label>
          <div class="seg c2" style="margin-top:8px"><button id="swap">⇅ Swap</button><a class="segbtn" href="/ship/${aId}">Open ${esc(A.name)}</a></div>
        </section>
        <section>
          <h3>Layout</h3>
          <div class="seg c2" id="layoutSeg"><button data-v="side">Side by Side</button><button data-v="overlay">Overlay</button></div>
          <p class="hint">Overlay puts both origins on the same point and draws ${esc(B.name)} as an X-Ray, so the hull difference reads directly.</p>
        </section>
        <section>
          <h3>Display Options</h3>
          <div class="check">
            <label><input type="checkbox" id="optTags" checked> Ship Tags</label>
            <label><input type="checkbox" id="optBloom" checked> Bloom Glow</label>
            <label><input type="checkbox" id="optStars" checked> Starfield</label>
            <label><input type="checkbox" id="optSpin"> Auto-Spin</label>
          </div>
        </section>
      </div>
    </aside>
    <button class="toggle" id="tl" title="Toggle controls" aria-label="Toggle controls">◀</button>
    <aside class="panel" id="right" aria-label="Comparison">
      <div class="panel-scroll">
        <div class="plan">
          <h3>Silhouettes <span class="val">True Scale</span></h3>
          <svg id="cmpPlan" aria-label="Both side elevations overlaid at the same scale"></svg>
          <div class="legend"><span><i style="background:${A_COL}"></i>${esc(A.name)}</span><span><i style="background:${B_COL}"></i>${esc(B.name)}</span></div>
        </div>
        <h3>Specifications</h3>
        <table class="cmp" id="cmpTable"></table>
        <section id="cmpOnly" hidden>
          <h3>Rooms Only Here</h3>
          <div class="onlyrooms" id="cmpOnlyBody"></div>
        </section>
      </div>
    </aside>
    <button class="toggle" id="tr" title="Toggle comparison" aria-label="Toggle comparison">▶</button>
    <div id="toast"></div>
    <div id="bottom"><div id="hint"><b>Drag</b> Rotate <i>·</i> <b>Right-drag</b> Pan <i>·</i> <b>Scroll</b> Zoom <i>·</i> <b>Click</b> a Room to Open It in Its Ship <i>·</i> <b>H</b> Hides UI</div></div>`;

  const go = (a: string, b: string, l = layout) => { location.search = `?a=${a}&b=${b}${l === 'overlay' ? '&layout=overlay' : ''}`; };
  $<HTMLSelectElement>('#pickA').addEventListener('change', e => go((e.target as HTMLSelectElement).value, bId));
  $<HTMLSelectElement>('#pickB').addEventListener('change', e => go(aId, (e.target as HTMLSelectElement).value));
  $('#swap').addEventListener('click', () => go(bId, aId));
  $('#tl').addEventListener('click', () => { const c = $('#left').classList.toggle('collapsed'); $('#tl').textContent = c ? '▶' : '◀'; });
  $('#tr').addEventListener('click', () => { const c = $('#right').classList.toggle('collapsed'); $('#tr').textContent = c ? '◀' : '▶'; });

  drawPlans(A, B);
  bindSheets(['Controls', 'Compare']);

  /* ---------- scene ---------- */
  const maxLen = Math.max(A.length_m, B.length_m);
  const canvas = $<HTMLCanvasElement>('#gl');
  const world = createWorld(canvas, maxLen / 300, 0.5, Math.max(A.camera.far ?? 8000, B.camera.far ?? 8000));
  const [shipA, shipB] = await Promise.all([loadShip(world.renderer, A), loadShip(world.renderer, B)]);
  const slotA = new Group(), slotB = new Group();
  slotA.add(shipA.model.root); slotB.add(shipB.model.root);
  world.scene.add(slotA, slotB);
  const statsA = shipStats(shipA), statsB = shipStats(shipB);
  drawTable(A, B, statsA, statsB);

  const S = createState();
  const dispA = new Display(shipA, world), dispB = new Display(shipB, world);
  const apply = () => {
    dispA.applyMaterials(S);
    dispB.applyMaterials({ ...S, opacity: layout === 'overlay' ? .22 : 1 });
  };

  const place = () => {
    const gap = Math.max(20, maxLen * .08);
    if (layout === 'side') {
      slotA.position.set(0, 0, gap / 2 - statsA.bounds.min[2]);
      slotB.position.set(0, 0, -gap / 2 - statsB.bounds.max[2]);
    } else {
      slotA.position.set(0, 0, 0);
      slotB.position.set(0, 0, 0);
    }
    const seg = $('#layoutSeg');
    seg.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.classList.toggle('on', b.dataset.v === layout));
    apply();
  };
  place();
  $('#layoutSeg').addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest('button'); if (!b) return;
    layout = b.dataset.v as Layout;
    history.replaceState(null, '', `?a=${aId}&b=${bId}${layout === 'overlay' ? '&layout=overlay' : ''}`);
    place();
  });

  // Frame both hulls: centre on the union, back off until the longer ship fits.
  const center = new Vector3(0, 0, (slotA.position.z + slotB.position.z) / 2);
  // Fit the longer hull to whichever field of view is narrower (portrait phones).
  const vfov = world.camera.fov * Math.PI / 180;
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * innerWidth / innerHeight);
  const dist = (maxLen * .62) / Math.tan(Math.min(vfov, hfov) / 2);
  const dir = new Vector3(-.28, .42, 1).normalize();
  const home = center.clone().add(dir.clone().multiplyScalar(dist));
  const rig = new CameraRig(home.clone().multiplyScalar(1.5), center, [8, maxLen * 8]);
  rig.flyTo(home, center, 3);

  const tags = [A, B].map((spec, i) => {
    const el = document.createElement('a');
    el.className = 'label shiptag';
    el.href = `/ship/${spec.id}`;
    el.innerHTML = `<span class="d" style="background:${i ? B_COL : A_COL};color:${i ? B_COL : A_COL}"></span>${esc(spec.name)}<span class="c">${spec.length_m} m</span>`;
    $('#labels').appendChild(el);
    return el;
  });

  bindInput(canvas, world.camera, rig, S, { objects: [...shipA.hitTargets, ...shipB.hitTargets] }, {
    takeOver: () => {},
    pickRoom: (i, obj) => {
      const ship = shipA.hitTargets.includes(obj as never) ? A : B;
      location.href = `/ship/${ship.id}#room=${ship.rooms[i].code}`;
    },
    jumpTo: () => {},
    toggleUi: () => { S.uiHidden = !S.uiHidden; document.body.classList.toggle('hideui', S.uiHidden); },
    clearSelection: () => {},
    setMode: () => {},
  });

  for (const [id, key] of [['optBloom', 'bloom'], ['optStars', 'stars'], ['optSpin', 'spin'], ['optTags', 'labels']] as const) {
    $<HTMLInputElement>('#' + id).addEventListener('change', e => {
      const v = (e.target as HTMLInputElement).checked;
      S[key] = v;
      if (key === 'stars') world.stars.visible = v;
      if (key === 'labels') $('#labels').style.display = v ? '' : 'none';
      if (key === 'bloom') apply();
    });
  }

  const quality = new Quality(world, (low, reason) => {
    S.bloom = !low;
    $<HTMLInputElement>('#optBloom').checked = S.bloom;
    apply();
    if (reason === 'auto' && low) showToast('Low-power mode · bloom off', 2600);
  });

  /* ---------- loop ---------- */
  const spinners = [shipA, shipB].map(s => spinnerFor(s));
  const tmp = new Vector3();
  let last = performance.now(), fpsAcc = 0, fpsN = 0, fpsT = 0;
  const frame = (now: number) => {
    requestAnimationFrame(frame);
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    const T = now / 1000;
    quality.tick(dt);
    for (const sp of spinners) sp(dt);
    for (const s of [shipA, shipB]) { for (const fn of s.model.animators) fn(T, dt); s.plumeTime(T); }
    if (!rig.stepFly(dt) && S.spin) { rig.theta += dt * .1; rig.applyOrbit(); }
    rig.apply(world.camera);

    if (S.labels && !S.uiHidden) {
      [[slotA, statsA], [slotB, statsB]].forEach(([slot, st], i) => {
        const s = st as ShipStats, g = slot as Group;
        // A's tag sits toward its bow, B's toward its stern, so the two never stack.
        const x = i ? s.bounds.min[0] * .45 : s.bounds.max[0] * .45;
        tmp.set(x, s.bounds.max[1] + maxLen * .03, (s.bounds.min[2] + s.bounds.max[2]) / 2).add(g.position);
        tmp.project(world.camera);
        const el = tags[i];
        if (tmp.z > 1) { el.style.transform = 'translate(-9999px,-9999px)'; return; }
        el.style.transform = `translate(${((tmp.x * .5 + .5) * innerWidth).toFixed(1)}px, ${((-tmp.y * .5 + .5) * innerHeight).toFixed(1)}px) translate(-50%,-100%)`;
      });
    }

    world.renderer.info.reset();
    world.composer.render();
    fpsAcc += dt; fpsN++;
    if (now - fpsT > 500) {
      $('#fps').textContent = String(Math.round(fpsN / fpsAcc)); fpsAcc = 0; fpsN = 0; fpsT = now;
      const t = world.renderer.info.render.triangles;
      $('#tris').textContent = t > 999 ? (t / 1000).toFixed(t > 99999 ? 0 : 1) + 'k' : String(t);
    }
  };
  requestAnimationFrame(frame);
  setTimeout(() => $('#loading').classList.add('done'), 300);
  quality.start();
  addEventListener('keydown', e => { if (e.key.toLowerCase() === 'o') { layout = layout === 'side' ? 'overlay' : 'side'; place(); } });
  Object.assign(window, { FLEET: { S, rig, ships: [shipA, shipB], stats: () => [statsA, statsB] } });
}

function spinnerFor(s: LoadedShip) {
  const nodes = spinners(s.spec)
    .map(sp => ({ node: s.model.spinNodes.get(sp.module), rate: sp.rpm * Math.PI * 2 / 60, axis: sp.axis }))
    .filter(n => n.node);
  let t = 0;
  return (dt: number) => {
    t += dt;
    for (const n of nodes) n.node!.rotation[n.axis] = t * n.rate;
  };
}

/* ---------- silhouettes ---------- */

function drawPlans(A: ShipSpec, B: ShipSpec) {
  const host = document.getElementById('cmpPlan') as unknown as SVGSVGElement;
  const ba = planBounds(A), bb = planBounds(B);
  const x0 = Math.min(ba.x0, bb.x0), x1 = Math.max(ba.x1, bb.x1);
  const y0 = Math.min(ba.y0, bb.y0), y1 = Math.max(ba.y1, bb.y1);
  const w = x1 - x0, pad = w * .04;
  const h = Math.max(y1 - y0, w / 2.6);
  const cy = (y0 + y1) / 2;
  host.setAttribute('viewBox', `${x0 - pad} ${-cy - h / 2 - pad} ${w + pad * 2} ${h + pad * 2 + w * .06}`);
  const k = w / 344;
  host.style.setProperty('--k', String(k));
  const g = svg('g', { transform: 'scale(1,-1)' });
  g.appendChild(svg('line', { class: 'axis', x1: x0, y1: 0, x2: x1, y2: 0 }));
  const sb = silhouette(B); sb.setAttribute('class', 'silB'); g.appendChild(sb);
  const sa = silhouette(A); sa.setAttribute('class', 'silA'); g.appendChild(sa);
  host.appendChild(g);
  // 50 m scale bar under the hulls
  const step = w > 500 ? 100 : 50;
  const by = cy + h / 2 + pad * .2;
  const bar = svg('g', { class: 'scalebar', transform: `translate(${x0},${by})` });
  bar.appendChild(svg('line', { x1: 0, y1: 0, x2: step, y2: 0 }));
  bar.appendChild(svg('line', { x1: 0, y1: -2 * k, x2: 0, y2: 2 * k }));
  bar.appendChild(svg('line', { x1: step, y1: -2 * k, x2: step, y2: 2 * k }));
  const t = svg('text', { x: step + 4 * k, y: 2.5 * k, style: `font-size:${(7.5 * k).toFixed(2)}px` }); t.textContent = `${step} m`;
  bar.appendChild(t);
  host.appendChild(bar);
}

/* ---------- stat table ---------- */

function drawTable(A: ShipSpec, B: ShipSpec, sa: ShipStats, sb: ShipStats) {
  const rows: [string, number, number, string?][] = [
    ['Length', A.length_m, B.length_m, 'm'],
    ['Beam', span(sa, 2), span(sb, 2), 'm'],
    ['Height', span(sa, 1), span(sb, 1), 'm'],
    ['Crew', A.crew, B.crew],
    ['Decks', A.decks.length, B.decks.length],
    ['Rooms', A.rooms.length, B.rooms.length],
    ['Interiors', A.rooms.filter(r => r.close).length, B.rooms.filter(r => r.close).length],
    ['Modules', A.modules.length, B.modules.length],
    ['Crew per 100 m', +(A.crew / A.length_m * 100).toFixed(1), +(B.crew / B.length_m * 100).toFixed(1)],
    ['Triangles', sa.triangles, sb.triangles],
  ];
  const fmt = (v: number) => v >= 10000 ? (v / 1000).toFixed(1) + 'k' : v.toLocaleString();
  const text: [string, string, string][] = [
    ['Class', A.class, B.class],
    ['Role', A.role, B.role],
    ['Spin gravity', spinners(A).length ? 'Yes' : 'No', spinners(B).length ? 'Yes' : 'No'],
  ];
  const head = `<thead><tr><th></th><th style="color:${A_COL}">${esc(A.name)}</th><th style="color:${B_COL}">${esc(B.name)}</th></tr></thead>`;
  const num = rows.map(([label, a, b, unit]) => {
    const max = Math.max(a, b) || 1, diff = a !== b;
    const d = a - b, rel = b ? Math.round((a / b - 1) * 100) : 0;
    return `<tr class="${diff ? 'diff' : ''}">
      <th>${label}${diff ? `<em>${d > 0 ? '+' : '−'}${fmt(Math.abs(+d.toFixed(1)))}${unit ? ' ' + unit : ''}${rel && Math.abs(rel) < 1000 ? ` · ${rel > 0 ? '+' : ''}${rel}%` : ''}</em>` : ''}</th>
      <td class="${a > b ? 'hi' : ''}">${fmt(a)}${unit ? ' ' + unit : ''}<span class="bar" style="--w:${clamp(a / max, 0, 1)};--c:${A_COL}"></span></td>
      <td class="${b > a ? 'hi' : ''}">${fmt(b)}${unit ? ' ' + unit : ''}<span class="bar" style="--w:${clamp(b / max, 0, 1)};--c:${B_COL}"></span></td>
    </tr>`;
  }).join('');
  const txt = text.map(([label, a, b]) => `<tr class="${a !== b ? 'diff txt' : 'txt'}"><th>${label}</th><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('');
  document.getElementById('cmpTable')!.innerHTML = head + '<tbody>' + num + txt + '</tbody>';
  drawOnlyRooms(A, B);
}

/** Rooms one ship has and the other does not, as two linked lists. */
function drawOnlyRooms(A: ShipSpec, B: ShipSpec) {
  const names = (x: ShipSpec) => new Set(x.rooms.map(r => r.name));
  const only = (x: ShipSpec, other: ShipSpec) => x.rooms.filter(r => !names(other).has(r.name));
  const onlyA = only(A, B), onlyB = only(B, A);
  const section = document.getElementById('cmpOnly') as HTMLElement;
  // Nothing worth showing when the ships share nothing at all.
  if (!onlyA.length && !onlyB.length) { section.hidden = true; return; }
  if (onlyA.length === A.rooms.length && onlyB.length === B.rooms.length) { section.hidden = true; return; }
  section.hidden = false;
  const column = (spec: ShipSpec, rooms: ShipSpec['rooms'], color: string) => `
    <div class="onlycol">
      <div class="onlyhead" style="--c:${color}"><span class="d"></span>${esc(spec.name)}<em>${rooms.length}</em></div>
      ${rooms.length
        ? `<ul>${rooms.map(r => `<li style="--c:${r.color}"><a href="/ship/${spec.id}#room=${r.code}">${esc(r.name)}<em>${r.code}</em></a></li>`).join('')}</ul>`
        : '<p class="none">Nothing the other ship lacks</p>'}
    </div>`;
  document.getElementById('cmpOnlyBody')!.innerHTML = column(A, onlyA, A_COL) + column(B, onlyB, B_COL);
}

const span = (s: ShipStats, axis: 1 | 2) => Math.round(s.bounds.max[axis] - s.bounds.min[axis]);
