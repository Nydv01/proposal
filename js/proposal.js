/**
 * proposal.js — The emotional climax of the experience.
 * v6.5 — Interactive Choice & Response Vapor Climax Edition
 * Features: monologue buildup, gold-sealed letter card, pink leaf backdrop,
 * canvas-based Vaporize Text Cycle, delayed choice buttons, and choice vaporization
 * micro-interactions.
 */
import gsap from 'gsap';

// ============================================================================
// VAPOR TEXT EFFECT — Canvas Particle Dissolve
// ============================================================================
class VaporTextEffect {
  constructor(canvas, {
    texts = [],
    fontFamily = "Caveat, cursive",
    fontSize = 44,
    fontWeight = 500,
    alignment = "center",
    vaporizeDuration = 1.8,
    fadeInDuration = 1.0,
    waitDuration = 2.2,
    onFinalText = null
  } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.texts = texts;
    this.fontFamily = fontFamily;
    this.fontSize = fontSize;
    this.fontWeight = fontWeight;
    this.alignment = alignment;
    this.onFinalText = onFinalText;

    this.durations = {
      vaporize: vaporizeDuration * 1000,
      fadeIn: fadeInDuration * 1000,
      wait: waitDuration * 1000
    };

    this.currentTextIndex = 0;
    this.state = "waiting"; // "waiting", "vaporizing", "fadingIn", "completed"

    this.particles = [];
    this.globalDpr = window.devicePixelRatio || 1;
    this.progress = 0;
    this.fadeOpacity = 0;
    this.lastTime = 0;
    this.animationFrameId = null;
    this.gradientOffset = 0;
    this.onVaporizeComplete = null; // Completion hook for response text
    this.vaporStartTime = 0; // Track when vaporization started
    this.maxVaporDuration = 2500; // Safety timeout (ms) to force-complete vaporization
    this.active = false;

    this._resizeHandler = this.resize.bind(this);
  }

  init() {
    this.resize();
    window.addEventListener('resize', this._resizeHandler);
  }

  resize() {
    if (!this.canvas || !this.canvas.parentElement) return;

    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = rect.width || 580;
    const h = rect.height || 180;

    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.width = Math.floor(w * this.globalDpr);
    this.canvas.height = Math.floor(h * this.globalDpr);

    this.textX = this.alignment === "center" ? this.canvas.width / 2 : (this.alignment === "left" ? 40 : this.canvas.width - 40);
    this.textY = this.canvas.height / 2;

    this.fontSpec = `${this.fontWeight} ${this.fontSize * this.globalDpr}px ${this.fontFamily}`;

    // Update text boundaries
    this.ctx.font = this.fontSpec;
    const currentText = this.texts[this.currentTextIndex] || "";
    const metrics = this.ctx.measureText(currentText);
    const textWidth = metrics.width;
    let textLeft;
    if (this.alignment === "center") {
      textLeft = this.textX - textWidth / 2;
    } else if (this.alignment === "left") {
      textLeft = this.textX;
    } else {
      textLeft = this.textX - textWidth;
    }

    this.textBoundaries = {
      left: textLeft,
      right: textLeft + textWidth,
      width: textWidth
    };
  }

  start() {
    this.active = true;
    // Start first text with fade-in instead of dead wait
    this.state = "fadingIn";
    this.fadeOpacity = 0;
    this.lastTime = performance.now();
    this.progress = 0;
    this.animate();
  }

  stop() {
    this.active = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    window.removeEventListener('resize', this._resizeHandler);
  }

  /**
   * Transition to display and vaporize the chosen response text
   */
  vaporizeResponse(responseText, callback) {
    this.stop(); // Halt active monologue animations

    this.texts = [responseText];
    this.currentTextIndex = 0;
    this.resize();

    this.active = true;
    // Set to fade in the response choice on the canvas
    this.state = "fadingIn";
    this.fadeOpacity = 0;

    // Speed up waiting pacing for response transition
    this.durations.wait = 800;

    // Set onVaporizeComplete DIRECTLY so it's ready when vaporization finishes.
    // Previously this was nested inside onFinalText which fired too late.
    this.onVaporizeComplete = () => {
      this.stop();
      callback();
    };
    // Clear onFinalText so it doesn't interfere
    this.onFinalText = null;

    this.lastTime = performance.now();
    this.animate();
  }

  // Samples text pixels and creates particles
  _sampleTextParticles() {
    const ctx = this.ctx;
    const canvas = this.canvas;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.font = this.fontSpec;
    ctx.textAlign = this.alignment;
    ctx.textBaseline = "middle";

    // Fill text to sample
    const gradient = ctx.createLinearGradient(this.textBoundaries.left, 0, this.textBoundaries.right, 0);
    gradient.addColorStop(0, '#50131c'); // Deep red
    gradient.addColorStop(0.25, '#b83f5d'); // Rose
    gradient.addColorStop(0.5, '#7c3aed'); // Violet
    gradient.addColorStop(0.75, '#b45309'); // Gold
    gradient.addColorStop(1, '#50131c'); // Deep red
    ctx.fillStyle = gradient;

    ctx.fillText(this.texts[this.currentTextIndex], this.textX, this.textY);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Count active pixels to dynamically set sample rate
    let activePixels = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 15) {
        activePixels++;
      }
    }

    // Target a maximum of 700 particles for excellent performance on all devices
    const targetParticles = 700;
    const calculatedSampleRate = Math.max(3, Math.ceil(Math.sqrt(activePixels / targetParticles)));
    this.sampleRate = calculatedSampleRate;
    this.particleSize = Math.max(1.8, calculatedSampleRate * 0.55);

    const particles = [];
    for (let y = 0; y < canvas.height; y += calculatedSampleRate) {
      for (let x = 0; x < canvas.width; x += calculatedSampleRate) {
        const index = (y * canvas.width + x) * 4;
        const alpha = data[index + 3];

        if (alpha > 15) {
          const originalAlpha = alpha / 255;
          particles.push({
            x: x,
            y: y,
            originalX: x,
            originalY: y,
            r: data[index],
            g: data[index + 1],
            b: data[index + 2],
            opacity: originalAlpha,
            originalAlpha: originalAlpha,
            velocityX: 0,
            velocityY: 0,
            angle: 0,
            speed: 0
          });
        }
      }
    }

    this.particles = particles;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  animate(currentTime = performance.now()) {
    if (!this.active || !this.canvas) return;
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    const ctx = this.ctx;
    const canvas = this.canvas;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.gradientOffset += deltaTime * 0.15;

    const createShimmerGradient = () => {
      if (!this.textBoundaries) return '#50131c';
      const gradient = ctx.createLinearGradient(this.textBoundaries.left, 0, this.textBoundaries.right, 0);
      const shift = this.gradientOffset % 1;

      const colors = [
        { pos: 0, color: '#50131c' },
        { pos: 0.25, color: '#b83f5d' },
        { pos: 0.5, color: '#7c3aed' },
        { pos: 0.75, color: '#b45309' },
        { pos: 1, color: '#50131c' }
      ];

      colors.forEach(c => {
        let newPos = (c.pos + shift) % 1;
        gradient.addColorStop(newPos, c.color);
      });

      return gradient;
    };

    switch (this.state) {
      case "waiting": {
        // Draw sharp text with animated shimmering gradient
        ctx.font = this.fontSpec;
        ctx.textAlign = this.alignment;
        ctx.textBaseline = "middle";
        ctx.fillStyle = createShimmerGradient();
        ctx.fillText(this.texts[this.currentTextIndex], this.textX, this.textY);

        this.progress += deltaTime * 1000;
        if (this.progress >= this.durations.wait) {
          this.state = "vaporizing";
          this.progress = 0;
          this.vaporStartTime = performance.now(); // Track start for safety timeout
          this._sampleTextParticles();
        }
        break;
      }

      case "vaporizing": {
        // Sweep vaporization wave left-to-right
        this.progress += deltaTime * 100 / (this.durations.vaporize / 1000);

        const progressClamped = Math.min(100, this.progress);
        const sweepX = this.textBoundaries.left + this.textBoundaries.width * (progressClamped / 100);

        // Safety: force-complete if vaporization exceeds max duration
        const vaporElapsed = performance.now() - this.vaporStartTime;
        const forceComplete = vaporElapsed > this.maxVaporDuration;

        let allVaporized = true;
        const spreadMultiplier = 3.5;

        // Accelerate fade rate as time passes to ensure completion
        const timeFactor = Math.min(3.0, 1.0 + vaporElapsed / 2000);

        ctx.save();

        // OPTIMIZATION: Use slightly larger particles so they look full despite higher step size,
        // and avoid costly RegExp operations on strings by using raw pre-sampled r, g, b components.
        const particleSize = this.particleSize || (this.globalDpr > 1.5 ? 2.5 : 1.8);

        this.particles.forEach(p => {
          if (p.originalX <= sweepX) {
            if (p.speed === 0) {
              p.angle = Math.random() * Math.PI * 2;
              p.speed = (Math.random() * 0.8 + 0.4) * spreadMultiplier;
              p.velocityX = Math.cos(p.angle) * p.speed;
              p.velocityY = Math.sin(p.angle) * p.speed;
              p.shouldFadeQuickly = Math.random() > 0.65;
            }

            if (p.shouldFadeQuickly) {
              p.opacity = Math.max(0, p.opacity - deltaTime * 3.0 * timeFactor);
            } else {
              const dx = p.originalX - p.x;
              const dy = p.originalY - p.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const damping = Math.max(0.88, 1 - dist / 80);

              const randX = (Math.random() - 0.5) * 6;
              const randY = (Math.random() - 0.5) * 6;

              p.velocityX = (p.velocityX + randX) * damping;
              p.velocityY = (p.velocityY + randY - 0.3) * damping;

              p.x += p.velocityX * deltaTime * 25;
              p.y += p.velocityY * deltaTime * 15;

              p.opacity = Math.max(0, p.opacity - deltaTime * 1.5 * timeFactor);
            }

            if (p.opacity > 0.01 && !forceComplete) {
              allVaporized = false;
            }
          } else {
            if (!forceComplete) allVaporized = false;
          }

          if (p.opacity > 0 && !forceComplete) {
            // Highly optimized drawing avoiding regular expression search-replace
            ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.opacity})`;
            ctx.fillRect(p.x, p.y, particleSize, particleSize);
          }
        });
        ctx.restore();

        if ((this.progress >= 100 && allVaporized) || forceComplete) {
          if (this.onVaporizeComplete) {
            this.onVaporizeComplete();
            this.onVaporizeComplete = null;
          } else if (this.currentTextIndex === this.texts.length - 1) {
            // Reached final monologue question end -> transit to completed state and trigger buttons
            this.state = "completed";
            this.stop(); // OPTIMIZATION: Stop loop completely to save CPU once monologue finishes!
            if (this.onFinalText) {
              this.onFinalText();
            }
          } else {
            this.currentTextIndex = (this.currentTextIndex + 1) % this.texts.length;
            this.resize();
            this.state = "fadingIn";
            this.fadeOpacity = 0;
          }
        }
        break;
      }

      case "fadingIn": {
        this.fadeOpacity += deltaTime * 1000 / this.durations.fadeIn;
        const opacityClamped = Math.min(1.0, this.fadeOpacity);

        ctx.save();
        ctx.globalAlpha = opacityClamped;
        ctx.font = this.fontSpec;
        ctx.textAlign = this.alignment;
        ctx.textBaseline = "middle";
        ctx.fillStyle = createShimmerGradient();
        ctx.fillText(this.texts[this.currentTextIndex], this.textX, this.textY);
        ctx.restore();

        if (this.fadeOpacity >= 1.0) {
          this.state = "waiting";
          this.progress = 0;
        }
        break;
      }
      case "completed": {
        // Keep canvas blank while choices are displayed
        break;
      }
    }
  }
}

// ============================================================================
// PROPOSAL CONTROLLER
// ============================================================================
export class ProposalController {
  constructor({ onCelebration, onDecline, onReconsider } = {}) {
    this.onCelebrationCb = onCelebration || (() => { });
    this.onDeclineCb = onDecline || (() => { });
    this.onReconsiderCb = onReconsider || (() => { });
    this.hasProposed = false;
    this.answered = false;
    this.declineAttempts = 0;
    this.buildupTimeline = null;
    this._screenGlowEl = null;
    this.vaporEffect = null;
    this._buttonsShown = false;
    this._buttonSafetyTimer = null;
  }

  init(contentData) {
    this.data = contentData?.proposal || {};
    this._cacheDOM();
    if (!this.proposalContainer) return;
    this._applyContent();
    this._createScreenGlow();
    this._initPointerGlow();
  }

  _cacheDOM() {
    this.proposalContainer = document.querySelector('.proposal-container');
    this.buildupEl = document.getElementById('proposal-buildup');
    this.buildupLines = document.querySelectorAll('.buildup-line');

    // Interactive Climax Envelope & Card Elements
    this.envelopeWrapper = document.getElementById('proposal-envelope-wrapper');
    this.envelopeBox = document.getElementById('proposal-envelope');
    this.letterCard = document.getElementById('proposal-letter-card');
    this.waxSeal = this.envelopeBox?.querySelector('.envelope-wax-seal');
    this.vaporCanvas = document.getElementById('proposal-vapor-canvas');

    this.acceptBtn = document.getElementById('accept-btn');
    this.declineBtn = document.getElementById('decline-btn');
    this.buttonsEl = document.getElementById('proposal-buttons');

    this.celebrationEl = document.getElementById('celebration');
    this.declineEl = document.getElementById('gentle-decline');
    this.reconsiderBtn = document.getElementById('reconsider-btn');
    this.sceneEl = document.getElementById('scene-proposal');
    this.vignetteEl = this.sceneEl?.querySelector('.proposal-vignette');
    this.firefliesEl = this.sceneEl?.querySelector('.proposal-fireflies');
  }

  _applyContent() {
    if (this.data.yesText && this.acceptBtn) {
      const textSpan = this.acceptBtn.querySelector('.btn-text');
      if (textSpan) textSpan.textContent = this.data.yesText;
      else this.acceptBtn.textContent = this.data.yesText;
    }
    if (this.data.noText && this.declineBtn) {
      this.declineBtn.textContent = this.data.noText;
    }
  }

  _createScreenGlow() {
    if (this._screenGlowEl) return;
    this._screenGlowEl = document.createElement('div');
    this._screenGlowEl.className = 'proposal-screen-glow';
    this._screenGlowEl.setAttribute('aria-hidden', 'true');
    Object.assign(this._screenGlowEl.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '9999',
      background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255, 150, 75, 0.12) 0%, transparent 70%)',
      opacity: '0',
      transition: 'opacity 0.3s ease',
    });
    document.body.appendChild(this._screenGlowEl);
  }

  _initPointerGlow() {
    let frameId = null;
    let cachedPageX = 0;
    let cachedPageY = 0;
    let cachedWidth = 1;
    let cachedHeight = 1;

    const updateRect = () => {
      if (this.proposalContainer) {
        const rect = this.proposalContainer.getBoundingClientRect();
        cachedPageX = rect.left + window.pageXOffset;
        cachedPageY = rect.top + window.pageYOffset;
        cachedWidth = rect.width || 1;
        cachedHeight = rect.height || 1;
      }
    };

    // Cache the rect initially
    updateRect();

    // Re-cache rect on window resize, scroll, and pointer actions to ensure layout stability
    window.addEventListener('resize', updateRect, { passive: true });
    window.addEventListener('scroll', updateRect, { passive: true });

    // Re-cache rect when pointer enters the scene or container to ensure accuracy
    if (this.sceneEl) {
      this.sceneEl.addEventListener('pointerenter', updateRect, { passive: true });
    }
    if (this.proposalContainer) {
      this.proposalContainer.addEventListener('pointerenter', updateRect, { passive: true });
    }

    const syncPointer = (e) => {
      if (!this.proposalContainer) return;

      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        // Calculate page coordinates of pointer
        const pageX = e.clientX + window.pageXOffset;
        const pageY = e.clientY + window.pageYOffset;

        // Calculate pointer coordinates relative to the container using cached coordinates
        const x = pageX - cachedPageX;
        const y = pageY - cachedPageY;

        this.proposalContainer.style.setProperty('--x', x.toFixed(2));
        this.proposalContainer.style.setProperty('--xp', (x / cachedWidth).toFixed(2));
        this.proposalContainer.style.setProperty('--y', y.toFixed(2));
        this.proposalContainer.style.setProperty('--yp', (y / cachedHeight).toFixed(2));
      });
    };

    // Listen to pointermove inside the scene if available, otherwise fallback to document
    if (this.sceneEl) {
      this.sceneEl.addEventListener('pointermove', syncPointer, { passive: true });
    } else {
      document.addEventListener('pointermove', syncPointer, { passive: true });
    }
  }

  _pulseScreenGlow(intensity = 0.6, duration = 0.35) {
    if (!this._screenGlowEl) return;
    gsap.to(this._screenGlowEl, {
      opacity: intensity,
      duration: duration * 0.4,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(this._screenGlowEl, {
          opacity: 0,
          duration: duration * 0.6,
          ease: 'power2.in',
        });
      }
    });
  }

  startProposal() {
    if (this.hasProposed || this.answered) return;
    this.hasProposed = true;

    if (this.proposalContainer) {
      this.proposalContainer.classList.add('in-buildup');
    }

    // Dim the background for theaters effect
    document.body.classList.add('proposal-active');

    // Start falling pink leaves
    this._createFallingLeaves();

    // Play heartbeat buildup sound
    window.dispatchEvent(new CustomEvent('play-sound', {
      detail: { name: 'heartbeat-start' }
    }));

    this._animateBuildup();
  }

  onProgress(progress) {
    if (this.answered) return;

    if (progress > 0.16 && !this.hasProposed) {
      this.startProposal();
    }
  }

  _animateBuildup() {
    const tl = gsap.timeline({
      onComplete: () => this._revealEnvelope()
    });
    this.buildupTimeline = tl;

    // Reveal buildup lines with cinematic timing
    this.buildupLines.forEach((line, i) => {
      if (i > 0) {
        tl.add(() => this._pulseScreenGlow(0.35, 0.5), `+=${i === 1 ? 0.8 : 1.0}`);
        tl.to({}, { duration: 0.5 });
      }

      tl.fromTo(line,
        {
          opacity: 0,
          y: 45,
          filter: 'blur(15px)',
          letterSpacing: '0.02em',
        },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          letterSpacing: i === 0 ? '0.06em' : '0.04em',
          duration: 1.8,
          ease: 'power3.out',
          onStart: () => {
            line.classList.add('active');
            window.dispatchEvent(new CustomEvent('play-sound', {
              detail: { name: 'monologue-appear' }
            }));
          },
        },
        i === 0 ? '+=0.6' : '+=0.4'
      );

      if (i > 0) {
        tl.to(this.buildupLines[i - 1], {
          opacity: 0.12,
          filter: 'blur(4px)',
          y: -15,
          duration: 1.2,
          ease: 'power2.inOut',
          onStart: () => {
            window.dispatchEvent(new CustomEvent('play-sound', {
              detail: { name: 'monologue-fade' }
            }));
          }
        }, '<+=0.3');
      }
    });

    // Double pulse before transition
    tl.add(() => this._pulseScreenGlow(0.5, 0.35), '+=1.0');
    tl.add(() => this._pulseScreenGlow(0.7, 0.35), '+=0.4');

    tl.to({}, { duration: 1.4 });

    // Fade out monologue
    tl.to(this.buildupLines, {
      opacity: 0,
      y: -40,
      filter: 'blur(20px)',
      duration: 1.4,
      stagger: 0.12,
      ease: 'power3.in',
      onStart: () => {
        window.dispatchEvent(new CustomEvent('play-sound', {
          detail: { name: 'monologue-fade' }
        }));
      },
      onComplete: () => {
        if (this.buildupEl) this.buildupEl.style.display = 'none';
      }
    });
  }

  /**
   * Reveal the golden wax sealed envelope
   */
  _revealEnvelope() {
    if (!this.envelopeWrapper || !this.envelopeBox) return;

    if (this.proposalContainer) {
      this.proposalContainer.classList.remove('in-buildup');
    }

    window.dispatchEvent(new CustomEvent('play-sound', {
      detail: { name: 'proposal-swell' }
    }));

    this.envelopeWrapper.classList.remove('hidden');

    // Intensify vignette for intimacy
    if (this.vignetteEl) {
      gsap.to(this.vignetteEl, {
        opacity: 0.95,
        duration: 2.5,
        ease: 'power2.inOut',
      });
    }

    // Pulse screen glow to draw eye
    this._pulseScreenGlow(0.8, 1.2);

    const tl = gsap.timeline();

    // Envelope rises and fades in
    tl.fromTo(this.envelopeBox,
      { opacity: 0, scale: 0.6, y: 60, rotateX: -45 },
      { opacity: 1, scale: 1, y: 0, rotateX: 0, duration: 2.2, ease: 'power3.out' }
    );

    // Fade in hint text below envelope
    const hintText = this.envelopeWrapper.querySelector('.envelope-tap-hint');
    if (hintText) {
      tl.fromTo(hintText,
        { opacity: 0 },
        { opacity: 1, duration: 1.0 },
        '-=0.8'
      );
    }

    // Listen for click/tap to open
    this.envelopeBox.addEventListener('click', () => this._openEnvelope(), { once: true });
  }

  /**
   * Physical envelope opening animation sequence
   */
  _openEnvelope() {
    if (!this.envelopeBox || !this.letterCard) return;

    window.dispatchEvent(new CustomEvent('play-sound', {
      detail: { name: 'paper-rustle' }
    }));
    window.dispatchEvent(new CustomEvent('play-sound', {
      detail: { name: 'envelope-open' }
    }));

    const hintText = this.envelopeWrapper?.querySelector('.envelope-tap-hint');
    if (hintText) {
      gsap.to(hintText, { opacity: 0, duration: 0.4 });
    }

    const tl = gsap.timeline();

    // 1. Shrink & fade wax seal
    if (this.waxSeal) {
      tl.to(this.waxSeal, {
        scale: 0.4,
        opacity: 0,
        duration: 0.4,
        ease: 'power2.in',
      });
    }

    // 2. Open top flap (CSS class handles 3D flip)
    tl.add(() => {
      this.envelopeBox.classList.add('open');
    }, '+=0.1');

    // 3. Slide letter card out and scale to center stage
    tl.add(() => {
      this.letterCard.classList.add('active');
      this.letterCard.classList.add('monologue-active');

      // Hide the static question text initially
      const questionEl = document.getElementById('proposal-question');
      if (questionEl) {
        questionEl.style.opacity = '0';
        questionEl.style.visibility = 'hidden';
      }

      // Hide the buttons initially so they don't show during the monologue cycle
      const buttonsEl = document.getElementById('proposal-buttons');
      if (buttonsEl) {
        buttonsEl.style.opacity = '0';
        buttonsEl.style.visibility = 'hidden';
        buttonsEl.style.pointerEvents = 'none';
      }

      const cardTl = gsap.timeline();
      cardTl.fromTo(this.letterCard,
        {
          opacity: 0,
          scale: 0.8,
          yPercent: 35,
          rotateX: 25,
        },
        {
          opacity: 1,
          scale: 1,
          yPercent: 0,
          rotateX: 0,
          duration: 1.6,
          ease: 'power3.out',
          onComplete: () => {
            // Buttons are ALWAYS VISIBLE - no hiding/showing logic.
            // Start vapor text cycle purely for visual decoration
            if (this.vaporCanvas) {
              this.vaporEffect = new VaporTextEffect(this.vaporCanvas, {
                texts: [
                  "Kanak Holkar...",
                  "will you be with me...",
                  "for your whole life?"
                ],
                fontFamily: "Caveat, cursive",
                fontSize: window.innerWidth < 600 ? 30 : 44,
                fontWeight: 500,
                alignment: "center",
                vaporizeDuration: 1.0,
                fadeInDuration: 0.7,
                waitDuration: 1.0,
                onFinalText: () => {
                  this._showProposalButtons();
                }
              });
              this.vaporEffect.init();
              this.vaporEffect.start();
            }

            // Fallback safety timer: if buttons are not shown within 18 seconds, force show them
            if (this._buttonSafetyTimer) clearTimeout(this._buttonSafetyTimer);
            this._buttonSafetyTimer = setTimeout(() => {
              this._showProposalButtons();
            }, 18000);
          }
        }
      );

      // Fade envelope box to background
      cardTl.to(this.envelopeBox, {
        opacity: 0.2,
        scale: 0.9,
        y: 40,
        duration: 1.2,
        ease: 'power2.inOut',
      }, '<');

      // Stagger reveal letter contents (Kicker)
      const kicker = this.letterCard.querySelector('.letter-card-kicker');
      cardTl.fromTo(kicker,
        { opacity: 0, y: 20, filter: 'blur(8px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power2.out' },
        '-=0.8'
      );

      this._attachButtonHandlers();
    }, '+=0.5');
  }

  _showProposalButtons() {
    if (this._buttonsShown) return;
    this._buttonsShown = true;

    // Clear safety timer
    if (this._buttonSafetyTimer) clearTimeout(this._buttonSafetyTimer);

    if (this.letterCard) {
      this.letterCard.classList.remove('monologue-active');
    }

    const questionEl = document.getElementById('proposal-question');
    const el = document.getElementById('proposal-buttons');
    const canvasContainer = document.querySelector('.proposal-canvas-container');

    // 1. Put a tiny delay before the whole question text starts fading in to let vapor clear
    setTimeout(() => {
      // Smoothly collapse the canvas container so buttons glide upward to meet the question
      if (canvasContainer) {
        canvasContainer.style.transition = 'height 1.2s ease, margin 1.2s ease, opacity 1.2s ease';
        canvasContainer.style.height = '0px';
        canvasContainer.style.marginBottom = '0px';
        canvasContainer.style.opacity = '0';
      }

      if (!this.answered && questionEl) {
        // Remove accessibility-only inline styles
        questionEl.removeAttribute('style');
        // Add the styled class for the gorgeous calligraphy gradient
        questionEl.classList.add('proposal-question');
        // Set inline transition styles
        questionEl.style.cssText = `
          opacity: 0;
          visibility: hidden;
          transition: opacity 1.2s ease, visibility 1.2s ease;
        `;
        // Force reflow
        void questionEl.offsetWidth;

        questionEl.style.opacity = '1';
        questionEl.style.visibility = 'visible';
      }

      // 2. Buttons appear 1.5 seconds later (after the question text has fully appeared)
      setTimeout(() => {
        if (!this.answered && el) {
          el.style.cssText = `
            display: flex !important;
            visibility: visible !important;
            opacity: 0;
            transform: translateY(15px);
            pointer-events: auto !important;
            position: relative !important;
            z-index: 50 !important;
            transition: opacity 1.0s ease, transform 1.0s ease;
          `;

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              el.style.opacity = '1';
              el.style.transform = 'translateY(0)';
            });
          });
        }
      }, 1500);
    }, 400);
  }

  /**
   * BULLETPROOF method to hide Yes/No buttons.
   */
  _hideProposalButtons() {
    const el = document.getElementById('proposal-buttons');
    if (!el) return;
    el.style.pointerEvents = 'none';
    el.style.opacity = '0';
    el.style.transform = 'translateY(-10px)';
    // After transition, hide fully
    setTimeout(() => {
      el.style.display = 'none';
    }, 500);
  }

  _attachButtonHandlers() {
    if (this.acceptBtn) {
      this.acceptBtn.replaceWith(this.acceptBtn.cloneNode(true));
      this.acceptBtn = document.getElementById('accept-btn');
      this.acceptBtn.addEventListener('click', () => this._onAccept());
    }

    if (this.declineBtn) {
      this.declineBtn.replaceWith(this.declineBtn.cloneNode(true));
      this.declineBtn = document.getElementById('decline-btn');
      this.declineBtn.addEventListener('click', () => this._onDecline());
    }
  }

  _onAccept() {
    if (this.answered) return;

    // Trigger celebration song instantly on click
    window.dispatchEvent(new CustomEvent('play-sound', {
      detail: { name: 'celebration-start' }
    }));

    // Stop heartbeat loop instantly on click
    window.dispatchEvent(new CustomEvent('play-sound', {
      detail: { name: 'heartbeat-stop' }
    }));

    // Clear safety timer
    if (this._buttonSafetyTimer) clearTimeout(this._buttonSafetyTimer);

    // 1. Hide buttons immediately
    this._hideProposalButtons();

    // 2. Hide static question to make way for vaporize effect
    const questionEl = document.getElementById('proposal-question');
    if (questionEl) {
      questionEl.style.opacity = '0';
      setTimeout(() => questionEl.style.display = 'none', 800);
    }

    // 3. Instantly restore canvas container size WITHOUT transition so the vapor text can draw immediately
    const canvasContainer = document.querySelector('.proposal-canvas-container');
    if (canvasContainer) {
      canvasContainer.style.transition = 'none';
      canvasContainer.style.height = window.innerWidth < 768 ? '90px' : '120px';
      canvasContainer.style.marginBottom = '1.2rem';
      canvasContainer.style.opacity = '1';
    }

    if (this.vaporEffect) {
      const yesText = this.data.yesText || "Yes. With all my heart.";
      // Tiny delay to ensure DOM updates before canvas resize() measures it
      setTimeout(() => {
        this.vaporEffect.vaporizeResponse(yesText, () => {
          this._onAcceptActual();
        });
      }, 50);
    } else {
      this._onAcceptActual();
    }
  }

  async _onAcceptActual() {
    this.answered = true;

    // Massive screen glow flash
    this._pulseScreenGlow(1.0, 2.0);

    // Breathtaking fade out of the card
    gsap.to(this.letterCard, {
      opacity: 0,
      scale: 0.92,
      yPercent: -15,
      filter: 'blur(10px)',
      duration: 1.0,
      ease: 'power2.in',
      onComplete: () => {
        this.letterCard?.classList.remove('active');
        this.envelopeWrapper?.classList.add('hidden');
      }
    });

    // Pause for emotional pacing
    const celebDelay = gsap.timeline();
    celebDelay.to({}, { duration: 0.8 });

    // Show celebration with breathtaking reveal
    celebDelay.add(() => {
      if (this.celebrationEl) {
        this.celebrationEl.classList.remove('hidden');

        const celebTl = gsap.timeline();

        const title = this.celebrationEl.querySelector('.celebration-title');
        if (title) {
          celebTl.fromTo(title,
            { opacity: 0, scale: 0.5, filter: 'blur(20px)', y: 35 },
            { opacity: 1, scale: 1, filter: 'blur(0px)', y: 0, duration: 2.0, ease: 'elastic.out(1, 0.45)' }
          );
        }

        const textEls = this.celebrationEl.querySelectorAll('.celebration-text, .celebration-promise, .celebration-sub');
        if (textEls.length) {
          celebTl.fromTo(textEls,
            { opacity: 0, y: 25, filter: 'blur(8px)' },
            { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, stagger: 0.4, ease: 'power2.out' },
            '-=1.0'
          );
        }
      }
    });

    // Trigger celebration effects (WebGL portals)
    this.onCelebrationCb();

    // Confetti & heart rain
    this._fireConfetti();
    this._createHeartRain();

    // Sound
    window.dispatchEvent(new CustomEvent('play-sound', {
      detail: { name: 'celebration' }
    }));

    // Add golden glow class to body
    document.body.classList.add('celebration-active');

    // Soften vignette for glowing background
    if (this.vignetteEl) {
      gsap.to(this.vignetteEl, {
        opacity: 0.35,
        duration: 2.5,
        ease: 'power2.out',
      });
    }
  }

  _onDecline() {
    if (this.answered) return;

    // Stop heartbeat loop instantly on click
    window.dispatchEvent(new CustomEvent('play-sound', {
      detail: { name: 'heartbeat-stop' }
    }));

    // Clear safety timer
    if (this._buttonSafetyTimer) clearTimeout(this._buttonSafetyTimer);

    // 1. Hide buttons immediately
    this._hideProposalButtons();

    // 2. Play decline response text and vaporize it, then show gentle decline
    if (this.vaporEffect) {
      const noText = this.data.noText || "I need a moment.";
      this.vaporEffect.vaporizeResponse(noText, () => {
        this._onDeclineActual();
      });
    } else {
      this._onDeclineActual();
    }
  }

  _onDeclineActual() {
    this.answered = true;

    // Fade out letter card
    gsap.to(this.letterCard, {
      opacity: 0,
      scale: 0.92,
      filter: 'blur(10px)',
      duration: 0.8,
      onComplete: () => {
        this.letterCard?.classList.remove('active');
        this.envelopeWrapper?.classList.add('hidden');
      }
    });

    // Stagger reveal gentle decline panel
    if (this.declineEl) {
      this.declineEl.classList.remove('hidden');

      const decTl = gsap.timeline({ delay: 0.5 });

      const h2 = this.declineEl.querySelector('h2');
      if (h2) {
        decTl.fromTo(h2,
          { opacity: 0, y: 25, filter: 'blur(10px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'power2.out' }
        );
      }

      const texts = this.declineEl.querySelectorAll('.decline-message, .decline-promise');
      if (texts.length) {
        decTl.fromTo(texts,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 1.0, stagger: 0.3, ease: 'power2.out' },
          '-=0.5'
        );
      }

      if (this.reconsiderBtn) {
        decTl.fromTo(this.reconsiderBtn,
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' },
          '-=0.3'
        );
      }
    }

    this.onDeclineCb();

    if (this._screenGlowEl) {
      this._screenGlowEl.style.background =
        'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(62, 193, 176, 0.06) 0%, transparent 70%)';
    }

    // Attach handler to reconsideration button
    if (this.reconsiderBtn) {
      this.reconsiderBtn.replaceWith(this.reconsiderBtn.cloneNode(true));
      this.reconsiderBtn = document.getElementById('reconsider-btn');

      this.reconsiderBtn.addEventListener('click', () => {
        this.onReconsiderCb();
        window.scrollTo({ top: 0, behavior: 'smooth' });

        setTimeout(() => {
          this.hasProposed = false;
          this.answered = false;
          this.declineAttempts = 0;
          this._buttonsShown = false;
          if (this._buttonSafetyTimer) {
            clearTimeout(this._buttonSafetyTimer);
            this._buttonSafetyTimer = null;
          }

          // Reset canvas container size so it displays again
          const canvasContainer = document.querySelector('.proposal-canvas-container');
          if (canvasContainer) {
            canvasContainer.style.transition = 'none';
            canvasContainer.style.height = '';
            canvasContainer.style.marginBottom = '';
            canvasContainer.style.opacity = '';
          }

          // Reset monologue
          if (this.buildupEl) {
            this.buildupEl.style.display = '';
            this.buildupLines.forEach(line => {
              gsap.set(line, { opacity: 0, y: 45, filter: 'blur(15px)' });
              line.classList.remove('active');
            });
          }

          // Reset envelope and card
          this.envelopeBox?.classList.remove('open');
          if (this.waxSeal) {
            gsap.set(this.waxSeal, { scale: 1, opacity: 1 });
          }
          if (this.letterCard) {
            this.letterCard.classList.remove('active');
            this.letterCard.classList.remove('monologue-active');
            gsap.set(this.letterCard, { opacity: 0, scale: 0.85, yPercent: 0, rotateX: 15 });
          }
          if (this.envelopeBox) {
            gsap.set(this.envelopeBox, { opacity: 1, scale: 1, y: 0, rotateX: 0 });
          }
          if (this.vaporEffect) {
            this.vaporEffect.stop();
            this.vaporEffect = null;
          }

          this.envelopeWrapper?.classList.add('hidden');
          this.declineEl?.classList.add('hidden');
          document.body.classList.remove('proposal-active');

          // Reset screen glow
          if (this._screenGlowEl) {
            this._screenGlowEl.style.background =
              'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255, 150, 75, 0.12) 0%, transparent 70%)';
            gsap.set(this._screenGlowEl, { opacity: 0 });
          }

          // Reset vignette
          if (this.vignetteEl) {
            gsap.set(this.vignetteEl, { opacity: 0.8 });
          }
        }, 1500);
      });
    }
  }

  async _fireConfetti() {
    try {
      const { default: confetti } = await import('canvas-confetti');
      const duration = 8000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 65,
          origin: { x: 0, y: 0.6 },
          colors: ['#ffd25a', '#ffd25a', '#f4b8c1', '#e8839e', '#fef5ef'],
          scalar: 1.2,
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 65,
          origin: { x: 1, y: 0.6 },
          colors: ['#ffd25a', '#ffd25a', '#f4b8c1', '#e8839e', '#fef5ef'],
          scalar: 1.2,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    } catch (e) {
      console.warn('Confetti failed to load:', e);
    }
  }

  _createHeartRain() {
    const rain = document.querySelector('.heart-rain');
    if (!rain) return;

    const hearts = ['♥', '♡', '❤', '💕', '✦'];

    // Clear out any old hearts
    rain.innerHTML = '';

    for (let i = 0; i < 45; i++) {
      const el = document.createElement('span');
      el.className = 'falling-heart';
      el.style.left = `${Math.random() * 100}%`;
      el.style.animationDelay = `${Math.random() * 5.5}s`;
      el.style.animationDuration = `${3.5 + Math.random() * 4.5}s`;
      el.style.opacity = `${0.35 + Math.random() * 0.55}`;
      el.style.setProperty('--heart-char', `'${hearts[Math.floor(Math.random() * hearts.length)]}'`);
      el.style.fontSize = `${0.85 + Math.random() * 1.3}rem`;
      rain.appendChild(el);
    }
  }

  _createFallingLeaves() {
    const container = document.getElementById('proposal-leaves-container');
    if (!container) return;

    container.innerHTML = '';

    const colors = [
      'linear-gradient(135deg, #ffb3c1 0%, #ff8ca3 100%)', // soft pink
      'linear-gradient(135deg, #ffa6c9 0%, #f472b6 100%)', // rose pink
      'linear-gradient(135deg, #ffd3e2 0%, #ffb3c1 100%)', // blush pink
      'linear-gradient(135deg, #fbcfe8 0%, #f472b6 100%)', // light magenta
      'linear-gradient(135deg, #ffe4e6 0%, #fda4af 100%)'  // rosebud pink
    ];

    for (let i = 0; i < 45; i++) {
      const leaf = document.createElement('div');
      leaf.className = 'falling-leaf';

      const width = 12 + Math.random() * 12;
      const height = width * 0.6;
      const left = Math.random() * 100;
      const delay = Math.random() * 8;
      const duration = 6 + Math.random() * 7;
      const sway = -100 + Math.random() * 200;
      const rotation = 180 + Math.random() * 360;
      const opacity = 0.45 + Math.random() * 0.45;
      const color = colors[Math.floor(Math.random() * colors.length)];

      leaf.style.left = `${left}%`;
      leaf.style.background = color;
      leaf.style.animationDelay = `${delay}s`;
      leaf.style.animationDuration = `${duration}s`;

      leaf.style.setProperty('--leaf-width', `${width}px`);
      leaf.style.setProperty('--leaf-height', `${height}px`);
      leaf.style.setProperty('--leaf-sway', `${sway}px`);
      leaf.style.setProperty('--leaf-rotation', `${rotation}deg`);
      leaf.style.setProperty('--leaf-opacity', opacity);

      container.appendChild(leaf);
    }
  }
}
