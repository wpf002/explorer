import { BoxGeometry, ConeGeometry, CylinderGeometry, Mesh, Vector3 } from 'three';

/** Cylinder along +X, the ship's forward axis. */
export const cylX = (r1: number, r2: number, len: number, seg = 32, open = false) => {
  const g = new CylinderGeometry(r1, r2, len, seg, 1, open);
  g.rotateZ(Math.PI / 2);
  return g;
};

/** Cone pointing +X. */
export const coneX = (r: number, len: number, seg = 32) => {
  const g = new ConeGeometry(r, len, seg, 1, false);
  g.rotateZ(-Math.PI / 2);
  return g;
};

export const box = (w: number, h: number, d: number) => new BoxGeometry(w, h, d);

export const Y_UP = new Vector3(0, 1, 0);

/** Orient a cylinder mesh so its length runs from a to b. */
export function spanTo(m: Mesh, a: Vector3, b: Vector3) {
  const d = b.clone().sub(a);
  m.position.copy(a).add(b).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(Y_UP, d.normalize());
}

export function trussPoints(x: number, r: number, k: number) {
  const a = k * Math.PI / 2 + Math.PI / 4;
  return new Vector3(x, Math.cos(a) * r, Math.sin(a) * r);
}


/** Cone opening aft along -X, anchored at the throat. */
export const plumeGeometry = (r: number, len: number) => {
  const g = new ConeGeometry(r, len, 24, 1, true);
  g.rotateZ(Math.PI / 2);
  g.translate(-len / 2, 0, 0);
  return g;
};
