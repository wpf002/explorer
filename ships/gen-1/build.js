/**
 * GEN-1 Meridian-class — procedural hull.
 *
 * A 1,200 m generation ship: an ice shield at the bow, two counter-rotating habitat
 * rings 240 m across, two farm drums, a foundry amidships, and six fusion nozzles aft.
 *
 * Units are metres. +X is forward (bow), +Y is up, origin is mid-length on the spine.
 */
export default function build(api) {
  const { THREE, mesh, glow, box, cylX, ringFrames, windowStrip, pipe, truss, rcs } = api;
  const { CylinderGeometry, SphereGeometry, CircleGeometry, TorusGeometry } = THREE;

  const navLights = [];
  const nav = (p, x, y, z, c, kind, size = 14) => navLights.push({ s: api.sprite(p, x, y, z, size, c), kind });
  const plumes = [];

  /* ---------------- Bow: ice shield, bridge, shuttle bays (deck Fwd) ---------------- */
  const bow = api.module('bow');
  mesh(cylX(58, 62, 14, 64), 'ice', 'SHD-01', 'hull', bow).position.set(588, 0, 0);
  mesh(cylX(62, 62, 1.6, 64), 'dark', 'SHD-01', 'hull', bow).position.set(580.5, 0, 0);
  for (let i = 0; i < 12; i++) {                                   // shield ribs back to the spine
    const a = i * Math.PI / 6;
    const rib = mesh(box(70, 2.2, 1.6), 'plate', 'Fwd', 'hull', bow);
    rib.position.set(545, Math.cos(a) * 34, Math.sin(a) * 34); rib.rotation.x = -a;
  }
  mesh(cylX(18, 24, 60, 24), 'hull', 'Fwd', 'hull', bow).position.set(540, 0, 0);
  ringFrames(bow, 515, 565, 12, 24.4, 'Fwd');
  // bridge blister under the shield
  mesh(box(26, 10, 22), 'plate', 'Fwd', 'hull', bow).position.set(505, -26, 0);
  const glass = mesh(box(.6, 5, 20), 'glass', 'Fwd', 'hull', bow);
  glass.position.set(517.6, -26, 0); glass.rotation.z = .35;
  mesh(box(24, .4, 20), 'plate', 'CMD-02', 'interior', bow).position.set(505, -29.5, 0);
  for (let i = 0; i < 6; i++) {
    const z = -7.5 + i * 3;
    mesh(box(1.4, 1.2, 1.6), 'interior', 'CMD-02', 'interior', bow).position.set(512, -28.6, z);
    const sc = mesh(box(.1, .8, 1.3), 'screen', 'CMD-02', 'glow', bow);
    sc.position.set(513.4, -27.6, z); sc.rotation.z = -.3;
  }
  mesh(new CylinderGeometry(2.6, 3, .8, 24), 'core', 'CMD-02', 'interior', bow).position.set(502, -29, 0);
  mesh(box(.2, 2.4, 12), 'screen', 'CMD-02', 'glow', bow).position.set(494, -26, 0);
  glow(bow, 505, -26, 0, 26, '#8fe8f5', .3);
  // shuttle bays either side of the spine
  for (const s of [1, -1]) {
    mesh(box(46, 16, 20), 'plate', 'Fwd', 'hull', bow).position.set(500, 6, s * 30);
    mesh(box(42, 12, .6), 'field', 'DCK-03', 'interior', bow).position.set(500, 6, s * 40.2);
    mesh(box(44, .5, 19), 'dark', 'DCK-03', 'interior', bow).position.set(500, -1.6, s * 30);
    for (let k = -2; k <= 2; k++) mesh(box(.5, .12, 18), 'strip', 'DCK-03', 'glow', bow).position.set(500 + k * 9, -1.2, s * 30);
    for (const x of [488, 512]) {
      mesh(cylX(2.4, 2, 9, 14), 'plate', 'DCK-03', 'interior', bow).position.set(x, 2, s * 30);
      mesh(box(4, .3, 11), 'plate', 'DCK-03', 'interior', bow).position.set(x - 1, .4, s * 30);
    }
    mesh(box(44, .6, .6), 'amber', 'Fwd', 'glow', bow).position.set(500, 14.4, s * 40);
    nav(bow, 500, 15, s * 40.6, s > 0 ? '#ff3b4a' : '#3bff7a', 'nav', 12);
  }
  nav(bow, 588, 0, 0, '#ffffff', 'strobe', 16);

  /* ---------------- Spine, farm drums, foundry (deck Spine) ---------------- */
  const spine = api.module('spine');
  mesh(cylX(14, 14, 900, 32), 'hull', 'Spine', 'hull', spine).position.set(60, 0, 0);
  ringFrames(spine, -380, 500, 40, 14.6, 'Spine');
  for (const a of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]) {
    mesh(box(880, 1.2, 1.2), 'strip', 'Spine', 'glow', spine).position.set(60, Math.sin(a) * 14.3, Math.cos(a) * 14.3);
    pipe(spine, -390, 505, Math.sin(a + .4) * 16, Math.cos(a + .4) * 16, 1.4, 'Spine');
  }
  truss(spine, -390, 505, 22, 24, 'Spine');
  // farm drums: two 90 m cylinders that turn with the rings
  const farms = [];
  [[160, 'FRM-01'], [-160, 'FRM-02']].forEach(([x, code], i) => {
    const drum = api.spin(spine, i ? 'farm2' : 'farm1');
    drum.position.x = x;
    mesh(cylX(30, 30, 92, 40), 'hull', code, 'hull', drum);
    mesh(cylX(31, 31, 2, 40), 'dark', code, 'hull', drum).position.x = 45;
    mesh(cylX(31, 31, 2, 40), 'dark', code, 'hull', drum).position.x = -45;
    for (let k = 0; k < 16; k++) {
      const a = k * Math.PI / 8;
      windowStrip(drum, 0, Math.cos(a) * 30.4, Math.sin(a) * 30.4, 86, code, k % 4 === 1 ? 'pink' : 'warm');
      if (k % 4 === 0) {
        const rail = mesh(box(88, .8, 3), 'plate', code, 'hull', drum);
        rail.position.set(0, Math.cos(a) * 31.4, Math.sin(a) * 31.4); rail.rotation.x = -a;
      }
    }
    for (let k = 0; k < 6; k++) {                                   // interior growing terraces
      const a = k * Math.PI / 3;
      for (const xx of [-30, 0, 30]) {
        const tray = mesh(box(26, .5, 14), 'leaf', code, 'interior', drum);
        tray.position.set(xx, Math.cos(a) * 26, Math.sin(a) * 26); tray.rotation.x = -a;
        const lamp = mesh(box(26, .3, 1.4), 'pink', code, 'glow', drum);
        lamp.position.set(xx, Math.cos(a) * 21.5, Math.sin(a) * 21.5); lamp.rotation.x = -a;
      }
    }
    farms.push(drum);
  });
  // foundry and shops amidships
  mesh(box(70, 34, 34), 'plate', 'Spine', 'hull', spine).position.set(0, 0, 0);
  mesh(box(64, .6, 30), 'dark', 'IND-01', 'interior', spine).position.set(0, -14, 0);
  for (let i = 0; i < 5; i++) {
    mesh(box(7, 5, 7), 'interior', 'IND-01', 'interior', spine).position.set(-24 + i * 12, -10.5, -8);
    mesh(box(4, 3.4, 4), 'dark', 'IND-01', 'interior', spine).position.set(-24 + i * 12, -10, 8);
  }
  mesh(new CylinderGeometry(4, 4, 18, 16), 'core', 'IND-01', 'interior', spine).position.set(14, -4, 0);
  for (let k = -1; k <= 1; k++) mesh(box(56, .4, 1.4), 'warm', 'IND-01', 'glow', spine).position.set(0, 14.4, k * 10);
  for (let k = -1; k <= 1; k++) mesh(box(56, .4, 1.2), 'warm', 'IND-01', 'glow', spine).position.set(0, -2, k * 11);
  windowStrip(spine, 0, 6, 17.4, 60, 'IND-01', 'warm'); windowStrip(spine, 0, 6, -17.4, 60, 'IND-01', 'warm');
  // infirmary and archive blisters
  mesh(box(30, 12, 16), 'plate', 'Spine', 'hull', spine).position.set(300, 20, 0);
  windowStrip(spine, 300, 22, 8.2, 26, 'MED-01'); windowStrip(spine, 300, 22, -8.2, 26, 'MED-01');
  for (let i = 0; i < 4; i++) mesh(cylX(1.6, 1.6, 5, 14), 'interior', 'MED-01', 'interior', spine).position.set(290 + i * 6, 18, 0);
  mesh(box(26, 14, 18), 'armor', 'Spine', 'hull', spine).position.set(-300, -20, 0);
  for (let i = 0; i < 6; i++) mesh(box(3, 9, 15), 'dark', 'ARC-01', 'interior', spine).position.set(-310 + i * 4, -20, 0);
  mesh(box(22, .4, .4), 'strip', 'ARC-01', 'glow', spine).position.set(-300, -12.6, 0);
  rcs(spine, 470, 16, 16, 'Spine'); rcs(spine, 470, -16, -16, 'Spine');
  rcs(spine, -350, 16, -16, 'Spine'); rcs(spine, -350, -16, 16, 'Spine');

  /* ---------------- Habitat rings (deck Ring) ---------------- */
  const ringMod = api.module('rings');
  const rings = [];
  [[250, 'ring1', 'RGA-01'], [-60, 'ring2', 'RGB-01']].forEach(([x, node, code], idx) => {
    const spin = api.spin(ringMod, node);
    rings.push(spin);
    spin.position.x = x;
    mesh(new TorusGeometry(118, 15, 20, 120).rotateY(Math.PI / 2), 'hull', 'Ring', 'hull', spin);
    mesh(new TorusGeometry(133, 1.2, 8, 120).rotateY(Math.PI / 2), 'dark', 'Ring', 'hull', spin);
    mesh(new TorusGeometry(103, 1.2, 8, 120).rotateY(Math.PI / 2), 'dark', 'Ring', 'hull', spin);
    mesh(cylX(18, 18, 34, 32), 'dark', 'Ring', 'hull', spin);
    for (let i = 0; i < 6; i++) {                                   // spokes
      const a = i * Math.PI / 3;
      const sp = mesh(new CylinderGeometry(4.5, 4.5, 100, 16), 'plate', 'Ring', 'hull', spin);
      sp.position.set(0, Math.cos(a) * 59, Math.sin(a) * 59); sp.rotation.x = -a;
      const lift = mesh(box(6, 96, 1.2), 'strip', 'Ring', 'glow', spin);
      lift.position.set(4.8, Math.cos(a) * 59, Math.sin(a) * 59); lift.rotation.x = -a;
    }
    for (let i = 0; i < 48; i++) {                                  // township windows and running lights
      const a = i * Math.PI * 2 / 48;
      const commons = idx === 0 && i >= 10 && i < 16;
      const w = mesh(box(9, 1.4, 5.6), commons ? 'strip' : 'warm', commons ? 'RGA-05' : code, 'glow', spin);
      w.position.set(13, Math.cos(a) * 132, Math.sin(a) * 132); w.rotation.x = -a;
      const w2 = mesh(box(9, 1.4, 5.6), commons ? 'strip' : 'warm', commons ? 'RGA-05' : code, 'glow', spin);
      w2.position.set(-13, Math.cos(a) * 132, Math.sin(a) * 132); w2.rotation.x = -a;
      if (i % 8 === 0) {
        const pod = mesh(box(22, 9, 14), 'plate', 'Ring', 'hull', spin);
        pod.position.set(0, Math.cos(a) * 136, Math.sin(a) * 136); pod.rotation.x = -a;
        nav(spin, 0, Math.cos(a) * 142, Math.sin(a) * 142, i % 16 ? '#f0b64a' : '#ffffff', 'nav', 10);
      }
      if (commons && i % 2 === 0) {                                 // commons: glazed roof and parkland
        const roof = mesh(box(16, .6, 12), 'glass', 'RGA-05', 'hull', spin);
        roof.position.set(0, Math.cos(a) * 134, Math.sin(a) * 134); roof.rotation.x = -a;
        const park = mesh(box(15, 1.2, 11), 'leaf', 'RGA-05', 'interior', spin);
        park.position.set(0, Math.cos(a) * 130, Math.sin(a) * 130); park.rotation.x = -a;
      }
    }
  });

  /* ---------------- Engineering: reactors, radiators, drives (deck Eng) ---------------- */
  const eng = api.module('engineering');
  mesh(cylX(26, 26, 90, 28), 'hull', 'Eng', 'hull', eng).position.set(-430, 0, 0);
  ringFrames(eng, -470, -390, 20, 26.6, 'Eng');
  for (let i = 0; i < 3; i++) {
    const x = -400 - i * 30;
    mesh(new TorusGeometry(11, 3.6, 12, 40).rotateY(Math.PI / 2), 'core', 'RCT-01', 'interior', eng).position.set(x, 0, 0);
    glow(eng, x, 0, 0, 44, '#cfefff', .38);
  }
  // radiator banks along the aft spine
  for (const s of [1, -1]) {
    for (let i = 0; i < 3; i++) {
      const p = mesh(box(120, 1.2, 60), 'rad', 'RAD-02', 'hull', eng);
      p.position.set(-250 + i * 130, s * 46, 0); p.rotation.x = s * .25;
      for (let k = 0; k < 5; k++) {
        const strip = mesh(box(118, .3, .9), 'amber', 'RAD-02', 'glow', eng);
        strip.position.set(-250 + i * 130, s * 46.8, -24 + k * 12); strip.rotation.x = s * .25;
      }
    }
    mesh(box(400, 4, 4), 'dark', 'Eng', 'hull', eng).position.set(-120, s * 40, 0);
  }
  // six drive nozzles on a hexagonal frame
  mesh(cylX(26, 34, 26, 6), 'armor', 'Eng', 'hull', eng).position.set(-490, 0, 0);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3, y = Math.cos(a) * 21, z = Math.sin(a) * 21;
    mesh(cylX(8, 9, 30, 20), 'plate', 'Eng', 'hull', eng).position.set(-520, y, z);
    const bell = mesh(new CylinderGeometry(15, 8.5, 34, 28, 1, true), 'plate', 'DRV-01', 'hull', eng);
    bell.position.set(-556, y, z); bell.rotation.z = Math.PI / 2;
    const throat = mesh(new CylinderGeometry(13.6, 7.4, 32, 28, 1, true), 'drive', 'DRV-01', 'glow', eng);
    throat.position.set(-556.5, y, z); throat.rotation.z = Math.PI / 2;
    const disk = mesh(new CircleGeometry(14, 28), 'drive', 'DRV-01', 'glow', eng);
    disk.position.set(-573, y, z); disk.rotation.y = -Math.PI / 2;
    glow(eng, -578, y, z, 64, '#ff9a3c', .5);
    glow(eng, -600, y, z, 150, '#ff6a2a', .16);
    plumes.push(api.plume(eng, -574, y, z, 13, 170));
  }
  nav(eng, -480, 30, 0, '#ffffff', 'strobe2', 16);

  /* ---------------- Room markers ---------------- */
  api.room('SHD-01', bow, [588, 36, 0]);
  api.room('CMD-02', bow, [505, -34, 0]);
  api.room('DCK-03', bow, [500, 6, 34]);
  api.room('MED-01', spine, [300, 30, 0]);
  api.room('IND-01', spine, [0, 22, 0]);
  api.room('ARC-01', spine, [-300, -30, 0]);
  api.room('FRM-01', farms[0], [0, 34, 0]);
  api.room('FRM-02', farms[1], [0, 34, 0]);
  api.room('RGA-01', rings[0], [0, -132, 0]);
  api.room('RGA-05', rings[0], [0, 0, 132]);
  api.room('RGB-01', rings[1], [0, -132, 0]);
  api.room('RCT-01', eng, [-430, 34, 0]);
  api.room('RAD-02', eng, [-120, 52, 0]);
  api.room('DRV-01', eng, [-540, 0, 0]);

  api.animate(T => {
    const strobe = (T % 2) < .1, strobe2 = ((T + 1) % 2) < .1;
    for (const { s, kind } of navLights) {
      s.material.opacity = kind === 'strobe' ? (strobe ? 1 : 0) : kind === 'strobe2' ? (strobe2 ? 1 : 0) : .5 + .4 * Math.abs(Math.sin(T * 1.6));
    }
    const fl = .96 + .04 * Math.sin(T * 19) * Math.sin(T * 9.3);
    for (const p of plumes) p.scale.set(fl, 1, 1);
  });
}
