import { AdditiveBlending, Color, Group, Object3D, Sprite, SpriteMaterial, Vector2, Vector3 } from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import type { SystemSpec, Vec3 } from '../schema';
import type { LoadedShip } from './loader';
import { col } from '../util';
import { glowTex } from './textures';

type Point = { room: Object3D } | { local: Vector3 };

/**
 * One path drawn as fat dashed segments. Positions are rewritten in place each frame so
 * routes follow spinning and exploding modules without reallocating GPU buffers.
 */
class Route {
  readonly line: LineSegments2;
  private points: Point[];
  private pos: Float32Array;
  private dist: Float32Array;
  private tmp = new Vector3();

  constructor(points: Point[], material: LineMaterial) {
    this.points = points;
    const n = points.length - 1;
    this.pos = new Float32Array(n * 6);
    this.dist = new Float32Array(n * 2);
    const geo = new LineSegmentsGeometry();
    geo.setPositions(this.pos);
    this.line = new LineSegments2(geo, material);
    this.line.frustumCulled = false;
    this.line.renderOrder = 10;
    this.line.computeLineDistances();
  }

  /** Recompute world positions and running dash distances into the existing buffers. */
  update(root: Object3D) {
    const world = this.points.map(p => ('room' in p ? p.room.getWorldPosition(new Vector3()) : root.localToWorld(this.tmp.copy(p.local)).clone()));
    let d = 0;
    for (let i = 0; i < world.length - 1; i++) {
      const a = world[i], b = world[i + 1];
      this.pos.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6);
      this.dist[i * 2] = d;
      d += a.distanceTo(b);
      this.dist[i * 2 + 1] = d;
    }
    const g = this.line.geometry;
    const start = g.getAttribute('instanceStart') as unknown as { data: { array: Float32Array; needsUpdate: boolean } };
    start.data.array.set(this.pos);
    start.data.needsUpdate = true;
    const ds = g.getAttribute('instanceDistanceStart') as unknown as { data: { array: Float32Array; needsUpdate: boolean } };
    ds.data.array.set(this.dist);
    ds.data.needsUpdate = true;
  }

  points2d(root: Object3D): [number, number][] {
    return this.points.map((_, i) => { const w = this.worldOf(i, root); return [w.x, w.y]; });
  }

  worldOf(i: number, root: Object3D) {
    const p = this.points[i];
    return 'room' in p ? p.room.getWorldPosition(new Vector3()) : root.localToWorld(p.local.clone());
  }
}

export class Systems {
  readonly group = new Group();
  private layers = new Map<string, { routes: Route[]; nodes: { s: Sprite; route: Route; i: number }[]; mat: LineMaterial }>();
  private active: string | null = null;

  constructor(private ship: LoadedShip) {
    this.group.name = 'systems';
    this.group.visible = false;
    const codes = new Map(ship.spec.rooms.map((r, i) => [r.code, ship.markers[i]]));
    const tex = glowTex();

    for (const sys of ship.spec.systems ?? []) {
      // A little past 1 so the tone-mapped line blooms; much more and ACES bleaches the hue.
      const c = col(sys.color);
      const k = 1.35;
      const mat = new LineMaterial({
        color: new Color(c.r * k, c.g * k, c.b * k).getHex(),
        linewidth: 3.2, dashed: true, dashSize: 7, gapSize: 4, transparent: true, opacity: .95,
        depthTest: false, depthWrite: false, worldUnits: false,
      });
      mat.color.setRGB(c.r * k, c.g * k, c.b * k);
      mat.resolution = new Vector2(innerWidth, innerHeight);
      const routes: Route[] = [];
      const nodes: { s: Sprite; route: Route; i: number }[] = [];
      for (const path of sys.paths) {
        const pts: Point[] = path.map(p => (typeof p === 'string' ? { room: codes.get(p)! } : { local: new Vector3(...(p as Vec3)) }));
        if (pts.some(p => 'room' in p && !p.room)) continue;
        const r = new Route(pts, mat);
        routes.push(r);
        this.group.add(r.line);
        path.forEach((p, i) => {
          if (typeof p !== 'string') return;
          const s = new Sprite(new SpriteMaterial({ map: tex, color: col(sys.color), transparent: true, opacity: .9, depthTest: false, depthWrite: false, blending: AdditiveBlending }));
          s.renderOrder = 11;
          this.group.add(s);
          nodes.push({ s, route: r, i });
        });
      }
      this.layers.set(sys.id, { routes, nodes, mat });
    }
  }

  get ids() { return [...this.layers.keys()]; }

  /** Rooms a system touches, by code. */
  roomsOf(id: string): string[] {
    const sys = this.ship.spec.systems?.find(s => s.id === id);
    return sys ? [...new Set(sys.paths.flat().filter((p): p is string => typeof p === 'string'))] : [];
  }

  /** Systems that reach a room. */
  systemsAt(code: string): SystemSpec[] {
    return (this.ship.spec.systems ?? []).filter(s => s.paths.some(p => p.includes(code)));
  }

  set(id: string | null) {
    this.active = id && this.layers.has(id) ? id : null;
    this.group.visible = !!this.active;
    for (const [k, l] of this.layers) for (const r of l.routes) r.line.visible = k === this.active;
    for (const [k, l] of this.layers) for (const n of l.nodes) n.s.visible = k === this.active;
  }

  /** Active routes projected to side elevation (x, y), for the deck plan. */
  planPaths(): [number, number][][] {
    if (!this.active) return [];
    const root = this.ship.model.root;
    return this.layers.get(this.active)!.routes.map(r => r.points2d(root));
  }

  get color() { return this.ship.spec.systems?.find(s => s.id === this.active)?.color ?? null; }

  resize(w: number, h: number) { for (const l of this.layers.values()) l.mat.resolution.set(w, h); }

  update(t: number, camPos: Vector3) {
    if (!this.active) return;
    const l = this.layers.get(this.active)!;
    const root = this.ship.model.root;
    for (const r of l.routes) r.update(root);
    l.mat.dashOffset = -t * 14;
    for (const n of l.nodes) {
      const p = n.route.worldOf(n.i, root);
      n.s.position.copy(p);
      const k = p.distanceTo(camPos) * .028 * (1 + .18 * Math.sin(t * 3 + n.i));
      n.s.scale.set(k, k, 1);
    }
  }
}
