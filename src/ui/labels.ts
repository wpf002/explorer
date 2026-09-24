import { Object3D, PerspectiveCamera, Raycaster, Vector3 } from 'three';
import type { ShipSpec } from '../schema';
import type { TaggedMesh } from '../ship/model';
import { $ } from '../util';

/** Screen-space room labels with distance fade and hull occlusion. */
export class Labels {
  readonly els: HTMLButtonElement[] = [];
  private ray = new Raycaster();
  private occluders: TaggedMesh[] = [];
  private tmp = new Vector3();
  private frame = 0;
  /** Screen boxes for this frame's declutter pass, plus cached label sizes. */
  private size: { w: number; h: number }[] = [];
  private slot: { x: number; y: number; d: number; i: number }[] = [];

  /** Distances that fade labels, scaled with the ship. */
  private far: number;
  private skin: number;

  constructor(private spec: ShipSpec, onPick: (i: number) => void) {
    // Proxies sit on their own layer, so the occlusion ray has to see every layer.
    this.ray.layers.enableAll();
    this.far = 420 * spec.length_m / 300;
    this.skin = 2.5 * Math.min(1, spec.length_m / 300 * 4);
    const host = $('#labels');
    host.textContent = '';
    spec.rooms.forEach((r, i) => {
      const el = document.createElement('button');
      el.className = 'label';
      el.type = 'button';
      el.innerHTML = `<span class="d" style="background:${r.color};color:${r.color}"></span>${r.name}<span class="c">${r.code}</span>`;
      el.style.setProperty('--lc', r.color);
      el.addEventListener('click', e => { e.stopPropagation(); onPick(i); });
      host.appendChild(el);
      this.els.push(el);
    });
  }

  setVisible(v: boolean) { $('#labels').style.display = v ? '' : 'none'; }

  /** Label boxes only change with the font, so measure them once. */
  private measure() {
    if (this.size.length === this.els.length && this.size[0].w) return;
    this.size = this.els.map(el => ({ w: el.offsetWidth, h: el.offsetHeight }));
  }

  select(i: number) { this.els.forEach((el, k) => el.classList.toggle('on', k === i)); }

  dim(deck: string) {
    this.els.forEach((el, i) => el.classList.toggle('dimmed', deck !== 'All' && this.spec.rooms[i].deck !== deck));
  }

  /**
   * Opaque, low-poly hull parts only, so the ray cost stays flat. After batching these are
   * the pre-batch proxies, judged by the state of the batch they were merged into.
   */
  refreshOccluders(meshes: TaggedMesh[], proxies: TaggedMesh[] = []) {
    const live = (m: TaggedMesh) => m.userData.batch ?? m;
    this.occluders = [...meshes.filter(m => !m.userData.merged), ...proxies].filter(m => {
      const b = live(m);
      return b.userData.kind === 'hull' && b.material.opacity > .5 && !b.material.wireframe
        && m.geometry.attributes.position.count < 6000;
    });
  }

  update(markers: Object3D[], camera: PerspectiveCamera, camPos: Vector3, selected = -1) {
    const w = innerWidth, h = innerHeight;
    this.measure();
    this.slot.length = 0;
    for (let i = 0; i < markers.length; i++) {
      const p = markers[i].getWorldPosition(this.tmp);
      const d = p.distanceTo(camPos);
      p.project(camera);
      const el = this.els[i];
      if (p.z > 1 || p.x < -1.1 || p.x > 1.1 || p.y < -1.1 || p.y > 1.1) {
        el.style.transform = 'translate(-9999px,-9999px)';
        el.classList.remove('crowded');
        continue;
      }
      const x = (p.x * .5 + .5) * w, y = (-p.y * .5 + .5) * h;
      el.style.transform = `translate(${x.toFixed(1)}px, ${(y - 26).toFixed(1)}px) translate(-50%,-50%)`;
      el.classList.toggle('far', d > this.far);
      // Past a few ship lengths a label is noise, not wayfinding.
      el.classList.toggle('distant', d > this.far * 1.8);
      el.style.zIndex = String(Math.round(1000 - d));
      this.slot.push({ x, y: y - 26, d, i });
    }

    // Declutter: nearest label wins its box, anything overlapping it drops out. The
    // selected room always keeps its label.
    this.slot.sort((a, b) => (a.i === selected ? -1 : b.i === selected ? 1 : a.d - b.d));
    const taken: [number, number, number, number][] = [];
    for (const s of this.slot) {
      const { w: bw, h: bh } = this.size[s.i] ?? { w: 120, h: 22 };
      const box: [number, number, number, number] = [s.x - bw / 2 - 3, s.y - bh / 2 - 2, bw + 6, bh + 4];
      const hidden = s.i !== selected && taken.some(t =>
        box[0] < t[0] + t[2] && box[0] + box[2] > t[0] && box[1] < t[1] + t[3] && box[1] + box[3] > t[1]);
      this.els[s.i].classList.toggle('crowded', hidden);
      if (!hidden) taken.push(box);
    }
    // A third of the rooms per frame keeps the occlusion rays cheap.
    const wp = new Vector3();
    for (let i = this.frame % 3; i < markers.length; i += 3) {
      markers[i].getWorldPosition(wp);
      const d = wp.distanceTo(camPos);
      this.ray.set(camPos, wp.sub(camPos).normalize());
      this.ray.far = d - this.skin;
      this.els[i].classList.toggle('occ', !!this.ray.intersectObjects(this.occluders, false)[0]);
    }
    this.frame++;
  }
}
