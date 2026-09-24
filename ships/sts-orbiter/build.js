/**
 * Space Shuttle orbiter, on orbit with the payload bay doors open.
 *
 * 37.24 m long, 23.79 m span, 17.25 m to the top of the tail. Nose at +X.
 *
 * Units are metres. +X is forward, +Y is up, origin is mid-length on the fuselage axis.
 */
export default function build(api) {
  const { THREE, mesh, glow, box, cylX } = api;
  const { CylinderGeometry, SphereGeometry, CircleGeometry, Shape, ExtrudeGeometry } = THREE;

  /** A flat planform in XZ, extruded in Y. Wings and fins are shapes, not boxes. */
  const planform = (points, thickness) => {
    const shape = new Shape();
    points.forEach(([x, z], i) => (i ? shape.lineTo(x, z) : shape.moveTo(x, z)));
    shape.closePath();
    const g = new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true, bevelSize: .06, bevelThickness: .06, bevelSegments: 1 });
    g.rotateX(Math.PI / 2);
    g.translate(0, thickness / 2, 0);
    return g;
  };

  const navLights = [];
  const nav = (p, x, y, z, c, kind, size = 1) => navLights.push({ s: api.sprite(p, x, y, z, size, c), kind });

  /* ---------------- Fuselage, flight deck, mid deck (deck Fwd) ---------------- */
  const fwd = api.module('forward');
  mesh(cylX(2.4, 1.1, 5, 18), 'tile_white', 'Fwd', 'hull', fwd).position.set(15.4, 0.2, 0);   // nose
  mesh(new SphereGeometry(1.15, 20, 14), 'tile_black', 'Fwd', 'hull', fwd).position.set(18.1, 0.1, 0);
  mesh(box(7.6, 4, 4.6), 'tile_white', 'Fwd', 'hull', fwd).position.set(11.6, 0.2, 0);        // crew module fairing
  // windscreen: six forward panes plus two overhead
  for (let i = 0; i < 6; i++) {
    const z = -1.35 + (i % 3) * 1.35, up = i > 2;
    const w = mesh(box(.12, up ? .8 : .9, 1.1), 'glass', 'Fwd', 'hull', fwd);
    w.position.set(14.4 + (up ? -.5 : 0), up ? 1.85 : 1.1, z); w.rotation.z = up ? 1.1 : .55;
  }
  for (const z of [-.7, .7]) mesh(box(.9, .1, .8), 'glass', 'Fwd', 'hull', fwd).position.set(11, 2.2, z);
  // flight deck: four seats, forward console, aft payload station
  mesh(box(4.4, .12, 3.6), 'interior', 'FLT-01', 'interior', fwd).position.set(12.4, .7, 0);
  for (const [x, z] of [[13.4, -.8], [13.4, .8], [11.8, -1.2], [11.8, 1.2]]) {
    mesh(box(.7, .6, .6), 'interior', 'FLT-01', 'interior', fwd).position.set(x, 1.1, z);
    mesh(box(.14, .8, .6), 'interior', 'FLT-01', 'interior', fwd).position.set(x - .4, 1.4, z);
  }
  mesh(box(.5, .9, 3), 'panel', 'FLT-01', 'interior', fwd).position.set(14.1, 1.2, 0);
  mesh(box(.08, .5, 2.6), 'screen', 'FLT-01', 'glow', fwd).position.set(13.85, 1.3, 0);
  mesh(box(.6, 1.2, 2.4), 'panel', 'FLT-01', 'interior', fwd).position.set(10.2, 1.4, 0);     // aft flight deck station
  mesh(box(.06, .4, 1.8), 'screen', 'FLT-01', 'glow', fwd).position.set(10.5, 1.5, 0);
  // mid deck: lockers, galley, airlock hatch
  mesh(box(4.4, .12, 3.6), 'interior', 'MID-02', 'interior', fwd).position.set(12, -1.4, 0);
  for (let i = 0; i < 4; i++) mesh(box(.9, 1.4, .5), 'panel', 'MID-02', 'interior', fwd).position.set(10.4 + i, -.6, -1.5);
  mesh(box(1.2, 1.4, .8), 'panel', 'MID-02', 'interior', fwd).position.set(10.6, -.6, 1.4);
  mesh(box(.12, .1, 2.8), 'warm', 'MID-02', 'glow', fwd).position.set(13.9, -.2, 0);
  mesh(new CylinderGeometry(.75, .75, 1.6, 18), 'tile_white', 'AIR-03', 'hull', fwd).position.set(9.4, -.6, 0);
  const lock = mesh(new CircleGeometry(.62, 20), 'field', 'AIR-03', 'interior', fwd);
  lock.position.set(8.6, -.6, 0); lock.rotation.y = -Math.PI / 2;
  nav(fwd, 18.4, .1, 0, '#ffffff', 'strobe', 1.2);

  /* ---------------- Payload bay and arm (deck Bay) ---------------- */
  const bay = api.module('bay');
  // mid fuselage: a flattened body with the bay as an open trough on top
  mesh(box(18.3, 2.9, 5.2), 'tile_white', 'Bay', 'hull', bay).position.set(-1.5, -1.5, 0);
  mesh(new CylinderGeometry(2.7, 2.7, 18.3, 20, 1, true, Math.PI * .1, Math.PI * .8).rotateZ(Math.PI / 2), 'tile_black', 'Bay', 'hull', bay).position.set(-1.5, -1.1, 0);
  for (const s of [1, -1]) mesh(box(18.3, 2.6, .3), 'tile_white', 'Bay', 'hull', bay).position.set(-1.5, 0.5, s * 2.45);
  for (const s of [1, -1]) {                                                                   // doors, swung open
    const door = new CylinderGeometry(2.62, 2.62, 18.3, 24, 1, true, 0, Math.PI * .46);
    door.rotateZ(Math.PI / 2);
    const m = mesh(door, 'radiator', 'BAY-01', 'hull', bay);
    m.position.set(-1.5, 0.2, s * 2.1);
    m.rotation.x = s > 0 ? -1.15 : Math.PI + 1.15;
  }
  mesh(box(18.3, .2, 4.6), 'panel', 'BAY-01', 'interior', bay).position.set(-1.5, -1.9, 0);   // bay floor
  for (let i = 0; i < 6; i++) {
    const x = -9.5 + i * 3.4;
    mesh(box(.3, 3.6, .3), 'bare', 'BAY-01', 'interior', bay).position.set(x, .2, 2.4);
    mesh(box(.3, 3.6, .3), 'bare', 'BAY-01', 'interior', bay).position.set(x, .2, -2.4);
    mesh(box(.25, .25, 4.8), 'bare', 'BAY-01', 'interior', bay).position.set(x, -1.7, 0);
  }
  mesh(new CylinderGeometry(1.9, 1.9, 4.4, 20).rotateZ(Math.PI / 2), 'mylar', 'PAY-02', 'interior', bay).position.set(2, -.2, 0);
  mesh(new CylinderGeometry(1.95, 1.95, .2, 20).rotateZ(Math.PI / 2), 'bare', 'PAY-02', 'interior', bay).position.set(4.3, -.2, 0);
  for (const s of [1, -1]) mesh(box(3.4, .08, 1.6), 'rad', 'PAY-02', 'interior', bay).position.set(2, s * 1.9, 0);
  // remote manipulator arm along the port sill
  const arm = api.group(bay, [0, 0, 0], { animated: true });
  mesh(box(.5, .5, .5), 'bare', 'ARM-03', 'hull', arm).position.set(7.4, 1.9, -2.5);
  mesh(cylX(.16, .16, 6.4, 10), 'tile_white', 'ARM-03', 'hull', arm).position.set(4.2, 2.1, -2.5);
  const fore = mesh(cylX(.14, .14, 5.8, 10), 'tile_white', 'ARM-03', 'hull', arm);
  fore.position.set(-1.8, 2.5, -2.4); fore.rotation.z = .12;
  mesh(new CylinderGeometry(.2, .2, .7, 12).rotateZ(Math.PI / 2), 'bare', 'ARM-03', 'hull', arm).position.set(-4.9, 2.6, -2.4);
  mesh(box(.5, .12, .12), 'amber', 'ARM-03', 'glow', arm).position.set(-5.2, 2.6, -2.4);

  /* ---------------- Wings, tail, engines (deck Aft) ---------------- */
  const aft = api.module('aft');
  // double-delta planform: strake off the forward fuselage, then the main wing
  for (const s of [1, -1]) {
    const wing = planform([
      [6.5, s * 2.3], [1, s * 4.2], [-5.5, s * 6.6], [-9.5, s * 11.5],
      [-15.2, s * 11.9], [-15.2, s * 2.6], [-9, s * 2.4],
    ], 1.1);
    mesh(wing, 'tile_white', 'Aft', 'hull', aft).position.set(0, -1.9, 0);
    const le = planform([
      [6.5, s * 2.3], [1, s * 4.2], [-5.5, s * 6.6], [-9.5, s * 11.5], [-10.3, s * 11.5], [-6.4, s * 6.4], [0.2, s * 4], [6, s * 2.5],
    ], 1.16);
    mesh(le, 'tile_black', 'Aft', 'hull', aft).position.set(0, -1.93, 0);
    const flap = planform([[-15.2, s * 3], [-15.2, s * 11.6], [-17.1, s * 11.2], [-17.1, s * 3]], .5);
    mesh(flap, 'tile_black', 'Aft', 'hull', aft).position.set(0, -1.75, 0);
    nav(aft, -12, -1.4, s * 11.7, s > 0 ? '#3bff7a' : '#ff3b4a', 'nav', 1.1);
  }
  // vertical tail: the same trick in XY, then stood on edge
  const fin = planform([[-11.4, 0], [-16.4, 0], [-17.3, 7.2], [-14.8, 7.2]], .8);
  fin.rotateZ(0); fin.rotateX(-Math.PI / 2);
  mesh(fin, 'tile_white', 'Aft', 'hull', aft).position.set(0, 1.4, -.4);
  mesh(box(2.2, 7, .95), 'tile_black', 'Aft', 'hull', aft).position.set(-16.9, 5, 0);
  mesh(box(3, .5, 2.4), 'tile_black', 'Aft', 'hull', aft).position.set(-16.2, 1.5, 0);
  mesh(box(6.4, 4.6, 5.4), 'tile_white', 'Aft', 'hull', aft).position.set(-14.2, .4, 0);       // aft fuselage
  for (const s of [1, -1]) {                                                                   // OMS pods
    const pod = mesh(cylX(1.5, 1.2, 5.2, 16), 'tile_white', 'OMS-04', 'hull', aft);
    pod.position.set(-14.4, 2.4, s * 2.1);
    const n = mesh(new CylinderGeometry(.55, .3, .9, 16, 1, true), 'nozzle', 'OMS-04', 'hull', aft);
    n.position.set(-17.4, 2.2, s * 2.1); n.rotation.z = Math.PI / 2;
    glow(aft, -18, 2.2, s * 2.1, 1.6, '#ff9a3c', .3);
  }
  for (const [y, z] of [[1.9, 0], [-.1, -1.6], [-.1, 1.6]]) {                                   // three main engines
    mesh(cylX(1.1, 1.1, 1.4, 18), 'bare', 'MPS-05', 'hull', aft).position.set(-16.4, y, z);
    const bell = mesh(new CylinderGeometry(1.24, .62, 2.8, 24, 1, true), 'nozzle', 'MPS-05', 'hull', aft);
    bell.position.set(-18.2, y, z); bell.rotation.z = Math.PI / 2;
    glow(aft, -19.6, y, z, 2.6, '#ff9a3c', .3);
  }
  mesh(box(2.2, 2.4, 3.6), 'tile_black', 'Aft', 'hull', aft).position.set(-11.4, 2.6, 0);      // body flap fairing

  /* ---------------- Room markers ---------------- */
  api.room('FLT-01', fwd, [12.6, 4.4, 0]);
  api.room('MID-02', fwd, [11.4, -3.4, 0]);
  api.room('AIR-03', fwd, [9, -3.2, 1.8]);
  api.room('BAY-01', bay, [-1.5, 4.4, 0]);
  api.room('PAY-02', bay, [2, 3.2, 2.6]);
  api.room('ARM-03', arm, [1, 4, -3.4]);
  api.room('OMS-04', aft, [-14.4, 5.4, 0]);
  api.room('MPS-05', aft, [-18.6, -2.6, 0]);

  api.animate(T => {
    const strobe = (T % 1.3) < .08;
    for (const { s, kind } of navLights) s.material.opacity = kind === 'strobe' ? (strobe ? 1 : 0) : .6 + .3 * Math.abs(Math.sin(T * 2.2));
  });
}
