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

  constructor(private spec: ShipSpec, onPick: (i: number) => void) {
    const host = $('#labels');
    host.textContent = '';
    spec.rooms.forEach((r, i) => {
      const el = document.createElement('button');
      el.className = 'label';
      el.type = 'button';
      el.innerHTML = `<span class="d" style="background:${r.color};color:${r.color}"></span>${r.name}<span class="c">${r.code}</span>`;
      el.addEventListener('click', e => { e.stopPropagation(); onPick(i); });
      host.appendChild(el);
      this.els.push(el);
    });
  }

  setVisible(v: boolean) { $('#labels').style.display = v ? '' : 'none'; }

  select(i: number) { this.els.forEach((el, k) => el.classList.toggle('on', k === i)); }

  dim(deck: string) {
    this.els.forEach((el, i) => el.classList.toggle('dimmed', deck !== 'All' && this.spec.rooms[i].deck !== deck));
  }

  /** Opaque, low-poly hull meshes only — the ray cost has to stay flat. */
  refreshOccluders(meshes: TaggedMesh[]) {
    this.occluders = meshes.filter(m =>
      m.userData.kind === 'hull' && m.material.opacity > .5 && !m.material.wireframe
      && m.geometry.attributes.position.count < 6000);
  }

  update(markers: Object3D[], camera: PerspectiveCamera, camPos: Vector3) {
    const w = innerWidth, h = innerHeight;
    for (let i = 0; i < markers.length; i++) {
      const p = markers[i].getWorldPosition(this.tmp);
      const d = p.distanceTo(camPos);
      p.project(camera);
      const el = this.els[i];
      if (p.z > 1 || p.x < -1.1 || p.x > 1.1 || p.y < -1.1 || p.y > 1.1) {
        el.style.transform = 'translate(-9999px,-9999px)';
        continue;
      }
      const x = (p.x * .5 + .5) * w, y = (-p.y * .5 + .5) * h;
      el.style.transform = `translate(${x.toFixed(1)}px, ${(y - 26).toFixed(1)}px) translate(-50%,-50%)`;
      el.classList.toggle('far', d > 420);
      el.style.zIndex = String(Math.round(1000 - d));
    }
    // A third of the rooms per frame keeps the occlusion rays cheap.
    const wp = new Vector3();
    for (let i = this.frame % 3; i < markers.length; i += 3) {
      markers[i].getWorldPosition(wp);
      const d = wp.distanceTo(camPos);
      this.ray.set(camPos, wp.sub(camPos).normalize());
      this.ray.far = d - 2.5;
      this.els[i].classList.toggle('occ', !!this.ray.intersectObjects(this.occluders, false)[0]);
    }
    this.frame++;
  }
}
