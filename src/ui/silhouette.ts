import type { PlanShape, ShipSpec } from '../schema';

const NS = 'http://www.w3.org/2000/svg';

/** One plan shape as an SVG element in ship metres (Y up; the caller flips). */
export function shapeEl(s: PlanShape): SVGElement {
  if (s.kind === 'axis') {
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('class', 'axis');
    l.setAttribute('x1', String(s.x1)); l.setAttribute('y1', String(s.y1));
    l.setAttribute('x2', String(s.x2)); l.setAttribute('y2', String(s.y2));
    return l;
  }
  const cls = 'hull' + (s.ghost ? ' tr' : '');
  if (s.kind === 'rect') {
    const r = document.createElementNS(NS, 'rect');
    r.setAttribute('class', cls);
    r.setAttribute('x', String(s.x)); r.setAttribute('y', String(s.y));
    r.setAttribute('width', String(s.w)); r.setAttribute('height', String(s.h));
    if (s.rx !== undefined) r.setAttribute('rx', String(s.rx));
    return r;
  }
  if (s.kind === 'polygon') {
    const p = document.createElementNS(NS, 'polygon');
    p.setAttribute('class', cls);
    p.setAttribute('points', s.points);
    return p;
  }
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('class', cls);
  p.setAttribute('d', s.d);
  return p;
}

/** Silhouette group for a ship: every plan shape except the axis line. */
export function silhouette(spec: ShipSpec): SVGGElement {
  const g = document.createElementNS(NS, 'g');
  for (const s of spec.plan.shapes) if (s.kind !== 'axis') g.appendChild(shapeEl(s));
  return g;
}

/** Bounds of the solid plan shapes in ship metres. Arcs in paths are ignored. */
export function planBounds(spec: ShipSpec) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const add = (x: number, y: number) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
  for (const s of spec.plan.shapes) {
    if (s.kind === 'rect') { add(s.x, s.y); add(s.x + s.w, s.y + s.h); }
    else if (s.kind === 'polygon') {
      const n = s.points.trim().split(/[\s,]+/).map(Number);
      for (let i = 0; i + 1 < n.length; i += 2) add(n[i], n[i + 1]);
    }
  }
  if (!Number.isFinite(x0)) { const h = spec.length_m / 2; return { x0: -h, x1: h, y0: -h / 10, y1: h / 10 }; }
  return { x0, x1, y0, y1 };
}

export const svg = (tag: string, attrs: Record<string, string | number> = {}) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
};
