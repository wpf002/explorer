/** Cheap 2D starfield for pages without a WebGL scene. Drifts slowly, follows the pointer a little. */
export function startSky(canvas: HTMLCanvasElement) {
  const g = canvas.getContext('2d')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w = 0, h = 0, dpr = 1;
  const stars = Array.from({ length: 520 }, () => ({
    x: Math.random(), y: Math.random(), z: .2 + Math.random() * .8, t: Math.random() * 6.28,
    c: Math.random() > .82 ? [200, 225, 255] : Math.random() > .9 ? [255, 214, 170] : [230, 236, 245],
  }));
  let px = 0, py = 0, tx = 0, ty = 0;
  addEventListener('pointermove', e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; });
  const resize = () => {
    dpr = Math.min(devicePixelRatio, 2); w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  addEventListener('resize', resize); resize();
  const draw = (now: number) => {
    g.clearRect(0, 0, w, h);
    px += (tx - px) * .03; py += (ty - py) * .03;
    const drift = reduce ? 0 : now * .000004;
    for (const s of stars) {
      const x = (((s.x + drift * s.z) % 1) * w - px * 30 * s.z + w) % w;
      const y = s.y * h - py * 20 * s.z;
      const a = (.25 + .55 * s.z) * (reduce ? 1 : .8 + .2 * Math.sin(now * .001 * s.z + s.t));
      g.fillStyle = `rgba(${s.c[0]},${s.c[1]},${s.c[2]},${a.toFixed(3)})`;
      const r = s.z * 1.15;
      g.fillRect(x, y, r, r);
    }
    if (!reduce) requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}
