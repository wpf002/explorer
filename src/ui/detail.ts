import type { ShipSpec } from '../schema';
import { $ } from '../util';

/** Room index rows plus the detail drawer under them. */
export class RoomIndex {
  readonly rows: HTMLButtonElement[] = [];
  private deckName: Map<string, string>;

  constructor(private spec: ShipSpec, onPick: (i: number) => void) {
    this.deckName = new Map(spec.decks.map(d => [d.code, d.name]));
    const host = $('#rooms');
    host.textContent = '';
    spec.rooms.forEach((r, i) => {
      const row = document.createElement('button');
      row.className = 'row';
      row.type = 'button';
      row.innerHTML = `<span class="n">${i < 9 ? i + 1 : '–'}</span>`
        + `<span class="d" style="background:${r.color};color:${r.color}"></span>`
        + `<span>${r.name}</span><span class="dk">${this.deckTag(r.deck)}</span>`;
      row.addEventListener('click', () => onPick(i));
      host.appendChild(row);
      this.rows.push(row);
    });
    $('#dClose').addEventListener('click', () => onPick(-1));
  }

  /** Ring-style deck codes get a one-letter tag so the column stays narrow. */
  private deckTag(code: string) { return code.length > 1 ? code[0].toUpperCase() : code; }

  select(i: number) {
    this.rows.forEach((el, k) => el.classList.toggle('on', k === i));
    const detail = $('#detail');
    if (i < 0) { detail.classList.remove('open'); return; }
    const r = this.spec.rooms[i];
    const deck = this.deckName.get(r.deck) ?? r.deck;
    $('#dName').innerHTML = `${r.name}<small>${deck}</small>`;
    $('#dChips').innerHTML = `<span class="chip">Deck ${this.deckTag(r.deck)} · ${deck}</span>`
      + `<span class="chip code">${r.code}</span>`;
    $('#dDesc').textContent = r.description;
    $('#dStats').innerHTML = r.stats.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
    detail.classList.add('open');
  }

  dim(deck: string) {
    this.rows.forEach((el, i) => el.classList.toggle('dimmed', deck !== 'All' && this.spec.rooms[i].deck !== deck));
  }
}
