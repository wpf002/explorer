/**
 * International Space Station, assembly complete.
 *
 * The 109 m integrated truss runs along X; the pressurised modules run along Z, crossing it
 * at Unity. Eight solar array wings, three radiator panels, Canadarm2 on the mobile base.
 *
 * Units are metres. +X is the starboard end of the truss, +Y is zenith.
 */
export default function build(api) {
  const { THREE, mesh, glow, box, cylX, truss } = api;
  const { CylinderGeometry, SphereGeometry, TorusGeometry } = THREE;

  const navLights = [];
  const nav = (p, x, y, z, c, kind, size = 1.6) => navLights.push({ s: api.sprite(p, x, y, z, size, c), kind });

  /* ---------------- Integrated truss (deck Truss) ---------------- */
  const tr = api.module('truss');
  truss(tr, -54, 54, 2.3, 24, 'Truss');
  for (let i = -5; i <= 5; i++) {
    mesh(box(1.6, 3.6, 3.6), 'alum', 'Truss', 'hull', tr).position.set(i * 9, 0, 0);
    if (i % 2 === 0) mesh(box(.5, .18, .18), 'strip', 'Truss', 'glow', tr).position.set(i * 9, 1.9, 0);
  }
  mesh(box(108, .8, .8), 'alum', 'Truss', 'hull', tr).position.set(0, 0, 0);
  // solar array wings: four pairs, gold cells on a mast
  for (const [x, s] of [[-46, 1], [-46, -1], [-34, 1], [-34, -1], [34, 1], [34, -1], [46, 1], [46, -1]]) {
    const mast = mesh(cylX(.35, .3, 2.6, 10), 'alum', 'SOL-01', 'hull', tr);
    mast.position.set(x, s * 2.4, 0);
    const wing = mesh(box(2.6, .12, 34), 'cell', 'SOL-01', 'hull', tr);
    wing.position.set(x, s * 4.2, s * 17.6);
    for (let k = 0; k < 7; k++) mesh(box(2.7, .16, .2), 'alum', 'SOL-01', 'hull', tr).position.set(x, s * 4.24, s * (2 + k * 5));
    mesh(box(3, .3, .5), 'alum', 'SOL-01', 'hull', tr).position.set(x, s * 4.2, s * .8);
  }
  // rotary joints at the array pairs
  for (const x of [-40, 40]) mesh(new CylinderGeometry(2.4, 2.4, 1.4, 20).rotateZ(Math.PI / 2), 'alum', 'SAR-02', 'hull', tr).position.set(x, 0, 0);
  // thermal radiators, zenith side of the mid truss
  for (const [x, s] of [[-14, 1], [0, 1], [14, 1]]) {
    for (let k = 0; k < 3; k++) {
      const r = mesh(box(3.4, .14, 11), 'radiator', 'RAD-03', 'hull', tr);
      r.position.set(x + k * .3, s * (6 + k * 3.4), s * 5.6); r.rotation.x = -s * .36;
    }
    mesh(box(4, 2, 2), 'alum', 'RAD-03', 'hull', tr).position.set(x, s * 2.4, 0);
  }
  // mobile base and Canadarm2
  const arm = api.group(tr, [8, 2.6, 0], { animated: true });
  mesh(box(4.4, 1, 4.4), 'alum', 'ARM-04', 'hull', arm);
  mesh(new CylinderGeometry(.7, .7, 1.2, 14), 'white', 'ARM-04', 'hull', arm).position.set(0, 1, 0);
  const seg1 = mesh(new CylinderGeometry(.4, .4, 7.6, 12), 'white', 'ARM-04', 'hull', arm);
  seg1.position.set(-2.4, 4.4, 1.4); seg1.rotation.z = .9; seg1.rotation.x = -.25;
  const seg2 = mesh(new CylinderGeometry(.38, .38, 7.6, 12), 'white', 'ARM-04', 'hull', arm);
  seg2.position.set(-6.4, 7.4, 4.2); seg2.rotation.z = -.7; seg2.rotation.x = -.5;
  mesh(new CylinderGeometry(.5, .5, 1, 12), 'white', 'ARM-04', 'hull', arm).position.set(-8.6, 8.6, 6.4);
  mesh(box(.4, .12, .12), 'amber', 'ARM-04', 'glow', arm).position.set(-8.9, 8.8, 6.6);
  nav(tr, -54, 1.8, 0, '#ff4d5a', 'beacon');
  nav(tr, 54, 1.8, 0, '#3bff7a', 'beacon');

  /* ---------------- Pressurised modules (deck US / RS) ---------------- */
  const mods = api.module('modules');
  const can = (name, deck, x, z, len, r, mat) => {
    const m = mesh(new CylinderGeometry(r, r, len, 24).rotateX(Math.PI / 2), mat, deck, 'hull', mods);
    m.position.set(x, -2.6, z);
    for (const e of [-1, 1]) mesh(new TorusGeometry(r, .12, 8, 28).rotateX(Math.PI / 2), 'alum', deck, 'hull', mods).position.set(x, -2.6, z + e * len / 2);
    return m;
  };
  can('lab', 'DST-01', 0, 6, 8.5, 2.2, 'white');          // Destiny
  can('node1', 'UNI-02', 0, -1.4, 5.5, 2.2, 'white');     // Unity
  can('node2', 'HRM-03', 0, 14, 7.2, 2.2, 'white');       // Harmony
  can('zvezda', 'ZVZ-04', 0, -12, 13, 2.2, 'russ');       // Zvezda
  can('zarya', 'ZVZ-04', 0, -22, 12.6, 2.1, 'russ');      // Zarya
  // Columbus and Kibo, outboard of Harmony
  const columbus = mesh(new CylinderGeometry(2.2, 2.2, 6.8, 24).rotateZ(Math.PI / 2), 'white', 'COL-05', 'hull', mods);
  columbus.position.set(5.4, -2.6, 14);
  const kibo = mesh(new CylinderGeometry(2.2, 2.2, 11, 24).rotateZ(Math.PI / 2), 'white', 'KIB-06', 'hull', mods);
  kibo.position.set(-7.2, -2.6, 14);
  mesh(new CylinderGeometry(2, 2, 4, 20).rotateZ(Math.PI / 2), 'white', 'KIB-06', 'hull', mods).position.set(-7.2, 1.4, 14);
  mesh(box(5.6, .3, 4.4), 'alum', 'KIB-06', 'interior', mods).position.set(-10.5, -2.6, 17.6);   // exposed facility
  // Tranquility, Quest airlock and the cupola
  const tranq = mesh(new CylinderGeometry(2.2, 2.2, 6.7, 24).rotateZ(Math.PI / 2), 'white', 'CUP-07', 'hull', mods);
  tranq.position.set(-6, -2.6, -1.4);
  mesh(new CylinderGeometry(1.5, 1.5, 1.5, 12), 'white', 'CUP-07', 'hull', mods).position.set(-6, -4.6, -1.4);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    const p = mesh(box(.9, .9, .1), 'glass', 'CUP-07', 'hull', mods);
    p.position.set(-6 + Math.cos(a) * 1.5, -5.2, -1.4 + Math.sin(a) * 1.5); p.rotation.y = -a;
  }
  mesh(new CylinderGeometry(1.4, 1.4, .2, 20), 'glass', 'CUP-07', 'hull', mods).position.set(-6, -5.5, -1.4);
  glow(mods, -6, -5.8, -1.4, 4, '#8fe8f5', .3);
  const quest = mesh(new CylinderGeometry(2, 2, 5.5, 20).rotateZ(Math.PI / 2), 'white', 'QST-08', 'hull', mods);
  quest.position.set(6, -2.6, -1.4);
  mesh(new CylinderGeometry(1.4, 1.4, 1.8, 16).rotateZ(Math.PI / 2), 'alum', 'QST-08', 'hull', mods).position.set(9.2, -2.6, -1.4);
  // docking ports at each end of the stack
  for (const [x, z] of [[0, 18.2], [0, -29], [3.4, 14]]) {
    mesh(new CylinderGeometry(.85, .85, .9, 18).rotateX(Math.PI / 2), 'alum', 'PMA-09', 'hull', mods).position.set(x, -2.6, z);
    mesh(new TorusGeometry(.85, .1, 8, 24).rotateX(Math.PI / 2), 'strip', 'PMA-09', 'glow', mods).position.set(x, -2.6, z + .5);
  }
  // Destiny's interior: racks down both walls and the window
  mesh(box(3.4, .2, 8), 'interior', 'DST-01', 'interior', mods).position.set(0, -4.4, 6);
  for (let i = 0; i < 5; i++) for (const s of [1, -1]) {
    mesh(box(.5, 2.2, 1.3), 'rack', 'DST-01', 'interior', mods).position.set(s * 1.6, -2.8, 3 + i * 1.5);
    if (i % 2 === 0) mesh(box(.06, .3, 1), 'screen', 'DST-01', 'glow', mods).position.set(s * 1.3, -2.2, 3 + i * 1.5);
  }
  mesh(new CylinderGeometry(.26, .26, .2, 20).rotateX(Math.PI / 2), 'glass', 'DST-01', 'hull', mods).position.set(0, -4.75, 6);
  mesh(box(7, .1, .3), 'warm', 'DST-01', 'glow', mods).position.set(0, -.9, 6);
  nav(mods, 0, -.4, 18.6, '#ffffff', 'strobe');

  /* ---------------- Room markers ---------------- */
  api.room('SOL-01', tr, [-40, 9, 0]);
  api.room('SAR-02', tr, [40, 5, 0]);
  api.room('RAD-03', tr, [0, 13, 8]);
  api.room('ARM-04', arm, [-6, 9, 4]);
  api.room('DST-01', mods, [0, 1.4, 6]);
  api.room('UNI-02', mods, [0, 1.4, -1.4]);
  api.room('HRM-03', mods, [0, 1.4, 14]);
  api.room('ZVZ-04', mods, [0, 1.4, -14]);
  api.room('COL-05', mods, [7.4, 0.4, 14]);
  api.room('KIB-06', mods, [-9.4, 4.6, 14]);
  api.room('CUP-07', mods, [-6, -7.4, -1.4]);
  api.room('QST-08', mods, [9.6, 0.4, -1.4]);
  api.room('PMA-09', mods, [0, 0.4, 19.6]);

  api.animate(T => {
    const strobe = (T % 1.6) < .1, beacon = .4 + .6 * Math.abs(Math.sin(T * 1.2));
    for (const { s, kind } of navLights) s.material.opacity = kind === 'strobe' ? (strobe ? 1 : 0) : beacon;
  });
}
