import { Object3D, Vector3 } from 'three';
import type { RoomSpec } from '../schema';
import type { LoadedShip } from '../ship/loader';
import { roomWorld } from '../ship/loader';
import type { CameraRig } from './camera';

export interface FlyPose { pos: Vector3; look: Vector3; }

/**
 * Where to sit to look at a room. `view: "radial"` approaches outward from the +X spine,
 * following whatever rotation the marker's parent currently has.
 */
export function roomPose(ship: LoadedShip, i: number, close: boolean): FlyPose {
  const room: RoomSpec = ship.spec.rooms[i];
  const target = roomWorld(ship, i);
  const parent: Object3D = ship.markers[i].parent ?? ship.model.root;

  if (close && room.close) {
    return {
      pos: parent.localToWorld(new Vector3(...room.close.pos)),
      look: parent.localToWorld(new Vector3(...room.close.look)),
    };
  }

  let dir: Vector3;
  if (room.view === 'radial') {
    const c = parent.getWorldPosition(new Vector3());
    dir = target.clone().sub(new Vector3(target.x, c.y, c.z)).normalize().multiplyScalar(1.1).add(new Vector3(.5, 0, 0));
  } else {
    dir = new Vector3(...room.view);
  }
  dir.normalize();
  return { pos: target.clone().add(dir.multiplyScalar(close ? room.dist * .55 : room.dist)), look: target };
}

export function flyToRoom(rig: CameraRig, ship: LoadedShip, i: number, close: boolean, dur = 2.2) {
  const { pos, look } = roomPose(ship, i, close);
  rig.flyTo(pos, look, dur);
}
