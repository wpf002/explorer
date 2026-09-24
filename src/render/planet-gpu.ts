import { AdditiveBlending, BackSide, Group, Mesh, MeshBasicNodeMaterial, Scene, SphereGeometry, Vector3 } from 'three/webgpu';
import { Fn, float, mix, pow, positionWorld, normalWorld, cameraPosition, uniform, uv, vec3, vec4, sin, smoothstep, max, dot, normalize } from 'three/tsl';

/** The banded gas giant and its atmosphere, as TSL rather than GLSL. */
export function createPlanetGpu(scene: Scene, sunPos: Vector3, scale = 1): Group {
  const radius = 760 * scale;
  const grp = new Group();
  grp.position.set(1250 * scale, -420 * scale, -1950 * scale);
  const sunDir = uniform(sunPos.clone().normalize());

  const body = new MeshBasicNodeMaterial();
  body.colorNode = Fn(() => {
    const y = uv().y;
    const wob = sin(uv().x.mul(18).add(y.mul(30))).mul(0.012);
    const b = sin(y.add(wob).mul(38).add(sin(y.mul(11)).mul(2.2))).mul(0.5).add(0.5);
    const b2 = sin(y.add(wob).mul(95).add(1.7)).mul(0.5).add(0.5);
    const b3 = smoothstep(0.3, 0.7, sin(y.mul(7).add(2)).mul(0.5).add(0.5));
    const deep = pow(vec3(0.16, 0.28, 0.55), vec3(2.2));
    const pale = pow(vec3(0.70, 0.78, 0.90), vec3(2.2));
    const ink = pow(vec3(0.07, 0.13, 0.30), vec3(2.2));
    let c = mix(deep, pale, b.mul(0.75));
    c = mix(c, ink, b2.mul(0.3));
    c = mix(c, pale, b3.mul(0.35));
    const N = normalize(normalWorld);
    const diff = max(dot(N, sunDir), float(0));
    const term = smoothstep(-0.15, 0.35, dot(N, sunDir));
    const V = normalize(cameraPosition.sub(positionWorld));
    const rim = pow(float(1).sub(max(dot(N, V), float(0))), 3.5);
    const glow = pow(vec3(0.45, 0.66, 1.0), vec3(2.2)).mul(rim).mul(term.mul(1.1).add(0.25));
    return vec4(c.mul(diff.add(0.02)).add(glow), 1);
  })();
  grp.add(new Mesh(new SphereGeometry(radius, 96, 64), body));

  const atmos = new MeshBasicNodeMaterial();
  atmos.side = BackSide;
  atmos.transparent = true;
  atmos.depthWrite = false;
  atmos.blending = AdditiveBlending;
  atmos.colorNode = Fn(() => {
    const N = normalize(normalWorld);
    const V = normalize(cameraPosition.sub(positionWorld));
    const a = pow(max(dot(N, V), float(0)), 3);
    const lit = smoothstep(-0.3, 0.4, dot(N.negate(), sunDir)).mul(0.65).add(0.35);
    return vec4(pow(vec3(0.42, 0.62, 1.0), vec3(2.2)).mul(a).mul(lit).mul(0.9), 1);
  })();
  grp.add(new Mesh(new SphereGeometry(radius * 1.035, 96, 64), atmos));

  scene.add(grp);
  return grp;
}
