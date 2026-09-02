/**
 * A stand-in BuildApi that records node names without a GPU. Enough of three.js is
 * faked for a build script to run: geometry constructors are inert and every node
 * returned is a chainable stub.
 */
const node = (name = '') => ({
  name,
  position: { x: 0, y: 0, z: 0, set() { return this; }, copy() { return this; } },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { set() { return this; } },
  quaternion: { setFromUnitVectors() { return this; } },
  material: { opacity: 1 },
  userData: {},
  add() { return this; },
});

const geometry = () => {
  const g = {
    rotateX: () => g, rotateY: () => g, rotateZ: () => g, translate: () => g,
    attributes: { position: { count: 0 } },
  };
  return g;
};

const THREE_STUB = new Proxy({
  Vector3: class { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    clone() { return new THREE_STUB.Vector3(this.x, this.y, this.z); }
    sub() { return this; } add() { return this; } normalize() { return this; }
    multiplyScalar() { return this; } length() { return 1; } copy() { return this; } },
}, {
  get(target, prop) {
    if (prop in target) return target[prop];
    if (typeof prop !== 'string') return undefined;
    return function () { return geometry(); };
  },
});

export function recordingApi(spec) {
  const names = [];
  const push = n => { names.push(n); return n; };
  let serial = 0;

  const mesh = (_geo, _mat, token, kind) => {
    const prefix = kind === 'hull' ? 'hull' : kind === 'interior' ? 'int' : 'glow';
    return node(push(`${prefix}_${token}_${serial++}`));
  };

  const api = {
    THREE: THREE_STUB,
    spec,
    module: id => node(push(`mod_${id}`)),
    spin: (_p, id) => node(push(`spin_${id}`)),
    group: () => node(),
    room: code => node(push(`room_${code}`)),
    mesh,
    glow: () => node(push(`glow_sprite_${serial++}`)),
    sprite: () => node(push(`glow_point_${serial++}`)),
    wireframe: () => node(push(`glow_wire_${serial++}`)),
    animate: () => {},
    box: geometry, cylX: geometry, coneX: geometry,
    ringFrames: (p, x0, x1, step, _r, token, matKey = 'dark') => {
      for (let x = x0; x <= x1; x += step) mesh(null, matKey, token, 'hull', p);
    },
    windowStrip: (p, _x, _y, _z, _len, token, matKey = 'strip') => mesh(null, matKey, token, 'glow', p),
    bar: (p, _a, _b, _r, token, matKey = 'bare') => mesh(null, matKey, token, 'hull', p),
    truss: (p, _x0, _x1, _r, bays, token) => {
      for (let k = 0; k < 4; k++) mesh(null, 'bare', token, 'hull', p);
      for (let i = 0; i <= bays; i++) for (let k = 0; k < 4; k++) {
        mesh(null, 'bare', token, 'hull', p);
        if (i < bays) mesh(null, 'bare', token, 'hull', p);
      }
    },
    pipe: (p, _x0, _x1, _y, _z, _r, token, matKey = 'bare') => mesh(null, matKey, token, 'hull', p),
    rcs: (p, _x, _y, _z, token) => {
      mesh(null, 'bare', token, 'hull', p);
      for (let i = 0; i < 4; i++) mesh(null, 'bare', token, 'hull', p);
      return node();
    },
    plume: () => node(push(`glow_plume_${serial++}`)),
  };
  return { api, names };
}
