import { Object3D, PerspectiveCamera, Vector3 } from 'three';
import type { ShipSpec } from '../schema';
import { shapeEl } from './silhouette';
import type { Cut } from '../state';
import { clamp } from '../util';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = <T extends SVGElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing element #${id}`);
  return el as unknown as T;
};

/** Side-elevation silhouette with live room dots, a camera chevron and the cut line. */
export class DeckPlan {
  private dots: SVGCircleElement[] = [];
  private sel = svgEl<SVGCircleElement>('planSel');
  private cam = svgEl<SVGPolygonElement>('planCam');
  private cut = svgEl<SVGLineElement>('planCut');
  private tmp = new Vector3();

  constructor(private spec: ShipSpec, onPick: (i: number) => void) {
    const svg = svgEl<SVGSVGElement>('plan');
    svg.setAttribute('viewBox', spec.plan.viewBox.join(' '));

    // Markers, the chevron and the labels are authored in ship metres, so they have to
    // follow the viewBox or a 30 m ship gets 300 m dots.
    const k = spec.plan.viewBox[2] / 344;
    this.sel.setAttribute('r', (5 * k).toFixed(2));
    this.cam.setAttribute('points', `0,0 ${(-6 * k).toFixed(2)},${(-3 * k).toFixed(2)} ${(-6 * k).toFixed(2)},${(3 * k).toFixed(2)}`);
    for (const id of ['planFwd', 'planAft']) svgEl(id).style.fontSize = `${(7.5 * k).toFixed(2)}px`;

    const hull = svgEl<SVGGElement>('planHull');
    hull.textContent = '';
    for (const s of spec.plan.shapes) hull.appendChild(shapeEl(s));

    const labels = spec.plan.labels;
    if (labels) {
      const fwd = svgEl<SVGTextElement>('planFwd');
      const aft = svgEl<SVGTextElement>('planAft');
      fwd.setAttribute('x', String(labels.fwd[0])); fwd.setAttribute('y', String(labels.fwd[1]));
      aft.setAttribute('x', String(labels.aft[0])); aft.setAttribute('y', String(labels.aft[1]));
    }

    const host = svgEl<SVGGElement>('planDots');
    host.textContent = '';
    this.dots = spec.rooms.map((r, i) => {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('class', 'dot');
      c.setAttribute('r', (2.6 * k).toFixed(2));
      c.setAttribute('fill', r.color);
      const t = document.createElementNS(NS, 'title');
      t.textContent = `${r.name} · ${r.code}`;
      c.appendChild(t);
      c.addEventListener('click', () => onPick(i));
      host.appendChild(c);
      return c;
    });
  }

  update(markers: Object3D[], camera: PerspectiveCamera, camPos: Vector3, selected: number, cut: Cut, cutPos: number) {
    for (let i = 0; i < markers.length; i++) {
      markers[i].getWorldPosition(this.tmp);
      this.dots[i].setAttribute('cx', this.tmp.x.toFixed(1));
      this.dots[i].setAttribute('cy', this.tmp.y.toFixed(1));
    }
    if (selected >= 0) {
      this.sel.setAttribute('visibility', 'visible');
      this.sel.setAttribute('cx', this.dots[selected].getAttribute('cx')!);
      this.sel.setAttribute('cy', this.dots[selected].getAttribute('cy')!);
    } else this.sel.setAttribute('visibility', 'hidden');

    const b = this.spec.plan.bounds;
    const cx = clamp(camPos.x, b.x[0], b.x[1]), cy = clamp(camPos.y, b.y[0], b.y[1]);
    camera.getWorldDirection(this.tmp);
    const ang = Math.atan2(this.tmp.y, this.tmp.x) * 180 / Math.PI;
    this.cam.setAttribute('transform', `translate(${cx.toFixed(1)},${cy.toFixed(1)}) rotate(${ang.toFixed(1)})`);

    // A long (Z) cut is edge-on in side elevation, so it has nothing to draw.
    if (cut === 'off' || cut === 'long') { this.cut.setAttribute('visibility', 'hidden'); return; }
    this.cut.setAttribute('visibility', 'visible');
    const d = cutPos * (cut === 'cross' ? this.spec.cut.cross : this.spec.cut.hlay);
    if (cut === 'cross') {
      this.cut.setAttribute('x1', String(d)); this.cut.setAttribute('x2', String(d));
      this.cut.setAttribute('y1', String(b.y[0])); this.cut.setAttribute('y2', String(b.y[1]));
    } else {
      this.cut.setAttribute('x1', String(b.x[0])); this.cut.setAttribute('x2', String(b.x[1]));
      this.cut.setAttribute('y1', String(d)); this.cut.setAttribute('y2', String(d));
    }
  }
}
