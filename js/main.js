/**
 * main.js — Master orchestrator for the Cinematic Love Letter Experience v3.0
 * 
 * Coordinates all subsystems:
 * - Scene Engine (scroll-driven scene management)
 * - 3D background (particles, hearts, atmosphere)
 * - Heart Scene (Scene 2)
 * - Story Scene (Scene 3)
 * - Poem Scene (Scene 4)
 * - Cylinder Gallery (Scene 5)
 * - Proposal Controller (Final Scene)
 * - Companion Bot (floating chat)
 * - Audio Engine (generative + reactive audio)
 * - Cinema Engine (scroll animations)
 * - Envelope Entry (3D wax seal)
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ContentLoader } from './content-loader.js';
import { EnvelopeScene } from './envelope-scene.js';
import { ThreeScene } from './three-scene.js';
import { HeartScene } from './heart-scene.js';
import { StoryScene } from './story-scene.js';
import { PoemScene } from './poem-scene.js';
import { TunnelGallery } from './tunnel-gallery.js';
import { AudioEngine } from './audio-engine.js';
import { ProposalController } from './proposal.js';
import { CompanionBot } from './companion-bot.js';
import { MusicPlayer } from './music-player.js';
import { getGPUTier, isMobile } from './utils.js';
import { MouseTubes } from './mouse-tubes.js';

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════
   Global state
   ═══════════════════════════════════════════════════════════════ */
let contentLoader, envelopeScene, threeScene, heartScene;
let storyScene, poemScene, tunnelGallery;
let audioEngine, proposalController, companionBot, musicPlayer;
let currentPhase = 'mind';
let mouseTubes;

const PHASES = [
  { id: 'mind', label: 'Mind', selector: '#scene-mind' },
  { id: 'heart', label: 'Heart', selector: '#scene-heart' },
  { id: 'story', label: 'Story', selector: '#scene-story' },
  { id: 'poem', label: 'Letter', selector: '#scene-poem' },
  { id: 'mirror', label: 'Mirror', selector: '#scene-mirror' },
  { id: 'memories', label: 'Memories', selector: '#scene-memories' },
  { id: 'song', label: 'Sound', selector: '#scene-song' },
  { id: 'forever', label: 'Forever', selector: '#scene-proposal' },
];

/* ═══════════════════════════════════════════════════════════════
   Scroll progress handler — drives all visual systems
   ═══════════════════════════════════════════════════════════════ */
function onScrollProgress(progress) {
  // Update 3D background
  if (threeScene) threeScene.updateScroll(progress);

  // Update audio filtering based on scroll position
  if (audioEngine) {
    if (!tunnelGallery || !tunnelGallery.isZoomed) {
      audioEngine.updateScrollPosition(progress);
    }
  }

  // Update progress bar
  const bar = document.getElementById('progress-bar');
  if (bar) bar.style.transform = `scaleX(${progress})`;

  // Resolve the active chapter from the viewport, not brittle global percentages.
  const focusY = window.innerHeight * 0.46;
  const activePhase = PHASES.reduce((closest, phase) => {
    const element = document.querySelector(phase.selector);
    if (!element) return closest;
    const rect = element.getBoundingClientRect();
    const distance = rect.top <= focusY && rect.bottom >= focusY
      ? 0
      : Math.min(Math.abs(rect.top - focusY), Math.abs(rect.bottom - focusY));
    return distance < closest.distance ? { ...phase, distance } : closest;
  }, { id: 'mind', label: 'Mind', distance: Infinity });
  const newPhase = activePhase.id;
  if (newPhase !== currentPhase) {
    currentPhase = newPhase;
    updatePhaseUI(newPhase);
    if (companionBot) companionBot.setCurrentScene(newPhase);
    if (musicPlayer) musicPlayer.onPhaseChange(newPhase);

    window.dispatchEvent(new CustomEvent('phase-change', {
      detail: { phase: newPhase }
    }));
  }

  // Update scroll percentage display
  const pctEl = document.getElementById('at-scroll-pct');
  if (pctEl) pctEl.textContent = `/${Math.round(progress * 100)}/`;
}

function updatePhaseUI(phase) {
  const label = document.getElementById('at-phase-label');
  const phaseIndex = PHASES.findIndex(item => item.id === phase);
  if (label) label.textContent = PHASES[phaseIndex]?.label || phase;

  const indexEl = document.getElementById('at-chapter-index');
  if (indexEl) {
    indexEl.textContent = `${String(phaseIndex + 1).padStart(2, '0')} / ${String(PHASES.length).padStart(2, '0')}`;
  }

  PHASES.forEach(item => document.body.classList.remove(`phase-${item.id}`));
  document.body.classList.add(`phase-${phase}`);

  // Update active pill
  document.querySelectorAll('.at-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.phase === phase);
  });
}

/* ═══════════════════════════════════════════════════════════════
   Scene-specific scroll triggers
   ═══════════════════════════════════════════════════════════════ */
function initSceneScrollTriggers() {
  // Scene: Mind — animate intro text
  const mindLines = document.querySelectorAll('.mind-line');
  mindLines.forEach((line, i) => {
    gsap.set(line, { opacity: 0, y: 40, filter: 'blur(12px)' });
  });

  document.querySelectorAll('.heart-line').forEach(line => {
    gsap.set(line, { opacity: 0, y: 30, filter: 'blur(10px)' });
  });

  ScrollTrigger.create({
    trigger: '#scene-mind',
    start: 'top center',
    end: 'bottom center',
    onUpdate: (self) => {
      const p = self.progress;
      mindLines.forEach((line, i) => {
        const threshold = 0.1 + i * 0.25;
        if (p > threshold) {
          gsap.to(line, {
            opacity: 1, y: 0, filter: 'blur(0px)',
            duration: 1.2, ease: 'power2.out', overwrite: true
          });
        }
      });
    }
  });

  // Scene: Heart — drive heart scene progress
  ScrollTrigger.create({
    trigger: '#scene-heart',
    start: 'top center',
    end: 'bottom center',
    onUpdate: (self) => {
      if (heartScene) {
        heartScene.onProgress(self.progress);
        heartScene.setVisible(true);
      }
      // Animate heart text
      const lines = document.querySelectorAll('.heart-line');
      lines.forEach((line, i) => {
        const threshold = 0.2 + i * 0.3;
        if (self.progress > threshold) {
          gsap.to(line, {
            opacity: 1, y: 0, filter: 'blur(0px)',
            duration: 1.0, ease: 'power2.out', overwrite: true
          });
        }
      });
    },
    onEnter: () => {
      if (heartScene) heartScene.setVisible(true);
    },
    onLeave: () => {
      if (heartScene) heartScene.setVisible(false);
    },
    onLeaveBack: () => {
      if (heartScene) heartScene.setVisible(false);
    }
  });

  // Scene: Story — drive milestone reveals
  ScrollTrigger.create({
    trigger: '#scene-story',
    start: 'top center',
    end: 'bottom center',
    onUpdate: (self) => {
      if (storyScene) storyScene.onProgress(self.progress);
    },
    onEnter: () => { if (storyScene) storyScene.onEnter(); },
    onLeave: () => { if (storyScene) storyScene.onLeave(); },
  });

  // Scene: Poem — drive line-by-line reveals
  ScrollTrigger.create({
    trigger: '#scene-poem',
    start: 'top center',
    end: 'bottom center',
    onUpdate: (self) => {
      if (poemScene) poemScene.onProgress(self.progress);
    },
    onEnter: () => { if (poemScene) poemScene.onEnter(); },
    onLeave: () => { if (poemScene) poemScene.onLeave(); },
  });

  // Scene: Mirror (Envenomed) — scroll-driven line reveals
  const mirrorLines = document.querySelectorAll('#scene-mirror .ev-line');
  ScrollTrigger.create({
    trigger: '#scene-mirror',
    start: 'top center',
    end: 'bottom center',
    onUpdate: (self) => {
      const p = self.progress;
      mirrorLines.forEach((line, i) => {
        const threshold = 0.02 + (i / mirrorLines.length) * 0.85;
        if (p >= threshold) {
          line.classList.add('ev-visible');
        }
      });
    },
    onLeaveBack: () => {
      mirrorLines.forEach(line => line.classList.remove('ev-visible'));
    },
  });

  // Scene: Song — animate waveform bars
  ScrollTrigger.create({
    trigger: '#scene-song',
    start: 'top center',
    end: 'bottom center',
    onEnter: () => {
      document.querySelectorAll('.waveform-bar').forEach((bar, i) => {
        gsap.to(bar, {
          scaleY: 0.3 + Math.random() * 0.7,
          duration: 0.4 + Math.random() * 0.3,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.08,
        });
      });
      // Clear audio filter
      if (audioEngine) {
        audioEngine.setFocusedState(false);
      }
    },
    onLeave: () => {
      document.querySelectorAll('.waveform-bar').forEach(bar => {
        gsap.killTweensOf(bar);
        gsap.to(bar, { scaleY: 0.15, duration: 0.5 });
      });
    }
  });

  // Scene: Proposal — drive the climax
  ScrollTrigger.create({
    trigger: '#scene-proposal',
    start: 'top center',
    end: 'bottom center',
    onUpdate: (self) => {
      if (proposalController) proposalController.onProgress(self.progress);
    },
    onEnter: () => {
      document.body.classList.add('proposal-approaching');
    }
  });

  // General section visibility tracking
  document.querySelectorAll('.scene').forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 72%',
      end: 'bottom 28%',
      toggleClass: { targets: section, className: 'scene-active' },
    });
  });
}

function playOpeningCopy() {
  document.getElementById('scene-mind')?.classList.add('scene-active');

  const lines = gsap.utils.toArray('.mind-line');
  const kicker = document.querySelector('#scene-mind .scene-kicker');
  const whisper = document.querySelector('#scene-mind .scene-whisper');
  const scrollCue = document.querySelector('#scene-mind .scroll-indicator');

  gsap.timeline({ delay: 0.35 })
    .fromTo(kicker, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' })
    .to(lines, {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 1.25,
      stagger: 0.28,
      ease: 'power3.out',
      overwrite: true,
    }, '-=0.25')
    .fromTo([whisper, scrollCue], { opacity: 0 }, { opacity: 1, duration: 0.9, stagger: 0.18 }, '-=0.35');
}

/* ═══════════════════════════════════════════════════════════════
   Global scroll progress tracker
   ═══════════════════════════════════════════════════════════════ */
function initGlobalScroll() {
  ScrollTrigger.create({
    trigger: '#smooth-content',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => onScrollProgress(self.progress),
  });
}

/* ═══════════════════════════════════════════════════════════════
   Envelope open → start the experience
   ═══════════════════════════════════════════════════════════════ */
function onEnvelopeOpen() {
  document.body.classList.add('experience-started');
  updatePhaseUI('mind');

  // Show chrome navigation
  const chrome = document.getElementById('at-chrome');
  if (chrome) {
    chrome.classList.remove('hidden');
    gsap.fromTo(chrome, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.5 });
  }

  // Show music player
  const player = document.getElementById('at-music-player');
  if (player) {
    musicPlayer?.show();
    gsap.fromTo(player, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.8 });
  }

  // Initialize audio
  if (audioEngine) {
    audioEngine.init().then(async () => {
      audioEngine.playSFX('wax-seal-crack');
      const tracks = contentLoader?.data?.audio?.tracks;
      if (musicPlayer) await musicPlayer.playIndex(0);
      else if (tracks?.length) await audioEngine.playTrack(tracks[0]);
    });
  }

  // Initialize scene scroll triggers
  initSceneScrollTriggers();
  initGlobalScroll();
  playOpeningCopy();

  // Initialize proposal controller
  proposalController = new ProposalController({
    onCelebration: () => { if (audioEngine) audioEngine.triggerCelebration(); },
    onDecline: () => { if (audioEngine) audioEngine.triggerSadMoment(); }
  });
  proposalController.init(contentLoader?.data);

  // Initialize companion bot
  companionBot = new CompanionBot({
    containerEl: document.getElementById('companion-bot-root') || document.body,
  });
  companionBot.init();

  // Pill nav click handlers
  document.querySelectorAll('.at-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const phase = pill.dataset.phase;
      const sceneEl = document.querySelector(`[data-scene="${phase}"]`);
      if (sceneEl) {
        sceneEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Gallery event handlers
  setupGalleryEvents();

  // Sound event handler
  window.addEventListener('play-sound', (e) => {
    if (audioEngine && e.detail) {
      if (e.detail.name === 'proposal-swell') audioEngine.playSFX('track-change');
      else if (e.detail.name === 'celebration') return;
      else audioEngine.playSFX(e.detail.name);
    }
  });
}

/* ═══════════════════════════════════════════════════════════════
   Gallery event setup
   ═══════════════════════════════════════════════════════════════ */
function setupGalleryEvents() {
  window.addEventListener('gallery-dive-in', (e) => {
    if (audioEngine) {
      audioEngine.setFocusedState(true);
    }

    // Animate background stardust vortex warp
    if (threeScene && threeScene.particleUniforms) {
      gsap.to(threeScene.particleUniforms.uPortalDiveProgress, {
        value: 1.0,
        duration: 1.5,
        ease: 'power2.inOut',
        overwrite: 'auto'
      });
    }

    const overlay = document.getElementById('gallery-detail-overlay');
    if (overlay && e.detail) {
      const emojiEl = document.getElementById('detail-emoji');
      const captionEl = document.getElementById('detail-caption');
      const dateEl = document.getElementById('detail-date');
      const storyEl = document.getElementById('detail-story');
      const imgEl = document.getElementById('detail-image');
      const videoEl = document.getElementById('detail-video');

      if (emojiEl) emojiEl.textContent = e.detail.emoji || '💖';
      if (captionEl) captionEl.textContent = e.detail.caption || '';
      if (dateEl) dateEl.textContent = e.detail.date || '';
      if (storyEl) storyEl.textContent = e.detail.story || '';

      if (videoEl) {
        if (e.detail.videoSrc) {
          videoEl.src = e.detail.videoSrc;
          videoEl.hidden = false;
          videoEl.play().catch(() => {});
          if (imgEl) imgEl.hidden = true;
        } else {
          videoEl.pause();
          videoEl.removeAttribute('src');
          videoEl.hidden = true;
        }
      }

      if (imgEl && !e.detail.videoSrc) {
        if (e.detail.previewUrl) {
          imgEl.src = e.detail.previewUrl;
          imgEl.hidden = false;
        } else {
          imgEl.removeAttribute('src');
          imgEl.hidden = true;
        }
      }

      overlay.classList.remove('hidden');
      overlay.classList.add('active');
      overlay.setAttribute('aria-hidden', 'false');
    }
  });

  window.addEventListener('gallery-dive-out', () => {
    if (audioEngine) audioEngine.setFocusedState(false);

    // Revert background stardust vortex warp
    if (threeScene && threeScene.particleUniforms) {
      gsap.to(threeScene.particleUniforms.uPortalDiveProgress, {
        value: 0.0,
        duration: 1.2,
        ease: 'power2.inOut',
        overwrite: 'auto'
      });
    }

    const overlay = document.getElementById('gallery-detail-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
    }
  });

  // Detail overlay close
  const detailCloseBtn = document.getElementById('detail-close-btn');
  if (detailCloseBtn) {
    detailCloseBtn.addEventListener('click', () => {
      if (tunnelGallery) tunnelGallery.comeOutside();
    });
  }

  const detailOverlay = document.getElementById('gallery-detail-overlay');
  if (detailOverlay) {
    detailOverlay.addEventListener('click', (e) => {
      if (e.target === detailOverlay && tunnelGallery) tunnelGallery.comeOutside();
    });
  }
}

/* ═══════════════════════════════════════════════════════════════
   Custom cursor
   ═══════════════════════════════════════════════════════════════ */
function initGlobalCursor() {
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  const trails = document.querySelectorAll('.cursor-trail');
  if (!dot || !ring || window.matchMedia('(hover: none)').matches) return;

  const mouse = { x: -100, y: -100 };
  const dotPos = { x: -100, y: -100 };
  const ringPos = { x: -100, y: -100 };
  const trailPositions = Array.from(trails).map(() => ({ x: -100, y: -100 }));

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  gsap.ticker.add(() => {
    dotPos.x += (mouse.x - dotPos.x) * 0.25;
    dotPos.y += (mouse.y - dotPos.y) * 0.25;
    dot.style.left = `${dotPos.x}px`;
    dot.style.top = `${dotPos.y}px`;

    ringPos.x += (mouse.x - ringPos.x) * 0.12;
    ringPos.y += (mouse.y - ringPos.y) * 0.12;
    ring.style.left = `${ringPos.x}px`;
    ring.style.top = `${ringPos.y}px`;

    trails.forEach((trail, i) => {
      const prev = i === 0 ? dotPos : trailPositions[i - 1];
      const lerpFactor = 0.2 - i * 0.02;
      trailPositions[i].x += (prev.x - trailPositions[i].x) * lerpFactor;
      trailPositions[i].y += (prev.y - trailPositions[i].y) * lerpFactor;
      trail.style.left = `${trailPositions[i].x}px`;
      trail.style.top = `${trailPositions[i].y}px`;
      trail.style.opacity = `${0.3 - i * 0.035}`;
      trail.style.transform = `translate(-50%, -50%) scale(${1 - i * 0.08})`;
    });
  });

  document.body.addEventListener('mouseover', (e) => {
    if (e.target.closest('.interactive, button, a, .gallery-item, #envelope-canvas, #cylinder-gallery-canvas, .cb-toggle, .cb-send')) {
      document.body.classList.add('cursor-hover');
    }
  });

  document.body.addEventListener('mouseout', (e) => {
    if (e.target.closest('.interactive, button, a, .gallery-item, #envelope-canvas, #cylinder-gallery-canvas, .cb-toggle, .cb-send')) {
      if (!e.relatedTarget || !e.relatedTarget.closest('.interactive, button, a, .gallery-item, #envelope-canvas, #cylinder-gallery-canvas, .cb-toggle, .cb-send')) {
        document.body.classList.remove('cursor-hover');
      }
    }
  });
}

/* ═══════════════════════════════════════════════════════════════
   Bootstrap — main entry point
   ═══════════════════════════════════════════════════════════════ */
async function bootstrap() {
  initGlobalCursor();

  // Init cursor particle trails (ActiveTheory-style dripping from edges)
  const tubesCanvas = document.getElementById('tubes-canvas');
  if (tubesCanvas) {
    mouseTubes = new MouseTubes(tubesCanvas);
    mouseTubes.bind();
  }

  // Boot loader
  const loaderRoot = document.getElementById('at-loader');
  const atLoader = new (await import('./at-loader.js')).ATLoader(loaderRoot);
  atLoader.start();

  // Load content
  contentLoader = new ContentLoader();
  atLoader.bump(15);
  const data = await contentLoader.load();
  if (data) contentLoader.applyDOM();
  atLoader.bump(20);

  // Init audio engine (lazy — waits for user interaction)
  audioEngine = new AudioEngine();
  musicPlayer = new MusicPlayer(audioEngine, data?.audio?.tracks);
  atLoader.bump(5);

  // Init 3D background scene
  const gpuTier = getGPUTier();
  const quality = isMobile() ? 'low' : gpuTier;
  const canvas = document.getElementById('three-canvas');

  if (canvas) {
    try {
      threeScene = new ThreeScene(canvas);
      threeScene.setQuality(quality);
      threeScene.setGalleryItems(data?.gallery?.items || []);
      threeScene.init();
      atLoader.bump(15);

      // Mouse parallax for 3D scene
      window.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -(e.clientY / window.innerHeight) * 2 + 1;
        threeScene.onMouseMove(x, y);
      });

      // Build heart scene into the 3D world
      heartScene = new HeartScene({ quality });
      heartScene.build(threeScene.scene, threeScene.camera);
      // Position heart scene lower in the 3D space
      heartScene.group.position.set(0, -5, -2);
      atLoader.bump(10);
    } catch (err) {
      console.error("WebGL Setup failed, falling back to 2D UI:", err);
      if (!threeScene) {
        threeScene = {
          fallback: true,
          isFallback() { return true; },
          updateScroll() {},
          onMouseMove() {},
          onResize() {},
          toggleHelixZoom() {},
          zoomedMesh: null,
          particleUniforms: null,
          destroy() {}
        };
      } else {
        threeScene.fallback = true;
      }

      heartScene = {
        onProgress() {},
        setVisible() {},
        update() {},
        dispose() {}
      };

      try {
        canvas.style.display = 'none';
      } catch (_) {}

      // Show fallback CSS grid gallery
      const galleryGrid = document.getElementById('gallery-grid');
      if (galleryGrid) {
        galleryGrid.style.display = 'grid';
      }
      const cylContainer = document.getElementById('cylinder-gallery-container');
      if (cylContainer) {
        cylContainer.style.display = 'none';
      }

      // Bump loader so it doesn't freeze at 48%
      atLoader.bump(25);
    }
  }

  // Init story scene
  storyScene = new StoryScene();
  storyScene.init();
  atLoader.bump(5);

  // Init poem scene
  poemScene = new PoemScene();
  poemScene.init(data?.poem?.lines || []);
  atLoader.bump(5);

  const galleryContainer = document.getElementById('cylinder-gallery-container');
  if (galleryContainer && data?.gallery?.items?.length) {
    tunnelGallery = new TunnelGallery(galleryContainer, data.gallery.items);
    tunnelGallery.init();
    atLoader.bump(15);
  } else {
    atLoader.bump(15);
  }

  // Complete loading
  atLoader.setProgress(100);
  await atLoader.finish();

  // Start envelope entry experience
  const envContainer = document.getElementById('envelope-container');
  if (envContainer) {
    envelopeScene = new EnvelopeScene(envContainer, { onOpenComplete: onEnvelopeOpen });
    envelopeScene.init();
    gsap.fromTo(envContainer, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.out' });

    document.getElementById('open-letter-btn')?.addEventListener('click', (event) => {
      event.stopPropagation();
      envelopeScene.openEnvelope();
    });
  }

  // Handle resize
  window.addEventListener('resize', () => {
    const tier = isMobile() ? 'low' : getGPUTier();
    if (threeScene) {
      threeScene.setQuality(tier);
      threeScene.onResize();
    }
    if (tunnelGallery) {
      tunnelGallery.onResize();
    }
    ScrollTrigger.refresh();
  });

  // Handle mute button
  const muteBtn = document.getElementById('mute-btn');
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      if (!audioEngine) return;
      const state = !audioEngine.isMuted();
      audioEngine.setMuted(state);
      muteBtn.textContent = state ? 'Muted' : 'Audio';
      muteBtn.classList.toggle('is-muted', state);
    });
  }

  // ESC key handling
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tunnelGallery?.isZoomed) {
      tunnelGallery.comeOutside();
    }
  });

  // Update heart scene in the 3D animation loop
  if (threeScene && heartScene) {
    const originalAnimate = threeScene.animate?.bind(threeScene);
    const clock = { elapsed: 0, lastTime: performance.now() };

    const enhancedTick = () => {
      const now = performance.now();
      const delta = (now - clock.lastTime) / 1000;
      clock.lastTime = now;
      clock.elapsed += delta;

      heartScene.update(clock.elapsed, 0, delta);
    };

    gsap.ticker.add(enhancedTick);
  }
}

/* ═══════════════════════════════════════════════════════════════
   Start
   ═══════════════════════════════════════════════════════════════ */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
