/**
 * ASV-07 Dome-class — procedural hull.
 *
 * Everything ship-specific lives here. The script imports nothing: the viewer hands it a
 * BuildApi with three.js, the declared materials and the tagging helpers, so mesh names
 * come out as hull_<deck>_*, int_<room|deck>_*, glow_*, room_<CODE>, spin_ring, mod_<id>.
 *
 * Units are metres. +X is forward (bow), +Y is up, origin is mid-length on the spine.
 */
export default function build(api) {
  const { THREE, mesh, glow, box, cylX, coneX, ringFrames, windowStrip, pipe, rcs, truss, bar } = api;
  const {
    BoxGeometry, CircleGeometry, CylinderGeometry, IcosahedronGeometry, SphereGeometry,
    TorusGeometry, Vector3,
  } = THREE;
  void BoxGeometry; void bar;

  const navLights = [];
  const navLight = (parent, x, y, z, color, kind) => {
    const s = api.sprite(parent, x, y, z, 4, color);
    navLights.push({ s, kind });
    return s;
  };
  const plumes = [];
  const plume = (parent, x, y, z, r, len) => { plumes.push(api.plume(parent, x, y, z, r, len)); };

  /* ---------------- Command module (deck A) ---------------- */
  const cmd = api.module('command');
  mesh(cylX(11, 12.5, 40, 40), 'hull', 'A', 'hull', cmd).position.x = 108;
  mesh(cylX(11.2, 11.2, 4, 40), 'dark', 'A', 'hull', cmd).position.x = 90;
  mesh(cylX(12.5, 9, 8, 40), 'plate', 'A', 'hull', cmd).position.x = 130;
  ringFrames(cmd, 94, 126, 8, 12.8, 'A');
  mesh(coneX(9, 22, 40), 'glass', 'A', 'hull', cmd).position.x = 143;                       // observation nose
  [[133, 7.5], [137.5, 5.5], [142, 3.3]].forEach(([x, r]) =>
    mesh(cylX(r, r, .5, 32), 'interior', 'CMD-04', 'interior', cmd).position.x = x);         // viewing tiers
  mesh(cylX(.6, .6, 26, 8), 'dark', 'A', 'hull', cmd).position.x = 150;                      // nose spar
  glow(cmd, 153, 0, 0, 10, '#bff6ff', .9);

  // bridge dome + halo
  mesh(new SphereGeometry(9, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2), 'glass', 'A', 'hull', cmd).position.set(112, 9.5, 0);
  mesh(new CylinderGeometry(9.6, 10.2, 2.6, 40), 'dark', 'A', 'hull', cmd).position.set(112, 9.2, 0);
  mesh(new TorusGeometry(9.8, .25, 8, 64).rotateX(Math.PI / 2), 'strip', 'A', 'glow', cmd).position.set(112, 10.6, 0);
  mesh(new CylinderGeometry(8.7, 8.7, .3, 40), 'plate', 'CMD-01', 'interior', cmd).position.set(112, 9.85, 0);
  mesh(new CylinderGeometry(2.2, 2.6, 1.2, 24), 'core', 'CMD-01', 'interior', cmd).position.set(112, 10.6, 0); // holotable
  const holo = api.wireframe(cmd, new IcosahedronGeometry(1.6, 1), '#8fe8f5', .55);
  holo.position.set(112, 12.6, 0);

  for (let i = 0; i < 11; i++) { // console, screen angled at the table, seat behind
    const a = Math.PI * (-.4 + .8 * i / 10);
    const c = mesh(box(.9, 1.0, 1.5), 'interior', 'CMD-01', 'interior', cmd);
    c.position.set(112 + Math.cos(a) * 6.2, 10.5, Math.sin(a) * 6.2); c.rotation.y = -a;
    const sc = mesh(box(.06, .7, 1.3), 'screen', 'CMD-01', 'glow', cmd);
    sc.position.set(112 + Math.cos(a) * 5.75, 11.25, Math.sin(a) * 5.75); sc.rotation.y = -a;
    const st = mesh(box(.8, 1.1, .8), 'dark', 'CMD-01', 'interior', cmd);
    st.position.set(112 + Math.cos(a) * 7.5, 10.55, Math.sin(a) * 7.5); st.rotation.y = -a;
  }
  [-1, 1].forEach(sg => { // rear situation boards
    const w = mesh(box(3.2, 1.8, .08), 'screen', 'CMD-01', 'glow', cmd);
    w.position.set(104.6, 12, sg * 4.6); w.rotation.y = Math.PI / 2 + sg * .25;
  });
  glow(cmd, 112, 12, 0, 22, '#8fe8f5', .45);

  // comms mast, sensor dish, thruster quads, nav strobe
  mesh(new CylinderGeometry(.35, .5, 9, 8), 'bare', 'A', 'hull', cmd).position.set(98, 16, 0);
  const dish = mesh(new CylinderGeometry(3.6, 1.2, 1.3, 28, 1, true), 'plate', 'A', 'hull', cmd);
  dish.position.set(98, 21, 0); dish.rotation.z = -Math.PI / 4; dish.rotation.x = Math.PI / 8;
  for (let i = 0; i < 3; i++) mesh(box(.5, 3 + i, .5), 'bare', 'A', 'hull', cmd).position.set(120 + i * 3, 12.5 + (3 + i) / 2, 8);
  rcs(cmd, 95, 9.5, 9.5, 'A'); rcs(cmd, 95, -9.5, -9.5, 'A'); rcs(cmd, 127, 10.8, -8, 'A'); rcs(cmd, 127, -10.8, 8, 'A');
  pipe(cmd, 91, 127, -9.6, 6.4, .55, 'A'); pipe(cmd, 91, 127, -9.6, -6.4, .55, 'A');
  navLight(cmd, 112, 19.2, 0, '#ffffff', 'strobe');
  navLight(cmd, 98, 25.6, 0, '#ff4d5a', 'beacon');

  windowStrip(cmd, 108, 6, 10.6, 26, 'A'); windowStrip(cmd, 108, 6, -10.6, 26, 'A');
  windowStrip(cmd, 108, -4, 11.3, 18, 'A', 'warm'); windowStrip(cmd, 108, -4, -11.3, 18, 'A', 'warm');

  /* ---------------- Forward hull (deck B) ---------------- */
  const fwd = api.module('forward');
  mesh(cylX(14, 14, 80, 48), 'hull', 'B', 'hull', fwd).position.x = 50;
  mesh(cylX(14.6, 11.6, 6, 48), 'dark', 'B', 'hull', fwd).position.x = 91;
  mesh(cylX(9, 14.6, 8, 48), 'dark', 'B', 'hull', fwd).position.x = 8;
  ringFrames(fwd, 16, 88, 12, 14.4, 'B');
  for (let i = 0; i < 4; i++) mesh(box(14, 3, 5), 'plate', 'B', 'hull', fwd).position.set(24 + i * 18, 14.6, i % 2 ? 4 : -4);
  mesh(box(30, 2.2, 8), 'plate', 'B', 'hull', fwd).position.set(60, -14.4, 0);
  [.6, -.6].forEach(s => mesh(box(46, 1, 3), 'dark', 'B', 'hull', fwd).position.set(50, 6 * s, 14.2 * Math.sign(s)));
  windowStrip(fwd, 50, 4, 14.2, 70, 'B'); windowStrip(fwd, 50, 4, -14.2, 70, 'B');
  windowStrip(fwd, 44, -6, 13.0, 40, 'B', 'warm'); windowStrip(fwd, 44, -6, -13.0, 40, 'B', 'warm');

  // science lab cells
  for (let i = 0; i < 4; i++) mesh(box(3.2, 3, 3.2), 'interior', 'FWD-06', 'interior', fwd).position.set(35 + (i % 2) * 5, -4, 3.5 + Math.floor(i / 2) * 5);
  mesh(new CylinderGeometry(1.2, 1.2, 3, 16), 'core', 'FWD-06', 'interior', fwd).position.set(40, -4, 6.5);
  // life support scrubber stacks
  for (let i = 0; i < 3; i++) mesh(new CylinderGeometry(1.6, 1.6, 7, 16), 'interior', 'FWD-22', 'interior', fwd).position.set(16 + i * 4, -6, -5);
  mesh(box(14, 1.2, 6), 'core', 'FWD-22', 'interior', fwd).position.set(20, -10, -5);
  // medical bay — six surgical pods, cryo cabinets along both walls, sterile field in the middle
  mesh(box(18, .3, 12), 'plate', 'FWD-11', 'interior', fwd).position.set(64, 4.9, 0);
  for (let i = 0; i < 6; i++) {
    const px = 57 + (i % 3) * 5.2, pz = i < 3 ? -3.4 : 3.4;
    mesh(cylX(.85, .85, 2.8, 18), 'interior', 'FWD-11', 'interior', fwd).position.set(px, 5.8, pz);
    const lid = mesh(new CylinderGeometry(.95, .95, 2.6, 18, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(Math.PI / 2), 'glass', 'FWD-11', 'hull', fwd);
    lid.position.set(px, 5.9, pz);
    mesh(box(.5, .12, .12), i % 2 ? 'strip' : 'warm', 'FWD-11', 'glow', fwd).position.set(px - 1.2, 6.7, pz);
    mesh(box(.9, .7, .9), 'dark', 'FWD-11', 'interior', fwd).position.set(px, 5.4, pz);
  }
  mesh(new CylinderGeometry(1.4, 1.4, .9, 20), 'core', 'FWD-11', 'interior', fwd).position.set(64, 5.5, 0);
  for (let i = 0; i < 9; i++) [-1, 1].forEach(sg => {
    mesh(box(1.1, 2.2, .6), 'dark', 'FWD-11', 'interior', fwd).position.set(56 + i * 2, 6.2, sg * 7.4);
    mesh(box(.5, .08, .06), 'strip', 'FWD-11', 'glow', fwd).position.set(56 + i * 2, 7.0, sg * 7.05);
  });
  glow(fwd, 40, -4, 6.5, 10, '#8fe8f5', .35);

  pipe(fwd, 14, 86, 13.2, 4.2, .7, 'B'); pipe(fwd, 14, 86, 13.2, -4.2, .7, 'B'); pipe(fwd, 14, 86, -12.2, 7.2, .5, 'B');
  for (let x = 20; x <= 80; x += 20) {
    const c = mesh(new TorusGeometry(.9, .3, 8, 16), 'bare', 'B', 'hull', fwd);
    c.position.set(x, 13.2, 4.2); c.rotation.y = Math.PI / 2;
  }
  rcs(fwd, 16, 10.5, 10.5, 'B'); rcs(fwd, 16, -10.5, -10.5, 'B'); rcs(fwd, 84, 10.5, -10.5, 'B'); rcs(fwd, 84, -10.5, 10.5, 'B');
  // heat radiator wings, folded flat against the hull
  [1, -1].forEach(sg => {
    mesh(box(36, .4, 9), 'plate', 'B', 'hull', fwd).position.set(48, -1, sg * 19);
    mesh(box(36.6, .2, .6), 'fin', 'B', 'hull', fwd).position.set(48, -1, sg * 23.6);
    pipe(fwd, 30, 66, -1, sg * 14.6, .45, 'B');
  });
  navLight(fwd, 48, -1, 24.3, '#ff3b4a', 'port');
  navLight(fwd, 48, -1, -24.3, '#3bff7a', 'starboard');

  /* ---------------- Spinal corridor (deck B) ---------------- */
  const spine = api.module('spine');
  mesh(cylX(5, 5, 82, 24), 'hull', 'B', 'hull', spine).position.x = -30;
  ringFrames(spine, -66, 6, 9, 5.3, 'B');
  [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2].forEach(a =>
    mesh(box(80, .4, .4), 'strip', 'B', 'glow', spine).position.set(-30, Math.sin(a) * 5.15, Math.cos(a) * 5.15));
  mesh(box(2.2, .8, 1.4), 'core', 'SPN-01', 'interior', spine).position.set(-12, -3.6, 0);  // maglev sleds
  mesh(box(2.2, .8, 1.4), 'core', 'SPN-01', 'interior', spine).position.set(-48, 3.6, 0);
  for (let x = -60; x <= 0; x += 20) {                                        // bulkheads, open at the hatch
    for (const [y, z, h, d] of [[2.9, 0, 1.2, 7], [-2.9, 0, 1.2, 7], [0, 2.9, 4.6, 1.2], [0, -2.9, 4.6, 1.2]]) {
      mesh(box(.6, h, d), 'dark', 'B', 'hull', spine).position.set(x, y, z);
    }
    mesh(new THREE.TorusGeometry(2.4, .16, 8, 28).rotateY(Math.PI / 2), 'bare', 'SPN-01', 'interior', spine).position.set(x + .5, 0, 0);
    mesh(box(.14, .1, 3.6), 'strip', 'SPN-01', 'glow', spine).position.set(x + .6, 2.5, 0);
  }
  // corridor fit-out: deck plates, twin rails, hand rails, wall panels
  mesh(box(78, .25, 4.2), 'plate', 'SPN-01', 'interior', spine).position.set(-30, -3.2, 0);
  for (const z of [-1.5, 1.5]) mesh(box(78, .16, .5), 'bare', 'SPN-01', 'interior', spine).position.set(-30, -3, z);
  for (const z of [-3, 3]) {
    mesh(cylX(.1, .1, 78, 8), 'bare', 'SPN-01', 'interior', spine).position.set(-30, -.8, z);
    for (let x = -66; x <= 4; x += 7) mesh(box(.18, 2.2, .18), 'bare', 'SPN-01', 'interior', spine).position.set(x, -2.1, z);
  }
  for (let x = -64; x <= 2; x += 8) {
    for (const z of [3.7, -3.7]) mesh(box(3.4, 2.2, .18), 'interior', 'SPN-01', 'interior', spine).position.set(x, -.4, z);
    mesh(box(.45, .3, .08), 'screen', 'SPN-01', 'glow', spine).position.set(x, .7, 3.6);
  }
  [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4].forEach(a =>
    pipe(spine, -70, 10, Math.sin(a) * 6.1, Math.cos(a) * 6.1, .6, 'B'));
  truss(spine, -70, 10, 8.6, 10, 'B');

  /* ---------------- Habitat ring ---------------- */
  const ringMod = api.module('ring');
  const ringSpin = api.spin(ringMod, 'ring');
  ringSpin.position.x = -25;
  mesh(new TorusGeometry(45, 5.5, 20, 120).rotateY(Math.PI / 2), 'hull', 'Ring', 'hull', ringSpin);
  mesh(new TorusGeometry(51, .5, 8, 120).rotateY(Math.PI / 2), 'dark', 'Ring', 'hull', ringSpin);
  mesh(new TorusGeometry(39, .5, 8, 120).rotateY(Math.PI / 2), 'dark', 'Ring', 'hull', ringSpin);
  // Open-ended: the spine runs straight through the hub, so the corridor reads end to end.
  mesh(cylX(7.5, 7.5, 16, 32, true), 'dark', 'Ring', 'hull', ringSpin);
  for (const x of [-7, 0, 7]) mesh(new TorusGeometry(5.6, .16, 8, 36).rotateY(Math.PI / 2), 'warm', 'SPN-01', 'glow', ringSpin).position.x = x;
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    const sp = mesh(new CylinderGeometry(1.7, 1.7, 40, 12), 'plate', 'Ring', 'hull', ringSpin);
    sp.position.set(0, Math.cos(a) * 24, Math.sin(a) * 24); sp.rotation.x = -a;
  }
  for (let i = 0; i < 24; i++) {
    const a = i * Math.PI * 2 / 24, hydro = i >= 3 && i < 9;
    const w = mesh(box(3.2, .5, 2.4), hydro ? 'pink' : 'strip', 'Ring', 'glow', ringSpin);
    w.position.set(5.6, Math.cos(a) * 45.5, Math.sin(a) * 45.5); w.rotation.x = -a;
    const w2 = mesh(box(3.2, .5, 2.4), hydro ? 'pink' : 'warm', 'Ring', 'glow', ringSpin);
    w2.position.set(-5.6, Math.cos(a) * 45.5, Math.sin(a) * 45.5); w2.rotation.x = -a;
    if (i % 6 === 0) {
      const mk = mesh(box(1.6, 1.6, .6), 'fin', 'Ring', 'hull', ringSpin);
      mk.position.set(0, Math.cos(a) * 51, Math.sin(a) * 51); mk.rotation.x = -a;
    }
  }
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + Math.PI / 8;
    const b = mesh(box(9, 3, 6), 'plate', 'Ring', 'hull', ringSpin);
    b.position.set(0, Math.cos(a) * 50.5, Math.sin(a) * 50.5); b.rotation.x = -a;
  }
  // hydroponics: growth racks stand on the outer rim (spin gravity points outward), LED canopies above each shelf
  for (let i = 0; i < 6; i++) {
    const a = (3.5 + i) * Math.PI * 2 / 24;
    for (let k = 0; k < 3; k++) {
      const rr = 48.2 - k * 2.2;
      const sh = mesh(box(7.6, .14, 3.4), 'bare', 'RNG-05', 'interior', ringSpin);
      sh.position.set(0, Math.cos(a) * rr, Math.sin(a) * rr); sh.rotation.x = a;
      const lf = mesh(box(7, .7, 2.8), 'leaf', 'RNG-05', 'interior', ringSpin);
      lf.position.set(0, Math.cos(a) * (rr - .45), Math.sin(a) * (rr - .45)); lf.rotation.x = a;
      const led = mesh(box(7.2, .1, .5), 'pink', 'RNG-05', 'glow', ringSpin);
      led.position.set(0, Math.cos(a) * (rr - 1.7), Math.sin(a) * (rr - 1.7)); led.rotation.x = a;
    }
  }

  /* ---------------- Cargo hold + hangar (deck C) ---------------- */
  const cargo = api.module('cargo');
  mesh(cylX(16, 16, 32, 8), 'hull', 'C', 'hull', cargo).position.x = -85;
  mesh(cylX(12, 16.5, 5, 8), 'dark', 'C', 'hull', cargo).position.x = -66.5;
  mesh(cylX(16.5, 12, 5, 8), 'dark', 'C', 'hull', cargo).position.x = -103.5;
  for (let x = -98; x <= -72; x += 13) mesh(new TorusGeometry(16.6, .6, 6, 8).rotateY(Math.PI / 2), 'dark', 'C', 'hull', cargo).position.x = x;
  // containers in a hex-ish grid
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
    const solid = (r + c) % 3;
    mesh(box(4.8, 2.6, 2.6), solid ? 'interior' : 'amber', 'CRG-01', solid ? 'interior' : 'glow', cargo)
      .position.set(-96 + c * 5.5, -7 + r * 3.2, r % 2 ? 1.5 : -1.5);
  }
  // hangar bay pod on the +Z side
  mesh(box(22, 12, 14), 'plate', 'C', 'hull', cargo).position.set(-85, -2, 20);
  [[0, 5.2, 22.6, 2.2], [0, -9.2, 22.6, 2.2], [-10.2, -2, 2.2, 12.6], [10.2, -2, 2.2, 12.6]].forEach(([dx, dy, w, h]) =>
    mesh(box(w, h, 1), 'dark', 'C', 'hull', cargo).position.set(-85 + dx, dy, 27.2));            // door frame
  mesh(box(18, 9, .3), 'field', 'CRG-03', 'interior', cargo).position.set(-85, -2, 27.6);        // force-field curtain
  mesh(box(21.4, .3, 13.4), 'dark', 'CRG-03', 'interior', cargo).position.set(-85, -7.85, 20);   // hangar deck
  for (let k = -2; k <= 2; k++) mesh(box(.15, .05, 13), 'strip', 'CRG-03', 'glow', cargo).position.set(-85 + k * 4.4, -7.65, 20);
  const pad = api.group(cargo, [-85, -7.5, 20], { animated: true });
  mesh(new CylinderGeometry(5.6, 5.6, .5, 40), 'plate', 'CRG-03', 'interior', pad);
  mesh(new TorusGeometry(5.4, .12, 8, 64).rotateX(Math.PI / 2), 'strip', 'CRG-03', 'glow', pad).position.y = .28;
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4;
    const ch = mesh(box(.5, .06, 2.4), 'amber', 'CRG-03', 'glow', pad);
    ch.position.set(Math.cos(a) * 4.2, .28, Math.sin(a) * 4.2); ch.rotation.y = -a;
  }
  // Trade-Wind-class: fuselage, canopy, swept wings, twin tails
  const shuttle = (parent, x, y, z, ry) => {
    const g = api.group(parent, [x, y, z]);
    g.rotation.y = ry;
    mesh(cylX(1.1, .9, 6.5, 16), 'plate', 'CRG-03', 'interior', g);
    mesh(coneX(.9, 2.2, 16), 'plate', 'CRG-03', 'interior', g).position.x = 4.3;
    const can = mesh(new SphereGeometry(.8, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 'glass', 'CRG-03', 'hull', g);
    can.position.set(2.2, .7, 0); can.scale.set(1.6, 1, 1);
    mesh(box(2.6, .14, 7), 'plate', 'CRG-03', 'interior', g).position.set(-.8, -.3, 0);
    [-1, 1].forEach(sg => {
      const t = mesh(box(1.4, 1.6, .12), 'plate', 'CRG-03', 'interior', g);
      t.position.set(-2.6, .9, sg * 1.4); t.rotation.x = -sg * .35;
    });
    [-1, 1].forEach(sg => mesh(new CylinderGeometry(.35, .45, 1, 10).rotateZ(Math.PI / 2), 'drive', 'CRG-03', 'glow', g)
      .position.set(-3.5, -.2, sg * .7));
    return g;
  };
  shuttle(cargo, -90.5, -6.2, 20, -Math.PI / 2);
  shuttle(cargo, -79.5, -6.2, 20, -Math.PI / 2);

  const drone = api.group(cargo, [-85, -3.5, 15.5]);
  mesh(box(1.4, .8, 1.4), 'dark', 'CRG-03', 'interior', drone);
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + Math.PI / 4;
    const arm = mesh(box(2.6, .12, .12), 'bare', 'CRG-03', 'interior', drone);
    arm.position.set(Math.cos(a) * 1.2, .2, Math.sin(a) * 1.2); arm.rotation.y = -a;
    mesh(new CylinderGeometry(.55, .55, .08, 12), 'interior', 'CRG-03', 'interior', drone)
      .position.set(Math.cos(a) * 2.3, .32, Math.sin(a) * 2.3);
  }
  [15.2, 24.8].forEach(z => pipe(cargo, -95.5, -74.5, 3.4, z, .22, 'C'));                        // gantry rails
  const gantry = api.group(cargo, [-88, 3.1, 20], { animated: true });
  mesh(box(.6, .5, 10.2), 'bare', 'CRG-01', 'interior', gantry);
  mesh(box(1.2, 1.2, 1.2), 'dark', 'CRG-01', 'interior', gantry).position.y = -.8;
  for (let k = -1; k <= 1; k++) mesh(box(5, .1, .6), 'warm', 'CRG-01', 'glow', cargo).position.set(-85 + k * 7, 3.8, 20);
  glow(cargo, -85, -2, 28.5, 24, '#8fe8f5', .4);
  pipe(cargo, -101, -69, 15.6, 3, .8, 'C'); pipe(cargo, -101, -69, 15.6, -3, .8, 'C'); pipe(cargo, -101, -69, -15.6, 0, .8, 'C');
  rcs(cargo, -72, 12, 12, 'C'); rcs(cargo, -98, -12, -12, 'C');
  for (let i = 0; i < 3; i++) mesh(new CylinderGeometry(2.2, 2.2, .6, 24), 'dark', 'C', 'hull', cargo).position.set(-92 + i * 7, 16.1, -9);
  mesh(box(14, .35, .35), 'amber', 'C', 'glow', cargo).position.set(-85, 4.3, 27.8);              // hangar approach lights

  /* ---------------- Reactor (deck C) ---------------- */
  const reactor = api.module('reactor');
  mesh(cylX(10, 10, 18, 32), 'hull', 'C', 'hull', reactor).position.x = -111;
  ringFrames(reactor, -118, -104, 7, 10.3, 'C');
  mesh(new TorusGeometry(4.2, 1.6, 12, 40).rotateY(Math.PI / 2), 'core', 'RCT-01', 'interior', reactor).position.x = -111;
  glow(reactor, -111, 0, 0, 30, '#cfefff', .55);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    const f = mesh(box(8, 16, .3), 'fin', 'C', 'hull', reactor);
    f.position.set(-111, Math.cos(a) * 18.5, Math.sin(a) * 18.5); f.rotation.x = -a;
  }
  mesh(cylX(10.5, 7.5, 4, 32), 'dark', 'C', 'hull', reactor).position.x = -122;
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    pipe(reactor, -117, -105, Math.cos(a) * 10.6, Math.sin(a) * 10.6, .5, 'C');
  }
  mesh(new TorusGeometry(10.8, .5, 8, 48).rotateY(Math.PI / 2), 'bare', 'C', 'hull', reactor).position.x = -111;

  /* ---------------- Engine room (deck C) ---------------- */
  const eng = api.module('engine');
  truss(eng, -124, -132, 7.2, 3, 'C');
  pipe(eng, -124, -132, 3, 0, .9, 'C', 'plate'); pipe(eng, -124, -132, -3, 0, .9, 'C', 'plate');
  pipe(eng, -124, -132, 0, 3.2, .6, 'C'); pipe(eng, -124, -132, 0, -3.2, .6, 'C');
  mesh(cylX(7.5, 8.7, 3, 32), 'dark', 'C', 'hull', eng).position.x = -133.5;
  mesh(cylX(8.7, 7.4, 12, 24), 'hull', 'C', 'hull', eng).position.x = -139;
  ringFrames(eng, -143, -135, 4, 8.9, 'C');
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const t = mesh(box(12, 1.2, 4), 'plate', 'C', 'hull', eng);
    t.position.set(-139, Math.cos(a) * 8.9, Math.sin(a) * 8.9); t.rotation.x = -a;
  }
  rcs(eng, -136, 8.2, 0, 'C'); rcs(eng, -136, -8.2, 0, 'C');
  navLight(eng, -134, 10.4, 0, '#ffffff', 'strobe2');
  [0, Math.PI * 2 / 3, Math.PI * 4 / 3].forEach(a => {
    const r = 7.5, y = Math.cos(a) * r, z = Math.sin(a) * r;
    const mount = mesh(new CylinderGeometry(3.4, 4.2, 3, 16), 'bare', 'C', 'hull', eng);
    mount.position.set(-145.8, y, z); mount.rotation.z = Math.PI / 2;
    const bell = mesh(new CylinderGeometry(6.2, 3.2, 12, 32, 1, true), 'plate', 'C', 'hull', eng);
    bell.position.set(-152, y, z); bell.rotation.z = Math.PI / 2;
    for (let k = 0; k < 3; k++) mesh(new TorusGeometry(3.6 + k * 1.1, .28, 8, 32).rotateY(Math.PI / 2), 'bare', 'C', 'hull', eng)
      .position.set(-148.5 - k * 3.4, y, z);
    const throat = mesh(new CylinderGeometry(5.4, 2.6, 11, 32, 1, true), 'drive', 'ENG-01', 'glow', eng);
    throat.position.set(-152.2, y, z); throat.rotation.z = Math.PI / 2;
    const disk = mesh(new CircleGeometry(5.6, 32), 'drive', 'ENG-01', 'glow', eng);
    disk.position.set(-158.2, y, z); disk.rotation.y = -Math.PI / 2;
    glow(eng, -159, y, z, 26, '#ff9a3c', .55);
    glow(eng, -163, y, z, 60, '#ff6a2a', .22);
    plume(eng, -158.4, y, z, 5.2, 58);
    plume(eng, -158.4, y, z, 2.6, 78);
  });

  /* ---------------- Room markers ---------------- */
  // Ring markers hang off the spinning hub, so they travel with the ring.
  api.room('CMD-01', cmd, [112, 13, 0]);
  api.room('CMD-04', cmd, [141, 0, 0]);
  api.room('FWD-11', fwd, [64, 6, 0]);
  api.room('FWD-06', fwd, [40, -4, 6]);
  api.room('FWD-22', fwd, [20, -6, -5]);
  api.room('SPN-01', spine, [-30, 0, 0]);
  api.room('RNG-01', ringSpin, [0, -45, 0]);
  api.room('RNG-05', ringSpin, [0, 0, 44]);
  api.room('CRG-01', cargo, [-85, 0, 0]);
  api.room('CRG-03', cargo, [-85, -2, 20]);
  api.room('RCT-01', reactor, [-109, 0, 0]);
  api.room('ENG-01', eng, [-139, 0, 0]);

  /* ---------------- Moving parts ---------------- */
  api.animate(T => {
    const strobe = (T % 1.4) < .08, strobe2 = ((T + .7) % 1.4) < .08;
    const beacon = .45 + .55 * Math.abs(Math.sin(T * 1.8));
    for (const { s, kind } of navLights) {
      s.material.opacity = kind === 'strobe' ? (strobe ? 1 : 0)
        : kind === 'strobe2' ? (strobe2 ? 1 : 0)
        : kind === 'beacon' ? beacon
        : .55 + .35 * Math.abs(Math.sin(T * 2.4));
    }
    holo.rotation.y = T * .6;
    holo.rotation.x = Math.sin(T * .3) * .4;
    pad.rotation.y = T * .15;
    gantry.position.x = -88 + Math.sin(T * .25) * 5;
    const fl = .94 + .06 * Math.sin(T * 27) * Math.sin(T * 13.3);
    for (const p of plumes) p.scale.set(fl, 1, 1);
  });

  void Vector3;
}
