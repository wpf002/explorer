import { AdditiveBlending, DoubleSide, Material, ShaderMaterial } from 'three';

export interface PlumeMaterial { material: Material; setTime: (t: number) => void; }

const GLSL_VERT = /* glsl */`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const GLSL_FRAG = /* glsl */`varying vec2 vUv;uniform float t;
  void main(){float y=vUv.y;float fade=pow(1.0-y,1.7)*smoothstep(0.0,0.08,y+0.08);
    float n=0.82+0.18*sin(t*21.0+y*38.0)*sin(t*15.0+vUv.x*31.4);
    vec3 c=mix(vec3(1.0,0.86,0.62),vec3(1.0,0.42,0.12),y);
    gl_FragColor=vec4(c*fade*n*0.9,fade*n*0.7);}`;

/** The drive exhaust, written once per backend: GLSL for WebGL, TSL for the node pipeline. */
export async function createPlumeMaterial(): Promise<PlumeMaterial> {
  if (!__GPU__) {
    const material = new ShaderMaterial({
      uniforms: { t: { value: 0 } },
      transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
      vertexShader: GLSL_VERT, fragmentShader: GLSL_FRAG,
    });
    return { material, setTime: t => { material.uniforms.t.value = t; } };
  }
  const { MeshBasicNodeMaterial } = await import('three/webgpu');
  const { Fn, float, mix, pow, sin, smoothstep, uniform, uv, vec3, vec4 } = await import('three/tsl');
  const t = uniform(0);
  const material = new MeshBasicNodeMaterial();
  material.transparent = true;
  material.depthWrite = false;
  material.blending = AdditiveBlending;
  material.side = DoubleSide;
  material.colorNode = Fn(() => {
    const y = uv().y;
    const fade = pow(float(1).sub(y), 1.7).mul(smoothstep(0, 0.08, y.add(0.08)));
    const n = float(0.82).add(sin(t.mul(21).add(y.mul(38))).mul(sin(t.mul(15).add(uv().x.mul(31.4)))).mul(0.18));
    const c = mix(vec3(1, 0.86, 0.62), vec3(1, 0.42, 0.12), y);
    return vec4(c.mul(fade).mul(n).mul(0.9), fade.mul(n).mul(0.7));
  })();
  return { material: material as unknown as Material, setTime: v => { t.value = v; } };
}
