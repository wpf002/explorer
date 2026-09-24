/**
 * Voyager, as flown: 3.66 m high-gain antenna, a ten-sided bus, the science boom with its
 * scan platform, the RTG boom opposite, and the magnetometer boom trailing 13 m aft.
 *
 * Units are metres. +X is the antenna boresight (Earth-pointing), +Y is up.
 */
export default function build(api) {
  const { THREE, mesh, glow, box, cylX } = api;
  const { CylinderGeometry, SphereGeometry, TorusGeometry, CircleGeometry } = THREE;

  const navLights = [];

  /* ---------------- High-gain antenna (deck Fwd) ---------------- */
  const ant = api.module('antenna');
  mesh(cylX(.35, 1.83, 1.1, 40, true), 'dish', 'HGA-01', 'hull', ant).position.set(1.5, 0, 0);
  mesh(new TorusGeometry(1.83, .05, 8, 48).rotateY(Math.PI / 2), 'alum', 'HGA-01', 'hull', ant).position.set(2.05, 0, 0);
  mesh(new CylinderGeometry(.42, .12, .14, 20).rotateZ(Math.PI / 2), 'alum', 'HGA-01', 'hull', ant).position.set(2.5, 0, 0);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    const st = mesh(new CylinderGeometry(.03, .03, 1.5, 6), 'alum', 'HGA-01', 'hull', ant);
    st.position.set(2.3, Math.cos(a) * .6, Math.sin(a) * .6);
    st.rotation.set(-Math.sin(a) * .35, 0, Math.PI / 2 - Math.cos(a) * .35);
  }
  glow(ant, 2.7, 0, 0, .7, '#bff6ff', .35);

  /* ---------------- Bus and electronics (deck Bus) ---------------- */
  const bus = api.module('bus');
  mesh(cylX(.94, .94, .47, 10), 'foil', 'BUS-02', 'hull', bus).position.set(.6, 0, 0);
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5;
    const bay = mesh(box(.44, .5, .58), 'alum', 'BUS-02', 'hull', bus);
    bay.position.set(.6, Math.cos(a) * .9, Math.sin(a) * .9); bay.rotation.x = -a;
  }
  mesh(new SphereGeometry(.35, 20, 12), 'foil', 'BUS-02', 'hull', bus).position.set(.1, 0, 0);
  mesh(cylX(.16, .16, .9, 12), 'alum', 'BUS-02', 'hull', bus).position.set(-.4, 0, 0);
  for (const [y, z] of [[.55, .55], [-.55, -.55]]) {
    mesh(new CylinderGeometry(.12, .07, .3, 10), 'alum', 'BUS-02', 'hull', bus).position.set(.2, y, z);
  }

  /* ---------------- Science boom and scan platform (deck Sci) ---------------- */
  const sci = api.module('science');
  const boom = api.group(sci, [0, -1.2, 1.1]);
  mesh(cylX(.07, .07, 2.4, 8), 'alum', 'SCI-03', 'hull', boom).position.set(-.6, 0, 0);
  const plat = api.group(boom, [-2, -.3, 0], { animated: true });
  mesh(box(.5, .4, .5), 'alum', 'SCI-03', 'hull', plat);
  for (const [dx, dy, r, l] of [[.34, .12, .11, .62], [.34, -.12, .08, .44], [-.05, .28, .06, .3]]) {
    mesh(cylX(r, r * .86, l, 14), 'dark', 'SCI-03', 'interior', plat).position.set(dx, dy, .16);
    mesh(new CircleGeometry(r * .8, 14), 'screen', 'SCI-03', 'glow', plat).position.set(dx + l / 2 + .01, dy, .16);
  }
  mesh(box(.3, .2, .24), 'dark', 'SCI-03', 'interior', plat).position.set(0, -.05, -.26);
  // the golden record, bolted to the bus
  mesh(new CylinderGeometry(.15, .15, .02, 32).rotateZ(Math.PI / 2), 'gold', 'REC-06', 'interior', sci).position.set(.62, .55, -.75);
  mesh(new TorusGeometry(.16, .015, 8, 28).rotateY(Math.PI / 2), 'alum', 'REC-06', 'hull', sci).position.set(.62, .55, -.75);
  glow(sci, .7, .55, -.75, .5, '#f0b64a', .3);
  // two 10 m whip antennas, swept back
  for (const s of [1, -1]) {
    const whip = mesh(new CylinderGeometry(.015, .01, 10, 6), 'alum', 'SCI-03', 'hull', sci);
    whip.position.set(-2.4, s * 3.1, -3.1);
    whip.rotation.set(s * .6, 0, Math.PI / 2 - s * .55);
  }

  /* ---------------- Power and magnetometer boom (deck Aft) ---------------- */
  const aft = api.module('aft');
  const rtgBoom = api.group(aft, [0, 1.15, -1.05]);
  mesh(cylX(.07, .07, 1.6, 8), 'alum', 'RTG-04', 'hull', rtgBoom).position.set(-.4, 0, 0);
  for (let i = 0; i < 3; i++) {
    mesh(cylX(.21, .21, .55, 16), 'dark', 'RTG-04', 'hull', rtgBoom).position.set(-1.1 - i * .6, 0, 0);
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4;
      const fin = mesh(box(.5, .3, .02), 'alum', 'RTG-04', 'hull', rtgBoom);
      fin.position.set(-1.1 - i * .6, Math.cos(a) * .32, Math.sin(a) * .32); fin.rotation.x = -a;
    }
    glow(rtgBoom, -1.1 - i * .6, 0, 0, 1, '#ff8a4a', .18);
  }
  mesh(cylX(.05, .02, 13, 6), 'alum', 'MAG-05', 'hull', aft).position.set(-6.9, 0, 0);
  for (const x of [-4.5, -8.5, -11.5]) mesh(new TorusGeometry(.08, .012, 6, 12).rotateY(Math.PI / 2), 'dark', 'MAG-05', 'hull', aft).position.set(x, 0, 0);
  mesh(new SphereGeometry(.11, 14, 10), 'dark', 'MAG-05', 'interior', aft).position.set(-13.3, 0, 0);
  glow(aft, -13.3, 0, 0, .6, '#8fe8f5', .3);
  navLights.push({ s: api.sprite(aft, .6, 1.2, 0, .4, '#ff4d5a'), kind: 'beacon' });

  /* ---------------- Room markers ---------------- */
  api.room('HGA-01', ant, [2, 2.4, 0]);
  api.room('BUS-02', bus, [.6, 1.6, 0]);
  api.room('SCI-03', sci, [-2, -2.2, 1.1]);
  api.room('RTG-04', aft, [-2.4, 2.2, -1.05]);
  api.room('MAG-05', aft, [-11, 1.4, 0]);
  api.room('REC-06', sci, [.62, 1.4, -1.6]);

  api.animate(T => {
    for (const { s } of navLights) s.material.opacity = .35 + .55 * Math.abs(Math.sin(T * 1.1));
  });
}
