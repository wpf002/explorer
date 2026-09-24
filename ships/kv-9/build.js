/**
 * KV-9 Lance-class — procedural hull.
 *
 * A 95 m patrol frigate: faceted armour box around a spinal railgun, canted radiator
 * wings, two main drives. Nothing spins and nothing is pressurised aft of frame 12.
 *
 * Units are metres. +X is forward (bow), +Y is up, origin is mid-length on the spine.
 */
export default function build(api) {
  const { THREE, mesh, glow, box, cylX, windowStrip, pipe } = api;
  const { CylinderGeometry, SphereGeometry, CircleGeometry, TorusGeometry } = THREE;

  const navLights = [];
  const nav = (parent, x, y, z, color, kind, size = 1.6) => navLights.push({ s: api.sprite(parent, x, y, z, size, color), kind });
  const plumes = [];

  /* ---------------- Forward hull: railgun, bow armour (deck Ops) ---------------- */
  const bow = api.module('bow');
  // hexagonal armour prism, flats top and bottom
  mesh(cylX(6.4, 7.2, 26, 6).rotateX(Math.PI / 6), 'hull', 'Ops', 'hull', bow).position.set(14, 0, 0);
  mesh(cylX(4.6, 6.4, 8, 6).rotateX(Math.PI / 6), 'armor', 'Ops', 'hull', bow).position.set(31, 0, 0);
  for (const x of [6, 14, 22]) mesh(cylX(7.3, 7.3, .7, 6).rotateX(Math.PI / 6), 'armor', 'Ops', 'hull', bow).position.set(x, 0, 0);
  // spinal railgun: barrel, rails, muzzle
  mesh(cylX(1.25, 1.1, 46, 16), 'bare', 'GUN-01', 'hull', bow).position.set(22, 0, 0);
  for (const s of [1, -1]) {
    mesh(box(44, .45, .3), 'dark', 'GUN-01', 'hull', bow).position.set(23, s * 1.35, 0);
    mesh(box(44, .3, .45), 'dark', 'GUN-01', 'hull', bow).position.set(23, 0, s * 1.35);
  }
  for (let i = 0; i < 6; i++) mesh(new TorusGeometry(1.5, .18, 8, 18).rotateY(Math.PI / 2), 'strip', 'GUN-01', 'glow', bow).position.set(24 + i * 4, 0, 0);
  mesh(cylX(2.1, 1.6, 3.4, 16), 'plate', 'GUN-01', 'hull', bow).position.set(46, 0, 0);
  glow(bow, 48.5, 0, 0, 5, '#bff6ff', .8);
  // breech and magazine
  mesh(cylX(2.6, 2.6, 7, 12), 'dark', 'MAG-01', 'interior', bow).position.set(2, 0, 0);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    mesh(box(5.6, .5, .5), 'interior', 'MAG-01', 'interior', bow).position.set(1, Math.cos(a) * 3.4, Math.sin(a) * 3.4);
  }
  mesh(new TorusGeometry(3.6, .2, 8, 28).rotateY(Math.PI / 2), 'amber', 'MAG-01', 'glow', bow).position.set(-1.6, 0, 0);
  // sensor cluster and point-defence domes
  mesh(new SphereGeometry(1.5, 20, 12), 'glass', 'Ops', 'hull', bow).position.set(24, 4.6, 0);
  for (const [x, y, z] of [[10, 6.2, 3.4], [10, -6.2, -3.4], [26, 0, 6.2]]) {
    mesh(new SphereGeometry(1.1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 'armor', 'Ops', 'hull', bow).position.set(x, y, z);
    mesh(cylX(.22, .18, 2.4, 8), 'bare', 'Ops', 'hull', bow).position.set(x + 1.4, y + .5, z);
  }
  nav(bow, 46, 1.9, 0, '#ffffff', 'strobe');

  /* ---------------- Command block: bridge and CIC (deck Cmd) ---------------- */
  const cmd = api.module('command');
  mesh(box(13, 4.6, 9), 'armor', 'Cmd', 'hull', cmd).position.set(2, 6.6, 0);
  const slit = mesh(box(.4, 1.1, 8.2), 'glass', 'Cmd', 'hull', cmd);
  slit.position.set(8.4, 7.2, 0); slit.rotation.z = -.42;
  mesh(box(13.4, .5, 9.4), 'dark', 'Cmd', 'hull', cmd).position.set(2, 9, 0);
  mesh(box(.3, .3, 8), 'strip', 'Cmd', 'glow', cmd).position.set(8.7, 8.4, 0);
  // bridge: three seats abreast facing the slit, console rail
  mesh(box(11, .3, 8), 'plate', 'BRG-02', 'interior', cmd).position.set(2, 4.6, 0);
  for (const z of [2.4, 0, -2.4]) {
    mesh(box(.9, .9, .9), 'interior', 'BRG-02', 'interior', cmd).position.set(5, 5.3, z);
    mesh(box(.12, .6, .8), 'screen', 'BRG-02', 'glow', cmd).position.set(6.1, 5.9, z);
    mesh(box(.7, 1.1, .7), 'dark', 'BRG-02', 'interior', cmd).position.set(3.6, 5.5, z);
  }
  mesh(box(.5, .4, 7.4), 'dark', 'BRG-02', 'interior', cmd).position.set(6.6, 5, 0);
  // CIC below the bridge: plot table ringed by four consoles
  mesh(box(11, .3, 8), 'plate', 'CIC-01', 'interior', cmd).position.set(-1, .6, 0);
  mesh(new CylinderGeometry(1.5, 1.7, .5, 20), 'core', 'CIC-01', 'interior', cmd).position.set(-1, 1.1, 0);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const c = mesh(box(.8, .9, 1.6), 'interior', 'CIC-01', 'interior', cmd);
    c.position.set(-1 + Math.cos(a) * 3, 1.3, Math.sin(a) * 3); c.rotation.y = -a;
    const sc = mesh(box(.06, .55, 1.3), 'screen', 'CIC-01', 'glow', cmd);
    sc.position.set(-1 + Math.cos(a) * 2.5, 1.9, Math.sin(a) * 2.5); sc.rotation.y = -a;
  }
  glow(cmd, -1, 1.6, 0, 7, '#8fe8f5', .3);

  /* ---------------- Midships: VLS, berths, airlock, sick bay (deck Ops) ---------------- */
  const mid = api.module('midships');
  mesh(cylX(7.2, 6.6, 22, 6).rotateX(Math.PI / 6), 'hull', 'Ops', 'hull', mid).position.set(-9, 0, 0);
  for (const s of [1, -1]) {                                                    // chine plates
    const p = mesh(box(30, .6, 5.5), 'plate', 'Ops', 'hull', mid);
    p.position.set(-4, -1.2, s * 6.4); p.rotation.x = s * .5;
  }
  windowStrip(mid, -8, 2.6, 6.3, 12, 'CRW-01'); windowStrip(mid, -8, 2.6, -6.3, 12, 'CRW-01');
  // vertical launch cells, four by two on the dorsal plate
  for (let i = 0; i < 4; i++) for (const z of [1.6, -1.6]) {
    const x = -2 - i * 3.4;
    mesh(box(2.6, 1, 2.6), 'dark', 'VLS-02', 'hull', mid).position.set(x, 6.3, z);
    mesh(new CylinderGeometry(.95, .95, .3, 12), 'armor', 'VLS-02', 'hull', mid).position.set(x, 6.9, z);
    mesh(new TorusGeometry(1, .08, 6, 18).rotateX(Math.PI / 2), 'amber', 'VLS-02', 'glow', mid).position.set(x, 7.06, z);
  }
  // crew berths: six bunks in two tiers
  mesh(box(12, .3, 9), 'plate', 'CRW-01', 'interior', mid).position.set(-9, -1.6, 0);
  for (let i = 0; i < 3; i++) for (let t = 0; t < 2; t++) {
    mesh(box(2.4, .4, 1.1), 'interior', 'CRW-01', 'interior', mid).position.set(-5.5 - i * 3, -.9 + t * 1.7, 3.2);
    mesh(box(2.4, .4, 1.1), 'interior', 'CRW-01', 'interior', mid).position.set(-5.5 - i * 3, -.9 + t * 1.7, -3.2);
  }
  mesh(box(10, .1, .3), 'warm', 'CRW-01', 'glow', mid).position.set(-9, 2.2, 0);
  // sick bay: one pod and a locker wall
  mesh(cylX(.7, .7, 2.4, 14), 'interior', 'MED-01', 'interior', mid).position.set(-16, -.6, 2);
  mesh(new CylinderGeometry(.8, .8, 2.2, 14, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(Math.PI / 2), 'glass', 'MED-01', 'hull', mid).position.set(-16, -.5, 2);
  mesh(box(3, 1.8, .5), 'dark', 'MED-01', 'interior', mid).position.set(-16, -.2, -2.4);
  mesh(box(2.4, .1, .1), 'strip', 'MED-01', 'glow', mid).position.set(-16, 1, -2.2);
  // airlock and EVA bay on the port quarter
  mesh(cylX(2.2, 2.2, 3.4, 16), 'dark', 'AIR-01', 'hull', mid).position.set(-14, 0, 7.4);
  mesh(new CircleGeometry(1.9, 24), 'field', 'AIR-01', 'interior', mid).position.set(-14, 0, 9.2);
  mesh(new TorusGeometry(2.1, .16, 8, 28), 'strip', 'AIR-01', 'glow', mid).position.set(-14, 0, 9.1);
  for (const y of [1.1, -1.1]) mesh(box(1.4, .8, .18), 'interior', 'AIR-01', 'interior', mid).position.set(-14, y, 7.4);
  glow(mid, -14, 0, 9.6, 5, '#8fe8f5', .35);
  pipe(mid, -20, 4, 5.4, 4.4, .3, 'Ops'); pipe(mid, -20, 4, 5.4, -4.4, .3, 'Ops');
  nav(mid, -4, 7.6, 6.9, '#ff3b4a', 'port'); nav(mid, -4, 7.6, -6.9, '#3bff7a', 'starboard');

  /* ---------------- Engineering: reactor, radiators, drives (deck Eng) ---------------- */
  const eng = api.module('engineering');
  mesh(cylX(6.6, 5.4, 12, 6).rotateX(Math.PI / 6), 'hull', 'Eng', 'hull', eng).position.set(-26, 0, 0);
  mesh(cylX(3.2, 3.2, 9, 16), 'dark', 'ENG-01', 'interior', eng).position.set(-26, 0, 0);
  mesh(new TorusGeometry(2.2, .5, 10, 28).rotateY(Math.PI / 2), 'core', 'ENG-01', 'interior', eng).position.set(-26, 0, 0);
  glow(eng, -26, 0, 0, 9, '#cfefff', .4);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    pipe(eng, -31, -21, Math.cos(a) * 4.4, Math.sin(a) * 4.4, .22, 'Eng');
  }
  // canted radiator wings, one each side
  for (const s of [1, -1]) {
    const w = mesh(box(15, .35, 9), 'rad', 'RAD-02', 'hull', eng);
    w.position.set(-28, s * 3.4, s * 8.6); w.rotation.x = s * .85;
    for (let i = 0; i < 4; i++) {
      const g = mesh(box(14, .1, .22), 'amber', 'RAD-02', 'glow', eng);
      g.position.set(-28, s * (3.4 + .25), s * (5.6 + i * 2)); g.rotation.x = s * .85;
    }
    mesh(box(3, 1.4, 1.4), 'bare', 'Eng', 'hull', eng).position.set(-27, s * 2.2, s * 4.4);
  }
  // two main drives plus vernier pods
  for (const z of [3.2, -3.2]) {
    mesh(cylX(2.4, 2.6, 7, 16), 'plate', 'Eng', 'hull', eng).position.set(-36, 0, z);
    const bell = mesh(new CylinderGeometry(3.4, 1.9, 6, 20, 1, true), 'plate', 'Eng', 'hull', eng);
    bell.position.set(-42.5, 0, z); bell.rotation.z = Math.PI / 2;
    const throat = mesh(new CylinderGeometry(3, 1.5, 5.6, 20, 1, true), 'drive', 'ENG-01', 'glow', eng);
    throat.position.set(-42.6, 0, z); throat.rotation.z = Math.PI / 2;
    const disk = mesh(new CircleGeometry(3.1, 20), 'drive', 'ENG-01', 'glow', eng);
    disk.position.set(-45.4, 0, z); disk.rotation.y = -Math.PI / 2;
    glow(eng, -46, 0, z, 9, '#ff9a3c', .5);
    plumes.push(api.plume(eng, -45.5, 0, z, 2.9, 26));
  }
  for (const [y, z] of [[3.6, 0], [-3.6, 0]]) {
    mesh(cylX(1.1, 1.2, 3, 12), 'bare', 'Eng', 'hull', eng).position.set(-36, y, z);
    const vd = mesh(new CircleGeometry(1.1, 14), 'drive', 'Eng', 'glow', eng);
    vd.position.set(-37.6, y, z); vd.rotation.y = -Math.PI / 2;
  }
  nav(eng, -33, 5.4, 0, '#ffffff', 'strobe2');

  /* ---------------- Room markers ---------------- */
  api.room('GUN-01', bow, [30, 3.4, 0]);
  api.room('MAG-01', bow, [1, -4.6, 0]);
  api.room('BRG-02', cmd, [2, 10.6, 0]);
  api.room('CIC-01', cmd, [-1, -4.4, 0]);
  api.room('VLS-02', mid, [-7, 9.4, 0]);
  api.room('CRW-01', mid, [-9, -5.2, 3.4]);
  api.room('MED-01', mid, [-16, -4.6, -3]);
  api.room('AIR-01', mid, [-14, 2.4, 9.4]);
  api.room('ENG-01', eng, [-26, 4.6, 0]);
  api.room('RAD-02', eng, [-28, 7.4, 10]);

  api.animate(T => {
    const strobe = (T % 1.2) < .07, strobe2 = ((T + .6) % 1.2) < .07;
    for (const { s, kind } of navLights) {
      s.material.opacity = kind === 'strobe' ? (strobe ? 1 : 0) : kind === 'strobe2' ? (strobe2 ? 1 : 0) : .6 + .3 * Math.abs(Math.sin(T * 2.4));
    }
    const fl = .93 + .07 * Math.sin(T * 26) * Math.sin(T * 12.7);
    for (const p of plumes) p.scale.set(fl, 1, 1);
  });
}
