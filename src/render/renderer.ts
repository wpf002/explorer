import {
  NoToneMapping, PerspectiveCamera, Scene, Vector2, WebGLRenderer, WebGLRenderTarget,
  HalfFloatType,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createTonemapPass } from './tonemap';
import { col } from '../util';

export interface Stage {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  composer: EffectComposer;
  bloomPass: UnrealBloomPass;
  /** Tone-map exposure. Lives on the tone pass, not the renderer, see tonemap.ts. */
  setExposure: (v: number) => void;
  resize: () => void;
}

/** render -> tonemap -> bloom -> output. Bloom stays selective by threshold, not by layers. */
export function createStage(canvas: HTMLCanvasElement, near = 0.5, far = 8000): Stage {
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.info.autoReset = false;
  // Tone mapping runs as a pass so bloom thresholds display values; OutputPass then
  // only converts to sRGB.
  renderer.toneMapping = NoToneMapping;
  renderer.localClippingEnabled = true;

  const scene = new Scene();
  scene.background = col('#03050a');

  const camera = new PerspectiveCamera(55, 1, near, far);
  scene.add(camera);

  // MSAA target so edges stay clean through the composer; half-float keeps bloom from banding.
  const rt = new WebGLRenderTarget(2, 2, { samples: 4, type: HalfFloatType });
  const composer = new EffectComposer(renderer, rt);
  const tonePass = createTonemapPass();
  const bloomPass = new UnrealBloomPass(new Vector2(2, 2), 0.72, 0.55, 0.78);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(tonePass);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
  const setExposure = (v: number) => { tonePass.uniforms.toneMappingExposure.value = v; };
  setExposure(1.15);

  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    bloomPass.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize);
  resize();

  return { renderer, scene, camera, composer, bloomPass, setExposure, resize };
}
