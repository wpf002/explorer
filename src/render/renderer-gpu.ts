import {
  ACESFilmicToneMapping, PerspectiveCamera, PostProcessing, Scene, WebGPURenderer,
} from 'three/webgpu';
import { mrt, normalView, output, pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { ao } from 'three/addons/tsl/display/GTAONode.js';
import { fxaa } from 'three/addons/tsl/display/FXAANode.js';
import { col } from '../util';
import type { Stage } from './renderer';

/**
 * The node pipeline: scene pass -> ambient occlusion on the pass's own depth and normals
 * -> bloom -> FXAA, with tone mapping and colour space handled by the renderer.
 *
 * Ambient occlusion works here because the pass gives the AO node a real depth and normal
 * buffer, rather than the composer reconstructing them from a clamped depth texture.
 */
export async function createStageGpu(canvas: HTMLCanvasElement, near = 0.5, far = 8000): Promise<Stage> {
  // forceWebGL keeps the same node pipeline on machines and CI runners without WebGPU.
  const forceWebGL = new URLSearchParams(location.search).get('backend') === 'webgl';
  // No MSAA: the ambient occlusion node cannot gather from a multisampled depth texture,
  // and FXAA at the end of the chain covers the edges.
  const renderer = new WebGPURenderer({ canvas, antialias: false, powerPreference: 'high-performance', forceWebGL });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  await renderer.init();

  const scene = new Scene();
  scene.background = col('#03050a');
  const camera = new PerspectiveCamera(55, 1, near, far);
  scene.add(camera);

  // The pass writes colour and view normals; ambient occlusion reads those plus depth.
  const scenePass = pass(scene, camera);
  scenePass.setMRT(mrt({ output, normal: normalView }));
  const colour = scenePass.getTextureNode('output');
  const depth = scenePass.getTextureNode('depth');
  const normal = scenePass.getTextureNode('normal');

  const aoNode = ao(depth, normal, camera);
  aoNode.distanceExponent.value = 1;
  aoNode.distanceFallOff.value = 1;
  aoNode.radius.value = 0.4;
  aoNode.scale.value = 1.2;
  aoNode.thickness.value = 1;

  const lit = colour.mul(aoNode.getTextureNode());
  const glow = bloom(lit, 0.85, 0.55, 0.78);

  const post = new PostProcessing(renderer);
  post.outputNode = fxaa(lit.add(glow));

  const composer = { render: () => post.render(), setSize: () => {}, setPixelRatio: () => {} };

  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize);
  resize();

  return {
    renderer: renderer as unknown as Stage['renderer'],
    scene: scene as unknown as Stage['scene'],
    camera: camera as unknown as Stage['camera'],
    composer: composer as unknown as Stage['composer'],
    bloomPass: { enabled: true, strength: .85, radius: .55 } as unknown as Stage['bloomPass'],
    setExposure: (v: number) => { renderer.toneMappingExposure = v; },
    resize,
  };
}
