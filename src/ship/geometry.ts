import {
  AdditiveBlending, BoxGeometry, ConeGeometry, CylinderGeometry, Mesh, ShaderMaterial, Vector3,
} from 'three';

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

export const plumeMaterial = () => new ShaderMaterial({
  uniforms: { t: { value: 0 } },
  transparent: true, depthWrite: false, blending: AdditiveBlending, side: 2,
  vertexShader: /* glsl */`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: /* glsl */`varying vec2 vUv;uniform float t;
    void main(){float y=vUv.y;float fade=pow(1.0-y,1.7)*smoothstep(0.0,0.08,y+0.08);
      float n=0.82+0.18*sin(t*21.0+y*38.0)*sin(t*15.0+vUv.x*31.4);
      vec3 c=mix(vec3(1.0,0.86,0.62),vec3(1.0,0.42,0.12),y);
      gl_FragColor=vec4(c*fade*n*0.9,fade*n*0.7);}`,
});

/** Cone opening aft along -X, anchored at the throat. */
export const plumeGeometry = (r: number, len: number) => {
  const g = new ConeGeometry(r, len, 24, 1, true);
  g.rotateZ(Math.PI / 2);
  g.translate(-len / 2, 0, 0);
  return g;
};
