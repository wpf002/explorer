import { ShaderChunk } from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/**
 * ACES tone mapping as a pass.
 *
 * Modern three skips the renderer's tone mapping whenever the scene renders into a
 * target, which is always true behind a composer. Bloom would then threshold raw HDR
 * and smear. Running the tone map here restores the r128 response: bloom sees 0..1
 * values and stays a highlight effect rather than a haze.
 */
export function createTonemapPass() {
  return new ShaderPass({
    name: 'ACESTonemapShader',
    uniforms: {
      tDiffuse: { value: null },
      toneMappingExposure: { value: 1 },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse;
      varying vec2 vUv;
      ${ShaderChunk.tonemapping_pars_fragment}
      void main(){
        vec4 texel = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(ACESFilmicToneMapping(texel.rgb), texel.a);
      }`,
  });
}
