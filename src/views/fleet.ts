import type { ShipSpec } from '../schema';
import { listed, type FleetEntry } from '../fleet';
import { planBounds, silhouette, svg } from '../ui/silhouette';
import { startSky } from '../ui/sky';

type Sort = 'long' | 'short' | 'name' | 'crew';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const interiors = (s: ShipSpec) => s.rooms.filter(r => r.close).length;
const shipUrl = (id: string, room?: string) => `/ship/${encodeURIComponent(id)}${room ? '#room=' + room : ''}`;

/** `/`: every listed ship as a card, a true-scale lineup, search across rooms. */
export function mountFleet(app: HTMLElement) {
  const ships = listed();
  const rooms = ships.reduce((n, e) => n + e.spec.rooms.length, 0);
  const metres = ships.reduce((n, e) => n + e.spec.length_m, 0);
  const crew = ships.reduce((n, e) => n + e.spec.crew, 0);
  document.title = 'Fleet Explorer';

  app.innerHTML = `
    <canvas id="sky" aria-hidden="true"></canvas>
    <div id="vignette"></div>
    <div id="top">
      <div class="shipname">FLEET</div>
      <div class="shipclass"><b>Explorer</b> · every ship at true scale <i>|</i> Ships <b>${ships.length}</b> <i>|</i> Rooms <b>${rooms}</b></div>
      <div id="stats">
        <a class="stat link" href="/compare">Compare ▸</a>
      </div>
    </div>
    <main class="fleet">
      <section class="intro">
        <div class="intro-copy">
          <p class="eyebrow">Fleet Explorer</p>
          <h1>Walk every ship.<br><span>Room by room, to scale.</span></h1>
          <p class="lede">Fly around each hull, cut it open, step inside the rooms and read what every system does. Then put two ships side by side and see the difference in metres.</p>
          <dl class="bignums">
            <div><dt>Ships</dt><dd>${ships.length}</dd></div>
            <div><dt>Rooms</dt><dd>${rooms}</dd></div>
            <div><dt>Hull</dt><dd>${metres.toLocaleString()}<small> m</small></dd></div>
            <div><dt>Crew</dt><dd>${crew.toLocaleString()}</dd></div>
          </dl>
        </div>
        <div class="lineup">
          <h3>Lineup <span class="val">True scale · side elevation</span></h3>
          <svg id="lineup" aria-label="Every ship's side elevation at the same scale"></svg>
        </div>
      </section>

      <section class="filters">
        <label class="search"><span>⌕</span><input id="q" type="search" placeholder="Search ships and rooms — try “hangar” or “reactor”" autocomplete="off" spellcheck="false"></label>
        <div class="filter"><span class="flab">Class</span><div class="seg" id="fClass"></div></div>
        <div class="filter"><span class="flab">Role</span><div class="seg" id="fRole"></div></div>
        <div class="filter"><span class="flab">Sort</span><div class="seg" id="fSort">
          <button data-v="long" class="on">Length ↓</button><button data-v="short">Length ↑</button><button data-v="crew">Crew</button><button data-v="name">Name</button>
        </div></div>
      </section>

      <section class="cards" id="cards"></section>
      <p class="empty" id="empty" hidden>No ship or room matches that.</p>
    </main>
    <div id="bottom"><div id="hint"><b>click</b> a ship to explore <i>·</i> <b>/</b> search <i>·</i> search matches room names across the fleet</div></div>`;

  startSky(document.getElementById('sky') as HTMLCanvasElement);
  drawLineup(ships);

  const state = { q: '', cls: 'All', role: 'All', sort: 'long' as Sort };
  const seg = (id: string, values: string[], key: 'cls' | 'role') => {
    const host = document.getElementById(id)!;
    host.innerHTML = ['All', ...values].map(v => `<button data-v="${esc(v)}" class="${v === 'All' ? 'on' : ''}">${esc(short(v))}</button>`).join('');
    host.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest('button'); if (!b) return;
      state[key] = b.dataset.v!; mark(host, b); render();
    });
  };
  const uniq = (f: (s: ShipSpec) => string) => [...new Set(ships.map(e => f(e.spec)))].sort();
  seg('fClass', uniq(s => s.class), 'cls');
  seg('fRole', uniq(s => s.role), 'role');
  const sortHost = document.getElementById('fSort')!;
  sortHost.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest('button'); if (!b) return;
    state.sort = b.dataset.v as Sort; mark(sortHost, b); render();
  });
  const q = document.getElementById('q') as HTMLInputElement;
  q.addEventListener('input', () => { state.q = q.value.trim().toLowerCase(); render(); });
  addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== q) { e.preventDefault(); q.focus(); }
    if (e.key === 'Escape' && document.activeElement === q) { q.value = ''; state.q = ''; render(); q.blur(); }
  });

  function render() {
    const host = document.getElementById('cards')!;
    const rows = ships
      .filter(e => state.cls === 'All' || e.spec.class === state.cls)
      .filter(e => state.role === 'All' || e.spec.role === state.role)
      .map(e => ({ e, hits: matches(e.spec, state.q) }))
      .filter(r => r.hits !== null)
      .sort((a, b) => order(a.e.spec, b.e.spec, state.sort));
    host.innerHTML = rows.map(({ e, hits }, i) => card(e, hits!, i)).join('');
    document.getElementById('empty')!.hidden = rows.length > 0;
    highlightLineup(new Set(rows.map(r => r.e.spec.id)));
  }
  render();
}

function mark(host: HTMLElement, on: HTMLElement) {
  host.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === on));
}

/** "deep-space exploration cruiser" → "Exploration cruiser" style labels for filter buttons. */
function short(v: string) {
  if (v === 'All') return v;
  const w = v.split(' ');
  const s = w.length > 2 ? w.slice(-2).join(' ') : v;
  return s[0].toUpperCase() + s.slice(1);
}

function order(a: ShipSpec, b: ShipSpec, sort: Sort) {
  if (sort === 'short') return a.length_m - b.length_m;
  if (sort === 'crew') return b.crew - a.crew;
  if (sort === 'name') return a.name.localeCompare(b.name);
  return b.length_m - a.length_m;
}

/** null: no match. []: ship matched on its own fields. Otherwise the rooms that matched. */
function matches(s: ShipSpec, q: string): ShipSpec['rooms'] | null {
  if (!q) return [];
  const rooms = s.rooms.filter(r => `${r.name} ${r.code}`.toLowerCase().includes(q));
  if (rooms.length) return rooms;
  return `${s.name} ${s.class} ${s.role} ${s.id} ${s.summary ?? ''}`.toLowerCase().includes(q) ? [] : null;
}

function card({ spec: s, hero }: FleetEntry, hits: ShipSpec['rooms'], i: number) {
  const other = listed().find(e => e.spec.id !== s.id);
  const decks = s.decks.map(d => esc(d.short ?? d.code)).join(' · ');
  const hitHtml = hits.length ? `<div class="hits"><span class="flab">Rooms</span>${hits.map(r =>
    `<a class="chip code" href="${shipUrl(s.id, r.code)}"><span class="d" style="background:${r.color}"></span>${esc(r.name)} <em>${r.code}</em></a>`).join('')}</div>` : '';
  return `
    <article class="card" style="--i:${i}">
      <a class="hero" href="${shipUrl(s.id)}" aria-label="Explore ${esc(s.name)}">
        ${hero ? `<img src="${hero}" alt="" loading="lazy" decoding="async">` : '<div class="nohero"></div>'}
        <span class="shipname">${esc(s.name)}</span>
        <span class="len">${s.length_m} m</span>
      </a>
      <div class="body">
        <h2>${esc(s.class)} <small>${esc(s.role)}</small></h2>
        ${s.summary ? `<p>${esc(s.summary)}</p>` : ''}
        <dl class="kv four">
          <div><dt>Length</dt><dd>${s.length_m} m</dd></div>
          <div><dt>Crew</dt><dd>${s.crew}</dd></div>
          <div><dt>Rooms</dt><dd>${s.rooms.length}</dd></div>
          <div><dt>Interiors</dt><dd>${interiors(s)}</dd></div>
        </dl>
        <div class="decks"><span class="flab">Decks</span>${decks}</div>
        ${hitHtml}
        <div class="btns">
          <a class="fly" href="${shipUrl(s.id)}">Explore</a>
          <a class="close" href="/compare?a=${s.id}${other ? '&b=' + other.spec.id : ''}">Compare</a>
        </div>
      </div>
    </article>`;
}

/* ---------- true-scale lineup ---------- */

const ROW_GAP = 14;

function drawLineup(ships: FleetEntry[]) {
  const host = document.getElementById('lineup') as unknown as SVGSVGElement;
  const bounds = ships.map(e => planBounds(e.spec));
  const maxLen = Math.max(...bounds.map(b => b.x1 - b.x0));
  const labelW = maxLen * 0.2;
  // Rows stack top to bottom; `top` is the screen y of each silhouette's highest point.
  let y = 0;
  const rows: { e: FleetEntry; top: number; h: number; b: ReturnType<typeof planBounds> }[] = [];
  ships.forEach((e, i) => {
    const b = bounds[i], h = b.y1 - b.y0;
    rows.push({ e, top: y, h, b });
    y += h + ROW_GAP;
  });
  const scaleY = y + 2;
  host.setAttribute('viewBox', `${-labelW} ${-4} ${maxLen + labelW * 1.25} ${scaleY + 16}`);

  for (const r of rows) {
    const a = svg('a', { href: shipUrl(r.e.spec.id), class: 'row', 'data-id': r.e.spec.id });
    // Align every ship at its stern so lengths compare left to right.
    const g = svg('g', { transform: `translate(${-r.b.x0},${r.top + r.b.y1}) scale(1,-1)` });
    g.appendChild(silhouette(r.e.spec));
    a.appendChild(g);
    const ty = r.top + r.h / 2 + 2.5;
    const name = svg('text', { x: -4, y: ty, 'text-anchor': 'end', class: 'nm' });
    name.textContent = r.e.spec.name;
    const len = svg('text', { x: r.b.x1 - r.b.x0 + 4, y: ty, class: 'ln' });
    len.textContent = `${r.e.spec.length_m} m`;
    a.append(name, len);
    const title = svg('title'); title.textContent = `${r.e.spec.name} · ${r.e.spec.class} · ${r.e.spec.length_m} m`;
    a.appendChild(title);
    host.appendChild(a);
  }

  // Scale bar in 50 m steps.
  const step = maxLen > 600 ? 100 : 50;
  const bar = svg('g', { class: 'scalebar', transform: `translate(0,${scaleY})` });
  bar.appendChild(svg('line', { x1: 0, y1: 0, x2: Math.floor(maxLen / step) * step, y2: 0 }));
  for (let m = 0; m <= maxLen; m += step) {
    bar.appendChild(svg('line', { x1: m, y1: -2, x2: m, y2: 2 }));
    const t = svg('text', { x: m, y: 10, 'text-anchor': 'middle' }); t.textContent = m ? `${m}` : '0 m';
    bar.appendChild(t);
  }
  host.appendChild(bar);
}

function highlightLineup(ids: Set<string>) {
  document.querySelectorAll<SVGAElement>('#lineup .row').forEach(r => r.classList.toggle('dimmed', !ids.has(r.dataset.id!)));
}
