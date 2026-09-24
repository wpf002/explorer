/**
 * SRV-4 Kite-class — procedural hull.
 *
 * A 68 m uncrewed survey probe: a 10 m high-gain dish forward, an instrument bus,
 * a 44 m reflective sail on four spars and a magnetometer boom trailing aft.
 *
 * Units are metres. +X is forward (bow), +Y is up, origin is mid-length on the bus axis.
 */
export default function build(api) {
  const { THREE, mesh, glow, box, cylX, pipe } = api;
  const { CylinderGeometry, SphereGeometry, TorusGeometry, CircleGeometry } = THREE;

  const navLights = [];
  const nav = (p, x, y, z, c, kind, size = 1.4) => navLights.push({ s: api.sprite(p, x, y, z, size, c), kind });

  /* ---------------- Dish and feed (deck Fwd) ---------------- */
  const dish = api.module('dish');
  mesh(cylX(1.2, 5.2, 4.6, 40, true), 'mesh', 'DSH-01', 'hull', dish).position.set(26, 0, 0);
  mesh(new TorusGeometry(5.2, .12, 8, 48).rotateY(Math.PI / 2), 'bare', 'DSH-01', 'hull', dish).position.set(28.3, 0, 0);
  mesh(cylX(1.25, 1.25, 1.2, 20), 'dark', 'DSH-01', 'hull', dish).position.set(23.4, 0, 0);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    const strut = mesh(new CylinderGeometry(.09, .09, 7.4, 6), 'bare', 'DSH-01', 'hull', dish);
    strut.position.set(29.6, Math.cos(a) * 2.2, Math.sin(a) * 2.2);
    strut.rotation.z = Math.PI / 2 - .3 * Math.cos(a); strut.rotation.x = .3 * Math.sin(a);
  }
  mesh(new CylinderGeometry(.5, .7, 1.4, 16), 'dark', 'DSH-01', 'hull', dish).position.set(33, 0, 0);
  glow(dish, 33.8, 0, 0, 3.4, '#bff6ff', .45);
  nav(dish, 21, 5.6, 0, '#ffffff', 'strobe', 1.1);

  /* ---------------- Instrument bus (deck Bus) ---------------- */
  const bus = api.module('bus');
  mesh(box(13, 4.4, 4.4), 'hull', 'Bus', 'hull', bus).position.set(13, 0, 0);
  mesh(box(9, 5.2, 5.2), 'hull', 'Bus', 'hull', bus).position.set(2, 0, 0);
  for (const x of [-1.4, 2, 5.4]) mesh(box(.5, 5.4, 5.4), 'dark', 'Bus', 'hull', bus).position.set(x, 0, 0);
  // instrument deck: camera tubes, spectrometer box, star trackers
  for (const [y, z, r, l] of [[1.4, 2.8, .55, 3.4], [-1.4, 2.8, .4, 2.6], [0, 2.9, .3, 2]]) {
    mesh(cylX(r, r * .85, l, 16), 'dark', 'INS-03', 'interior', bus).position.set(9 + l / 2, y, z);
    mesh(new CircleGeometry(r * .8, 16), 'screen', 'INS-03', 'glow', bus).position.set(9 + l + .1, y, z);
  }
  mesh(box(2.6, 2, 1.6), 'interior', 'INS-03', 'interior', bus).position.set(12, 0, -3);
  mesh(box(.1, .08, 1.2), 'strip', 'INS-03', 'glow', bus).position.set(13.4, 0, -3);
  for (const s of [1, -1]) {
    mesh(cylX(.4, .4, 1.4, 12), 'bare', 'INS-03', 'interior', bus).position.set(16, s * 1.6, 0);
    mesh(new CircleGeometry(.36, 12), 'screen', 'INS-03', 'glow', bus).position.set(16.8, s * 1.6, 0);
  }
  mesh(box(4, .12, 3.4), 'screen', 'BUS-02', 'glow', bus).position.set(2, 2.75, 0);          // avionics radiator face
  glow(bus, 2, 3.2, 0, 5, '#5fd4ff', .3);
  for (const [y, z] of [[2.9, 2.9], [-2.9, -2.9], [2.9, -2.9], [-2.9, 2.9]]) {
    mesh(box(.7, .7, .7), 'bare', 'Bus', 'hull', bus).position.set(6, y, z);
    mesh(new CylinderGeometry(.2, .1, .3, 8), 'bare', 'Bus', 'hull', bus).position.set(6, y * 1.2, z * 1.2);
  }

  /* ---------------- Sail (deck Sail) ---------------- */
  const sailMod = api.module('sail');
  // four flat quadrants in the YZ plane, so the sail faces the sun square-on
  for (const [sy, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    mesh(box(.06, 20, 20), 'sail', 'SAI-05', 'hull', sailMod).position.set(-4, sy * 10.6, sz * 10.6);
    for (let k = 1; k < 4; k++) {
      mesh(box(.09, 20, .12), 'dark', 'SAI-05', 'hull', sailMod).position.set(-3.9, sy * 10.6, sz * (10.6 - 10 + k * 5));
      mesh(box(.09, .12, 20), 'dark', 'SAI-05', 'hull', sailMod).position.set(-3.9, sy * (10.6 - 10 + k * 5), sz * 10.6);
    }
    mesh(box(.12, .22, 20.4), 'dark', 'SAI-05', 'hull', sailMod).position.set(-3.85, sy * 20.6, sz * 10.6);
    mesh(box(.12, 20.4, .22), 'dark', 'SAI-05', 'hull', sailMod).position.set(-3.85, sy * 10.6, sz * 20.6);
    // diagonal spar out to the corner
    const spar = mesh(new CylinderGeometry(.18, .07, 29, 8), 'bare', 'SAI-05', 'hull', sailMod);
    spar.position.set(-4, sy * 10.3, sz * 10.3);
    spar.rotation.x = sy * sz > 0 ? -Math.PI / 4 : Math.PI / 4;
    if (sy < 0) spar.rotation.x += Math.PI;
  }
  mesh(new TorusGeometry(2.6, .2, 8, 28).rotateY(Math.PI / 2), 'dark', 'SAI-05', 'hull', sailMod).position.set(-4, 0, 0);

  /* ---------------- Power and boom (deck Aft) ---------------- */
  const aft = api.module('aft');
  for (const s of [1, -1]) {
    const arm = mesh(cylX(.22, .22, 5, 10), 'bare', 'PWR-04', 'hull', aft);
    arm.position.set(-8, 0, s * 4);
    arm.rotation.y = Math.PI / 2;
    const rtg = mesh(cylX(1, 1, 3.6, 16), 'dark', 'PWR-04', 'hull', aft);
    rtg.position.set(-8, 0, s * 7.4);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const fin = mesh(box(3.4, 1.1, .07), 'rad', 'PWR-04', 'hull', aft);
      fin.position.set(-8, Math.cos(a) * 1.5, s * 7.4 + Math.sin(a) * 1.5);
      fin.rotation.x = -a;
    }
    glow(aft, -8, 0, s * 7.4, 4.4, '#ff8a4a', .3);
  }
  mesh(cylX(.9, .9, 6, 16), 'hull', 'Aft', 'hull', aft).position.set(-8, 0, 0);
  // magnetometer boom, held clear of the bus so the instrument reads the field and not the ship
  mesh(cylX(.22, .12, 22, 8), 'bare', 'BOM-06', 'hull', aft).position.set(-22, 0, 0);
  for (const x of [-18, -26, -31]) mesh(new TorusGeometry(.3, .05, 6, 14).rotateY(Math.PI / 2), 'dark', 'BOM-06', 'hull', aft).position.set(x, 0, 0);
  mesh(new SphereGeometry(.5, 16, 10), 'interior', 'BOM-06', 'interior', aft).position.set(-33.4, 0, 0);
  mesh(box(.1, 1.4, .1), 'strip', 'BOM-06', 'glow', aft).position.set(-33.4, 0, 0);
  glow(aft, -33.4, 0, 0, 2.6, '#8fe8f5', .35);
  pipe(aft, -12, -2, 0, 1.2, .1, 'Aft'); pipe(aft, -12, -2, 0, -1.2, .1, 'Aft');
  nav(aft, -8, 2.4, 0, '#ff4d5a', 'beacon', 1.1);

  /* ---------------- Room markers ---------------- */
  api.room('DSH-01', dish, [28, 7.4, 0]);
  api.room('BUS-02', bus, [2, 5.4, 0]);
  api.room('INS-03', bus, [13, 0, 5.4]);
  api.room('SAI-05', sailMod, [-4, 14, 14]);
  api.room('PWR-04', aft, [-8, 4.6, 7.4]);
  api.room('BOM-06', aft, [-30, 2.6, 0]);

  api.animate(T => {
    const strobe = (T % 2) < .08, beacon = .4 + .6 * Math.abs(Math.sin(T * 1.2));
    for (const { s, kind } of navLights) s.material.opacity = kind === 'strobe' ? (strobe ? 1 : 0) : beacon;
  });
}
