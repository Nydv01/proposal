/**
 * mirror-scene.js — Upgraded, highly cinematic Envenomed Mirror experience.
 * Coordinates vertical/horizontal scroll-linked bead tracking, real-time image 
 * lighting/blur changes, and side-by-side unblur/slide reveal animations.
 * Added: Highly romantic, premium fluid particle background utilizing Simplex Noise.
 */
import gsap from 'gsap';

// Helper function for Simplex/Perlin Noise
function createNoise() {
  const permutation = [
    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140,
    36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120,
    234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
    88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71,
    134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133,
    230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161,
    1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130,
    116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250,
    124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227,
    47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44,
    154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98,
    108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34,
    242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14,
    239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121,
    50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243,
    141, 128, 195, 78, 66, 215, 61, 156, 180,
  ];

  const p = new Array(512);
  for (let i = 0; i < 256; i++) p[256 + i] = p[i] = permutation[i];

  function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function lerp(t, a, b) {
    return a + t * (b - a);
  }

  function grad(hash, x, y, z) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  return {
    simplex3: (x, y, z) => {
      const X = Math.floor(x) & 255;
      const Y = Math.floor(y) & 255;
      const Z = Math.floor(z) & 255;

      x -= Math.floor(x);
      y -= Math.floor(y);
      z -= Math.floor(z);

      const u = fade(x);
      const v = fade(y);
      const w = fade(z);

      const A = p[X] + Y;
      const AA = p[A] + Z;
      const AB = p[A + 1] + Z;
      const B = p[X + 1] + Y;
      const BA = p[B] + Z;
      const BB = p[B + 1] + Z;

      return lerp(
        w,
        lerp(
          v,
          lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)),
          lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z)),
        ),
        lerp(
          v,
          lerp(
            u,
            grad(p[AA + 1], x, y, z - 1),
            grad(p[BA + 1], x - 1, y, z - 1),
          ),
          lerp(
            u,
            grad(p[AB + 1], x, y - 1, z - 1),
            grad(p[BB + 1], x - 1, y - 1, z - 1),
          ),
        ),
      );
    },
  };
}

export class MirrorScene {
  constructor() {
    this.pastLines = [];
    this.nowLines = [];
    this.glassBead = null;
    this.glassImage = null;
    this.isInitialized = false;
    this.isActive = false;
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.noise = null;
    this.animationFrameId = null;
    this.resizeHandler = null;
  }

  /**
   * Initialize the mirror scene elements
   */
  init() {
    this.pastLines = Array.from(document.querySelectorAll('#scene-mirror .mirror-past .ev-line'));
    this.nowLines = Array.from(document.querySelectorAll('#scene-mirror .mirror-now .ev-line'));
    this.glassBead = document.querySelector('.mirror-glass-bead');
    this.glassImage = document.querySelector('.mirror-glass-image');

    if (!this.pastLines.length && !this.nowLines.length) return;

    // Reset initial states for lines
    this.pastLines.forEach(line => line.classList.remove('ev-visible'));
    this.nowLines.forEach(line => line.classList.remove('ev-visible'));

    if (this.glassBead) {
      gsap.set(this.glassBead, { top: '0%' });
    }

    if (this.glassImage) {
      gsap.set(this.glassImage, {
        opacity: 0.5,
        filter: 'blur(4px) brightness(1)',
      });
    }

    // Initialize the fluid particles background
    this.initCanvasBg();

    this.isInitialized = true;
  }

  /**
   * Initialize the canvas-based fluid particle background
   */
  initCanvasBg() {
    this.canvas = document.getElementById('mirror-particles-canvas');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d', { alpha: true });
    if (!this.ctx) return;

    this.noise = createNoise();
    this.resizeCanvas();

    // Bind window resize event
    this.resizeHandler = this.resizeCanvas.bind(this);
    window.addEventListener('resize', this.resizeHandler);

    // Initialize romantic-colored particles
    this.initParticles();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const parent = document.getElementById('scene-mirror');
    if (parent) {
      const rect = parent.getBoundingClientRect();
      this.canvas.width = rect.width || window.innerWidth;
      this.canvas.height = rect.height || (window.innerHeight * 2);
    } else {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight * 2;
    }
  }

  initParticles() {
    const colors = [
      { r: 255, g: 140, b: 163 }, // Soft romantic rose-pink
      { r: 244, g: 184, b: 193 }, // Pale pastel pink
      { r: 196, g: 176, b: 214 }, // Soft violet/lavender
      { r: 255, g: 210, b: 160 }  // Warm romantic gold/peach
    ];

    const particleCount = 650; // Optimized count for 60 FPS rendering
    this.particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      size: Math.random() * 1.8 + 0.9, // sizes 0.9px to 2.7px (dreamy pixie dust, perfectly visible)
      velocity: { x: 0, y: 0 },
      life: Math.random() * 100,
      maxLife: 100 + Math.random() * 50,
      color: colors[Math.floor(Math.random() * colors.length)],
      history: [] // Keep track of past positions for transparent trails
    }));

    // Pre-simulate (warm up) the particles so that their patterns and trails are already active immediately
    const noiseIntensity = 0.0028;
    for (let step = 0; step < 40; step++) {
      const time = step * 0.01;
      for (const particle of this.particles) {
        particle.life += 0.8;
        if (particle.life > particle.maxLife) {
          particle.life = 0;
          particle.x = Math.random() * this.canvas.width;
          particle.y = Math.random() * this.canvas.height;
          particle.history = [];
        }

        const n = this.noise.simplex3(
          particle.x * noiseIntensity,
          particle.y * noiseIntensity,
          time
        );
        const angle = n * Math.PI * 4;
        particle.velocity.x = Math.cos(angle) * 1.3;
        particle.velocity.y = Math.sin(angle) * 1.3;

        particle.x += particle.velocity.x;
        particle.y += particle.velocity.y;

        particle.history.push({ x: particle.x, y: particle.y });
        if (particle.history.length > 6) {
          particle.history.shift();
        }
      }
    }
  }

  startAnimation() {
    if (this.isActive) return;
    this.isActive = true;
    this.animate();
  }

  stopAnimation() {
    this.isActive = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  animate() {
    if (!this.isActive || !this.canvas || !this.ctx) return;
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    // Clear canvas completely to keep background 100% transparent
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const noiseIntensity = 0.0028;
    const time = Date.now() * 0.0001;

    for (const particle of this.particles) {
      particle.life += 0.8;
      if (particle.life > particle.maxLife) {
        particle.life = 0;
        particle.x = Math.random() * this.canvas.width;
        particle.y = Math.random() * this.canvas.height;
        particle.history = [];
      }

      // Calculate opacity: fade in and fade out (balanced for visibility & elegance)
      const opacity = Math.sin((particle.life / particle.maxLife) * Math.PI) * 0.45;

      // Get direction from Simplex Noise
      const n = this.noise.simplex3(
        particle.x * noiseIntensity,
        particle.y * noiseIntensity,
        time
      );

      const angle = n * Math.PI * 4;
      particle.velocity.x = Math.cos(angle) * 1.3; // flowing speed (soothing but dynamic)
      particle.velocity.y = Math.sin(angle) * 1.3;

      particle.x += particle.velocity.x;
      particle.y += particle.velocity.y;

      // Edge wrapping with history reset (to avoid long horizontal/vertical lines stretching across screen)
      let wrapped = false;
      if (particle.x < 0) { particle.x = this.canvas.width; wrapped = true; }
      if (particle.x > this.canvas.width) { particle.x = 0; wrapped = true; }
      if (particle.y < 0) { particle.y = this.canvas.height; wrapped = true; }
      if (particle.y > this.canvas.height) { particle.y = 0; wrapped = true; }
      if (wrapped) {
        particle.history = [];
      }

      // Track positions for trail history (sleek, shorter trail length for a cute glow)
      particle.history.push({ x: particle.x, y: particle.y });
      if (particle.history.length > 6) {
        particle.history.shift();
      }

      // Draw the trails from oldest to newest
      const len = particle.history.length;
      for (let i = 0; i < len; i++) {
        const pt = particle.history[i];
        // Fade opacity and shrink size as history gets older
        const trailOpacity = opacity * (0.2 + 0.8 * (i / len));
        const ptSize = particle.size * (0.4 + 0.6 * (i / len));

        this.ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${trailOpacity})`;
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, ptSize, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  /**
   * Update based on scroll progress of the mirror scene
   * @param {number} progress - 0 to 1
   */
  onProgress(progress) {
    if (!this.isInitialized) return;

    const isMobile = window.innerWidth <= 768;

    // 1. Animate glass bead position along the divider line
    if (this.glassBead) {
      if (isMobile) {
        this.glassBead.style.left = `${progress * 100}%`;
        this.glassBead.style.top = '50%';
      } else {
        this.glassBead.style.top = `${progress * 100}%`;
        this.glassBead.style.left = '50%';
      }
    }

    // 2. Animate central image (focus & glowing reflection when bead is near it)
    if (this.glassImage) {
      // The image is centered (progress = 0.5)
      // Compute proximity: 1 when progress is 0.5, 0 when progress is <= 0.25 or >= 0.75
      const proximity = Math.max(0, 1 - Math.abs(progress - 0.5) * 4.0);
      const opacity = 0.4 + proximity * 0.6;
      const blurVal = (1 - proximity) * 8;
      const brightnessVal = 1.0 + proximity * 0.4;
      const scaleVal = 1.0 + proximity * 0.08;

      this.glassImage.style.opacity = opacity;
      this.glassImage.style.filter = `blur(${blurVal}px) brightness(${brightnessVal})`;
      this.glassImage.style.transform = `scale(${scaleVal})`;
    }

    // 3. Staggered reveal of past (left) text lines
    const totalPast = this.pastLines.length;
    this.pastLines.forEach((line, i) => {
      const threshold = 0.02 + (i / totalPast) * 0.90;
      if (progress >= threshold) {
        if (!line.classList.contains('ev-visible')) {
          line.classList.add('ev-visible');
        }
      }
    });

    // 4. Staggered reveal of now (right) text lines
    const totalNow = this.nowLines.length;
    this.nowLines.forEach((line, i) => {
      const threshold = 0.02 + (i / totalNow) * 0.90;
      if (progress >= threshold) {
        if (!line.classList.contains('ev-visible')) {
          line.classList.add('ev-visible');
          // Add a subtle play chime on highlight lines in Nitin's response
          if (line.classList.contains('ev-highlight') && Math.random() > 0.5) {
            window.dispatchEvent(new CustomEvent('play-sound', { detail: { name: 'section-chime' } }));
          }
        }
      }
    });
  }

  /**
   * Called when entering the scene
   */
  onEnter() {
    document.body.classList.add('mirror-active');
    this.startAnimation();
  }

  /**
   * Called when leaving the scene
   */
  onLeave() {
    document.body.classList.remove('mirror-active');
    this.stopAnimation();
  }

  /**
   * Reset the mirror scene states
   */
  reset() {
    this.pastLines.forEach(line => line.classList.remove('ev-visible'));
    this.nowLines.forEach(line => line.classList.remove('ev-visible'));
    if (this.glassBead) {
      gsap.set(this.glassBead, { top: '0%', left: '50%' });
    }
    if (this.glassImage) {
      gsap.set(this.glassImage, {
        opacity: 0.5,
        filter: 'blur(4px) brightness(1)',
        scale: 1,
      });
    }
    this.stopAnimation();
  }

  destroy() {
    this.stopAnimation();
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    this.pastLines = [];
    this.nowLines = [];
    this.isInitialized = false;
    this.particles = [];
    this.canvas = null;
    this.ctx = null;
  }
}
