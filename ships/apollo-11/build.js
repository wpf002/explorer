/**
 * Apollo CSM + LM, in the docked translunar configuration.
 *
 * Flown LM-first: footpads at +X, the service propulsion nozzle at -X. Dimensions follow
 * the flight vehicles — 3.9 m command module base, 4.27 m descent stage across the flats,
 * 9.4 m between opposite footpads.
 *
 * Units are metres. +X is forward, +Y is up, origin is mid-length on the stack axis.
 */
export default function build(api) {
  const { THREE, mesh, glow, box, cylX } = api;
  const { CylinderGeometry, SphereGeometry, TorusGeometry, CircleGeometry } = THREE;

  const navLights = [];
  const nav = (p, x, y, z, c, kind, size = .5) => navLights.push({ s: api.sprite(p, x, y, z, size, c), kind });

  /* ---------------- Command Module (deck CM) ---------------- */
  const cm = api.module('command');
  mesh(cylX(1.95, 0.46, 3.3, 28), 'foilwhite', 'CM', 'hull', cm).position.set(-0.55, 0, 0);
  mesh(new SphereGeometry(2.6, 28, 16, 0, Math.PI * 2, 0, Math.PI * .42).rotateZ(Math.PI / 2), 'ablator', 'CM', 'hull', cm).position.set(-3.6, 0, 0);
  mesh(cylX(0.46, 0.46, 0.5, 20), 'mylar', 'CM', 'hull', cm).position.set(1.35, 0, 0);       // docking tunnel
  mesh(new TorusGeometry(0.5, .06, 8, 28).rotateY(Math.PI / 2), 'bare', 'CMD-03', 'interior', cm).position.set(1.6, 0, 0);
  for (let i = 0; i < 3; i++) {                                                               // crew hatch and windows
    const a = i * 2.1 - 1;
    const w = mesh(box(.5, .34, .06), 'glass', 'CM', 'hull', cm);
    w.position.set(-0.2, Math.cos(a) * 1.62, Math.sin(a) * 1.62); w.rotation.x = -a;
  }
  const hatch = mesh(box(.86, .78, .07), 'mylar', 'CM', 'hull', cm);
  hatch.position.set(-0.4, 1.4, 0.85); hatch.rotation.x = -0.55;
  // cabin: three couches abreast, the main display panel above them
  mesh(box(2.3, .1, 2.1), 'interior', 'CMD-01', 'interior', cm).position.set(-1, -0.5, 0);
  for (const z of [-0.62, 0, 0.62]) {
    mesh(box(1.9, .12, .52), 'interior', 'CMD-01', 'interior', cm).position.set(-1, -0.3, z);
    mesh(box(.5, .5, .5), 'interior', 'CMD-01', 'interior', cm).position.set(-1.9, -0.05, z);
  }
  mesh(box(.12, .9, 1.9), 'panel', 'CMD-01', 'interior', cm).position.set(0.35, 0.35, 0);
  mesh(box(.04, .3, 1.5), 'screen', 'CMD-01', 'glow', cm).position.set(0.42, 0.45, 0);
  for (const z of [-0.5, 0.5]) mesh(box(.06, .2, .28), 'screen', 'CMD-01', 'glow', cm).position.set(0.42, -0.1, z);
  glow(cm, 0.2, 0.2, 0, 1.6, '#bff6ff', .3);

  /* ---------------- Service Module (deck SM) ---------------- */
  const sm = api.module('service');
  mesh(cylX(1.95, 1.95, 4.4, 28), 'mylar', 'SM', 'hull', sm).position.set(-5, 0, 0);
  for (let i = 0; i < 6; i++) {                                                               // sector seams
    const a = i * Math.PI / 3;
    const seam = mesh(box(4.4, .06, .12), 'bare', 'SM', 'hull', sm);
    seam.position.set(-5, Math.cos(a) * 1.97, Math.sin(a) * 1.97); seam.rotation.x = -a;
  }
  for (let i = 0; i < 4; i++) {                                                               // RCS quads
    const a = i * Math.PI / 2 + Math.PI / 4;
    const q = mesh(box(.6, .5, .5), 'bare', 'SM', 'hull', sm);
    q.position.set(-3.4, Math.cos(a) * 2.1, Math.sin(a) * 2.1); q.rotation.x = -a;
    for (const [dy, dz] of [[.3, 0], [-.3, 0], [0, .3], [0, -.3]]) {
      mesh(new CylinderGeometry(.09, .05, .22, 8), 'bare', 'SM', 'hull', sm)
        .position.set(-3.4, Math.cos(a) * 2.1 + dy, Math.sin(a) * 2.1 + dz);
    }
  }
  // radiators and fuel-cell bay
  for (const s of [1, -1]) {
    const r = mesh(box(2.6, .08, 1.5), 'rad', 'SVC-03', 'hull', sm);
    r.position.set(-4.4, s * 1.4, s * 1.4); r.rotation.x = -s * Math.PI / 4;
  }
  for (let i = 0; i < 3; i++) mesh(new CylinderGeometry(.34, .34, .8, 16), 'panel', 'SVC-03', 'interior', sm).position.set(-6.4, .9, -1 + i);
  // service propulsion engine
  mesh(cylX(1.1, .7, 1, 20), 'bare', 'SVC-01', 'hull', sm).position.set(-7.5, 0, 0);
  const bell = mesh(new CylinderGeometry(1.25, .5, 2.1, 28, 1, true), 'nozzle', 'SVC-01', 'hull', sm);
  bell.position.set(-8.4, 0, 0); bell.rotation.z = Math.PI / 2;
  glow(sm, -9.4, 0, 0, 2.4, '#ff9a3c', .25);
  // high-gain antenna: four dishes on a boom
  const boom = api.group(sm, [-7.4, -1.6, 1.6]);
  boom.rotation.x = -0.7;
  mesh(cylX(.07, .07, 1.6, 8), 'bare', 'SVC-05', 'hull', boom);
  for (const [dy, dz] of [[.42, .42], [.42, -.42], [-.42, .42], [-.42, -.42]]) {
    const d = mesh(new CylinderGeometry(.42, .12, .18, 20, 1, true), 'mylar', 'SVC-05', 'hull', boom);
    d.position.set(1.1, dy, dz); d.rotation.z = Math.PI / 2;
  }
  nav(sm, -3.4, 2.4, 0, '#ffffff', 'strobe', .6);

  /* ---------------- LM ascent stage (deck LM) ---------------- */
  const asc = api.module('ascent');
  mesh(box(2.3, 2.1, 2.6), 'foilwhite', 'LM', 'hull', asc).position.set(3.5, .15, 0);
  mesh(cylX(1.05, 1.05, 1.5, 20), 'foilwhite', 'LM', 'hull', asc).position.set(2.4, .15, 0);  // crew compartment barrel
  mesh(cylX(.46, .46, .7, 20), 'mylar', 'LM', 'hull', asc).position.set(1.75, .15, 0);        // upper docking tunnel
  for (const z of [-.52, .52]) {                                                              // the two triangular windows
    const w = mesh(box(.06, .42, .46), 'glass', 'LM', 'hull', asc);
    w.position.set(1.95, .45, z); w.rotation.z = .5;
  }
  mesh(box(.08, .82, .82), 'mylar', 'LM', 'hull', asc).position.set(1.98, -.55, 0);           // forward hatch
  // ascent engine cover, RCS clusters, antennas
  mesh(new CylinderGeometry(.55, .55, .5, 20).rotateZ(Math.PI / 2), 'bare', 'LUN-01', 'interior', asc).position.set(4.3, .15, 0);
  for (const [y, z] of [[1.2, 1.2], [1.2, -1.2], [-.9, 1.2], [-.9, -1.2]]) {
    mesh(box(.42, .42, .42), 'bare', 'LM', 'hull', asc).position.set(3.5, y, z);
    for (const d of [-1, 1]) mesh(new CylinderGeometry(.07, .04, .18, 8).rotateZ(Math.PI / 2), 'bare', 'LM', 'hull', asc).position.set(3.5 + d * .3, y, z);
  }
  const dish = mesh(new CylinderGeometry(.35, .1, .16, 18, 1, true), 'mylar', 'LM', 'hull', asc);
  dish.position.set(3.2, 1.7, .9); dish.rotation.z = -1.1;
  mesh(cylX(.05, .05, 1.1, 6), 'bare', 'LM', 'hull', asc).position.set(3.2, 1.5, -1.1);
  // cabin: two standing stations, instrument panel, ascent engine cover in the middle
  mesh(box(1.6, .08, 1.9), 'interior', 'LUN-01', 'interior', asc).position.set(2.6, -.7, 0);
  for (const z of [-.5, .5]) {
    mesh(box(.1, .8, .62), 'panel', 'LUN-01', 'interior', asc).position.set(2.15, .2, z);
    mesh(box(.04, .22, .5), 'screen', 'LUN-01', 'glow', asc).position.set(2.09, .3, z);
    mesh(box(.5, .06, .4), 'bare', 'LUN-01', 'interior', asc).position.set(2.5, -.25, z);     // armrest restraints
  }
  glow(asc, 2.4, 0, 0, 1.4, '#ffd9a0', .25);

  /* ---------------- LM descent stage and gear (deck LM) ---------------- */
  const desc = api.module('descent');
  mesh(cylX(2.14, 2.14, 1.65, 8).rotateX(Math.PI / 8), 'foil', 'LM', 'hull', desc).position.set(5.7, .15, 0);
  mesh(cylX(2.2, 2.2, .12, 8).rotateX(Math.PI / 8), 'bare', 'LM', 'hull', desc).position.set(6.6, .15, 0);
  const engine = mesh(new CylinderGeometry(.9, .45, 1.5, 24, 1, true), 'nozzle', 'LUN-03', 'hull', desc);
  engine.position.set(7.2, .15, 0); engine.rotation.z = Math.PI / 2;
  glow(desc, 7.9, .15, 0, 1.8, '#ff9a3c', .2);
  mesh(box(.9, .7, 1.1), 'mylar', 'LUN-07', 'interior', desc).position.set(5.7, -1.9, .9);    // MESA equipment bay
  mesh(box(.5, .06, .9), 'bare', 'LUN-07', 'interior', desc).position.set(5.4, -2.1, .9);
  for (let i = 0; i < 4; i++) {                                                               // landing gear
    const a = i * Math.PI / 2 + Math.PI / 4;
    const y = Math.cos(a), z = Math.sin(a);
    const leg = mesh(new CylinderGeometry(.13, .11, 3.1, 10), 'mylar', 'LUN-05', 'hull', desc);
    leg.position.set(6.9, .15 + y * 2.9, z * 2.9);
    leg.rotation.set(-z * .62, 0, Math.PI / 2 - y * .62);
    const strut = mesh(new CylinderGeometry(.07, .07, 2.4, 8), 'mylar', 'LUN-05', 'hull', desc);
    strut.position.set(6.2, .15 + y * 2.2, z * 2.2);
    strut.rotation.set(-z * .95, 0, Math.PI / 2 - y * .95);
    const pad = mesh(new CylinderGeometry(.48, .46, .12, 20).rotateZ(Math.PI / 2), 'mylar', 'LUN-05', 'hull', desc);
    pad.position.set(8.3, .15 + y * 3.7, z * 3.7);
    mesh(new CylinderGeometry(.03, .03, 1.7, 6).rotateZ(Math.PI / 2), 'bare', 'LUN-05', 'hull', desc)
      .position.set(9.1, .15 + y * 3.7, z * 3.7);                                             // contact probe
  }
  // ladder on the forward leg
  for (let i = 0; i < 9; i++) mesh(box(.04, .04, .42), 'mylar', 'LUN-05', 'hull', desc).position.set(5.9 + i * .26, .15 - 1.2 - i * .18, .9);
  nav(desc, 5.7, 2.3, 0, '#ff4d5a', 'beacon', .5);

  /* ---------------- Room markers ---------------- */
  api.room('CMD-01', cm, [-1, 2.6, 0]);
  api.room('CMD-03', cm, [1.5, 1.4, 0]);
  api.room('SVC-01', sm, [-8.2, 2.2, 0]);
  api.room('SVC-03', sm, [-5.2, -2.6, 0]);
  api.room('SVC-05', sm, [-6.6, -3, 2.4]);
  api.room('LUN-01', asc, [3, 2.8, 0]);
  api.room('LUN-03', desc, [7.2, 2, 0]);
  api.room('LUN-05', desc, [8.3, -3, 3.2]);
  api.room('LUN-07', desc, [5.7, -3, 1.6]);

  api.animate(T => {
    const strobe = (T % 1.5) < .09, beacon = .4 + .6 * Math.abs(Math.sin(T * 1.4));
    for (const { s, kind } of navLights) s.material.opacity = kind === 'strobe' ? (strobe ? 1 : 0) : beacon;
  });
}
