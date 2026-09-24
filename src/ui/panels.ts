import { spinners, type ShipSpec } from '../schema';
import type { Cut, Mode, ViewerState } from '../state';
import { $ } from '../util';

export interface PanelHandlers {
  mode(m: Mode): void;
  cut(c: Cut): void;
  cutPos(v: number): void;
  flip(v: boolean): void;
  opacity(v: number): void;
  preset(p: string): void;
  deck(code: string): void;
  system(id: string | null): void;
  explode(v: number): void;
  option(key: 'labels' | 'bloom' | 'stars' | 'spinNode' | 'wire' | 'lamp' | 'spin', v: boolean): void;
}

export const MODE_HINT: Record<Mode, string> = {
  orbit: 'Drag to rotate · scroll to zoom · click a room label to fly there',
  roam: 'WASD to move · right-click or hold-drag to look · Shift to boost · Space/C for up and down · keys 1–9 jump to rooms · H hides the UI',
  tour: 'An automated cruise around the ship · switch modes at any time to take over',
};

const BOTTOM_HINT: Record<Mode, string> = {
  orbit: '<b>Drag</b> rotate <i>·</i> <b>Right-drag</b> pan <i>·</i> <b>Scroll</b> zoom <i>·</i> <b>1–9</b> jump to rooms <i>·</i> <b>H</b> hides UI',
  roam: '<b>WASD</b> move <i>·</i> <b>Right-click / hold-drag</b> to look <i>·</i> <b>Shift</b> boost <i>·</i> <b>Space/C</b> up &amp; down <i>·</i> <b>1–9</b> jump to rooms <i>·</i> <b>H</b> hides UI',
  tour: 'Tour <i>·</i> <span id="tourShip"></span> <i>·</i> <b id="tourSeg"></b>',
};

const segMark = (host: HTMLElement, attr: string, val: string) =>
  host.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.classList.toggle('on', b.dataset[attr] === val));

/** Builds the ship-dependent controls and wires every input to a handler. */
export class Panels {
  constructor(private spec: ShipSpec, private S: ViewerState, private h: PanelHandlers) {
    this.buildHeader();
    this.buildDeckButtons();
    this.buildSystemButtons();
    this.wire();
  }

  private buildHeader() {
    $('#shipName').textContent = this.spec.name;
    $('#shipClass').innerHTML =
      `<b>${this.spec.class}</b> · ${this.spec.role} <i>|</i> Length <b>${this.spec.length_m} m</b> <i>|</i> Crew <b>${this.spec.crew}</b>`;
    $('#loadingText').textContent = `Loading ${this.spec.name}`;
    document.title = `${this.spec.name} ${this.spec.class}`;

    const spin = spinners(this.spec);
    if (spin.length) $('#optSpinNodeLabel').textContent = spin[0].label ?? 'Spin';
    else $('#optSpinNodeWrap').style.display = 'none';

    if (!this.spec.modules.length) $('#explodeSection').style.display = 'none';
  }

  /** Deck isolation: All plus one button per deck, three to a row. */
  private buildDeckButtons() {
    const host = $('#deckSegs');
    host.textContent = '';
    const entries = [{ code: 'All', label: 'All' }, ...this.spec.decks.map(d => ({ code: d.code, label: d.short ?? d.code }))];
    for (let i = 0; i < entries.length; i += 3) {
      const row = document.createElement('div');
      row.className = 'seg c3';
      for (const e of entries.slice(i, i + 3)) {
        const b = document.createElement('button');
        b.dataset.deck = e.code;
        b.textContent = e.label;
        b.classList.toggle('on', e.code === this.S.deck);
        row.appendChild(b);
      }
      host.appendChild(row);
    }
    host.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-deck]');
      if (!b) return;
      host.querySelectorAll<HTMLButtonElement>('button[data-deck]').forEach(x => x.classList.toggle('on', x === b));
      this.h.deck(b.dataset.deck!);
    });
  }

  /** Systems overlay: Off plus one button per ship.json system, three to a row. */
  private buildSystemButtons() {
    const systems = this.spec.systems ?? [];
    const section = $('#systemsSection');
    if (!systems.length) { section.style.display = 'none'; return; }
    const host = $('#sysSegs');
    host.textContent = '';
    const entries = [{ id: '', name: 'Off', color: '' }, ...systems];
    for (let i = 0; i < entries.length; i += 3) {
      const row = document.createElement('div');
      row.className = 'seg c3';
      for (const e of entries.slice(i, i + 3)) {
        const b = document.createElement('button');
        b.dataset.sys = e.id;
        b.className = e.id ? 'sysbtn' : 'on';
        if (e.color) b.style.setProperty('--c', e.color);
        b.innerHTML = e.id ? `<span class="d"></span>${e.name}` : e.name;
        row.appendChild(b);
      }
      host.appendChild(row);
    }
    host.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-sys]');
      if (b) this.h.system(b.dataset.sys || null);
    });
  }

  syncSystem(id: string | null) {
    const sys = this.spec.systems?.find(s => s.id === id);
    $('#sysSegs').querySelectorAll<HTMLButtonElement>('button[data-sys]').forEach(b => b.classList.toggle('on', (b.dataset.sys || null) === id));
    $('#sysVal').textContent = sys ? sys.name : 'OFF';
    $('#sysVal').style.color = sys ? sys.color : '';
    $('#sysHint').textContent = sys?.description ?? 'Routes are drawn through the hull; the hull drops to X-Ray while one is shown.';
  }

  private seg(id: string, attr: string, cb: (v: string) => void) {
    $(id).addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (b) cb(b.dataset[attr]!);
    });
  }

  private wire() {
    this.seg('#modeSeg', 'mode', v => this.h.mode(v as Mode));
    this.seg('#cutSeg', 'cut', v => this.h.cut(v as Cut));
    this.seg('#presetSeg', 'preset', v => this.h.preset(v));
    $<HTMLInputElement>('#cutPos').addEventListener('input', e => this.h.cutPos(+(e.target as HTMLInputElement).value));
    $<HTMLInputElement>('#cutFlip').addEventListener('change', e => this.h.flip((e.target as HTMLInputElement).checked));
    $<HTMLInputElement>('#opacity').addEventListener('input', e => this.h.opacity(+(e.target as HTMLInputElement).value));
    $<HTMLInputElement>('#explode').addEventListener('input', e => this.h.explode(+(e.target as HTMLInputElement).value));

    const opts = {
      optLabels: 'labels', optBloom: 'bloom', optStars: 'stars', optSpinNode: 'spinNode',
      optWire: 'wire', optLamp: 'lamp', optSpin: 'spin',
    } as const;
    for (const [id, key] of Object.entries(opts)) {
      $<HTMLInputElement>('#' + id).addEventListener('change', e =>
        this.h.option(key as keyof typeof this.S & Parameters<PanelHandlers['option']>[0], (e.target as HTMLInputElement).checked));
    }

    $('#tl').addEventListener('click', () => {
      const c = $('#left').classList.toggle('collapsed');
      $('#tl').textContent = c ? '▶' : '◀';
    });
    $('#tr').addEventListener('click', () => {
      const c = $('#right').classList.toggle('collapsed');
      $('#tr').textContent = c ? '◀' : '▶';
    });
  }

  /* ---------- readback: keep the DOM in step with state changed elsewhere ---------- */

  syncMode(m: Mode) {
    segMark($('#modeSeg'), 'mode', m);
    $('#modeHint').textContent = MODE_HINT[m];
    $('#hint').innerHTML = BOTTOM_HINT[m];
    const shipEl = document.getElementById('tourShip');
    if (shipEl) shipEl.textContent = this.spec.name;
    $('#viewname').textContent = m[0].toUpperCase() + m.slice(1);
  }

  syncCut(S: ViewerState, metres: number) {
    $('#cutPosOut').textContent = (metres >= 0 ? '+' : '−') + Math.abs(metres).toFixed(1) + ' m';
    $('#cutVal').textContent = ({ off: 'OFF', cross: 'Cross', hlay: 'Horiz', long: 'Long' })[S.cut];
    $<HTMLInputElement>('#cutPos').disabled = $<HTMLInputElement>('#cutFlip').disabled = S.cut === 'off';
    segMark($('#cutSeg'), 'cut', S.cut);
    $<HTMLInputElement>('#cutPos').value = String(S.cutPos);
    $<HTMLInputElement>('#cutFlip').checked = S.flip;
  }

  syncOpacity(v: number) {
    $<HTMLInputElement>('#opacity').value = String(v);
    $('#opOut').textContent = Math.round(v * 100) + '%';
  }

  syncExplode(v: number) {
    $<HTMLInputElement>('#explode').value = String(v);
    $('#expOut').textContent = Math.round(v * 100) + '%';
  }

  syncWire(v: boolean) { $<HTMLInputElement>('#optWire').checked = v; }
  markPreset(v: string) { segMark($('#presetSeg'), 'preset', v); }
}
