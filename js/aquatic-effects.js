/**
 * AquaticCaustics - A custom canvas animation engine for rendering calm,
 * organic water caustics, floating bubbles, and interactive cursor water ripples.
 */

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

export class AquaticCaustics {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.isRunning = false;
    this.animationId = null;
    this.time = 0;
    this.blobs = [];
    this.particles = [];
    this.ripples = [];
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.noise = createNoise();

    this.initCanvasSize();
    this.createBlobs();
    this.createParticles();

    // Bind event listeners
    window.addEventListener('resize', this.onResize.bind(this));
    
    // Mouse listener to track ripples relative to canvas bounding box
    const parent = this.canvas.parentElement;
    if (parent) {
      parent.addEventListener('mousemove', this.onMouseMove.bind(this));
    }
  }

  initCanvasSize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const oldWidth = this.width;
    const oldHeight = this.height;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;

    // If size changed from 0 or initialized later, distribute particles
    if ((!oldWidth || oldWidth === 0 || Math.abs(this.width - oldWidth) > 50) && this.particles && this.particles.length > 0) {
      this.distributeParticles();
    }
  }

  distributeParticles() {
    if (!this.particles) return;
    this.particles.forEach(particle => {
      particle.x = Math.random() * this.width;
      particle.y = Math.random() * this.height;
      particle.history = [];
    });

    // Pre-simulate (warm up) the particles so that their patterns and trails are active immediately
    const noiseIntensity = 0.0028;
    for (let step = 0; step < 40; step++) {
      const time = step * 0.01;
      for (const particle of this.particles) {
        particle.life += 0.8;
        if (particle.life > particle.maxLife) {
          particle.life = 0;
          particle.x = Math.random() * this.width;
          particle.y = Math.random() * this.height;
          particle.history = [];
        }

        const n = this.noise.simplex3(
          particle.x * noiseIntensity,
          particle.y * noiseIntensity,
          time
        );
        const angle = n * Math.PI * 4;
        particle.velocity.x = Math.cos(angle) * 0.85; // slow soothing speed
        particle.velocity.y = Math.sin(angle) * 0.85;

        particle.x += particle.velocity.x;
        particle.y += particle.velocity.y;

        particle.history.push({ x: particle.x, y: particle.y });
        if (particle.history.length > 5) {
          particle.history.shift();
        }
      }
    }
  }

  onResize() {
    this.initCanvasSize();
  }

  createBlobs() {
    this.blobs = [];
    // Create 6 large overlapping caustics gradient blobs
    const colors = [
      'rgba(78, 205, 196, ', // Teal
      'rgba(0, 119, 182, ',  // Deep blue
      'rgba(144, 224, 239, ', // Light cyan
      'rgba(3, 4, 94, ',     // Dark indigo depth
      'rgba(255, 215, 0, ',   // Gold shimmer
      'rgba(78, 205, 196, '   // Teal accent
    ];

    for (let i = 0; i < 6; i++) {
      this.blobs.push({
        baseX: Math.random() * 100, // percentage based
        baseY: Math.random() * 100,
        speedX: 0.05 + Math.random() * 0.08,
        speedY: 0.04 + Math.random() * 0.07,
        rangeX: 10 + Math.random() * 20,
        rangeY: 10 + Math.random() * 20,
        radius: 180 + Math.random() * 180,
        colorPrefix: colors[i],
        opacity: 0.07 + Math.random() * 0.08,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  createParticles() {
    const colors = [
      { r: 255, g: 140, b: 163 }, // Soft romantic rose-pink
      { r: 244, g: 184, b: 193 }, // Pale pastel pink
      { r: 196, g: 176, b: 214 }, // Soft violet/lavender
      { r: 255, g: 210, b: 160 }  // Warm romantic gold/peach
    ];

    const particleCount = 380; // Soothing density surrounding the scrapbook
    this.particles = Array.from({ length: particleCount }, () => ({
      x: 0,
      y: 0,
      size: Math.random() * 1.5 + 0.8, // sizes 0.8px to 2.3px (dreamy pixie dust)
      velocity: { x: 0, y: 0 },
      life: Math.random() * 100,
      maxLife: 100 + Math.random() * 50,
      color: colors[Math.floor(Math.random() * colors.length)],
      history: [] // Keep track of past positions for transparent trails
    }));
  }

  onMouseMove(e) {
    if (!this.isRunning) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check distance from last ripple coordinate to prevent overcrowding
    const dist = Math.hypot(mx - this.lastMouseX, my - this.lastMouseY);
    if (dist > 35) {
      this.ripples.push({
        x: mx,
        y: my,
        radius: 2,
        maxRadius: 60 + Math.random() * 50,
        opacity: 0.35,
        speed: 1.2 + Math.random() * 1.0
      });
      this.lastMouseX = mx;
      this.lastMouseY = my;
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.initCanvasSize();
    this.loop();
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  loop() {
    if (!this.isRunning) return;
    this.time += 0.005;
    this.draw();
    this.animationId = requestAnimationFrame(this.loop.bind(this));
  }

  draw() {
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Render Caustics / Water Shimmers
    ctx.globalCompositeOperation = 'screen';
    this.blobs.forEach((blob) => {
      // Calculate animated coordinate using sine/cosine loops
      const x = (blob.baseX / 100) * this.width + Math.sin(this.time * blob.speedX + blob.phase) * blob.rangeX;
      const y = (blob.baseY / 100) * this.height + Math.cos(this.time * blob.speedY + blob.phase) * blob.rangeY;

      // Draw soft gradient light blob
      const grad = ctx.createRadialGradient(x, y, 0, x, y, blob.radius);
      grad.addColorStop(0, blob.colorPrefix + blob.opacity + ')');
      grad.addColorStop(0.3, blob.colorPrefix + blob.opacity * 0.4 + ')');
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, blob.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. Render Simplex-noise-driven stardust particles (soothing, calm)
    ctx.globalCompositeOperation = 'source-over';
    const noiseIntensity = 0.0028;
    const noiseTime = Date.now() * 0.0001;

    for (const particle of this.particles) {
      particle.life += 0.8;
      if (particle.life > particle.maxLife) {
        particle.life = 0;
        particle.x = Math.random() * this.width;
        particle.y = Math.random() * this.height;
        particle.history = [];
      }

      // Calculate opacity: fade in and fade out (balanced for visibility & elegance)
      // We set peak opacity in canvas to 0.48, which gets multiplied by the CSS opacity (0.65)
      const opacity = Math.sin((particle.life / particle.maxLife) * Math.PI) * 0.48;

      // Get direction from Simplex Noise
      const n = this.noise.simplex3(
        particle.x * noiseIntensity,
        particle.y * noiseIntensity,
        noiseTime
      );

      const angle = n * Math.PI * 4;
      particle.velocity.x = Math.cos(angle) * 0.85; // slow soothing speed
      particle.velocity.y = Math.sin(angle) * 0.85;

      particle.x += particle.velocity.x;
      particle.y += particle.velocity.y;

      // Edge wrapping with history reset
      let wrapped = false;
      if (particle.x < 0) { particle.x = this.width; wrapped = true; }
      if (particle.x > this.width) { particle.x = 0; wrapped = true; }
      if (particle.y < 0) { particle.y = this.height; wrapped = true; }
      if (particle.y > this.height) { particle.y = 0; wrapped = true; }
      if (wrapped) {
        particle.history = [];
      }

      // Track positions for trail history
      particle.history.push({ x: particle.x, y: particle.y });
      if (particle.history.length > 5) {
        particle.history.shift();
      }

      // Draw trails from oldest to newest
      const len = particle.history.length;
      for (let i = 0; i < len; i++) {
        const pt = particle.history[i];
        // Fade opacity and shrink size as history gets older
        const trailOpacity = opacity * (0.2 + 0.8 * (i / len));
        const ptSize = particle.size * (0.4 + 0.6 * (i / len));

        ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${trailOpacity})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, ptSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Render Cursor Water Ripples
    this.ripples.forEach((ripple, idx) => {
      ripple.radius += ripple.speed;
      ripple.opacity -= 0.006;

      if (ripple.opacity <= 0) {
        this.ripples.splice(idx, 1);
        return;
      }

      ctx.strokeStyle = `rgba(78, 205, 196, ${ripple.opacity})`;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Draw a secondary inner ripple for a more organic wave reflection
      if (ripple.radius > 15) {
        ctx.strokeStyle = `rgba(144, 224, 239, ${ripple.opacity * 0.4})`;
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius - 12, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }
}
