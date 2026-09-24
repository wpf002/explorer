import { DoubleSide, FrontSide, MeshPhysicalMaterial, MeshStandardMaterial, Vector2, WebGLRenderer } from 'three';
import type { MaterialSpec, ShipSpec } from '../schema';
import { col } from '../util';
import { plating, type PlatingMaps } from './textures';

export interface MaterialSet {
  /** One shared prototype per key; each mesh clones it so per-mesh opacity is independent. */
  base: Record<string, MeshStandardMaterial>;
  /** Keys whose emissive is dimmed when bloom is off. */
  emissive: Set<string>;
  spec: Record<string, MaterialSpec>;
}

export function buildMaterials(renderer: WebGLRenderer, ship: ShipSpec): MaterialSet {
  const maps: Record<string, PlatingMaps> = {};
  for (const [key, t] of Object.entries(ship.textures ?? {})) {
    if (t.type === 'plating') maps[key] = plating(renderer, t);
  }

  const base: Record<string, MeshStandardMaterial> = {};
  const emissive = new Set<string>();

  for (const [key, m] of Object.entries(ship.materials)) {
    // A textured hull gets a physical clearcoat by default: it is what makes plating read
    // as painted metal rather than flat grey.
    const coat = m.clearcoat ?? (m.texture && (m.metalness ?? 0) > .2 ? .25 : 0);
    const Ctor = coat > 0 ? MeshPhysicalMaterial : MeshStandardMaterial;
    const mat = new Ctor({
      color: col(m.color),
      metalness: m.metalness ?? 0,
      roughness: m.roughness ?? 1,
      side: m.doubleSide ? DoubleSide : FrontSide,
      envMapIntensity: m.envMapIntensity ?? 1,
      transparent: m.transparent ?? (m.opacity !== undefined && m.opacity < 1),
      opacity: m.opacity ?? 1,
      dithering: true,                 // large hull gradients band badly without it
    });
    if (coat > 0 && mat instanceof MeshPhysicalMaterial) {
      mat.clearcoat = coat;
      mat.clearcoatRoughness = m.clearcoatRoughness ?? .45;
    }
    if (m.emissive) {
      mat.emissive = col(m.emissive);
      mat.emissiveIntensity = m.emissiveIntensity ?? 1;
      if ((m.emissiveIntensity ?? 1) >= 1) emissive.add(key);
    }
    if (m.texture && maps[m.texture]) {
      const mm = maps[m.texture];
      mat.map = mm.map;
      mat.roughnessMap = mm.roughnessMap;
      mat.normalMap = mm.normalMap;
      mat.normalScale = new Vector2(m.normalScale ?? 1, m.normalScale ?? 1);
    }
    base[key] = mat;
  }

  return { base, emissive, spec: ship.materials };
}
