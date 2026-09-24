import { CanvasTexture, RepeatWrapping, SRGBColorSpace, Texture, WebGLRenderer } from 'three';
import type { TextureSpec } from '../schema';
import { clamp } from '../util';

export function radialTex(inner: number, outer: number, stops: [number, string][], size = 128): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const h = size / 2, k = size / 128;
  const gr = g.createRadialGradient(h, h, inner * k, h, h, outer * k);
  stops.forEach(([o, cl]) => gr.addColorStop(o, cl));
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  return new CanvasTexture(c);
}

/** A gaussian-ish falloff at 256 px: a 128 px ramp bands badly when a sprite fills the screen. */
export const glowTex = () => radialTex(0, 64, [
  [0, 'rgba(255,255,255,1)'], [0.08, 'rgba(255,255,255,.92)'], [0.18, 'rgba(255,255,255,.66)'],
  [0.3, 'rgba(255,255,255,.4)'], [0.45, 'rgba(255,255,255,.2)'], [0.62, 'rgba(255,255,255,.08)'],
  [0.8, 'rgba(255,255,255,.02)'], [1, 'rgba(255,255,255,0)'],
], 256);

export function ringTex(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.strokeStyle = '#fff'; g.lineWidth = 3;
  g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 1.5; g.globalAlpha = .6;
  g.beginPath(); g.arc(64, 64, 38, 0, Math.PI * 2); g.stroke();
  g.globalAlpha = 1; g.fillStyle = '#fff';
  g.beginPath(); g.arc(64, 64, 4, 0, Math.PI * 2); g.fill();
  return new CanvasTexture(c);
}

export interface PlatingMaps { map: Texture; roughnessMap: Texture; normalMap: Texture; }

/** WebGLRenderer keeps this on `capabilities`; the node renderer exposes it directly. */
const maxAnisotropy = (r: WebGLRenderer & { getMaxAnisotropy?: () => number }) =>
  r.capabilities?.getMaxAnisotropy?.() ?? r.getMaxAnisotropy?.() ?? 4;

/** Procedural hull plating: colour, roughness and a normal map derived from the seam height field. */
export function plating(renderer: WebGLRenderer, spec: TextureSpec): PlatingMaps {
  const W = spec.width ?? 1024, H = spec.height ?? 512;
  let sd = spec.seed;
  const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const cv = (): [HTMLCanvasElement, CanvasRenderingContext2D] => {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    return [c, c.getContext('2d')!];
  };
  const [c, g] = cv(), [rc, rg] = cv(), [hc, hg] = cv();
  g.fillStyle = spec.tint; g.fillRect(0, 0, W, H);
  rg.fillStyle = '#7a7a7a'; rg.fillRect(0, 0, W, H);
  hg.fillStyle = '#808080'; hg.fillRect(0, 0, W, H);

  let y = 0;
  while (y < H) {
    const h = 22 + Math.floor(rnd() * 58);
    let x = Math.floor(rnd() * 40) - 40;
    while (x < W) {
      const w = 30 + Math.floor(rnd() * 100), v = (rnd() - .5) * .16;
      g.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v)})`;
      g.fillRect(x, y, w, h);
      const k = rnd();
      if (k < .07) {
        g.fillStyle = 'rgba(18,24,32,.6)'; g.fillRect(x + 3, y + 3, w - 6, h - 6);
        rg.fillStyle = '#b8b8b8'; rg.fillRect(x + 3, y + 3, w - 6, h - 6);
        hg.fillStyle = '#6a6a6a'; hg.fillRect(x + 3, y + 3, w - 6, h - 6);
      } else if (k < .16) {
        g.fillStyle = 'rgba(0,0,0,.35)';
        for (let q = 0; q < Math.min(4, (h - 10) / 6); q++) g.fillRect(x + 8, y + 7 + q * 6, Math.min(w * .45, 40), 2);
      } else if (k < .21) {
        g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(x + 3, y + 3, w - 6, h - 6);
        rg.fillStyle = '#5a5a5a'; rg.fillRect(x + 3, y + 3, w - 6, h - 6);
      }
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x, y, w, 2); g.fillRect(x, y, 2, h);
      hg.fillStyle = '#383838'; hg.fillRect(x, y, w, 2); hg.fillRect(x, y, 2, h);
      rg.fillStyle = '#c8c8c8'; rg.fillRect(x, y, w, 2); rg.fillRect(x, y, 2, h);
      if (rnd() < .55) {
        g.fillStyle = 'rgba(0,0,0,.4)'; hg.fillStyle = '#a0a0a0';
        for (let rx = x + 7; rx < x + w - 5; rx += 9) {
          g.fillRect(rx, y + 5, 2, 2); g.fillRect(rx, y + h - 7, 2, 2);
          hg.fillRect(rx, y + 5, 2, 2); hg.fillRect(rx, y + h - 7, 2, 2);
        }
      }
      x += w;
    }
    y += h;
  }
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(0,0,0,${.03 + rnd() * .07})`; g.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 5, 20 + rnd() * 90); }
  for (let i = 0; i < 14; i++) {
    g.fillStyle = rnd() < .4 ? 'rgba(240,182,74,.75)' : rnd() < .5 ? 'rgba(255,92,122,.6)' : 'rgba(255,255,255,.55)';
    g.fillRect(rnd() * W, rnd() * H, 24 + rnd() * 60, 3);
  }

  const hd = hg.getImageData(0, 0, W, H).data;
  const [nc, ng] = cv();
  const nd = ng.createImageData(W, H);
  const hAt = (xx: number, yy: number) => hd[(((yy + H) % H) * W + ((xx + W) % W)) * 4];
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
    const dx = (hAt(xx + 1, yy) - hAt(xx - 1, yy)) / 255, dy = (hAt(xx, yy + 1) - hAt(xx, yy - 1)) / 255, i = (yy * W + xx) * 4;
    nd.data[i] = clamp(128 - dx * 255, 0, 255);
    nd.data[i + 1] = clamp(128 + dy * 255, 0, 255);
    nd.data[i + 2] = 255;
    nd.data[i + 3] = 255;
  }
  ng.putImageData(nd, 0, 0);
  void hc;

  const repeat = spec.repeat ?? [3, 1.5];
  const mk = (canvas: HTMLCanvasElement, srgb: boolean) => {
    const t = new CanvasTexture(canvas);
    t.wrapS = t.wrapT = RepeatWrapping;
    t.anisotropy = maxAnisotropy(renderer);
    if (srgb) t.colorSpace = SRGBColorSpace;
    t.repeat.set(repeat[0], repeat[1]);
    return t;
  };
  return { map: mk(c, true), roughnessMap: mk(rc, false), normalMap: mk(nc, false) };
}
