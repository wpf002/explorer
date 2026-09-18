import type { Points } from 'three';
import { createStage, type Stage } from './renderer';
import { createEnvironment, createLighting, type Lighting } from './environment';
import { createStars } from './stars';
import { createPlanet } from './planet';

export interface World extends Stage, Lighting { stars: Points; }

/** Renderer, lights, sky and planet. `scale` is ship length over the 300 m reference. */
export function createWorld(canvas: HTMLCanvasElement, scale: number, near = 0.5, far = 8000): World {
  const stage = createStage(canvas, near, far);
  const lighting = createLighting(stage.scene, stage.camera);
  const stars = createStars(stage.scene, scale);
  createPlanet(stage.scene, lighting.sun.position, scale);
  createEnvironment(stage.renderer, stage.scene, lighting.sun.position);
  return { ...stage, ...lighting, stars };
}
