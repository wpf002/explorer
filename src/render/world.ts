import type { Points } from 'three';
import type { Stage } from './renderer';
import { createEnvironment, createLighting, type Lighting } from './environment';
import { createStars } from './stars';
import { createPlanet } from './planet';

export interface World extends Stage, Lighting { stars: Points; }

/** Renderer, lights, sky and planet. `scale` is ship length over the 300 m reference. */
export async function createWorld(canvas: HTMLCanvasElement, scale: number, near = 0.5, far = 8000): Promise<World> {
  const stage = __GPU__
    ? await (await import('./renderer-gpu')).createStageGpu(canvas, near, far)
    : (await import('./renderer')).createStage(canvas, near, far);
  const lighting = createLighting(stage.scene, stage.camera);
  const stars = createStars(stage.scene, scale);
  if (__GPU__) (await import('./planet-gpu')).createPlanetGpu(stage.scene as never, lighting.sun.position, scale);
  else createPlanet(stage.scene, lighting.sun.position, scale);
  createEnvironment(stage.renderer, stage.scene, lighting.sun.position);
  return { ...stage, ...lighting, stars };
}
