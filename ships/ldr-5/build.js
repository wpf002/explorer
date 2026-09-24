/**
 * LDR-5 Anvil-class — procedural hull.
 *
 * A 26 m surface lander: squat pressure can on four splayed legs, four throttling
 * descent engines, a ventral cargo ramp and a dorsal docking collar.
 *
 * Units are metres. +X is forward (bow), +Y is up, origin is mid-length on the deck line.
 */
export default function build(api) {
  const { THREE, mesh, glow, box, cylX, windowStrip } = api;
  const { CylinderGeometry, SphereGeometry, CircleGeometry, TorusGeometry } = THREE;

  const navLights = [];
  const nav = (p, x, y, z, c, kind, size = .9) => navLights.push({ s: api.sprite(p, x, y, z, size, c), kind });
  const plumes = [];

  /* ---------------- Pressure hull (deck Main) ---------------- */
  const hull = api.module('hull');
  mesh(cylX(4.2, 4.2, 12, 8).rotateX(Math.PI / 8), 'hull', 'Main', 'hull', hull).position.set(0, 1.4, 0);
  mesh(cylX(3, 4.2, 3.4, 8).rotateX(Math.PI / 8), 'plate', 'Main', 'hull', hull).position.set(7.7, 1.4, 0);
  mesh(cylX(4.2, 3.4, 2.6, 8).rotateX(Math.PI / 8), 'plate', 'Main', 'hull', hull).position.set(-7.3, 1.4, 0);
  for (const x of [-4, 0, 4]) mesh(cylX(4.3, 4.3, .5, 8).rotateX(Math.PI / 8), 'dark', 'Main', 'hull', hull).position.set(x, 1.4, 0);

  // flight deck: two seats behind a wrapped forward window
  const glassA = mesh(box(.25, 1.7, 5.6), 'glass', 'Main', 'hull', hull);
  glassA.position.set(9.1, 2.6, 0); glassA.rotation.z = -.5;
  for (const s of [1, -1]) {
    const gs = mesh(box(2.6, 1.5, .25), 'glass', 'Main', 'hull', hull);
    gs.position.set(7.6, 2.5, s * 2.5); gs.rotation.y = -s * .5;
  }
  mesh(box(6, .25, 6.4), 'plate', 'CPT-01', 'interior', hull).position.set(7, .6, 0);
  for (const z of [.9, -.9]) {
    mesh(box(.75, .7, .75), 'interior', 'CPT-01', 'interior', hull).position.set(6.6, 1.2, z);
    mesh(box(.15, .8, .7), 'interior', 'CPT-01', 'interior', hull).position.set(6.1, 1.6, z);
    const sc = mesh(box(.05, .38, .62), 'screen', 'CPT-01', 'glow', hull);
    sc.position.set(8.1, 1.7, z); sc.rotation.z = -.45;
  }
  mesh(box(.5, .3, 2.4), 'dark', 'CPT-01', 'interior', hull).position.set(8.4, 1.25, 0);

  // cabin: six jump seats along the walls, overhead rail, EVA suits aft
  mesh(box(9, .25, 7), 'plate', 'CAB-02', 'interior', hull).position.set(0, .6, 0);
  for (let i = 0; i < 3; i++) for (const z of [2.4, -2.4]) {
    mesh(box(.7, .12, .7), 'interior', 'CAB-02', 'interior', hull).position.set(-2.6 + i * 2.4, 1.15, z);
    mesh(box(.7, .9, .12), 'interior', 'CAB-02', 'interior', hull).position.set(-2.6 + i * 2.4, 1.6, z * 1.2);
  }
  mesh(box(8, .08, .18), 'warm', 'CAB-02', 'glow', hull).position.set(0, 4.5, 0);
  for (const z of [1.1, -1.1]) mesh(box(.5, 1.7, .55), 'dark', 'EVA-03', 'interior', hull).position.set(-5.4, 1.5, z);
  mesh(box(.3, .06, .06), 'strip', 'EVA-03', 'glow', hull).position.set(-5.4, 2.5, 0);
  windowStrip(hull, 0, 3.2, 4.25, 7, 'CAB-02', 'warm');
  windowStrip(hull, 0, 3.2, -4.25, 7, 'CAB-02', 'warm');

  // dorsal docking collar
  mesh(new CylinderGeometry(1.5, 1.7, 1.6, 20), 'dark', 'Main', 'hull', hull).position.set(-1.5, 6.1, 0);
  mesh(new TorusGeometry(1.55, .14, 8, 28).rotateX(Math.PI / 2), 'strip', 'DCK-04', 'glow', hull).position.set(-1.5, 6.9, 0);
  mesh(new CircleGeometry(1.35, 24).rotateX(-Math.PI / 2), 'field', 'DCK-04', 'interior', hull).position.set(-1.5, 6.88, 0);
  glow(hull, -1.5, 7.3, 0, 3, '#8fe8f5', .35);

  // ventral cargo bay and ramp
  mesh(box(7, 1.6, 5.4), 'plate', 'CGO-05', 'hull', hull).position.set(-1, -1.5, 0);
  mesh(box(6.4, .18, 4.8), 'dark', 'CGO-05', 'interior', hull).position.set(-1, -2.2, 0);
  for (const [x, z, s] of [[-1.6, 1.2, .9], [-.2, -1.1, .7]]) mesh(box(1.5, s, 1.4), 'crate', 'CGO-05', 'interior', hull).position.set(x, -1.8, z);
  const ramp = mesh(box(4.4, .16, 4.6), 'dark', 'CGO-05', 'hull', hull);
  ramp.position.set(-5.4, -3, 0); ramp.rotation.z = .42;
  mesh(box(.08, .06, 4.2), 'amber', 'CGO-05', 'glow', hull).position.set(-4.1, -2.35, 0);

  // radiator strakes and antennae
  for (const s of [1, -1]) {
    const r = mesh(box(6.5, .2, 1.6), 'rad', 'Main', 'hull', hull);
    r.position.set(0, 4.6, s * 3.1); r.rotation.x = s * .5;
  }
  mesh(new CylinderGeometry(.06, .08, 2.2, 6), 'bare', 'Main', 'hull', hull).position.set(4.5, 5.9, 1.2);
  const dish = mesh(new CylinderGeometry(.9, .3, .35, 18, 1, true), 'plate', 'Main', 'hull', hull);
  dish.position.set(3, 5.6, -1.6); dish.rotation.z = -Math.PI / 3;
  nav(hull, 9.4, 3.3, 0, '#ffffff', 'strobe');
  nav(hull, 0, 5.2, 4.3, '#ff3b4a', 'port');
  nav(hull, 0, 5.2, -4.3, '#3bff7a', 'starboard');

  /* ---------------- Legs (deck Main) ---------------- */
  const gear = api.module('gear');
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const hip = mesh(box(1.2, 1, 1.2), 'bare', 'GER-06', 'hull', gear);
    hip.position.set(sx * 4.4, -1.2, sz * 3.4);
    const leg = mesh(new CylinderGeometry(.42, .34, 6.4, 10), 'plate', 'GER-06', 'hull', gear);
    leg.position.set(sx * 6.5, -3.8, sz * 5.1); leg.rotation.z = sx * .38; leg.rotation.x = -sz * .38;
    const strut = mesh(new CylinderGeometry(.16, .16, 4.2, 8), 'bare', 'GER-06', 'hull', gear);
    strut.position.set(sx * 5.4, -4.4, sz * 4.2); strut.rotation.z = sx * .9; strut.rotation.x = -sz * .5;
    mesh(new CylinderGeometry(1.15, 1.35, .35, 20), 'dark', 'GER-06', 'hull', gear).position.set(sx * 8.3, -6.8, sz * 6.5);
    mesh(new TorusGeometry(1.2, .06, 6, 24).rotateX(Math.PI / 2), 'amber', 'GER-06', 'glow', gear).position.set(sx * 8.3, -6.6, sz * 6.5);
  }

  /* ---------------- Descent engines (deck Main) ---------------- */
  const drives = api.module('drives');
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const pod = mesh(new CylinderGeometry(1.05, 1.2, 2.2, 16), 'plate', 'DRV-07', 'hull', drives);
    pod.position.set(sx * 3.2, -2.4, sz * 2.6);
    const bell = mesh(new CylinderGeometry(.7, 1.45, 1.9, 18, 1, true), 'plate', 'DRV-07', 'hull', drives);
    bell.position.set(sx * 3.2, -4.3, sz * 2.6);
    const throat = mesh(new CylinderGeometry(.6, 1.3, 1.8, 18, 1, true), 'drive', 'DRV-07', 'glow', drives);
    throat.position.set(sx * 3.2, -4.35, sz * 2.6);
    mesh(new CircleGeometry(1.3, 18).rotateX(Math.PI / 2), 'drive', 'DRV-07', 'glow', drives).position.set(sx * 3.2, -5.25, sz * 2.6);
    glow(drives, sx * 3.2, -5.6, sz * 2.6, 3.2, '#ff9a3c', .5);
    const g = api.plume(drives, sx * 3.2, -5.4, sz * 2.6, .9, 7);
    g.rotation.z = -Math.PI / 2;                                     // plumes point down, not aft
    plumes.push(g);
  }
  // RCS quads at the corners of the hull
  for (const [x, y, z] of [[8, 3.6, 3], [8, 3.6, -3], [-7, 3.6, 3], [-7, 3.6, -3]]) {
    mesh(box(.7, .5, .7), 'bare', 'Main', 'hull', drives).position.set(x, y, z);
    mesh(new CylinderGeometry(.22, .1, .35, 8), 'bare', 'Main', 'hull', drives).position.set(x, y + .4, z);
  }
  mesh(new SphereGeometry(1.6, 18, 12), 'dark', 'Main', 'hull', drives).position.set(-6.6, -1.2, 0);

  /* ---------------- Room markers ---------------- */
  api.room('CPT-01', hull, [7.4, 5, 0]);
  api.room('CAB-02', hull, [0, 5.6, 0]);
  api.room('EVA-03', hull, [-5.4, 4.6, 1.6]);
  api.room('DCK-04', hull, [-1.5, 8.2, 0]);
  api.room('CGO-05', hull, [-1.8, -3.4, 0]);
  api.room('GER-06', gear, [8.3, -5.4, 6.5]);
  api.room('DRV-07', drives, [-3.2, -6.4, -2.6]);

  api.animate(T => {
    const strobe = (T % 1.1) < .07;
    for (const { s, kind } of navLights) s.material.opacity = kind === 'strobe' ? (strobe ? 1 : 0) : .6 + .3 * Math.abs(Math.sin(T * 2.5));
    const fl = .9 + .1 * Math.sin(T * 24) * Math.sin(T * 11.3);
    for (const p of plumes) p.scale.set(fl, 1, 1);
  });
}
