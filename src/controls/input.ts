import { PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three';
import type { ViewerState } from '../state';
import { clamp } from '../util';
import type { CameraRig } from './camera';

export interface InputHandlers {
  /** A drag, wheel or key that should take over from an automated mode. */
  takeOver(): void;
  pickRoom(index: number): void;
  jumpTo(index: number): void;
  toggleUi(): void;
  clearSelection(): void;
  setMode(m: 'roam'): void;
}

export interface InputTargets { objects: import('three').Object3D[]; }

export function bindInput(
  canvas: HTMLCanvasElement,
  camera: PerspectiveCamera,
  rig: CameraRig,
  S: ViewerState,
  targets: InputTargets,
  h: InputHandlers,
) {
  const keys = new Set<string>();
  const ptrs = new Map<number, { x: number; y: number }>();
  let drag: { x: number; y: number; btn: number; moved: boolean } | null = null;
  let pinch0 = 0;
  const tmp = new Vector3();

  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    drag = { x: e.clientX, y: e.clientY, btn: e.button, moved: false };
    canvas.classList.add('dragging');
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      pinch0 = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });

  canvas.addEventListener('pointermove', e => {
    if (!drag || !ptrs.has(e.pointerId)) return;
    const prev = ptrs.get(e.pointerId)!;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch0) {
        const k = pinch0 / d;
        if (S.mode === 'orbit') { rig.r *= k; rig.applyOrbit(); }
        else rig.pos.add(rig.forward().multiplyScalar((d - pinch0) * .4));
      }
      pinch0 = d;
      return;
    }

    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
    if (rig.fly) return;
    if (S.mode === 'tour') h.takeOver();
    if (S.mode === 'orbit') {
      if (drag.btn === 2 || e.shiftKey) {
        const right = new Vector3().crossVectors(camera.getWorldDirection(tmp), camera.up).normalize();
        const up = new Vector3().crossVectors(right, camera.getWorldDirection(tmp)).normalize();
        rig.target.add(right.multiplyScalar(-dx * rig.r * .0012)).add(up.multiplyScalar(dy * rig.r * .0012));
      } else {
        rig.theta -= dx * .005;
        rig.phi -= dy * .005;
      }
      rig.applyOrbit();
    } else {
      rig.yaw += dx * .0032;
      rig.pitch = clamp(rig.pitch - dy * .0032, -1.5, 1.5);
    }
  });

  const ray = new Raycaster();
  ray.layers.set(1);
  canvas.addEventListener('pointerup', e => {
    if (!drag || drag.moved || drag.btn !== 0 || rig.fly || ptrs.size > 1) return;
    const m = new Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(m, camera);
    const hit = ray.intersectObjects(targets.objects, false)[0];
    if (hit) h.pickRoom(hit.object.userData.room as number);
  });

  const endDrag = (e: PointerEvent) => {
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch0 = 0;
    if (ptrs.size === 0) { drag = null; canvas.classList.remove('dragging'); }
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    if (rig.fly) return;
    if (S.mode === 'tour') h.takeOver();
    const k = Math.exp(e.deltaY * .0011);
    if (S.mode === 'orbit') { rig.r *= k; rig.applyOrbit(); }
    else rig.pos.add(rig.forward().multiplyScalar(-e.deltaY * .08));
  }, { passive: false });

  addEventListener('keydown', e => {
    const t = e.target as HTMLElement;
    if (t.tagName === 'INPUT' || t.tagName === 'BUTTON') t.blur();
    const k = e.key.toLowerCase();
    keys.add(k);
    if (k === ' ') e.preventDefault();
    if (k >= '1' && k <= '9') h.jumpTo(+k - 1);
    if (k === 'h') h.toggleUi();
    if (k === 'escape') h.clearSelection();
    if ('wasd'.includes(k) && S.mode !== 'roam') h.setMode('roam');
  });
  addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());

  return keys;
}
