import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import type { MaterialId, SheetMaterial } from '@/types/carpentry';

/** World size (mm) covered by one repetition of a procedural texture. */
export const TEXTURE_WORLD_SIZE = 700;

const TEXTURE_PX = 512;
const cache = new Map<MaterialId, CanvasTexture>();

/** Deterministic PRNG (mulberry32) so textures look identical on every load. */
const createRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const hashString = (text: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

/**
 * Wood grain runs along the texture U axis (left → right) so meshes can align
 * it with each panel's length by swapping UVs. Boards without grain get a
 * fine fibre/speckle noise instead.
 */
const paintTexture = (ctx: CanvasRenderingContext2D, material: SheetMaterial): void => {
  const random = createRandom(hashString(material.id));
  const size = TEXTURE_PX;
  ctx.fillStyle = material.color;
  ctx.fillRect(0, 0, size, size);

  if (material.hasGrain) {
    const lines = material.family === 'solid' ? 70 : 95;
    for (let i = 0; i < lines; i += 1) {
      const baseY = (i / lines) * size + random() * 6;
      const amplitude = 2 + random() * (material.family === 'solid' ? 9 : 5);
      const frequency = (1 + Math.floor(random() * 3)) * ((Math.PI * 2) / size);
      const phase = random() * Math.PI * 2;
      ctx.strokeStyle = material.grainColor;
      ctx.globalAlpha = 0.18 + random() * 0.35;
      ctx.lineWidth = 0.6 + random() * 1.8;
      ctx.beginPath();
      for (let x = 0; x <= size; x += 8) {
        // Integer frequencies keep the pattern tileable along U.
        const y = baseY + Math.sin(x * frequency + phase) * amplitude + Math.sin(x * frequency * 3 + phase) * amplitude * 0.25;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    if (material.family === 'solid') {
      for (let k = 0; k < 2; k += 1) {
        const kx = 60 + random() * (size - 120);
        const ky = 60 + random() * (size - 120);
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = material.grainColor;
        ctx.beginPath();
        ctx.ellipse(kx, ky, 9 + random() * 6, 4 + random() * 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    const specks = material.family === 'melamine' ? 1800 : 5000;
    for (let i = 0; i < specks; i += 1) {
      ctx.globalAlpha = 0.05 + random() * 0.12;
      ctx.fillStyle = random() > 0.5 ? material.grainColor : '#ffffff';
      ctx.fillRect(random() * size, random() * size, 1 + random() * 1.5, 1 + random() * 1.5);
    }
  }
  ctx.globalAlpha = 1;
};

export const getMaterialTexture = (material: SheetMaterial): CanvasTexture | null => {
  if (typeof document === 'undefined') return null;
  const cached = cache.get(material.id);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_PX;
  canvas.height = TEXTURE_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  paintTexture(ctx, material);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  cache.set(material.id, texture);
  return texture;
};
