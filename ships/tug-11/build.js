/**
 * TUG-11 Bollard-class — procedural hull.
 *
 * A 44 m orbital tug: a glasshouse cab forward, four grapple arms, two propellant
 * spheres on an open truss and two oversized drive bells aft.
 *
 * Units are metres. +X is forward (bow), +Y is up, origin is mid-length on the spine.
 */
export default function build(api) {
  const { THREE, mesh, glow, box, cylX, pipe, truss, windowStrip } = api;
  const { CylinderGeometry, SphereGeometry, CircleGeometry, TorusGeometry } = THREE;

  const navLights = [];
  const nav = (p, x, y, z, c, kind, size = 1.2) => navLights.push({ s: api.sprite(p, x, y, z, size, c), kind });
  const plumes = [];
  const arms = [];

  /* ---------------- Cab: bridge, bunks, lock (deck Cab) ---------------- */
  const cab = api.module('cab');
  mesh(box(9, 5.4, 7.6), 'hull', 'Cab', 'hull', cab).position.set(14, .6, 0);
  mesh(box(9.4, .6, 8), 'dark', 'Cab', 'hull', cab).position.set(14, 3.6, 0);
  // glasshouse: front, sides and a roof panel, because a tug pilot looks everywhere
  const front = mesh(box(.25, 3, 6.4), 'glass', 'Cab', 'hull', cab);
  front.position.set(18.7, 1.5, 0); front.rotation.z = -.28;
  for (const s of [1, -1]) {
    mesh(box(5.6, 2.4, .25), 'glass', 'Cab', 'hull', cab).position.set(15.5, 1.5, s * 3.85);
  }
  mesh(box(4.4, .25, 5.4), 'glass', 'Cab', 'hull', cab).position.set(16.4, 3.35, 0);
  mesh(box(.3, .3, 6.2), 'strip', 'Cab', 'glow', cab).position.set(19.2, 3.1, 0);
  // bridge: one seat on the centreline, hand controllers, wrap console
  mesh(box(8, .25, 6.8), 'plate', 'BRG-01', 'interior', cab).position.set(14, -.9, 0);
  mesh(box(1, 1.2, 1), 'interior', 'BRG-01', 'interior', cab).position.set(15, .1, 0);
  mesh(box(.16, 1, .9), 'interior', 'BRG-01', 'interior', cab).position.set(14.4, .7, 0);
  for (const z of [1.4, -1.4]) {
    mesh(box(.5, .3, .5), 'dark', 'BRG-01', 'interior', cab).position.set(16.6, .5, z);
    const sc = mesh(box(.06, .5, 1.1), 'screen', 'BRG-01', 'glow', cab);
    sc.position.set(17.6, 1.2, z); sc.rotation.z = -.35;
  }
  mesh(box(2.2, .35, 5.4), 'dark', 'BRG-01', 'interior', cab).position.set(17.4, .2, 0);
  glow(cab, 16, 1.2, 0, 7, '#8fe8f5', .28);
  // two bunks and a locker aft of the cab
  mesh(box(3.4, .25, 6), 'plate', 'CRW-02', 'interior', cab).position.set(11.4, -.9, 0);
  for (const z of [2, -2]) {
    mesh(box(2.6, .35, 1.1), 'interior', 'CRW-02', 'interior', cab).position.set(11.4, -.4, z);
    mesh(box(2.6, .35, 1.1), 'interior', 'CRW-02', 'interior', cab).position.set(11.4, 1.1, z);
  }
  mesh(box(3, .08, .16), 'warm', 'CRW-02', 'glow', cab).position.set(11.4, 2.6, 0);
  windowStrip(cab, 11.5, 1.4, 3.85, 3, 'CRW-02', 'warm');
  windowStrip(cab, 11.5, 1.4, -3.85, 3, 'CRW-02', 'warm');
  // work airlock on the ventral face, the way out to a job
  mesh(new CylinderGeometry(1.5, 1.5, 2.6, 16), 'dark', 'EVA-04', 'hull', cab).position.set(11, -3, 0);
  mesh(new CircleGeometry(1.3, 20).rotateX(Math.PI / 2), 'field', 'EVA-04', 'interior', cab).position.set(11, -4.3, 0);
  mesh(new TorusGeometry(1.45, .12, 8, 24).rotateX(Math.PI / 2), 'strip', 'EVA-04', 'glow', cab).position.set(11, -4.25, 0);
  for (const z of [.9, -.9]) mesh(box(.5, 1.5, .5), 'interior', 'EVA-04', 'interior', cab).position.set(10.4, -2.8, z);
  glow(cab, 11, -4.8, 0, 3.4, '#8fe8f5', .3);
  // work lights on the cab roof
  for (const z of [2.6, -2.6]) {
    mesh(box(.7, .5, .7), 'bare', 'Cab', 'hull', cab).position.set(18, 4.2, z);
    mesh(box(.12, .34, .5), 'strip', 'Cab', 'glow', cab).position.set(18.5, 4.2, z);
  }
  nav(cab, 14, 4.4, 0, '#ffffff', 'strobe');
  nav(cab, 14, 1, 4.1, '#ff3b4a', 'port');
  nav(cab, 14, 1, -4.1, '#3bff7a', 'starboard');

  /* ---------------- Grapple arms and tow winch (deck Work) ---------------- */
  const work = api.module('work');
  mesh(cylX(3.4, 3.6, 4, 12), 'plate', 'Work', 'hull', work).position.set(20.4, .6, 0);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const base = api.group(work, [21.4, .6 + Math.cos(a) * 2.6, Math.sin(a) * 2.6], { animated: true });
    base.rotation.x = -a;
    mesh(new CylinderGeometry(.55, .6, 1, 12), 'bare', 'GRP-01', 'hull', base);
    const upper = mesh(cylX(.38, .34, 4.4, 10), 'plate', 'GRP-01', 'hull', base);
    upper.position.set(2.1, .5, 0); upper.rotation.z = .35;
    const fore = mesh(cylX(.3, .26, 3.8, 10), 'plate', 'GRP-01', 'hull', base);
    fore.position.set(5.6, 1.9, 0); fore.rotation.z = -.5;
    for (const s of [1, -1]) {
      const claw = mesh(box(1.4, .16, .3), 'bare', 'GRP-01', 'hull', base);
      claw.position.set(7.4, 2.2, s * .34); claw.rotation.z = -1;
    }
    mesh(box(.3, .1, .1), 'amber', 'GRP-01', 'glow', base).position.set(6.9, 2.6, 0);
    arms.push({ base, phase: i * 1.7 });
  }
  // tow winch and cable drum on the dorsal spine
  mesh(new CylinderGeometry(1.6, 1.6, 3, 20).rotateZ(Math.PI / 2), 'dark', 'TOW-05', 'hull', work).position.set(2, 3.4, 0);
  mesh(new CylinderGeometry(1.75, 1.75, .3, 20).rotateZ(Math.PI / 2), 'bare', 'TOW-05', 'hull', work).position.set(3.6, 3.4, 0);
  mesh(new CylinderGeometry(1.75, 1.75, .3, 20).rotateZ(Math.PI / 2), 'bare', 'TOW-05', 'hull', work).position.set(.4, 3.4, 0);
  mesh(cylX(.08, .08, 9, 6), 'bare', 'TOW-05', 'hull', work).position.set(7.5, 3.9, 0);
  mesh(box(.8, .6, .8), 'bare', 'TOW-05', 'hull', work).position.set(12.2, 3.9, 0);
  mesh(box(.3, .12, .12), 'amber', 'TOW-05', 'glow', work).position.set(2, 5.1, 0);

  /* ---------------- Truss, tanks, drives (deck Eng) ---------------- */
  const eng = api.module('engineering');
  truss(eng, -16, 10, 3.2, 7, 'Eng');
  mesh(box(26, 1.2, 1.2), 'dark', 'Eng', 'hull', eng).position.set(-3, 0, 0);
  for (const z of [1, -1]) {
    mesh(new SphereGeometry(3.4, 24, 16), 'plate', 'TNK-02', 'hull', eng).position.set(1, 0, z * 5.4);
    mesh(new SphereGeometry(2.6, 20, 14), 'plate', 'TNK-02', 'hull', eng).position.set(-7.5, 0, z * 4.6);
    mesh(new TorusGeometry(3.45, .1, 6, 32).rotateY(Math.PI / 2), 'strip', 'TNK-02', 'glow', eng).position.set(1, 0, z * 5.4);
    pipe(eng, -12, 4, -1.4, z * 3.2, .22, 'Eng');
  }
  mesh(cylX(3.4, 3.8, 5, 12), 'hull', 'Eng', 'hull', eng).position.set(-18, 0, 0);
  for (const z of [2.6, -2.6]) {
    mesh(cylX(1.9, 2.1, 4.4, 16), 'plate', 'Eng', 'hull', eng).position.set(-21, 0, z);
    const bell = mesh(new CylinderGeometry(3.6, 1.7, 5.4, 22, 1, true), 'plate', 'DRV-03', 'hull', eng);
    bell.position.set(-25.8, 0, z); bell.rotation.z = Math.PI / 2;
    const throat = mesh(new CylinderGeometry(3.2, 1.4, 5, 22, 1, true), 'drive', 'DRV-03', 'glow', eng);
    throat.position.set(-25.9, 0, z); throat.rotation.z = Math.PI / 2;
    const disk = mesh(new CircleGeometry(3.3, 22), 'drive', 'DRV-03', 'glow', eng);
    disk.position.set(-28.4, 0, z); disk.rotation.y = -Math.PI / 2;
    glow(eng, -29, 0, z, 8, '#ff9a3c', .5);
    plumes.push(api.plume(eng, -28.5, 0, z, 3, 24));
  }
  for (const [y, z] of [[3.4, 0], [-3.4, 0]]) {
    mesh(box(1.4, 1.4, 1.4), 'bare', 'Eng', 'hull', eng).position.set(-16, y, z);
    const v = mesh(new CircleGeometry(.6, 12), 'drive', 'Eng', 'glow', eng);
    v.position.set(-16.8, y, z); v.rotation.y = -Math.PI / 2;
  }
  nav(eng, -18, 4.6, 0, '#ffffff', 'strobe2');

  /* ---------------- Room markers ---------------- */
  api.room('BRG-01', cab, [15.6, 5.4, 0]);
  api.room('CRW-02', cab, [11.4, 4.8, -2.6]);
  api.room('EVA-04', cab, [11, -5.6, 0]);
  api.room('GRP-01', work, [24, 5.4, 0]);
  api.room('TOW-05', work, [2, 6.4, 0]);
  api.room('TNK-02', eng, [1, 0, 9.4]);
  api.room('DRV-03', eng, [-24, 5, 0]);

  api.animate(T => {
    const strobe = (T % 1.4) < .08, strobe2 = ((T + .7) % 1.4) < .08;
    for (const { s, kind } of navLights) {
      s.material.opacity = kind === 'strobe' ? (strobe ? 1 : 0) : kind === 'strobe2' ? (strobe2 ? 1 : 0) : .6 + .3 * Math.abs(Math.sin(T * 2.3));
    }
    // arms breathe slowly, like a crane idling on station
    for (const a of arms) a.base.rotation.z = Math.sin(T * .35 + a.phase) * .12;
    const fl = .94 + .06 * Math.sin(T * 25) * Math.sin(T * 12.1);
    for (const p of plumes) p.scale.set(fl, 1, 1);
  });
}
