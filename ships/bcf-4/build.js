/**
 * BCF-4 Longhaul-class — procedural hull.
 *
 * A square truss spine carrying eight cassette bays of 6 m containers in a plus-shaped
 * cross-section, a hammerhead crew block and bridge at the bow, and a reactor hall,
 * radiator boom and four-drive cluster aft. No ring.
 *
 * Units are metres. +X is forward (bow), +Y is up, origin is mid-length on the spine.
 */
export default function build(api) {
  const { THREE, mesh, glow, box, cylX, ringFrames, windowStrip, pipe, rcs, truss } = api;
  const { CylinderGeometry, TorusGeometry, CircleGeometry, SphereGeometry } = THREE;

  let seed = 4127;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  const navLights = [];
  const navLight = (parent, x, y, z, color, kind) => navLights.push({ s: api.sprite(parent, x, y, z, 4.5, color), kind });
  const plumes = [];

  /* ---------------- Bow block: bridge, galley, med, docking collar (deck Ops) ---------------- */
  const bow = api.module('bow');
  mesh(box(40, 22, 26), 'hull', 'Ops', 'hull', bow).position.set(176, 6, 0);
  mesh(cylX(15.5, 7, 18, 4).rotateX(Math.PI / 4), 'plate', 'Ops', 'hull', bow).position.set(205, 5, 0);
  mesh(cylX(1.2, .5, 14, 8), 'dark', 'Ops', 'hull', bow).position.set(220, 5, 0);            // nose probe
  glow(bow, 227, 5, 0, 9, '#bff6ff', .8);
  for (const x of [160, 168, 176, 184, 192]) {                                                  // hull ribs
    for (const [y, z, h, d] of [[17.2, 0, .8, 26.8], [-5.2, 0, .8, 26.8], [6, 13.2, 22.6, .8], [6, -13.2, 22.6, .8]]) {
      mesh(box(1.2, h, d), 'dark', 'Ops', 'hull', bow).position.set(x, y, z);
    }
  }
  windowStrip(bow, 176, 12, 13.2, 34, 'Ops'); windowStrip(bow, 176, 12, -13.2, 34, 'Ops');
  windowStrip(bow, 172, 1, 13.2, 22, 'Ops', 'warm'); windowStrip(bow, 172, 1, -13.2, 22, 'Ops', 'warm');

  // bridge cab on the dorsal line, raked glazing forward
  mesh(box(18, 5, 20), 'hull', 'Ops', 'hull', bow).position.set(186, 19.5, 0);
  const glazing = mesh(box(.3, 4.6, 19), 'glass', 'Ops', 'hull', bow);
  glazing.position.set(195.4, 19.4, 0); glazing.rotation.z = -.38;
  mesh(box(18.6, .5, 20.6), 'dark', 'Ops', 'hull', bow).position.set(186, 22.2, 0);
  mesh(box(.4, .4, 19), 'strip', 'Ops', 'glow', bow).position.set(195.9, 21.4, 0);
  // bridge interior: deck, five forward consoles, captain's seat, overhead plot
  mesh(box(17, .3, 19), 'plate', 'OPS-01', 'interior', bow).position.set(186, 17.2, 0);
  for (let i = 0; i < 5; i++) {
    const z = -6 + i * 3;
    mesh(box(1.4, 1.1, 2.2), 'interior', 'OPS-01', 'interior', bow).position.set(192, 17.9, z);
    const sc = mesh(box(.08, .9, 2), 'screen', 'OPS-01', 'glow', bow); sc.position.set(192.8, 18.9, z); sc.rotation.z = -.3;
    mesh(box(.8, 1.1, .8), 'dark', 'OPS-01', 'interior', bow).position.set(190, 17.9, z);
  }
  mesh(box(1.2, 1.4, 1.2), 'dark', 'OPS-01', 'interior', bow).position.set(185.5, 18, 0);
  mesh(new CylinderGeometry(1.4, 1.6, .5, 20), 'core', 'OPS-01', 'interior', bow).position.set(182, 17.6, 0);
  mesh(box(.1, 1.6, 7), 'screen', 'OPS-01', 'glow', bow).position.set(177.4, 19.4, 0);
  glow(bow, 186, 19.5, 0, 16, '#8fe8f5', .35);

  // galley and mess on the lower level: three tables, benches, a lit servery
  mesh(box(22, .3, 22), 'plate', 'OPS-04', 'interior', bow).position.set(174, -1, 0);
  for (let i = 0; i < 3; i++) {
    const z = -6 + i * 6;
    mesh(box(7, .2, 2.2), 'interior', 'OPS-04', 'interior', bow).position.set(172, .5, z);
    mesh(box(.3, .7, .3), 'dark', 'OPS-04', 'interior', bow).position.set(172, -.1, z);
    [-1, 1].forEach(s => mesh(box(7, .5, .7), 'dark', 'OPS-04', 'interior', bow).position.set(172, -.5, z + s * 1.6));
  }
  mesh(box(2, 1.2, 12), 'interior', 'OPS-04', 'interior', bow).position.set(181, -.2, 0);
  mesh(box(.2, .12, 11), 'warm', 'OPS-04', 'glow', bow).position.set(180, .5, 0);
  for (let k = -1; k <= 1; k++) mesh(box(6, .1, .5), 'warm', 'OPS-04', 'glow', bow).position.set(172, 4.6, k * 6);
  glow(bow, 172, 2, 0, 14, '#ffd9a0', .3);

  // ventral docking collar
  mesh(new CylinderGeometry(4, 4.6, 8, 24), 'dark', 'Ops', 'hull', bow).position.set(182, -9, 0);
  mesh(new TorusGeometry(4.3, .3, 8, 40).rotateX(Math.PI / 2), 'strip', 'OPS-08', 'glow', bow).position.set(182, -13.1, 0);
  mesh(new CircleGeometry(3.6, 32).rotateX(Math.PI / 2), 'field', 'OPS-08', 'interior', bow).position.set(182, -13.05, 0);
  glow(bow, 182, -13.5, 0, 12, '#8fe8f5', .35);

  // sensor mast and dish
  mesh(new CylinderGeometry(.3, .5, 10, 8), 'bare', 'Ops', 'hull', bow).position.set(180, 27, 0);
  const dish = mesh(new CylinderGeometry(3.2, 1, 1.1, 24, 1, true), 'plate', 'Ops', 'hull', bow);
  dish.position.set(180, 32, 0); dish.rotation.z = -Math.PI / 4;
  rcs(bow, 194, 16.5, 12.5, 'Ops'); rcs(bow, 194, -4.5, -12.5, 'Ops'); rcs(bow, 158, 16.5, -12.5, 'Ops'); rcs(bow, 158, -4.5, 12.5, 'Ops');
  navLight(bow, 186, 23, 0, '#ffffff', 'strobe');
  navLight(bow, 180, 37, 0, '#ff4d5a', 'beacon');

  /* ---------------- Hab: transverse crew block (deck Ops) ---------------- */
  const hab = api.module('hab');
  mesh(new CylinderGeometry(7, 7, 40, 28).rotateX(Math.PI / 2), 'hull', 'Ops', 'hull', hab).position.set(147, 4, 0);
  [-20.4, 20.4].forEach(z => mesh(new CylinderGeometry(6.2, 7.2, 1.2, 28).rotateX(Math.PI / 2), 'dark', 'Ops', 'hull', hab).position.set(147, 4, z));
  for (let z = -15; z <= 15; z += 7.5) mesh(new TorusGeometry(7.3, .35, 8, 40), 'dark', 'Ops', 'hull', hab).position.set(147, 4, z);
  for (let i = 0; i < 16; i++) {
    const z = -18 + i * 2.4; const up = i % 4 !== 3;
    mesh(box(.6, .5, 1.4), up ? 'warm' : 'strip', 'OPS-02', 'glow', hab).position.set(154.1, 6, z);
    mesh(box(.6, .5, 1.4), 'warm', 'OPS-02', 'glow', hab).position.set(139.9, 6, z);
  }
  // bunks: two tiers of nine per side
  for (let i = 0; i < 9; i++) for (let t = 0; t < 2; t++) {
    const z = -16 + i * 4;
    mesh(box(4.2, .5, 2), 'interior', 'OPS-02', 'interior', hab).position.set(150, 1.2 + t * 2.2, z);
  }
  mesh(box(1.2, 1.2, 1.2), 'bare', 'Ops', 'hull', hab).position.set(147, 11.6, 19);
  navLight(hab, 147, 4, 21.4, '#ff3b4a', 'port');
  navLight(hab, 147, 4, -21.4, '#3bff7a', 'starboard');

  /* ---------------- Cargo spine, cassettes, gantry (deck Hold) ---------------- */
  const cargo = api.module('cargo');
  truss(cargo, -126, 156, 7, 28, 'Hold');
  mesh(box(282, 3, 3), 'dark', 'Hold', 'hull', cargo).position.set(15, 0, 0);
  [[3.6, 3.6], [-3.6, 3.6], [3.6, -3.6], [-3.6, -3.6]].forEach(([y, z]) => pipe(cargo, -126, 150, y, z, .45, 'Hold'));
  mesh(box(280, .25, .25), 'strip', 'Hold', 'glow', cargo).position.set(15, 5.2, 0);

  const CRATES = ['crate_rust', 'crate_blue', 'crate_olive', 'crate_white', 'crate_grey', 'crate_rust', 'crate_blue'];
  const bayStart = b => -124 + b * 34;
  const slots = [];
  for (const d of [0, 1]) for (const c of [-1, 0, 1]) {
    const r = 6.5 + d * 2.8, a = c * 2.8;
    slots.push([a, r], [a, -r], [r, a], [-r, a]);   // [y, z] positions round a plus-shaped section
  }
  for (let b = 0; b < 8; b++) {
    const x0 = bayStart(b);
    for (let s = 0; s < 4; s++) {
      const x = x0 + 5.6 + s * 6.4 + 3;
      for (const [y, z] of slots) {
        if (rnd() < .1) continue;
        const reefer = b === 1 && z < -5;
        const token = reefer ? 'HLD-12' : b >= 4 ? 'HLD-01' : 'HLD-05';
        const k = mesh(box(6, 2.55, 2.55), reefer ? 'crate_white' : CRATES[Math.floor(rnd() * CRATES.length)], token, 'interior', cargo);
        k.position.set(x, y, z);
        if (reefer) mesh(box(.12, .4, 1.6), 'strip', 'HLD-12', 'glow', cargo).position.set(x + 3.05, y + .6, z);
      }
    }
    // bay frame: four clamp bars around the cassette envelope
    for (const [y, z, w, h] of [[11.3, 0, .8, 23.4], [-11.3, 0, .8, 23.4], [0, 11.3, 23.4, .8], [0, -11.3, 23.4, .8]]) {
      mesh(box(1.4, w, h), 'plate', 'Hold', 'hull', cargo).position.set(x0 + 1.5, y, z);
    }
    mesh(box(.4, .4, 23), b % 2 ? 'amber' : 'strip', 'Hold', 'glow', cargo).position.set(x0 + 1.5, 11.9, 0);
  }
  glow(cargo, -97, 0, -11.5, 22, '#bff6ff', .28);

  // gantry crane riding rails along the flanks
  [12.8, -12.8].forEach(z => pipe(cargo, -124, 150, -2, z, .35, 'Hold'));
  const gantry = api.group(cargo, [40, 0, 0], { animated: true });
  mesh(box(3, 1.4, 27), 'plate', 'Hold', 'hull', gantry).position.set(0, 13.2, 0);
  [12.8, -12.8].forEach(z => {
    mesh(box(1.4, 15, 1.4), 'bare', 'Hold', 'hull', gantry).position.set(0, 5.4, z);
    mesh(box(2.6, 1.2, 1.6), 'dark', 'Hold', 'hull', gantry).position.set(0, -2, z);
  });
  mesh(box(2.4, 1.6, 2.4), 'dark', 'HLD-09', 'interior', gantry).position.set(0, 12, 4);
  mesh(new CylinderGeometry(.08, .08, 4, 6), 'bare', 'HLD-09', 'interior', gantry).position.set(0, 9.2, 4);
  mesh(box(2.8, .3, .3), 'amber', 'HLD-09', 'glow', gantry).position.set(0, 14, 0);
  navLight(gantry, 0, 14.6, 12.8, '#f0b64a', 'beacon');
  navLight(gantry, 0, 14.6, -12.8, '#f0b64a', 'beacon');

  /* ---------------- Engineering: reactor hall and machine shop (deck Eng) ---------------- */
  const eng = api.module('eng');
  mesh(cylX(13, 13, 24, 8), 'hull', 'Eng', 'hull', eng).position.x = -142;
  mesh(cylX(9, 13.6, 6, 8), 'dark', 'Eng', 'hull', eng).position.x = -127;
  ringFrames(eng, -152, -132, 10, 13.3, 'Eng');
  // reactor: vertical column in a shield ring, catwalk at mid-height
  mesh(new CylinderGeometry(2.6, 2.6, 18, 24), 'plate', 'ENG-01', 'interior', eng).position.set(-144, 0, 0);
  for (const y of [-6, 0, 6]) mesh(new TorusGeometry(4.2, .7, 10, 36).rotateX(Math.PI / 2), 'dark', 'ENG-01', 'interior', eng).position.set(-144, y, 0);
  for (const y of [-6, 0, 6]) mesh(new TorusGeometry(4.2, .12, 6, 48).rotateX(Math.PI / 2), 'core', 'ENG-01', 'glow', eng).position.set(-144, y + .75, 0);
  const shield = mesh(new CylinderGeometry(6.4, 6.4, 18, 24, 1, true, 0, Math.PI * 1.4), 'dark', 'ENG-01', 'interior', eng);
  shield.position.set(-144, 0, 0); shield.rotation.y = .26;                                    // gap faces aft, wall faces the crew end
  mesh(new CylinderGeometry(9, 9, .25, 32), 'plate', 'ENG-01', 'interior', eng).position.set(-144, -3, 0);
  // machine shop on the dorsal side
  mesh(box(16, 7, 14), 'plate', 'Eng', 'hull', eng).position.set(-140, 15.5, 0);
  mesh(box(15, .3, 13), 'dark', 'ENG-07', 'interior', eng).position.set(-140, 12.3, 0);
  for (let i = 0; i < 3; i++) mesh(box(3.2, 1, 1.4), 'interior', 'ENG-07', 'interior', eng).position.set(-145 + i * 4.5, 13, -4.6);
  mesh(cylX(.6, .6, 3.4, 16), 'bare', 'ENG-07', 'interior', eng).position.set(-140.5, 14, 3.5);
  mesh(box(4, 1, 1.6), 'dark', 'ENG-07', 'interior', eng).position.set(-140.5, 13, 3.5);
  mesh(box(.2, 3, 8), 'bare', 'ENG-07', 'interior', eng).position.set(-147.6, 15, 1);
  for (let k = -1; k <= 1; k++) mesh(box(4, .1, .5), 'warm', 'ENG-07', 'glow', eng).position.set(-140 + k * 5, 18.8, 0);
  windowStrip(eng, -140, 16, 7.1, 12, 'Eng', 'warm'); windowStrip(eng, -140, 16, -7.1, 12, 'Eng', 'warm');
  rcs(eng, -132, 11, 9, 'Eng'); rcs(eng, -132, -11, -9, 'Eng');
  navLight(eng, -140, 19.4, 0, '#ffffff', 'strobe2');

  /* ---------------- Radiator boom (deck Eng) ---------------- */
  const rad = api.module('radiators');
  mesh(box(4, 4, 104), 'dark', 'Eng', 'hull', rad).position.set(-164, 0, 0);
  [1, -1].forEach(sg => {
    const panel = mesh(box(44, .5, 32), 'rad', 'ENG-03', 'hull', rad);
    panel.position.set(-164, 0, sg * 36); panel.rotation.x = sg * .12;
    for (let i = 0; i < 9; i++) {
      const strip = mesh(box(43, .1, .22), 'amber', 'ENG-03', 'glow', rad);
      strip.position.set(-164, sg * .02 + .3, sg * (22 + i * 3.4)); strip.rotation.x = sg * .12;
    }
    mesh(box(44.6, .8, .8), 'plate', 'Eng', 'hull', rad).position.set(-164, 0, sg * 52);
  });

  /* ---------------- Drive cluster (deck Eng) ---------------- */
  const drives = api.module('drives');
  mesh(cylX(10, 13, 8, 8), 'dark', 'Eng', 'hull', drives).position.x = -158;
  mesh(box(6, 25, 25), 'plate', 'Eng', 'hull', drives).position.set(-171, 0, 0);
  [[7.5, 7.5], [7.5, -7.5], [-7.5, 7.5], [-7.5, -7.5]].forEach(([y, z]) => {
    mesh(cylX(4.6, 5, 14, 20), 'hull', 'Eng', 'hull', drives).position.set(-181, y, z);
    for (let k = 0; k < 2; k++) mesh(new TorusGeometry(5.1, .3, 8, 28).rotateY(Math.PI / 2), 'bare', 'Eng', 'hull', drives).position.set(-178 - k * 6, y, z);
    const bell = mesh(new CylinderGeometry(6.4, 3.4, 12, 28, 1, true), 'plate', 'Eng', 'hull', drives);
    bell.position.set(-194, y, z); bell.rotation.z = Math.PI / 2;
    const throat = mesh(new CylinderGeometry(5.6, 2.8, 11, 28, 1, true), 'drive', 'ENG-05', 'glow', drives);
    throat.position.set(-194.2, y, z); throat.rotation.z = Math.PI / 2;
    const disk = mesh(new CircleGeometry(5.8, 28), 'drive', 'ENG-05', 'glow', drives);
    disk.position.set(-200, y, z); disk.rotation.y = -Math.PI / 2;
    glow(drives, -201, y, z, 16, '#ff9a3c', .45);
    glow(drives, -210, y, z, 34, '#ff6a2a', .18);
    plumes.push(api.plume(drives, -200.2, y, z, 5.4, 60), api.plume(drives, -200.2, y, z, 2.7, 82));
  });
  mesh(new SphereGeometry(1.4, 12, 8), 'bare', 'Eng', 'hull', drives).position.set(-171, 13.5, 0);

  /* ---------------- Room markers ---------------- */
  api.room('OPS-01', bow, [188, 24.5, 0]);
  api.room('OPS-02', hab, [147, 12.5, 12]);
  api.room('OPS-04', bow, [172, 1.5, 0]);
  api.room('OPS-06', bow, [166, 9, -8]);
  api.room('OPS-08', bow, [182, -14.5, 0]);
  api.room('HLD-01', cargo, [80, 12.5, 0]);
  api.room('HLD-05', cargo, [-40, 12.5, 0]);
  api.room('HLD-09', gantry, [0, 16, 0]);
  api.room('HLD-12', cargo, [-97, 0, -11.5]);
  api.room('ENG-01', eng, [-144, 0, 0]);
  api.room('ENG-07', eng, [-140, 19.5, 0]);
  api.room('ENG-03', rad, [-164, 1, 38]);
  api.room('ENG-05', drives, [-194, 0, 0]);

  /* ---------------- Moving parts ---------------- */
  api.animate(T => {
    const strobe = (T % 1.6) < .08, strobe2 = ((T + .8) % 1.6) < .08, beacon = .45 + .55 * Math.abs(Math.sin(T * 1.5));
    for (const { s, kind } of navLights) {
      s.material.opacity = kind === 'strobe' ? (strobe ? 1 : 0)
        : kind === 'strobe2' ? (strobe2 ? 1 : 0)
        : kind === 'beacon' ? beacon
        : .55 + .35 * Math.abs(Math.sin(T * 2.2));
    }
    gantry.position.x = 13 + Math.sin(T * .045) * 118;
    const fl = .95 + .05 * Math.sin(T * 23) * Math.sin(T * 11.7);
    for (const p of plumes) p.scale.set(fl, 1, 1);
  });
}
