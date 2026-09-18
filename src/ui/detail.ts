import type { LinkSpec, ShipSpec, SystemSpec } from '../schema';
import { fleet } from '../fleet';
import { $ } from '../util';

/** Room index rows plus the detail drawer under them. */
export class RoomIndex {
  readonly rows: HTMLButtonElement[] = [];
  private deckName: Map<string, string>;

  constructor(
    private spec: ShipSpec,
    onPick: (i: number) => void,
    private extras: {
      systemsAt: (code: string) => SystemSpec[];
      onSystem: (id: string) => void;
      onLink: (l: LinkSpec) => void;
      hotspots: (i: number) => number;
    },
  ) {
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
    this.renderLinks(r.code, r.links ?? [], this.extras.hotspots(i));
    $('#dFly').textContent = r.close ? 'Step inside' : 'Fly closer';
    detail.classList.add('open');
  }

  private renderLinks(code: string, links: LinkSpec[], hotspots: number) {
    const host = $('#dLinks');
    host.textContent = '';
    const systems = this.extras.systemsAt(code);
    if (systems.length) {
      const row = document.createElement('div');
      row.className = 'lrow';
      row.innerHTML = '<span class="flab">Systems</span>';
      for (const sy of systems) {
        const b = document.createElement('button');
        b.className = 'chip sys';
        b.style.setProperty('--c', sy.color);
        b.innerHTML = `<span class="d"></span>${sy.name}`;
        b.addEventListener('click', () => this.extras.onSystem(sy.id));
        row.appendChild(b);
      }
      host.appendChild(row);
    }
    if (links.length) {
      const row = document.createElement('div');
      row.className = 'lrow';
      row.innerHTML = '<span class="flab">Links</span>';
      for (const l of links) {
        const other = l.ship ? fleet().get(l.ship)?.spec : undefined;
        const target = l.room ? (other ?? this.spec).rooms.find(r => r.code === l.room) : undefined;
        const b = document.createElement(l.ship ? 'a' : 'button') as HTMLAnchorElement;
        b.className = 'chip link' + (l.ship ? ' out' : '');
        if (l.ship) b.href = `/ship/${l.ship}${l.room ? '#room=' + l.room : ''}`;
        else b.addEventListener('click', () => this.extras.onLink(l));
        b.innerHTML = `${l.label}<em>${l.ship ? (other?.name ?? l.ship) + (target ? ' · ' + target.code : '') : target?.code ?? ''}</em>${l.ship ? ' ↗' : ' →'}`;
        row.appendChild(b);
      }
      host.appendChild(row);
    }
    if (hotspots) {
      const row = document.createElement('div');
      row.className = 'lrow note';
      row.innerHTML = `<span class="flab">Inside</span>${hotspots} point${hotspots > 1 ? 's' : ''} of interest · step inside to see them`;
      host.appendChild(row);
    }
    host.style.display = host.childElementCount ? '' : 'none';
  }

  dim(deck: string) {
    this.rows.forEach((el, i) => el.classList.toggle('dimmed', deck !== 'All' && this.spec.rooms[i].deck !== deck));
  }
}
