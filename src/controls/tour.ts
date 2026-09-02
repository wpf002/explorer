import { CatmullRomCurve3, Vector3 } from 'three';
import type { TourSpec } from '../schema';

export class Tour {
  t = 0;
  seg = -1;
  readonly duration: number;
  private path: CatmullRomCurve3;
  private look: CatmullRomCurve3;
  readonly segments: TourSpec['segments'];

  constructor(spec: TourSpec) {
    this.duration = spec.duration;
    this.segments = spec.segments;
    this.path = new CatmullRomCurve3(spec.path.map(p => new Vector3(...p)), true, 'centripetal');
    this.look = new CatmullRomCurve3(spec.look.map(p => new Vector3(...p)), true, 'centripetal');
  }

  reset() { this.t = 0; this.seg = -1; }

  /** Advance and write the pose. Returns the segment name when it changes. */
  step(dt: number, pos: Vector3, target: Vector3): TourSpec['segments'][number] | null {
    this.t = (this.t + dt / this.duration) % 1;
    this.path.getPointAt(this.t, pos);
    this.look.getPointAt((this.t + .02) % 1, target);
    const seg = Math.min(this.segments.length - 1, Math.floor(this.t * this.segments.length));
    if (seg === this.seg) return null;
    this.seg = seg;
    return this.segments[seg];
  }
}
