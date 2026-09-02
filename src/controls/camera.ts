import { PerspectiveCamera, Vector3 } from 'three';
import { clamp, ease } from '../util';

export interface FlyLeg { p0: Vector3; t0: Vector3; p1: Vector3; t1: Vector3; dur: number; t: number; }

/** Shared camera pose all three modes write into, plus orbit and roam bookkeeping. */
export class CameraRig {
  pos = new Vector3();
  target = new Vector3();
  yaw = 0;
  pitch = 0;
  theta = 0;
  phi = 0;
  r = 0;
  range: [number, number] = [8, 1600];
  fly: FlyLeg | null = null;

  constructor(pos: Vector3, target: Vector3, range?: [number, number]) {
    this.pos.copy(pos);
    this.target.copy(target);
    if (range) this.range = range;
    this.syncOrbit();
    this.syncYaw();
  }

  syncOrbit() {
    const o = this.pos.clone().sub(this.target);
    this.r = o.length();
    this.theta = Math.atan2(o.x, o.z);
    this.phi = Math.acos(clamp(o.y / this.r, -1, 1));
  }

  applyOrbit() {
    this.phi = clamp(this.phi, .04, Math.PI - .04);
    this.r = clamp(this.r, this.range[0], this.range[1]);
    this.pos.set(
      this.r * Math.sin(this.phi) * Math.sin(this.theta),
      this.r * Math.cos(this.phi),
      this.r * Math.sin(this.phi) * Math.cos(this.theta),
    ).add(this.target);
  }

  syncYaw() {
    const d = this.target.clone().sub(this.pos).normalize();
    this.pitch = Math.asin(clamp(d.y, -1, 1));
    this.yaw = Math.atan2(d.z, d.x);
  }

  forward() {
    return new Vector3(
      Math.cos(this.pitch) * Math.cos(this.yaw),
      Math.sin(this.pitch),
      Math.cos(this.pitch) * Math.sin(this.yaw),
    );
  }

  flyTo(pos: Vector3, target: Vector3, dur: number) {
    this.fly = { p0: this.pos.clone(), t0: this.target.clone(), p1: pos.clone(), t1: target.clone(), dur, t: 0 };
  }

  /** Advance an in-progress fly-to. Returns true while one is running. */
  stepFly(dt: number): boolean {
    const f = this.fly;
    if (!f) return false;
    f.t += dt / f.dur;
    const k = ease(clamp(f.t, 0, 1));
    this.pos.lerpVectors(f.p0, f.p1, k);
    this.target.lerpVectors(f.t0, f.t1, k);
    if (f.t >= 1) { this.fly = null; this.syncOrbit(); this.syncYaw(); }
    return true;
  }

  apply(camera: PerspectiveCamera) {
    camera.position.copy(this.pos);
    camera.lookAt(this.target);
  }
}

const UP = new Vector3(0, 1, 0);

/** WASD / Space / C free flight. */
export function roamStep(rig: CameraRig, keys: Set<string>, dt: number) {
  const fwd = rig.forward();
  const right = new Vector3().crossVectors(fwd, UP).normalize();
  const sp = (keys.has('shift') ? 110 : 34) * dt;
  const mv = new Vector3();
  if (keys.has('w')) mv.add(fwd);
  if (keys.has('s')) mv.sub(fwd);
  if (keys.has('d')) mv.add(right);
  if (keys.has('a')) mv.sub(right);
  if (keys.has(' ') || keys.has('e')) mv.y += 1;
  if (keys.has('c') || keys.has('q')) mv.y -= 1;
  if (mv.lengthSq()) rig.pos.add(mv.normalize().multiplyScalar(sp));
  rig.target.copy(rig.pos).add(fwd.multiplyScalar(20));
}
