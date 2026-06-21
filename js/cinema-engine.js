/**
 * CinemaEngine — Lenis smooth scroll + GSAP ScrollTrigger cinematic transitions.
 * Each section has a unique dramatic entrance animation.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import SplitType from 'split-type';

gsap.registerPlugin(ScrollTrigger);

export class CinemaEngine {
  constructor({ onScrollProgress } = {}) {
    this.onScrollProgress = onScrollProgress ?? null;
    this.lenis = null;
    this.scrollProgress = 0;
  }

  init() {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      this.initReducedMotion();
      return;
    }

    // Lenis smooth scroll
    this.lenis = new Lenis({
      duration: 1.85,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.75,
      infinite: false
    });

    document.documentElement.style.scrollSnapType = 'y proximity';
    document.querySelectorAll('.section').forEach((s) => {
      s.style.scrollSnapAlign = 'start';
    });

    gsap.ticker.add((time) => { this.lenis.raf(time * 1000); });
    this.lenis.on('scroll', ScrollTrigger.update);
    ScrollTrigger.clearScrollMemory();
    window.scrollTo(0, 0);

    // Section animations
    this.initHero();
    this.initPoem();
    this.initStoryHorizontal();
    this.initGallery();
    this.initSectionAtmosphere();
    this.initMasterProgress();
  }

  initReducedMotion() {
    gsap.set(['.hero-title span', '.hero-subtitle', '.scroll-indicator', '.poem-line', '.story-block', '.gallery-item'], { opacity: 1, x: 0, y: 0, scale: 1 });
    this.initMasterProgress();
  }

  // ACT I: Hero — Characters fly in dramatically
  initHero() {
    const heroTitle = document.querySelector('.hero-title');
    if (!heroTitle) return;

    const split = new SplitType(heroTitle, { types: 'chars,words' });
    gsap.set(split.chars, { opacity: 0, y: 100, rotateX: -45, scale: 0.5 });
    gsap.set('.hero-subtitle', { opacity: 0, y: 30, filter: 'blur(10px)' });
    gsap.set('.scroll-indicator', { opacity: 0 });

    const tl = gsap.timeline({ delay: 0.8 });
    tl.to(split.chars, {
      opacity: 1, y: 0, rotateX: 0, scale: 1,
      duration: 1.4, ease: 'back.out(1.7)', stagger: 0.06
    });
    tl.to('.hero-subtitle', {
      opacity: 0.85, y: 0, filter: 'blur(0px)',
      duration: 1.2, ease: 'power3.out'
    }, '-=0.8');
    tl.to('.scroll-indicator', {
      opacity: 1, duration: 1.0, ease: 'power2.out'
    }, '-=0.4');
  }

  // ACT II: Poem — Ink bleed reveal, chars appear with blur→clear
  initPoem() {
    const lines = gsap.utils.toArray('.poem-line');
    if (!lines.length) return;

    lines.forEach((line) => {
      const splitLine = new SplitType(line, { types: 'chars' });
      gsap.set(splitLine.chars, { opacity: 0, filter: 'blur(12px)', y: 5 });

      ScrollTrigger.create({
        trigger: line,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          // Play chime on first poem line
          if (line === lines[0]) {
            window.dispatchEvent(new CustomEvent('play-sound', { detail: { name: 'section-chime' } }));
          }
          gsap.to(splitLine.chars, {
            opacity: 1, filter: 'blur(0px)', y: 0,
            duration: 0.9, ease: 'sine.out',
            stagger: { each: 0.04, from: 'start' },
            onComplete: () => {
              if (line.classList.contains('poem-signature')) {
                gsap.to(line, { textShadow: '0 0 20px rgba(255, 140, 163, 0.6)', duration: 2.0 });
              }
            }
          });
        }
      });
    });
  }

  // ACT III: Horizontal pinned story timeline
  initStoryHorizontal() {
    const container = document.querySelector('.story-horizontal-container');
    const panels = gsap.utils.toArray('.story-panel');
    if (!container || !panels.length) return;

    if (window.innerWidth > 768) {
      const storyTl = gsap.timeline({
        scrollTrigger: {
          trigger: '#story',
          pin: true,
          scrub: 1.2,
          start: 'top top',
          end: () => '+=' + container.offsetWidth,
          anticipatePin: 1
        }
      });

      // Normalize timeline duration to 1.0 representing full scroll
      storyTl.duration(1.0);

      // Slide container horizontally
      storyTl.to(container, {
        xPercent: -(100 - 100 / panels.length),
        ease: 'none',
        duration: 1.0
      }, 0);

      // Transition timeline steps
      const step = 1.0 / (panels.length - 1);

      panels.forEach((panel, idx) => {
        const block = panel.querySelector('.story-block');
        if (!block) return;

        // Panel 1 starts active; others start hidden
        if (idx > 0) {
          gsap.set(block, { opacity: 0, scale: 0.9, y: 50 });
        } else {
          gsap.set(block, { opacity: 1, scale: 1, y: 0 });
        }

        // Programmatic crossfades relative to scroll steps
        if (idx < panels.length - 1) {
          const nextBlock = panels[idx + 1].querySelector('.story-block');
          const timeOutStart = idx * step + step * 0.15;

          // Slide current block out (upwards fade)
          storyTl.to(block, {
            opacity: 0,
            scale: 0.9,
            y: -50,
            duration: step * 0.45,
            ease: 'power2.inOut'
          }, timeOutStart);

          // Slide next block in (downwards fade)
          storyTl.to(nextBlock, {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: step * 0.45,
            ease: 'power2.inOut'
          }, timeOutStart + step * 0.18);
        }
      });
    } else {
      // Mobile: vertical stacked
      gsap.utils.toArray('.story-block').forEach((block) => {
        gsap.set(block, { opacity: 0, y: 50 });
        ScrollTrigger.create({
          trigger: block,
          start: 'top 85%',
          once: true,
          onEnter: () => { gsap.to(block, { opacity: 1, y: 0, duration: 1.0, ease: 'power3.out' }); }
        });
      });
    }
  }

  // ACT IV: Gallery — 3D card flip entries
  initGallery() {
    const items = gsap.utils.toArray('.gallery-item');
    if (!items.length) return;

    gsap.set(items, { opacity: 0, scale: 0.75, rotateX: 30, y: 80 });
    ScrollTrigger.create({
      trigger: '#gallery',
      start: 'top 70%',
      once: true,
      onEnter: () => {
        gsap.to(items, {
          opacity: 1, scale: 1, rotateX: 0, y: 0,
          duration: 1.4, ease: 'back.out(1.4)', stagger: 0.12
        });
      }
    });
  }

  // Section atmosphere: background color shifts
  initSectionAtmosphere() {
    const sections = ['#scene-mind', '#scene-heart', '#scene-story', '#scene-poem', '#scene-mirror', '#scene-memories', '#scene-video', '#scene-proposal'];
    const bgColors = [
      'linear-gradient(180deg, #0e0910 0%, #16101c 100%)',
      'linear-gradient(180deg, #16101c 0%, #1d1121 100%)',
      'linear-gradient(180deg, #1d1121 0%, #221226 100%)',
      'linear-gradient(180deg, #221226 0%, #1f1020 100%)',
      'linear-gradient(180deg, #1f1020 0%, #190e21 100%)',
      'linear-gradient(180deg, #190e21 0%, #1c0f1c 100%)',
      'linear-gradient(180deg, #1c0f1c 0%, #170a18 100%)',
      'linear-gradient(180deg, #170a18 0%, #120512 60%, #08010a 100%)'
    ];

    sections.forEach((sel, idx) => {
      ScrollTrigger.create({
        trigger: sel,
        start: 'top 60%',
        onEnter: () => {
          gsap.to(document.body, { background: bgColors[idx], duration: 2.0, ease: 'power2.inOut' });
        },
        onLeaveBack: () => {
          if (idx > 0) {
            gsap.to(document.body, { background: bgColors[idx - 1], duration: 2.0, ease: 'power2.inOut' });
          }
        }
      });
    });
  }

  // Custom cursor has been moved to main.js for immediate startup.

  // Master scroll progress
  initMasterProgress() {
    const progressBar = document.getElementById('progress-bar');
    ScrollTrigger.create({
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        this.scrollProgress = self.progress;
        if (progressBar) progressBar.style.width = `${self.progress * 100}%`;
        if (this.onScrollProgress) this.onScrollProgress(self.progress);

        // Dripping particle trigger (active on scroll)
        if (Math.random() > 0.35) {
          const cameraY = -self.progress * 30.0;
          // Emit event to spawn a drip near the current scroll height
          window.dispatchEvent(new CustomEvent('spawn-drips', {
            detail: {
              x: (Math.random() - 0.5) * 12.0,
              y: cameraY + 6.0, // Spawn slightly above camera field of view
              z: (Math.random() - 0.5) * 4.0 - 2.0,
              count: Math.floor(Math.random() * 8) + 3
            }
          }));
        }
      }
    });
  }

  destroy() {
    ScrollTrigger.getAll().forEach(t => t.kill());
    if (this.lenis) this.lenis.destroy();
  }
}
