/**
 * Procedural memory textures when photos are missing or fail to load.
 * ActiveTheory-style rich panels with gradient, grain, and emoji.
 */
import * as THREE from 'three';

const PALETTES = [
  ['#1a3a4a', '#3ec1b0', '#0d1f28'],
  ['#3d1a2e', '#ff4a76', '#1a0a12'],
  ['#2e2a10', '#ffd25a', '#141008'],
  ['#1a2040', '#ff8ca3', '#0a0c1a'],
  ['#1a2838', '#7eb8ff', '#080c14'],
  ['#2a1a38', '#c77dff', '#100818']
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

export function createMemoryCanvasTexture(item, index = 0) {
  const w = 1024;
  const h = 1280;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const palette = PALETTES[index % PALETTES.length];
  const seed = hash(item.caption || String(index));

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, palette[0]);
  grad.addColorStop(0.45, palette[1]);
  grad.addColorStop(1, palette[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 80; i++) {
    const x = (seed + i * 97) % w;
    const y = (seed + i * 131) % h;
    const r = 20 + ((seed + i * 17) % 120);
    ctx.fillStyle = `rgba(255,255,255,${0.02 + (i % 5) * 0.008})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.12;
  for (let y = 0; y < h; y += 4) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, y, w, 1);
  }
  ctx.globalAlpha = 1;

  ctx.font = '140px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(item.emoji || '💖', w / 2, h * 0.38);

  ctx.font = 'italic 42px Georgia, serif';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  wrapText(ctx, item.caption || 'Our memory', w / 2, h * 0.62, w - 120, 52);

  if (item.date) {
    ctx.font = '600 28px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(item.date, w / 2, h * 0.88);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  const lines = [];
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line.trim());
      line = word + ' ';
    } else {
      line = test;
    }
  }
  if (line) lines.push(line.trim());
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((ln, i) => ctx.fillText(ln, x, startY + i * lineHeight));
}

export function loadMemoryTexture(loader, item, index) {
  return new Promise((resolve) => {
    const fallback = () => resolve(createMemoryCanvasTexture(item, index));

    if (!item.image || !String(item.image).trim()) {
      fallback();
      return;
    }

    loader.load(
      item.image,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        resolve(tex);
      },
      undefined,
      () => fallback()
    );
  });
}

export async function preloadGalleryTextures(items) {
  const loader = new THREE.TextureLoader();
  const textures = await Promise.all(
    items.map((item, i) => loadMemoryTexture(loader, item, i))
  );
  return textures;
}
