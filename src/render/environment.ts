import {
  AmbientLight, BackSide, Color, DirectionalLight, HemisphereLight, Mesh, MeshBasicMaterial,
  PerspectiveCamera, PMREMGenerator, PointLight, Scene, SphereGeometry, SpotLight, Vector3,
  WebGLRenderer,
} from 'three';
import { col } from '../util';

export interface Lighting { sun: DirectionalLight; lamp: SpotLight; interiorFill: PointLight; }

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
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.6;
  scene.add(sun);
  scene.add(sun.target);

  const fill = new DirectionalLight(col('#7fa6ff'), 0.35 * L);
  fill.position.set(-300, -200, -400);
  scene.add(fill);

  const lamp = new SpotLight(col('#d8f6ff'), 0, 400, 0.5, 0.5, 1.2);
  lamp.visible = false;
  camera.add(lamp);
  lamp.target.position.set(0, 0, -1);
  camera.add(lamp.target);

  // Nothing casts shadows, so an interior is lit by whatever the sun happens to hit.
  // This comes up only while the camera is inside a room, to keep the fittings readable.
  const interiorFill = new PointLight(col('#dce9f2'), 0, 0, 1.1);
  camera.add(interiorFill);

  return { sun, lamp, interiorFill };
}

/**
 * Point the sun at the ship and size its shadow frustum to the hull. A directional shadow
 * covers a box, so the box has to be the ship rather than the whole scene.
 */
export function fitSunShadow(sun: DirectionalLight, radius: number, centre = new Vector3()) {
  const d = Math.max(radius * 2.2, 20);
  sun.position.copy(new Vector3(400, 260, 520).normalize().multiplyScalar(d * 1.6)).add(centre);
  sun.target.position.copy(centre);
  sun.target.updateMatrixWorld();
  const cam = sun.shadow.camera;
  cam.left = -radius * 1.15; cam.right = radius * 1.15;
  cam.top = radius * 1.15; cam.bottom = -radius * 1.15;
  cam.near = d * .2; cam.far = d * 3.4;
  sun.shadow.normalBias = Math.max(.05, radius * .004);
  cam.updateProjectionMatrix();
}

/**
 * The environment a hull reflects: a graded sky, the planet, a bright sun disc and its
 * glare ring. Reflections are most of what makes plating read as metal, so this is worth
 * more than its two dozen triangles suggest.
 */
export function createEnvironment(renderer: WebGLRenderer, scene: Scene, sunPos: Vector3) {
  const pm = new PMREMGenerator(renderer);
  const es = new Scene();
  const dir = sunPos.clone().normalize();

  // Sky: dark at the anti-sun side, faintly warm toward the sun.
  es.add(new Mesh(new SphereGeometry(100, 48, 32), new MeshBasicMaterial({ color: col('#05080f'), side: BackSide })));
  const band = new Mesh(new SphereGeometry(98, 48, 32, 0, Math.PI * 2, Math.PI * .28, Math.PI * .44),
    new MeshBasicMaterial({ color: col('#0b1424'), side: BackSide, transparent: true, opacity: .8 }));
  es.add(band);

  // Planet, lit crescent toward the sun.
  const pl = new Mesh(new SphereGeometry(44, 48, 32), new MeshBasicMaterial({ color: col('#31537f') }));
  pl.position.set(55, -25, -75);
  es.add(pl);
  const limb = new Mesh(new SphereGeometry(46, 48, 32), new MeshBasicMaterial({ color: col('#9dc0ef'), transparent: true, opacity: .35 }));
  limb.position.copy(pl.position).add(dir.clone().multiplyScalar(6));
  es.add(limb);

  // Sun: a small, very bright disc with a wide, weak glare around it.
  const sun = new Mesh(new SphereGeometry(4.5, 24, 16), new MeshBasicMaterial({ color: new Color(26, 23, 19) }));
  sun.position.copy(dir).multiplyScalar(88);
  es.add(sun);
  const glare = new Mesh(new SphereGeometry(17, 24, 16), new MeshBasicMaterial({ color: new Color(1.2, 1.05, .85), transparent: true, opacity: .5 }));
  glare.position.copy(sun.position);
  es.add(glare);

  scene.environment = pm.fromScene(es, 0.025).texture;
  scene.environmentIntensity = 1.15;
  pm.dispose();
}
