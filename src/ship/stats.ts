import { Box3, Mesh, Object3D, Points, Sprite, Line } from 'three';
import type { LoadedShip } from './loader';

export interface ShipStats {
  /** Triangles across every tagged mesh. */
  triangles: number;
  /** Renderable objects on the default layer under the ship root: one draw call each. */
  drawCalls: number;
  meshes: number;
  /** Tagged-mesh bounds in ship space, metres. */
  bounds: { min: [number, number, number]; max: [number, number, number] };
}

const drawable = (o: Object3D) =>
  (o instanceof Mesh || o instanceof Sprite || o instanceof Points || o instanceof Line) && o.layers.isEnabled(0);

export function shipStats(ship: LoadedShip): ShipStats {
  const root = ship.model.root;
  root.updateMatrixWorld(true);
  let triangles = 0;
  const box = new Box3();
  for (const m of ship.model.meshes) {
    const g = m.geometry;
    triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
    box.expandByObject(m);
  }
  let drawCalls = 0;
  root.traverseVisible(o => { if (drawable(o)) drawCalls++; });
  return {
    triangles: Math.round(triangles),
    drawCalls,
    meshes: ship.model.meshes.length,
    bounds: { min: box.min.toArray(), max: box.max.toArray() },
  };
}
