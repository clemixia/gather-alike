import Phaser from 'phaser';

export const CHARACTER_LOOKS = ['boy', 'girl'];
export const DIRECTIONS = ['south', 'north', 'east', 'west'] as const;
export type CompassDirection = (typeof DIRECTIONS)[number];

export const INPUT_TO_COMPASS: Record<'up' | 'down' | 'left' | 'right', CompassDirection> = {
  down: 'south',
  up: 'north',
  right: 'east',
  left: 'west',
};

const FRAME_COUNT = 8;

export function preloadCharacterAssets(scene: Phaser.Scene): void {
  for (const look of CHARACTER_LOOKS) {
    for (const dir of DIRECTIONS) {
      scene.load.image(`${look}-idle-${dir}`, `/assets/characters/${look}/Idle/rotations/${dir}.png`);
      for (let i = 0; i < FRAME_COUNT; i++) {
        scene.load.image(
          `${look}-walk-${dir}-${i}`,
          `/assets/characters/${look}/Idle/animations/Walking/${dir}/frame_00${i}.png`
        );
      }
    }
  }
}

// ─── Transparent-padding trimmer ───────────────────────────────────────────

interface Box { x: number; y: number; w: number; h: number; }

function readPixels(texture: Phaser.Textures.Texture) {
  const source = texture.getSourceImage() as HTMLImageElement;
  const w = source.width;
  const h = source.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0);
  return { source, data: ctx.getImageData(0, 0, w, h).data, w, h };
}

function measureAlpha(data: Uint8ClampedArray, w: number, h: number): Box | null {
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function crop(source: HTMLImageElement, box: Box): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = box.w;
  canvas.height = box.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.drawImage(source, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
  return canvas;
}

function trimTextures(scene: Phaser.Scene, look: string, dir: CompassDirection): void {
  const textures = scene.textures;

  // Idle: crop to its own character pixels
  const idleKey = `${look}-idle-${dir}`;
  if (textures.exists(idleKey)) {
    const px = readPixels(textures.get(idleKey));
    const box = px ? measureAlpha(px.data, px.w, px.h) : null;
    if (px && box) {
      const canvas = crop(px.source, box);
      textures.remove(idleKey);
      textures.addCanvas(idleKey, canvas);
      console.log(`[assets] ${look}/${dir} idle ${px.w}x${px.h} -> ${box.w}x${box.h}`);
    }
  }

  // Walk: crop ALL frames with ONE shared box (no jitter mid-step)
  const frameKeys: string[] = [];
  for (let i = 0; i < FRAME_COUNT; i++) frameKeys.push(`${look}-walk-${dir}-${i}`);
  if (!frameKeys.every((k) => textures.exists(k))) return;

  const pixels = frameKeys.map((k) => readPixels(textures.get(k)));
  if (pixels.some((p) => !p)) return;

  let union: Box | null = null;
  for (const p of pixels) {
    if (!p) continue;
    const b = measureAlpha(p.data, p.w, p.h);
    if (!b) continue;
    if (!union) {
      union = { ...b };
    } else {
      const x = Math.min(union.x, b.x);
      const y = Math.min(union.y, b.y);
      const right = Math.max(union.x + union.w, b.x + b.w);
      const bottom = Math.max(union.y + union.h, b.y + b.h);
      union = { x, y, w: right - x, h: bottom - y };
    }
  }
  if (!union) return;

  const box = union;
  const canvases = pixels.map((p) => crop((p as NonNullable<typeof p>).source, box));
  frameKeys.forEach((k, i) => {
    textures.remove(k);
    textures.addCanvas(k, canvases[i]);
  });
  const first = pixels[0];
  if (first) console.log(`[assets] ${look}/${dir} walk ${first.w}x${first.h} -> ${box.w}x${box.h}`);
}

// ─── Build animations AFTER trimming ───────────────────────────────────────

export function createCharacterAnimations(scene: Phaser.Scene): void {
  for (const look of CHARACTER_LOOKS) {
    for (const dir of DIRECTIONS) {
      trimTextures(scene, look, dir);

      const keys = Array.from({ length: FRAME_COUNT }, (_, i) => `${look}-walk-${dir}-${i}`);
      if (!keys.every((k) => scene.textures.exists(k))) {
        console.warn(`[assets] No walk frames for ${look}/${dir} — using idle pose there.`);
        continue;
      }
      scene.anims.create({
        key: `${look}-walk-${dir}`,
        frames: keys.map((key) => ({ key })),
        frameRate: 12,
        repeat: -1,
      });
    }
  }
}