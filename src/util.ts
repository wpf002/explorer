import { Color } from 'three';

export const $ = <T extends HTMLElement = HTMLElement>(s: string): T => {
  const el = document.querySelector<T>(s);
  if (!el) throw new Error(`missing element ${s}`);
  return el;
};
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const ease = (t: number) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Colours in code go through ColorManagement; never hand-convert sRGB to linear. */
export const col = (hex: string) => new Color().setStyle(hex, 'srgb');
