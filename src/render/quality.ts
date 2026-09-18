import type { Stage } from './renderer';

export type QualityMode = 'auto' | 'high' | 'low';

const KEY = 'fleet.quality';
const read = (): QualityMode => {
  // ?quality=high|low|auto pins the mode for one visit; screenshot scripts use it.
  const q = new URLSearchParams(location.search).get('quality');
  if (q === 'high' || q === 'low' || q === 'auto') return q;
  try { const v = localStorage.getItem(KEY); return v === 'high' || v === 'low' ? v : 'auto'; } catch { return 'auto'; }
};
const write = (v: QualityMode) => { try { localStorage.setItem(KEY, v); } catch { /* private mode */ } };

/**
 * Auto quality: after a short warm-up, average the frame rate for two seconds. Under 40 fps
 * the pixel ratio drops to 1 and bloom goes off. High and Low are manual overrides and are
 * remembered per browser.
 */
export class Quality {
  mode: QualityMode = read();
  low = false;
  private t = 0;
  private frames = 0;
  private decided = false;

  constructor(private stage: Stage, private apply: (low: boolean, reason: 'auto' | 'manual') => void) {}

  /** Call once the scene is up. */
  start() {
    this.decided = this.mode !== 'auto';
    if (this.mode !== 'auto') this.set(this.mode === 'low', 'manual');
  }

  set(low: boolean, reason: 'auto' | 'manual') {
    this.low = low;
    const pr = low ? 1 : Math.min(devicePixelRatio, 1.5);
    this.stage.renderer.setPixelRatio(pr);
    this.stage.resize();
    this.apply(low, reason);
  }

  choose(mode: QualityMode) {
    this.mode = mode;
    write(mode);
    if (mode === 'auto') { this.decided = false; this.t = 0; this.frames = 0; this.set(false, 'manual'); return; }
    this.decided = true;
    this.set(mode === 'low', 'manual');
  }

  /** Feed every frame's dt. */
  tick(dt: number) {
    if (this.decided) return;
    this.t += dt;
    if (this.t < .6) return;                 // skip shader compiles and the first layout
    this.frames++;
    if (this.t < 2.6) return;
    this.decided = true;
    const fps = this.frames / (this.t - .6);
    if (fps < 40) this.set(true, 'auto');
  }
}
