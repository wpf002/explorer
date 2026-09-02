import { BufferAttribute, BufferGeometry, Points, PointsMaterial, Scene } from 'three';

/** `scale` keeps the sky proportional to the ship: 1 is the 300 m reference. */
export function createStars(scene: Scene, scale = 1, n = 4000): Points {
  const p = new Float32Array(n * 3), cc = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = (3500 + Math.random() * 1500) * scale, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    p[i * 3] = r * Math.sin(ph) * Math.cos(th);
    p[i * 3 + 1] = r * Math.cos(ph);
    p[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    const w = .5 + Math.random() * .5, b = Math.random();
    cc[i * 3] = w * (b > .8 ? .8 : 1);
    cc[i * 3 + 1] = w * (b > .8 ? .9 : 1);
    cc[i * 3 + 2] = w;
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(p, 3));
  g.setAttribute('color', new BufferAttribute(cc, 3));
  const m = new PointsMaterial({ size: 12 * scale, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: .75, depthWrite: false });
  const pts = new Points(g, m);
  scene.add(pts);
  return pts;
}
