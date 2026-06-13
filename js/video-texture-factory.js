/**
 * Cinematic memory "video" surfaces — real MP4 when present, else GPU-friendly canvas motion.
 */
import * as THREE from 'three';

const PRESETS = [
  { speed: 0.4, orbs: 12, hue: 0.52 },
  { speed: 0.55, orbs: 18, hue: 0.92 },
  { speed: 0.35, orbs: 10, hue: 0.08 },
  { speed: 0.48, orbs: 14, hue: 0.72 },
  { speed: 0.42, orbs: 16, hue: 0.58 },
  { speed: 0.5, orbs: 20, hue: 0.95 }
];

export class AnimatedMemorySurface {
  constructor(item, index = 0) {
    this.item = item;
    this.index = index;
    this.canvas = document.createElement('canvas');
    this.canvas.width = 720;
    this.canvas.height = 900;
    this.ctx = this.canvas.getContext('2d');
    this.videoEl = null;
    this.texture = null;
    this.isVideo = false;
    this.time = 0;
    this.preset = PRESETS[index % PRESETS.length];
    this.orbs = Array.from({ length: this.preset.orbs }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.08 + Math.random() * 0.14,
      vx: (Math.random() - 0.5) * 0.0008,
      vy: (Math.random() - 0.5) * 0.0006
    }));
  }

  async load() {
    if (this.item.video) {
      const tex = await this.tryVideo(this.item.video);
      if (tex) return tex;
    }
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.isVideo = false;
    this.drawFrame(0);
    return this.texture;
  }

  tryVideo(src) {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = src;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';

      const done = (ok) => {
        if (!ok) return resolve(null);
        this.videoEl = video;
        this.isVideo = true;
        const tex = new THREE.VideoTexture(video);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        this.texture = tex;
        video.play().catch(() => {});
        resolve(tex);
      };

      video.addEventListener('loadeddata', () => done(true), { once: true });
      video.addEventListener('error', () => done(false), { once: true });
      setTimeout(() => {
        if (video.readyState >= 2) done(true);
        else if (!this.videoEl) done(false);
      }, 2500);
    });
  }

  update(dt) {
    if (this.isVideo && this.texture) {
      this.texture.needsUpdate = true;
      return;
    }
    this.time += dt;
    this.drawFrame(this.time);
    if (this.texture) this.texture.needsUpdate = true;
  }

  drawFrame(t) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const p = this.preset;
    const hue = p.hue + Math.sin(t * 0.15) * 0.05;

    // 1. Draw static deep background Space
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#05080e';
    ctx.fillRect(0, 0, w, h);

    // 2. Draw subtle background coordinate grid lines
    ctx.strokeStyle = 'rgba(245, 242, 235, 0.025)';
    ctx.lineWidth = 1;
    const gridSize = 45;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 3. Fluid mathematical plasma attraction points (using additive screen blending)
    ctx.globalCompositeOperation = 'screen';
    
    // Attractor 1: Teal glow
    const ax1 = w * (0.5 + 0.3 * Math.sin(t * 0.48));
    const ay1 = h * (0.5 + 0.25 * Math.cos(t * 0.36));
    const rad1 = (0.35 + 0.08 * Math.sin(t * 0.8)) * w;
    const g1 = ctx.createRadialGradient(ax1, ay1, 0, ax1, ay1, rad1);
    g1.addColorStop(0, 'rgba(62, 193, 176, 0.35)');
    g1.addColorStop(0.5, 'rgba(62, 193, 176, 0.12)');
    g1.addColorStop(1, 'rgba(62, 193, 176, 0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);

    // Attractor 2: Neon Pink/Rose glow
    const ax2 = w * (0.5 + 0.25 * Math.cos(t * 0.32));
    const ay2 = h * (0.5 + 0.28 * Math.sin(t * 0.44));
    const rad2 = (0.32 + 0.06 * Math.sin(t * 0.6 + 1.5)) * w;
    const g2 = ctx.createRadialGradient(ax2, ay2, 0, ax2, ay2, rad2);
    g2.addColorStop(0, 'rgba(255, 74, 118, 0.32)');
    g2.addColorStop(0.5, 'rgba(255, 74, 118, 0.08)');
    g2.addColorStop(1, 'rgba(255, 74, 118, 0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);

    // Attractor 3: Golden Amber glow
    const ax3 = w * (0.5 + 0.28 * Math.sin(t * 0.22 + 2.0));
    const ay3 = h * (0.5 + 0.22 * Math.sin(t * 0.52));
    const rad3 = (0.28 + 0.05 * Math.cos(t * 0.7)) * w;
    const g3 = ctx.createRadialGradient(ax3, ay3, 0, ax3, ay3, rad3);
    g3.addColorStop(0, 'rgba(255, 210, 90, 0.22)');
    g3.addColorStop(0.5, 'rgba(255, 210, 90, 0.05)');
    g3.addColorStop(1, 'rgba(255, 210, 90, 0)');
    ctx.fillStyle = g3;
    ctx.fillRect(0, 0, w, h);

    // Attractor 4: Deep Magenta glow
    const ax4 = w * (0.5 + 0.32 * Math.cos(t * 0.18));
    const ay4 = h * (0.5 + 0.32 * Math.cos(t * 0.62 + 3.0));
    const rad4 = (0.42 + 0.1 * Math.sin(t * 0.5)) * w;
    const g4 = ctx.createRadialGradient(ax4, ay4, 0, ax4, ay4, rad4);
    g4.addColorStop(0, 'rgba(255, 140, 163, 0.25)');
    g4.addColorStop(0.5, 'rgba(255, 140, 163, 0.06)');
    g4.addColorStop(1, 'rgba(255, 140, 163, 0)');
    ctx.fillStyle = g4;
    ctx.fillRect(0, 0, w, h);

    // 4. Stardust particles drifting along trigonometric flow fields
    this.orbs.forEach((o, i) => {
      // Vector force field calculations
      const angle = Math.sin(o.x * 5.0 + t * 0.7) * Math.cos(o.y * 4.5 - t * 0.5) * Math.PI * 2.0;
      const speed = 0.0006 + o.r * 0.0008;
      
      o.x += Math.cos(angle) * speed;
      o.y += Math.sin(angle) * speed;

      // Bound wrap
      if (o.x < 0) o.x = 1.0;
      if (o.x > 1.0) o.x = 0.0;
      if (o.y < 0) o.y = 1.0;
      if (o.y > 1.0) o.y = 0.0;

      const px = o.x * w;
      const py = o.y * h;
      const size = Math.max(0.01, o.r * 15.0 + Math.sin(t * 3.5 + i) * 1.5);

      const pGrd = ctx.createRadialGradient(px, py, 0, px, py, size);
      pGrd.addColorStop(0, 'rgba(245, 242, 235, 0.95)');
      pGrd.addColorStop(0.2, `hsla(${(hue * 360 + i * 15) % 360}, 85%, 70%, 0.45)`);
      pGrd.addColorStop(1, 'rgba(245, 242, 235, 0)');

      ctx.fillStyle = pGrd;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. Draw visual HUD scan/lock target around the central emoji
    ctx.globalCompositeOperation = 'source-over';
    const cx = w / 2;
    const cy = h * 0.38;

    // Static target circle
    ctx.strokeStyle = 'rgba(245, 242, 235, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 140, 0, Math.PI * 2);
    ctx.stroke();

    // Outer rotating dashed circle
    ctx.strokeStyle = 'rgba(245, 242, 235, 0.28)';
    ctx.lineWidth = 1.0;
    ctx.setLineDash([8, 14]);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.18);
    ctx.beginPath();
    ctx.arc(0, 0, 160, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.setLineDash([]); // reset line dash

    // Crosshairs
    ctx.strokeStyle = 'rgba(245, 242, 235, 0.18)';
    ctx.beginPath();
    ctx.moveTo(cx - 180, cy); ctx.lineTo(cx - 145, cy);
    ctx.moveTo(cx + 145, cy); ctx.lineTo(cx + 180, cy);
    ctx.moveTo(cx, cy - 180); ctx.lineTo(cx, cy - 145);
    ctx.moveTo(cx, cy + 145); ctx.lineTo(cx, cy + 180);
    ctx.stroke();

    // 6. Sleek cybernetic telemetry textual readouts
    ctx.fillStyle = 'rgba(245, 242, 235, 0.4)';
    ctx.font = '700 11px monospace';
    
    // Top Left: Channel metadata
    ctx.textAlign = 'left';
    ctx.fillText(`CH. 0${this.index + 1} / STARDUST SOLVER v2.5`, 40, 52);
    
    // Top Right: Live system logs
    ctx.textAlign = 'right';
    const logLatency = (14.2 + Math.sin(t * 6.0) * 1.8).toFixed(1);
    ctx.fillText(`LATENCY: ${logLatency}ms / FBO_ACTIVE`, w - 40, 52);

    // Bottom Left: Heartbeat / Emotional frequency telemetry
    ctx.textAlign = 'left';
    const pulseHeart = Math.round(92 + 18 * Math.sin(t * 1.8));
    ctx.fillText(`HEART: ${pulseHeart}BPM / ROMANTIC_FREQ: 72.8Hz`, 40, h - 52);

    // Bottom Right: Timestamp / Phase coordinate log
    ctx.textAlign = 'right';
    ctx.fillText(`DATE: ${this.item.date || 'SEP 2023'} / MEM_COORDS`, w - 40, h - 52);

    // 7. Core Emoji
    ctx.font = 'bold 125px serif';
    ctx.textAlign = 'center';
    
    // Slight float shift on the emoji
    const emoShiftX = Math.sin(t * 1.5) * 8;
    const emoShiftY = Math.cos(t * 1.1) * 8;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fillText(this.item.emoji || '💖', cx + emoShiftX, cy + emoShiftY + 40);

    // 8. Bottom panel labels
    ctx.font = '600 24px system-ui';
    ctx.fillStyle = 'rgba(245, 242, 235, 0.48)';
    ctx.fillText('CINEMATIC ARCHIVE', w / 2, h * 0.72);
    
    if (this.item.caption) {
      ctx.font = 'italic 29px Georgia';
      ctx.fillStyle = 'rgba(245, 242, 235, 0.88)';
      ctx.fillText(this.item.caption, w / 2, h * 0.79);
    }

    // 9. VHS scanning line bars overlay
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#000000';
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y + (t * 22) % 4, w, 1.8);
    }
    ctx.globalAlpha = 1.0;
  }

  dispose() {
    this.texture?.dispose?.();
    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.src = '';
    }
  }
}

export async function preloadMemorySurfaces(items) {
  const surfaces = await Promise.all(
    items.map(async (item, i) => {
      const surface = new AnimatedMemorySurface(item, i);
      const texture = await surface.load();
      return { texture, surface, isVideo: surface.isVideo };
    })
  );
  return surfaces;
}
