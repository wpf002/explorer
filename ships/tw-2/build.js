/**
 * TW-2 Trade-Wind-class shuttle — procedural hull.
 *
 * The small craft carried in the ASV-07 hangar and used as a crew tender by the BCF-4.
 * Units are metres. +X is forward (bow), +Y is up, origin is mid-length on the fuselage axis.
 */
export default function build(api) {
  const { THREE, mesh, glow, box, cylX } = api;
  const { CylinderGeometry, SphereGeometry, CircleGeometry, TorusGeometry } = THREE;

  const navLights = [];
  const plumes = [];

  /* ---------------- Fuselage, cockpit, cabin ---------------- */
  const hull = api.module('fuselage');
  mesh(cylX(1.6, 1.45, 7.4, 32), 'hull', 'Main', 'hull', hull).position.set(-.2, 0, 0);
  mesh(cylX(1.6, .55, 2.6, 32), 'plate', 'Main', 'hull', hull).position.set(4.8, -.05, 0);
  mesh(new SphereGeometry(.55, 20, 12), 'plate', 'Main', 'hull', hull).position.set(6.1, -.05, 0);
  for (const x of [-2.6, -.6, 1.4, 3.3]) mesh(new TorusGeometry(1.58, .045, 6, 40).rotateY(Math.PI / 2), 'dark', 'Main', 'hull', hull).position.x = x;
  const canopy = mesh(new SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), 'glass', 'Main', 'hull', hull);
  canopy.position.set(3.5, .7, 0); canopy.scale.set(1.9, 1.05, 1.15);
  mesh(box(3.4, .06, 2.1), 'dark', 'Main', 'hull', hull).position.set(3.4, .72, 0);        // canopy sill
  // cabin windows, three per side
  for (let i = 0; i < 3; i++) for (const z of [1.5, -1.5]) {
    const w = mesh(box(.55, .32, .05), 'warm', 'CAB-02', 'glow', hull);
    w.position.set(-1.6 + i * 1.1, .55, z); w.rotation.y = z > 0 ? .08 : -.08;
  }
  mesh(box(7, .08, .04), 'strip', 'Main', 'glow', hull).position.set(-.2, -.4, 1.49);
  mesh(box(7, .08, .04), 'strip', 'Main', 'glow', hull).position.set(-.2, -.4, -1.49);
  // dorsal spine and antenna
  mesh(box(4.2, .3, .5), 'dark', 'Main', 'hull', hull).position.set(-1.4, 1.55, 0);
  mesh(new CylinderGeometry(.03, .05, 1.2, 6), 'bare', 'Main', 'hull', hull).position.set(-.4, 2.2, 0);
  navLights.push({ s: api.sprite(hull, -.4, 2.85, 0, .5, '#ff4d5a'), kind: 'beacon' });

  // cockpit: two seats, a wraparound console, twin screens
  mesh(box(2.2, .06, 2.2), 'dark', 'CPT-01', 'interior', hull).position.set(3.4, -.2, 0);
  for (const z of [.55, -.55]) {
    mesh(box(.6, .5, .55), 'interior', 'CPT-01', 'interior', hull).position.set(3, .1, z);
    mesh(box(.12, .75, .55), 'interior', 'CPT-01', 'interior', hull).position.set(2.68, .55, z);
    const sc = mesh(box(.04, .32, .5), 'screen', 'CPT-01', 'glow', hull);
    sc.position.set(4.3, .5, z * 1.05); sc.rotation.z = -.5;
  }
  mesh(box(.5, .35, 1.9), 'dark', 'CPT-01', 'interior', hull).position.set(4.3, .2, 0);
  mesh(box(.06, .04, 1.7), 'strip', 'CPT-01', 'glow', hull).position.set(4.05, .4, 0);

  // cabin: three rows of two seats, overhead light, bulkhead
  mesh(box(4.4, .06, 2.4), 'plate', 'CAB-02', 'interior', hull).position.set(-.9, -.55, 0);
  for (let i = 0; i < 3; i++) for (const z of [.65, -.65]) {
    mesh(box(.55, .45, .55), 'interior', 'CAB-02', 'interior', hull).position.set(-2.3 + i * 1.3, -.3, z);
    mesh(box(.12, .7, .55), 'interior', 'CAB-02', 'interior', hull).position.set(-2.58 + i * 1.3, .05, z);
  }
  mesh(box(4, .04, .2), 'warm', 'CAB-02', 'glow', hull).position.set(-.9, 1.25, 0);
  mesh(box(.08, 2.6, 2.6), 'dark', 'Main', 'hull', hull).position.set(1.9, 0, 0);          // cockpit bulkhead

  // cargo bay at the stern: floor, two crates, ramp
  mesh(box(1.8, .06, 2.4), 'plate', 'CGO-03', 'interior', hull).position.set(-3.4, -.6, 0);
  mesh(box(.8, .6, .9), 'crate', 'CGO-03', 'interior', hull).position.set(-3.5, -.27, .5);
  mesh(box(.8, .45, .8), 'crate', 'CGO-03', 'interior', hull).position.set(-3.4, -.34, -.55);
  const ramp = mesh(box(1.8, .08, 2.2), 'dark', 'CGO-03', 'hull', hull);
  ramp.position.set(-4.3, -1.25, 0); ramp.rotation.z = -.35;
  mesh(box(.06, .06, 2), 'amber', 'CGO-03', 'glow', hull).position.set(-3.55, -.93, 0);

  // landing gear
  for (const [x, z] of [[4.4, 0], [-2.2, 1.1], [-2.2, -1.1]]) {
    mesh(new CylinderGeometry(.06, .06, .7, 8), 'bare', 'Main', 'hull', hull).position.set(x, -1.6, z);
    mesh(new CylinderGeometry(.22, .22, .08, 16), 'dark', 'Main', 'hull', hull).position.set(x, -1.95, z);
  }
  // RCS blocks
  for (const [x, y, z] of [[4.9, .5, .95], [4.9, .5, -.95], [-3.4, .9, 1.1], [-3.4, .9, -1.1]]) {
    mesh(box(.28, .22, .28), 'bare', 'Main', 'hull', hull).position.set(x, y, z);
  }

  /* ---------------- Wings and tails ---------------- */
  const wings = api.module('wings');
  for (const sg of [1, -1]) {
    const w = mesh(box(3.2, .16, 3.8), 'plate', 'Main', 'hull', wings);
    w.position.set(-1, -.55, sg * 3.2); w.rotation.y = sg * .22; w.rotation.x = sg * -.06;
    const tip = mesh(box(1.4, .5, .12), 'dark', 'Main', 'hull', wings);
    tip.position.set(-1.7, -.35, sg * 5.05); tip.rotation.y = sg * .22;
    navLights.push({ s: api.sprite(wings, -1.1, -.4, sg * 5.15, .55, sg > 0 ? '#ff3b4a' : '#3bff7a'), kind: 'nav' });
    const tail = mesh(box(1.6, 1.9, .1), 'plate', 'Main', 'hull', wings);
    tail.position.set(-3.1, 1.25, sg * 1.05); tail.rotation.x = -sg * .38; tail.rotation.z = .25;
  }
  navLights.push({ s: api.sprite(wings, -3.6, 2.15, 0, .5, '#ffffff'), kind: 'strobe' });

  /* ---------------- Drives ---------------- */
  const drives = api.module('drives');
  for (const z of [.72, -.72]) {
    mesh(cylX(.52, .6, 1.6, 20), 'hull', 'DRV-04', 'hull', drives).position.set(-4.45, -.15, z);
    const bell = mesh(new CylinderGeometry(.62, .38, .7, 20, 1, true), 'plate', 'DRV-04', 'hull', drives);
    bell.position.set(-5.5, -.15, z); bell.rotation.z = Math.PI / 2;
    const disk = mesh(new CircleGeometry(.55, 20), 'drive', 'DRV-04', 'glow', drives);
    disk.position.set(-5.84, -.15, z); disk.rotation.y = -Math.PI / 2;
    glow(drives, -5.95, -.15, z, 1.8, '#ff9a3c', .55);
    plumes.push(api.plume(drives, -5.86, -.15, z, .5, 5.5));
  }

  /* ---------------- Room markers ---------------- */
  api.room('CPT-01', hull, [3.6, 2.1, 0]);
  api.room('CAB-02', hull, [-.8, 2.4, 0]);
  api.room('CGO-03', hull, [-3.6, .2, 1.9]);
  api.room('DRV-04', drives, [-5.2, .9, 0]);

  api.animate(T => {
    const strobe = (T % 1.3) < .08, beacon = .45 + .55 * Math.abs(Math.sin(T * 2));
    for (const { s, kind } of navLights) {
      s.material.opacity = kind === 'strobe' ? (strobe ? 1 : 0) : kind === 'beacon' ? beacon : .6 + .3 * Math.abs(Math.sin(T * 2.6));
    }
    const fl = .93 + .07 * Math.sin(T * 29) * Math.sin(T * 13.1);
    for (const p of plumes) p.scale.set(fl, 1, 1);
  });
}
