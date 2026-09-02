import {
  AmbientLight, BackSide, Color, DirectionalLight, HemisphereLight, Mesh, MeshBasicMaterial,
  PerspectiveCamera, PMREMGenerator, Scene, SphereGeometry, SpotLight, Vector3, WebGLRenderer,
} from 'three';
import { col } from '../util';

export interface Lighting { sun: DirectionalLight; lamp: SpotLight; }

/**
 * Three dropped `useLegacyLights` in r165, so an intensity of 1 is a good deal dimmer
 * than the same number was in r128. The demo's intensities are scaled back up by this
 * factor; π is the documented unit conversion, and 0.75 of it is where the golden diff
 * bottoms out for this particular rig (ambient + hemisphere + two directionals + PMREM).
 */
const L = Math.PI * 0.75;
export const LAMP_INTENSITY = 2.2 * L;

export function createLighting(scene: Scene, camera: PerspectiveCamera): Lighting {
  scene.add(new AmbientLight(col('#33465e'), 0.28 * L));
  scene.add(new HemisphereLight(col('#5b7fb8'), col('#0a0d16'), 0.3 * L));

  const sun = new DirectionalLight(col('#fff1dc'), 2.1 * L);
  sun.position.set(400, 260, 520);
  scene.add(sun);

  const fill = new DirectionalLight(col('#7fa6ff'), 0.35 * L);
  fill.position.set(-300, -200, -400);
  scene.add(fill);

  const lamp = new SpotLight(col('#d8f6ff'), 0, 400, 0.5, 0.5, 1.2);
  lamp.visible = false;
  camera.add(lamp);
  lamp.target.position.set(0, 0, -1);
  camera.add(lamp.target);

  return { sun, lamp };
}

/** A dark sky, a blue planet and the sun, baked to a PMREM for hull reflections. */
export function createEnvironment(renderer: WebGLRenderer, scene: Scene, sunPos: Vector3) {
  const pm = new PMREMGenerator(renderer);
  const es = new Scene();
  es.add(new Mesh(new SphereGeometry(100, 32, 16), new MeshBasicMaterial({ color: col('#070c16'), side: BackSide })));
  const pl = new Mesh(new SphereGeometry(42, 32, 16), new MeshBasicMaterial({ color: col('#4a74c4') }));
  pl.position.set(55, -25, -75);
  es.add(pl);
  const sb = new Mesh(new SphereGeometry(7, 16, 8), new MeshBasicMaterial({ color: new Color(9, 8, 6.5) }));
  sb.position.copy(sunPos).normalize().multiplyScalar(88);
  es.add(sb);
  scene.environment = pm.fromScene(es, 0.04).texture;
  pm.dispose();
}
