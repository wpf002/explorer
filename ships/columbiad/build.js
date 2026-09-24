/**
 * The Columbiad projectile: Jules Verne's 1865 aluminium shell as filmed by Méliès in 1902.
 *
 * Nine feet across and twelve high, with padded walls, a water shock buffer under the floor
 * and three portholes. Fired from a cannon; no engine, no control, no way back.
 *
 * Units are metres. +X is the nose (direction of flight), +Y is up.
 */
export default function build(api) {
  const { THREE, mesh, glow, box, cylX } = api;
  const { CylinderGeometry, SphereGeometry, TorusGeometry, CircleGeometry } = THREE;

  const shell = api.module('shell');
  /* ---------------- Shell (deck Hull) ---------------- */
  mesh(cylX(1.37, 1.37, 2.1, 28), 'alum', 'Hull', 'hull', shell).position.set(-.6, 0, 0);
  mesh(cylX(1.37, .34, 1.5, 28), 'alum', 'Hull', 'hull', shell).position.set(1.2, 0, 0);       // ogive nose
  mesh(new SphereGeometry(.36, 20, 12), 'brass', 'Hull', 'hull', shell).position.set(2, 0, 0);
  mesh(cylX(1.4, 1.34, .18, 28), 'brass', 'Hull', 'hull', shell).position.set(-1.72, 0, 0);    // base ring
  const base = mesh(new CircleGeometry(1.34, 28), 'plate', 'Hull', 'hull', shell);
  base.position.set(-1.82, 0, 0); base.rotation.y = -Math.PI / 2;
  for (let r = 0; r < 4; r++) {                                                                 // reinforcing bands and rivets
    const x = -1.4 + r * .8;
    mesh(new TorusGeometry(1.39, .05, 8, 36).rotateY(Math.PI / 2), 'brass', 'Hull', 'hull', shell).position.set(x, 0, 0);
    for (let k = 0; k < 24; k++) {
      const a = k * Math.PI / 12;
      mesh(new SphereGeometry(.035, 8, 6), 'brass', 'Hull', 'hull', shell).position.set(x, Math.cos(a) * 1.4, Math.sin(a) * 1.4);
    }
  }
  // three portholes with hinged covers
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3 + .4;
    const y = Math.cos(a), z = Math.sin(a);
    const frame = mesh(new CylinderGeometry(.33, .33, .14, 20).rotateZ(Math.PI / 2), 'brass', 'PRT-03', 'hull', shell);
    frame.position.set(-.3, y * 1.36, z * 1.36); frame.rotation.x = -a;
    const pane = mesh(new CylinderGeometry(.26, .26, .05, 20).rotateZ(Math.PI / 2), 'glass', 'PRT-03', 'hull', shell);
    pane.position.set(-.3, y * 1.4, z * 1.4); pane.rotation.x = -a;
    glow(shell, -.3, y * 1.5, z * 1.5, .8, '#bff6ff', .25);
  }
  // hatch on the shoulder
  const hatch = mesh(new CylinderGeometry(.42, .42, .1, 22).rotateZ(Math.PI / 2), 'brass', 'Hull', 'hull', shell);
  hatch.position.set(.5, 1.28, .42); hatch.rotation.x = -.32;
  mesh(new TorusGeometry(.44, .04, 8, 24).rotateZ(Math.PI / 2), 'brass', 'Hull', 'hull', shell).position.set(.52, 1.3, .42);

  /* ---------------- Cabin (deck Cabin) ---------------- */
  const cabin = api.module('cabin');
  mesh(cylX(1.2, 1.2, 1.9, 24, true), 'padding', 'CAB-01', 'interior', cabin).position.set(-.5, 0, 0);
  const aftWall = mesh(new CircleGeometry(1.2, 24), 'padding', 'CAB-01', 'interior', cabin);
  aftWall.position.set(-1.45, 0, 0); aftWall.rotation.y = -Math.PI / 2;
  for (let i = 0; i < 3; i++) {                                                                 // three couches on the floor
    const a = i * Math.PI * 2 / 3;
    const couch = mesh(box(1.5, .16, .5), 'couch', 'CAB-01', 'interior', cabin);
    couch.position.set(-.5, -.75 + Math.cos(a) * .12, Math.sin(a) * .55);
  }
  mesh(new CylinderGeometry(1.18, 1.18, .12, 24).rotateZ(Math.PI / 2), 'plate', 'FLR-02', 'interior', cabin).position.set(-1.1, 0, 0);
  mesh(cylX(1.15, 1.15, .5, 24), 'water', 'FLR-02', 'interior', cabin).position.set(-1.45, 0, 0);
  // gas lamp, instruments, stowed provisions
  mesh(new SphereGeometry(.12, 14, 10), 'warm', 'CAB-01', 'glow', cabin).position.set(.35, .75, 0);
  mesh(new CylinderGeometry(.16, .16, .1, 16).rotateZ(Math.PI / 2), 'brass', 'CAB-01', 'interior', cabin).position.set(.42, .75, 0);
  for (const [y, z] of [[.2, .95], [-.1, -.95]]) {
    mesh(box(.5, .35, .25), 'brass', 'CAB-01', 'interior', cabin).position.set(.1, y, z);
    mesh(new CircleGeometry(.1, 16), 'glass', 'CAB-01', 'interior', cabin).position.set(.36, y + .05, z);
  }
  for (let i = 0; i < 4; i++) mesh(box(.3, .3, .3), 'crate', 'CAB-01', 'interior', cabin).position.set(-1.25, -.35, -.8 + i * .55);
  glow(cabin, .3, .5, 0, 1.6, '#ffd9a0', .3);

  api.room('CAB-01', cabin, [-.5, 2.2, 0]);
  api.room('FLR-02', cabin, [-1.3, -2, 0]);
  api.room('PRT-03', shell, [-.3, 1.4, 1.8]);
  api.room('NSE-04', shell, [1.6, 1.6, 0]);
}
