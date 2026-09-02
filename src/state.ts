import type { ShipSpec } from './schema';

export type Mode = 'orbit' | 'roam' | 'tour';
export type Cut = 'off' | 'cross' | 'hlay' | 'long';

export interface ViewerState {
  mode: Mode;
  cut: Cut;
  cutPos: number;
  flip: boolean;
  opacity: number;
  deck: string;
  explode: number;
  labels: boolean;
  bloom: boolean;
  stars: boolean;
  /** The ship's own `spinning` node, if it has one. */
  spinNode: boolean;
  wire: boolean;
  lamp: boolean;
  spin: boolean;
  selected: number;
  uiHidden: boolean;
  spinAngle: number;
}

export const createState = (): ViewerState => ({
  mode: 'orbit', cut: 'off', cutPos: 0, flip: false, opacity: 1, deck: 'All', explode: 0,
  labels: true, bloom: true, stars: true, spinNode: true, wire: false, lamp: false, spin: false,
  selected: -1, uiHidden: false, spinAngle: 0,
});

/* ---------- URL hash sync: ship, room, mode ---------- */

export interface Hash { ship: string | null; room: string | null; mode: Mode | null; }

export function readHash(): Hash {
  const h = new URLSearchParams(location.hash.slice(1));
  const mode = h.get('mode');
  return {
    ship: h.get('ship'),
    room: h.get('room'),
    mode: mode === 'roam' || mode === 'tour' || mode === 'orbit' ? mode : null,
  };
}

export function writeHash(S: ViewerState, spec: ShipSpec, multiShip: boolean) {
  const q: string[] = [];
  if (multiShip) q.push('ship=' + spec.id);
  if (S.selected >= 0) q.push('room=' + spec.rooms[S.selected].code);
  if (S.mode !== 'orbit') q.push('mode=' + S.mode);
  history.replaceState(null, '', location.pathname + location.search + (q.length ? '#' + q.join('&') : ''));
}
