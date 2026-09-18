import { Object3D, PerspectiveCamera, Vector3 } from 'three';
import type { ShipSpec } from '../schema';
import { $ } from '../util';

/** Diamond markers inside an interior; shown only once the camera is inside the selected room. */
export class Hotspots {
  private els: { room: number; el: HTMLButtonElement; local: Vector3 }[] = [];
  private tmp = new Vector3();
  private open: HTMLButtonElement | null = null;

  constructor(spec: ShipSpec) {
    const host = $('#hotspots');
    host.textContent = '';
    const pop = $('#hotpop');
    spec.rooms.forEach((r, i) => (r.hotspots ?? []).forEach((h, k) => {
      const el = document.createElement('button');
      el.className = 'hotspot';
      el.type = 'button';
      el.setAttribute('aria-label', h.title);
      el.innerHTML = `<i></i><span>${k + 1}</span>`;
      el.addEventListener('click', e => {
        e.stopPropagation();
        if (this.open === el) return this.close();
        this.open?.classList.remove('on');
        this.open = el;
        el.classList.add('on');
        pop.querySelector('h4')!.textContent = h.title;
        pop.querySelector('p')!.textContent = h.text;
        pop.classList.add('show');
      });
      host.appendChild(el);
      this.els.push({ room: i, el, local: new Vector3(...h.pos) });
    }));
    pop.querySelector('.x')!.addEventListener('click', () => this.close());
    addEventListener('pointerdown', e => { if (!(e.target as HTMLElement).closest('#hotpop,.hotspot')) this.close(); });
  }

  close() {
    this.open?.classList.remove('on');
    this.open = null;
    $('#hotpop').classList.remove('show');
  }

  /** `inside` is true when the camera sits within the selected room's close range. */
  update(markers: Object3D[], selected: number, inside: boolean, camera: PerspectiveCamera) {
    const w = innerWidth, h = innerHeight;
    let anyShown = false;
    for (const s of this.els) {
      const show = inside && s.room === selected;
      if (!show) { s.el.style.transform = 'translate(-9999px,-9999px)'; continue; }
      const parent = markers[s.room].parent ?? markers[s.room];
      const p = parent.localToWorld(this.tmp.copy(s.local)).project(camera);
      if (p.z > 1 || Math.abs(p.x) > 1.05 || Math.abs(p.y) > 1.05) { s.el.style.transform = 'translate(-9999px,-9999px)'; continue; }
      const x = (p.x * .5 + .5) * w, y = (-p.y * .5 + .5) * h;
      s.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`;
      if (s.el === this.open) {
        const pop = $('#hotpop');
        const left = Math.min(w - pop.offsetWidth - 16, x + 18), top = Math.max(56, Math.min(h - pop.offsetHeight - 60, y - 20));
        pop.style.transform = `translate(${left.toFixed(0)}px,${top.toFixed(0)}px)`;
      }
      anyShown = true;
    }
    if (!anyShown && this.open) this.close();
  }

  count(room: number) { return this.els.filter(s => s.room === room).length; }
}
