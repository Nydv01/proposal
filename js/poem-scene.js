/**
 * poem-scene.js — "Words I Could Never Say Out Loud"
 * Dynamic letter-by-letter handwriting reveal with ink-bleed effects.
 * Each word appears as if Nitin is writing it in real-time for Kanak.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

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

const LETTER_CONTENT = [
  { type: 'salutation', text: 'Myyy cutiepie,' },
  { type: 'break' },
  { type: 'line', text: 'There are things I\'ve carried inside me for so long that they\'ve become part of who I am.' },
  { type: 'line', text: 'Words I rehearsed a thousand times in my head but could never get past my lips.' },
  { type: 'line', text: 'So I\'m writing them down — because you deserve to know every single one.' },
  { type: 'break' },
  { type: 'line', text: 'The first time I saw you laugh — really laugh — something inside me shifted forever.' },
  { type: 'line', text: 'It wasn\'t loud or dramatic. It was quiet, like a key turning in a lock I didn\'t know existed.' },
  { type: 'line', text: 'And suddenly, every room without you in it felt incomplete.' },
  { type: 'break' },
  { type: 'line', text: 'I never told you this, but some nights I\'d stay up replaying our conversations.' },
  { type: 'line', text: 'Not because they were extraordinary — but because with you, even silence felt like poetry.' },
  { type: 'line', text: 'You made the ordinary sacred, Kanak. You still do.' },
  { type: 'break' },
  { type: 'line', text: 'I\'m not perfect. I stumble with words, I overthink, I sometimes go quiet when I should speak up.' },
  { type: 'line', text: 'But here\'s what I know with absolute certainty:' },
  { type: 'highlight', text: 'You are the best thing that has ever happened to me.' },
  { type: 'break' },
  { type: 'line', text: 'Every version of my future has you in it.' },
  { type: 'line', text: 'Every dream I dare to dream has your name written across it.' },
  { type: 'line', text: 'And every heartbeat — every single one — it whispers your name.' },
  { type: 'break' },
  { type: 'line', text: 'I know I don\'t always say this enough, so let me say it now,' },
  { type: 'line', text: 'in ink, where it can never be unsaid:' },
  { type: 'break' },
  { type: 'highlight', text: 'I love you. Not just today, not just on the good days —' },
  { type: 'highlight', text: 'but on every single day this universe gives me with you.' },
  { type: 'break' },
  { type: 'closing', text: 'With all my love, always and forever,' },
  { type: 'signature', text: 'Nitin ♥' },
  { type: 'stamp' },
];

export class PoemScene {
  constructor() {
    this.container = null;
    this.contentEl = null;
    this.lines = [];
    this.isInitialized = false;
    this.hasStarted = false;
    this.currentLineIndex = 0;
    this.currentCharIndex = 0;
    this.typingInterval = null;
    this.cursorEl = null;

    // Background animation canvas properties
    this.canvas = null;
    this.ctx = null;
    this.canvasActive = false;
    this.animationFrameIdBg = null;
    this.particles = [];
    this.lights = [];
    this.textFloats = [];
    this.resizeHandler = null;
  }

  /**
   * Initialize the poem scene
   * @param {string[]} _poemLines - ignored, we use built-in content
   */
  init(_poemLines) {
    this.container = document.getElementById('letter-paper');
    this.contentEl = document.getElementById('letter-content-inner');

    if (!this.contentEl) return;

    // Clear and build the letter structure
    this.contentEl.innerHTML = '';
    this.lines = [];

    // Inject SVG filter for burnt edges if not already present in the document
    if (!document.getElementById('burnt-paper-filter-svg')) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'burnt-paper-filter-svg';
      svg.setAttribute('style', 'position: absolute; width: 0; height: 0; pointer-events: none;');
      svg.setAttribute('aria-hidden', 'true');
      svg.innerHTML = `
        <filter id="burnt-paper-edge" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="4" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="26" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      `;
      document.body.appendChild(svg);
    }

    // Inject the paper background layer dynamically (without geometric corner overlays)
    if (this.container) {
      // Remove any existing paper backgrounds first
      const existingBg = this.container.querySelector('.letter-paper-bg');
      if (existingBg) existingBg.remove();
      this.container.querySelectorAll('.burnt-corner').forEach(el => el.remove());

      // Create new background wrapper element
      const paperBg = document.createElement('div');
      paperBg.className = 'letter-paper-bg';

      this.container.insertBefore(paperBg, this.container.firstChild);
    }

    // Inject background canvas to scene container
    const poemSection = document.getElementById('scene-poem');
    if (poemSection && !document.getElementById('poem-canvas-bg')) {
      const canvas = document.createElement('canvas');
      canvas.id = 'poem-canvas-bg';
      canvas.className = 'poem-canvas-bg';
      canvas.setAttribute('aria-hidden', 'true');
      poemSection.insertBefore(canvas, poemSection.firstChild);
    }

    // Initialize background canvas stardust/petals
    this.initBackground();

    LETTER_CONTENT.forEach((item, i) => {
      const el = document.createElement('div');
      el.dataset.index = i;

      if (item.type === 'break') {
        el.className = 'letter-break';
      } else if (item.type === 'salutation') {
        el.className = 'letter-line letter-salutation';
        el.dataset.fullText = item.text;
      } else if (item.type === 'highlight') {
        el.className = 'letter-line letter-highlight';
        el.dataset.fullText = item.text;
      } else if (item.type === 'closing') {
        el.className = 'letter-line letter-closing';
        el.dataset.fullText = item.text;
      } else if (item.type === 'signature') {
        el.className = 'letter-line letter-sig';
        el.dataset.fullText = item.text;
      } else if (item.type === 'stamp') {
        el.className = 'letter-stamp-wrapper';
        el.innerHTML = `
          <div class="letter-wax-seal" style="opacity: 0; transform: scale(3.5) rotate(-25deg); display: none;">
            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </div>
        `;
      } else {
        el.className = 'letter-line';
        el.dataset.fullText = item.text;
      }

      this.contentEl.appendChild(el);
      this.lines.push(el);
    });

    // Add blinking cursor
    this.cursorEl = document.createElement('span');
    this.cursorEl.className = 'letter-cursor';
    this.cursorEl.textContent = '|';

    this.isInitialized = true;
  }

  /**
   * Initialize the background canvas
   */
  initBackground() {
    this.canvas = document.getElementById('poem-canvas-bg');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d', { alpha: true });
    if (!this.ctx) return;

    this.resizeCanvas();

    // Initialize Simplex noise math
    this.noise = createNoise();

    // Bind window resize event
    if (!this.resizeHandler) {
      this.resizeHandler = this.resizeCanvas.bind(this);
      window.addEventListener('resize', this.resizeHandler);
    }

    // Initialize romantic assets
    this.initAssets();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const parent = document.getElementById('scene-poem');
    if (parent) {
      const rect = parent.getBoundingClientRect();
      this.canvas.width = rect.width || window.innerWidth;
      this.canvas.height = rect.height || (window.innerHeight * 2);
    } else {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight * 2;
    }
  }

  initAssets() {
    // 1. Spawning bokeh fairylights
    this.lights = Array.from({ length: 25 }, () => ({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      radius: Math.random() * 2.5 + 1.2, // 1.2px to 3.7px
      speedY: -(Math.random() * 0.25 + 0.1), // floating upwards slowly
      speedX: Math.random() * 0.2 - 0.1,
      pulseSpeed: Math.random() * 0.02 + 0.01,
      pulseOffset: Math.random() * Math.PI * 2,
      maxOpacity: Math.random() * 0.25 + 0.12 // opacity 0.12 to 0.37
    }));

    // 2. Spawning stardust particles (matching the soothing mirror scene particles)
    const colors = [
      { r: 255, g: 140, b: 163 }, // Soft romantic rose-pink
      { r: 244, g: 184, b: 193 }, // Pale pastel pink
      { r: 196, g: 176, b: 214 }, // Soft violet/lavender
      { r: 255, g: 210, b: 160 }  // Warm romantic gold/peach
    ];

    const particleCount = 450; // soft soothing count surrounding the letter
    this.particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      size: Math.random() * 1.4 + 0.7, // sizes 0.7px to 2.1px (soothing, delicate pixie dust)
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
        particle.velocity.x = Math.cos(angle) * 0.85; // very slow, calm drift speed
        particle.velocity.y = Math.sin(angle) * 0.85;

        particle.x += particle.velocity.x;
        particle.y += particle.velocity.y;

        particle.history.push({ x: particle.x, y: particle.y });
        if (particle.history.length > 5) {
          particle.history.shift();
        }
      }
    }

    // 3. Spawning faint cursive text snippets
    const phrases = ['Kanak', 'Always', 'Love', 'Heartbeat', 'Forever', 'With all my heart'];
    this.textFloats = Array.from({ length: 6 }, (v, i) => ({
      text: phrases[i % phrases.length],
      x: Math.random() * (this.canvas.width - 200) + 100,
      y: Math.random() * (this.canvas.height - 200) + 100,
      fontSize: Math.random() * 6 + 22, // 22px to 28px font size
      speedY: -(Math.random() * 0.1 + 0.05), // float up slowly
      speedX: Math.random() * 0.06 - 0.03,
      opacity: Math.random() * 0.03 + 0.03 // faint, between 3% and 6% opacity
    }));
  }

  startBackgroundAnimation() {
    if (this.canvasActive) return;
    this.canvasActive = true;
    this.animateBg();
  }

  stopBackgroundAnimation() {
    this.canvasActive = false;
    if (this.animationFrameIdBg) {
      cancelAnimationFrame(this.animationFrameIdBg);
      this.animationFrameIdBg = null;
    }
  }

  animateBg() {
    if (!this.canvasActive || !this.canvas || !this.ctx) return;
    this.animationFrameIdBg = requestAnimationFrame(this.animateBg.bind(this));

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const time = Date.now() * 0.001;

    // 1. Draw Cursive Nostalgic Texts (deep background)
    this.textFloats.forEach(t => {
      t.y += t.speedY;
      t.x += t.speedX;

      // Wrap-around boundaries
      if (t.y < -50) {
        t.y = this.canvas.height + 50;
        t.x = Math.random() * (this.canvas.width - 200) + 100;
      }
      if (t.x < -100) t.x = this.canvas.width + 100;
      if (t.x > this.canvas.width + 100) t.x = -100;

      this.ctx.fillStyle = `rgba(255, 117, 143, ${t.opacity})`;
      this.ctx.font = `italic 300 ${t.fontSize}px "Caveat", cursive`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText(t.text, t.x, t.y);
    });

    // 2. Draw Bokeh Fairylights (middle background)
    this.lights.forEach(l => {
      l.y += l.speedY;
      l.x += l.speedX;

      // Wrap-around
      if (l.y < -10) {
        l.y = this.canvas.height + 10;
        l.x = Math.random() * this.canvas.width;
      }
      if (l.x < -10) l.x = this.canvas.width + 10;
      if (l.x > this.canvas.width + 10) l.x = -10;

      // Subtle opacity pulse
      const currentOpacity = l.maxOpacity * (0.6 + 0.4 * Math.sin(time * l.pulseSpeed + l.pulseOffset));

      // Draw glowing light point
      const glowGrad = this.ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.radius * 2);
      glowGrad.addColorStop(0, `rgba(255, 210, 150, ${currentOpacity})`);
      glowGrad.addColorStop(0.4, `rgba(255, 180, 110, ${currentOpacity * 0.4})`);
      glowGrad.addColorStop(1, 'rgba(255, 180, 110, 0)');

      this.ctx.fillStyle = glowGrad;
      this.ctx.beginPath();
      this.ctx.arc(l.x, l.y, l.radius * 2, 0, Math.PI * 2);
      this.ctx.fill();
    });

    // 3. Draw Simplex-noise-driven stardust particles (soothing, calm)
    const noiseIntensity = 0.0028;
    const noiseTime = Date.now() * 0.0001;

    for (const particle of this.particles) {
      particle.life += 0.8;
      if (particle.life > particle.maxLife) {
        particle.life = 0;
        particle.x = Math.random() * this.canvas.width;
        particle.y = Math.random() * this.canvas.height;
        particle.history = [];
      }

      // Calculate opacity: fade in and fade out (balanced for visibility & elegance)
      const opacity = Math.sin((particle.life / particle.maxLife) * Math.PI) * 0.38;

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
      if (particle.x < 0) { particle.x = this.canvas.width; wrapped = true; }
      if (particle.x > this.canvas.width) { particle.x = 0; wrapped = true; }
      if (particle.y < 0) { particle.y = this.canvas.height; wrapped = true; }
      if (particle.y > this.canvas.height) { particle.y = 0; wrapped = true; }
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

        this.ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${trailOpacity})`;
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, ptSize, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  /**
   * Start the typing animation
   */
  startTyping() {
    if (this.hasStarted) return;
    // Re-initialize if DOM content is empty (e.g. after reset)
    if (!this.isInitialized || !this.contentEl || !this.contentEl.children.length) {
      this.init();
    }
    this.hasStarted = true;
    this.currentLineIndex = 0;
    this.currentCharIndex = 0;

    // Refresh ScrollTrigger at start of typing to capture initial offsets
    ScrollTrigger.refresh();

    this._typeNextLine();
  }

  _typeNextLine() {
    if (this.currentLineIndex >= this.lines.length) {
      // All done — remove cursor
      if (this.cursorEl?.parentElement) {
        gsap.to(this.cursorEl, {
          opacity: 0,
          duration: 0.5,
          onComplete: () => {
            this.cursorEl.remove();
            // Final ScrollTrigger refresh once letter is fully written
            ScrollTrigger.refresh();
          }
        });
      } else {
        ScrollTrigger.refresh();
      }
      return;
    }

    const lineEl = this.lines[this.currentLineIndex];

    // Handle stamp animation
    if (lineEl.classList.contains('letter-stamp-wrapper')) {
      const seal = lineEl.querySelector('.letter-wax-seal');
      if (seal) {
        gsap.set(lineEl, { opacity: 1, display: 'block' });
        gsap.set(seal, { display: 'inline-flex' });

        // Remove cursor before stamping
        if (this.cursorEl?.parentElement) {
          gsap.to(this.cursorEl, { opacity: 0, duration: 0.3, onComplete: () => this.cursorEl.remove() });
        }

        // Stamping reveal animation with a satisfying impact scale/shake
        gsap.fromTo(seal,
          { opacity: 0, scale: 3.5, rotate: -35 },
          {
            opacity: 1,
            scale: 1,
            rotate: -5,
            duration: 0.5,
            ease: 'back.out(1.5)',
            delay: 0.4,
            onStart: () => {
              // Shake paper on impact
              if (this.container) {
                gsap.fromTo(this.container,
                  { x: -1.5, y: -1.5 },
                  { x: 1.5, y: 1.5, duration: 0.05, repeat: 4, yoyo: true }
                );
              }
            },
            onComplete: () => {
              // Ensure window scrolls down to reveal stamp fully, only if the user is looking at the letter scene
              const poemSection = document.getElementById('scene-poem');
              if (poemSection && poemSection.classList.contains('scene-active')) {
                const stampRect = lineEl.getBoundingClientRect();
                const targetScrollY = window.scrollY + stampRect.top - window.innerHeight + stampRect.height + 40;
                if (window.scrollY < targetScrollY) {
                  window.scrollTo({
                    top: targetScrollY,
                    behavior: 'smooth'
                  });
                }
              }
              // Final ScrollTrigger refresh once the stamp is placed
              ScrollTrigger.refresh();
            }
          }
        );
      }
      this.currentLineIndex++;
      setTimeout(() => this._typeNextLine(), 1000);
      return;
    }

    // Handle breaks
    if (lineEl.classList.contains('letter-break')) {
      gsap.fromTo(lineEl,
        { opacity: 0, height: 0 },
        { opacity: 1, height: '1.2rem', duration: 0.3, ease: 'power2.out' }
      );
      this.currentLineIndex++;
      setTimeout(() => this._typeNextLine(), 200);
      return;
    }

    const fullText = lineEl.dataset.fullText || '';
    if (!fullText) {
      this.currentLineIndex++;
      this._typeNextLine();
      return;
    }

    // Reveal the line element with fade
    gsap.set(lineEl, { opacity: 1, display: 'block' });

    // Append cursor to this line
    lineEl.appendChild(this.cursorEl);
    gsap.set(this.cursorEl, { opacity: 1 });

    // Smooth scroll page to center this line if it's below the middle of the viewport (only once per line!)
    this._adjustScroll(lineEl);

    this.currentCharIndex = 0;
    this._typeChar(lineEl, fullText);
  }

  _typeChar(lineEl, fullText) {
    if (this.currentCharIndex >= fullText.length) {
      // Line complete
      if (this.cursorEl?.parentElement === lineEl) {
        lineEl.removeChild(this.cursorEl);
      }

      // Add subtle ink-settle effect
      gsap.fromTo(lineEl,
        { filter: 'blur(0.3px)' },
        { filter: 'blur(0px)', duration: 0.4 }
      );

      this.currentLineIndex++;
      this.currentCharIndex = 0;

      // Pause between lines — longer for highlights and closings
      const isSpecial = lineEl.classList.contains('letter-highlight') ||
        lineEl.classList.contains('letter-closing') ||
        lineEl.classList.contains('letter-sig');
      const delay = isSpecial ? 600 : 300;

      setTimeout(() => this._typeNextLine(), delay);
      return;
    }

    // Type the next character
    const char = fullText[this.currentCharIndex];

    // Create a span for each word (for word-level effects)
    const textNode = document.createTextNode(char);
    lineEl.insertBefore(textNode, this.cursorEl);

    // Play a cute typing click sound for non-space characters
    if (char !== ' ') {
      window.dispatchEvent(new CustomEvent('play-sound', { detail: { name: 'typewriter-click' } }));
    }

    this.currentCharIndex++;

    // Variable typing speed for natural feel
    let speed = 28 + Math.random() * 22; // 28-50ms per char
    if (char === ',' || char === ';') speed = 120 + Math.random() * 80;
    if (char === '.' || char === '!' || char === '?') speed = 200 + Math.random() * 150;
    if (char === '—' || char === '–') speed = 150 + Math.random() * 100;
    if (char === '\'' || char === '"') speed = 40 + Math.random() * 30;
    if (char === ' ') speed = 15 + Math.random() * 20;

    // Occasional pause (thinking hesitation)
    if (Math.random() < 0.03 && char === ' ') {
      speed += 300 + Math.random() * 400;
    }

    setTimeout(() => this._typeChar(lineEl, fullText), speed);
  }

  /**
   * Scroll progress handler
   */
  onProgress(progress) {
    if (!this.isInitialized) return;

    // Start typing only when the user has reached the section and the letter is fully centered/visible
    if (progress > 0.45 && !this.hasStarted) {
      this.startTyping();
    }
  }

  onEnter() {
    document.body.classList.add('poem-active');
    this.startBackgroundAnimation();
  }

  onLeave() {
    document.body.classList.remove('poem-active');
    this.stopBackgroundAnimation();
  }

  reset() {
    this.hasStarted = false;
    this.currentLineIndex = 0;
    this.currentCharIndex = 0;
    if (this.typingInterval) {
      clearInterval(this.typingInterval);
      this.typingInterval = null;
    }
    if (this.contentEl) {
      this.contentEl.innerHTML = '';
    }
    this.stopBackgroundAnimation();
  }

  _adjustScroll(lineEl) {
    if (!lineEl) return;
    const rect = lineEl.getBoundingClientRect();
    const cursorY = rect.bottom;
    const targetY = window.innerHeight * 0.55; // Pinned at 55% of viewport height
    if (cursorY > targetY) {
      const scrollDiff = cursorY - targetY;
      window.scrollTo({
        top: window.scrollY + scrollDiff,
        behavior: 'smooth'
      });
    }
  }

  destroy() {
    this.reset();
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    this.lines = [];
    this.particles = [];
    this.lights = [];
    this.textFloats = [];
    this.isInitialized = false;
    this.canvas = null;
    this.ctx = null;
  }
}
