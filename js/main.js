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
import { MirrorScene } from './mirror-scene.js';
import { AudioEngine } from './audio-engine.js';
import { ProposalController } from './proposal.js';
import { CompanionBot } from './companion-bot.js';
import { MusicPlayer } from './music-player.js';
import { getGPUTier, isMobile } from './utils.js';
import { AquaticCaustics } from './aquatic-effects.js';
import { VideoShader } from './video-shader.js';
gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════
   Global state
   ═══════════════════════════════════════════════════════════════ */
let contentLoader, envelopeScene, threeScene, heartScene;
let storyScene, poemScene, mirrorScene, videoShader;
let audioEngine, proposalController, companionBot, musicPlayer;
let mainAquatic, lightboxAquatic;
let currentPhase = 'mind';
const PHASES = [
  { id: 'dearest', label: 'Dearest', selector: '#scene-mind' },
  { id: 'journey', label: 'Journey', selector: '#scene-story' },
  { id: 'memories', label: 'Memories', selector: '#scene-memories' },
  { id: 'forever', label: 'Forever', selector: '#scene-proposal' },
];

/* ═══════════════════════════════════════════════════════════════
   Scroll progress handler — drives all visual systems
   ═══════════════════════════════════════════════════════════════ */
let phaseRects = [];

function cachePhaseRects() {
  phaseRects = PHASES.map(phase => {
    const element = document.querySelector(phase.selector);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {
      id: phase.id,
      docTop: rect.top + window.scrollY,
      height: rect.height
    };
  }).filter(Boolean);
}

function onScrollProgress(progress) {
  // Update 3D background
  if (threeScene) threeScene.updateScroll(progress);

  // Update audio filtering based on scroll position
  if (audioEngine) {
    const isGalleryZoomed = !!document.getElementById('gallery-detail-overlay')?.classList.contains('active');
    if (!isGalleryZoomed) {
      audioEngine.updateScrollPosition(progress);
    }
  }

  // Resolve the active chapter from the viewport using cached phase coordinates to avoid layout thrashing
  const focusY = window.innerHeight * 0.46;
  const sY = window.scrollY;
  const focusAbsoluteY = sY + focusY;

  let activePhase = { id: 'mind' };
  let minDistance = Infinity;

  phaseRects.forEach(phase => {
    const pTop = phase.docTop;
    const pBottom = phase.docTop + phase.height;

    let distance = 0;
    if (focusAbsoluteY >= pTop && focusAbsoluteY <= pBottom) {
      distance = 0;
    } else {
      distance = Math.min(Math.abs(pTop - focusAbsoluteY), Math.abs(pBottom - focusAbsoluteY));
    }

    if (distance < minDistance) {
      minDistance = distance;
      activePhase = phase;
    }
  });

  const newPhase = activePhase.id;
  if (newPhase !== currentPhase) {
    currentPhase = newPhase;
    updatePhaseUI(newPhase);
    if (musicPlayer) musicPlayer.onPhaseChange(newPhase);

    window.dispatchEvent(new CustomEvent('phase-change', {
      detail: { phase: newPhase }
    }));
  }
}

function updatePhaseUI(phase) {
  PHASES.forEach(item => document.body.classList.remove(`phase-${item.id}`));
  document.body.classList.add(`phase-${phase}`);
}

/* ═══════════════════════════════════════════════════════════════
   Scene-specific scroll triggers
   ═══════════════════════════════════════════════════════════════ */
function initSceneScrollTriggers() {
  // Scene: Mind — intro text is fully animated by typewriter in playOpeningCopy()
  document.querySelectorAll('.heart-line').forEach(line => {
    gsap.set(line, { opacity: 0, y: 0, filter: 'blur(0px)' });
  });
  const heartSig = document.querySelector('#scene-heart .pulse-signature');
  if (heartSig) gsap.set(heartSig, { opacity: 0 });

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
      // Animate heart text via typewriter
      const line1El = document.querySelector('.heart-line-1');
      if (self.progress > 0.22 && line1El) {
        typeHeartLine(line1El, "Somewhere between friendship and forever,", 40);
      }
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

  // Scene: Mirror (Envenomed) — scroll-driven mirror reveals
  ScrollTrigger.create({
    trigger: '#scene-mirror',
    start: 'top center',
    end: 'bottom center',
    onUpdate: (self) => {
      if (mirrorScene) mirrorScene.onProgress(self.progress);
    },
    onEnter: () => { 
      // Cinematic entrance for mirror elements
      const mirrorHeader = document.querySelector('.mirror-header');
      const mirrorSplit = document.querySelector('.mirror-split');
      if (mirrorHeader) {
        gsap.fromTo(mirrorHeader, 
          { opacity: 0, y: 40, filter: 'blur(10px)' }, 
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.0, ease: 'power3.out' }
        );
      }
      if (mirrorSplit) {
        const sides = mirrorSplit.querySelectorAll('.mirror-side');
        gsap.fromTo(sides[0], { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.8, ease: 'power2.out', delay: 0.3 });
        gsap.fromTo(sides[1], { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.8, ease: 'power2.out', delay: 0.5 });
      }
    },
    onLeaveBack: () => { if (mirrorScene) mirrorScene.reset(); },
  });

  // Early-trigger stardust background animation as soon as the section approaches the viewport
  ScrollTrigger.create({
    trigger: '#scene-mirror',
    start: 'top bottom',
    end: 'bottom top',
    onEnter: () => { if (mirrorScene) mirrorScene.onEnter(); },
    onEnterBack: () => { if (mirrorScene) mirrorScene.onEnter(); },
    onLeave: () => { if (mirrorScene) mirrorScene.onLeave(); },
    onLeaveBack: () => { if (mirrorScene) mirrorScene.onLeave(); },
  });

  // Scene: Song — animate waveform bars + cinematic entrance
  const songTitle = document.querySelector('.song-title');
  const songSubtitle = document.querySelector('.song-subtitle');
  const videoSectionContainer = document.querySelector('.love-video-section-container');
  if (songTitle) gsap.set(songTitle, { opacity: 0, y: 50, filter: 'blur(12px)' });
  if (songSubtitle) gsap.set(songSubtitle, { opacity: 0, y: 30, filter: 'blur(8px)' });
  if (videoSectionContainer) gsap.set(videoSectionContainer, { opacity: 0, y: 60, scale: 0.95 });

  const playSongAnimation = () => {
    const tl = gsap.timeline();
    const songKicker = document.querySelector('#scene-song .scene-kicker');
    if (songKicker) tl.fromTo(songKicker, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
    if (songTitle) tl.to(songTitle, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out' }, '-=0.3');
    if (songSubtitle) tl.to(songSubtitle, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.7, ease: 'power2.out' }, '-=0.4');
    
    const songWaveform = document.getElementById('song-waveform');
    if (songWaveform) tl.fromTo(songWaveform, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, '-=0.3');
    
    if (videoSectionContainer) tl.to(videoSectionContainer, { opacity: 1, y: 0, scale: 1, duration: 1.0, ease: 'power3.out' }, '-=0.3');

    // Clear audio filter
    if (audioEngine) {
      audioEngine.setFocusedState(false);
    }
  };

  const flattenWaveform = () => {
    // Make sure the waveform goes flat when leaving the scene
    document.querySelectorAll('.waveform-bar').forEach(bar => {
      gsap.killTweensOf(bar);
      gsap.to(bar, { scaleY: 0.15, duration: 0.5 });
    });
  };

  ScrollTrigger.create({
    trigger: '#scene-song',
    start: 'top 80%',
    end: 'bottom 20%',
    onEnter: playSongAnimation,
    onEnterBack: playSongAnimation,
    onLeave: flattenWaveform,
    onLeaveBack: flattenWaveform,
  });

  // Scene: Song — start/stop video shader dynamically for CPU optimization
  ScrollTrigger.create({
    trigger: '#scene-song',
    start: 'top bottom',
    end: 'bottom top',
    onEnter: () => { if (videoShader) videoShader.start(); },
    onEnterBack: () => { if (videoShader) videoShader.start(); },
    onLeave: () => { if (videoShader) videoShader.stop(); },
    onLeaveBack: () => { if (videoShader) videoShader.stop(); }
  });

  // Scene: Proposal — drive the climax
  ScrollTrigger.create({
    trigger: '#scene-proposal',
    start: 'top 10%',
    end: 'bottom center',
    onUpdate: (self) => {
      if (proposalController) proposalController.onProgress(self.progress);
    },
    onEnter: () => {
      document.body.classList.add('proposal-approaching');
    }
  });

  // Scene: Memories — start/stop aquatic caustics loop dynamically for CPU optimization
  ScrollTrigger.create({
    trigger: '#scene-memories',
    start: 'top bottom',
    end: 'bottom top',
    onEnter: () => { if (mainAquatic) mainAquatic.start(); },
    onEnterBack: () => { if (mainAquatic) mainAquatic.start(); },
    onLeave: () => { if (mainAquatic) mainAquatic.stop(); },
    onLeaveBack: () => { if (mainAquatic) mainAquatic.stop(); }
  });

  // Scrapbook paper entrance animation — unfolds in with a premium stagger
  const scrapbookPaper = document.querySelector('.scrapbook-paper');
  const memoriesSection = document.getElementById('scene-memories');
  if (scrapbookPaper && memoriesSection) {
    gsap.set(scrapbookPaper, { opacity: 0, y: 60, scale: 0.96, rotateX: 3 });
    ScrollTrigger.create({
      trigger: memoriesSection,
      start: 'top 90%', // Starts loading as soon as memories section enters the viewport
      once: true,
      onEnter: () => {
        gsap.to(scrapbookPaper, {
          opacity: 1, y: 0, scale: 1, rotateX: 0,
          duration: 1.2, ease: 'power3.out'
        });

        // Staggered reveal of polaroids
        const polaroids = scrapbookPaper.querySelectorAll('.scrapbook-polaroid');
        gsap.set(polaroids, { opacity: 0, y: 40, scale: 0.9 });
        gsap.to(polaroids, {
          opacity: 1, y: 0, scale: 1,
          duration: 0.8, stagger: 0.15, ease: 'back.out(1.3)', delay: 0.4
        });

        // Staggered reveal of badges/stickers
        const badges = scrapbookPaper.querySelectorAll('.scrapbook-badge');
        gsap.set(badges, { opacity: 0, scale: 0.5 });
        gsap.to(badges, {
          opacity: 1, scale: 1,
          duration: 0.5, stagger: 0.06, ease: 'back.out(2)', delay: 0.8
        });

        // Staggered reveal of annotations
        const annotations = scrapbookPaper.querySelectorAll('.scrapbook-annotation');
        gsap.set(annotations, { opacity: 0, y: 15 });
        gsap.to(annotations, {
          opacity: 1, y: 0,
          duration: 0.6, stagger: 0.1, ease: 'power2.out', delay: 1.2
        });
      }
    });

    // 3D Parallax Mouse interaction for premium cinematic depth
    let polaroids = null;
    memoriesSection.addEventListener('mousemove', (e) => {
      memoriesSection.classList.add('parallax-active');
      const mx = (e.clientX / window.innerWidth) * 2 - 1;
      const my = (e.clientY / window.innerHeight) * 2 - 1;

      if (!polaroids) {
        polaroids = memoriesSection.querySelectorAll('.scrapbook-polaroid');
      }
      polaroids.forEach((card, idx) => {
        const speedX = (idx % 2 === 0 ? 12 : -12);
        const speedY = (idx % 3 === 0 ? 10 : -10);
        const rotX = my * -5;
        const rotY = mx * 5;

        // Fetch individual rotation from inline CSS variable --rot
        const baseRotString = card.style.getPropertyValue('--rot') || '-2';
        const baseRot = parseFloat(baseRotString);

        gsap.to(card, {
          x: mx * speedX,
          y: my * speedY,
          rotateX: rotX,
          rotateY: rotY,
          rotation: baseRot + mx * 2.5,
          duration: 0.8,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      });
    });

    // Smoothly reset cards when mouse leaves the section
    memoriesSection.addEventListener('mouseleave', () => {
      memoriesSection.classList.remove('parallax-active');
      const polaroids = memoriesSection.querySelectorAll('.scrapbook-polaroid');
      polaroids.forEach((card) => {
        const baseRotString = card.style.getPropertyValue('--rot') || '-2';
        const baseRot = parseFloat(baseRotString);

        gsap.to(card, {
          x: 0,
          y: 0,
          rotateX: 0,
          rotateY: 0,
          rotation: baseRot,
          duration: 1.2,
          ease: 'power3.out',
          overwrite: 'auto'
        });
      });
    });
  }

  // General section visibility tracking
  document.querySelectorAll('.scene').forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 85%',
      end: 'bottom 15%',
      toggleClass: { targets: section, className: 'scene-active' },
    });
  });
}

function playOpeningCopy() {
  const sceneMind = document.getElementById('scene-mind');
  if (!sceneMind) return;
  sceneMind.classList.add('scene-active');

  const kicker = document.querySelector('#scene-mind .scene-kicker');
  const line1El = document.querySelector('#scene-mind .mind-line-1');
  const line2El = document.querySelector('#scene-mind .mind-line-2');
  const line3El = document.querySelector('#scene-mind .mind-line-3');
  const whisper = document.querySelector('#scene-mind .scene-whisper');
  const scrollCue = document.querySelector('#scene-mind .scroll-indicator');

  if (!line1El || !line2El || !line3El) return;

  const text1 = "Before there was an us,";
  const text2 = "there was one thought I kept returning to.";
  const text3Part1 = "It was always ";
  const text3Part2 = "you, Kanak.";

  // Reset elements to blank and hide everything with clear filters and target offsets
  gsap.set([kicker, line1El, line2El, line3El, whisper, scrollCue], { opacity: 0, y: 0, filter: 'blur(0px)' });
  line1El.innerHTML = '';
  line2El.innerHTML = '';
  line3El.innerHTML = '';

  line1El.classList.remove('mind-line-animated');
  line2El.classList.remove('mind-line-animated');
  line3El.classList.remove('mind-line-animated');

  // Create a blinking vertical cursor
  const cursor = document.createElement('span');
  cursor.className = 'mind-cursor';
  cursor.innerHTML = '|';

  // Helper function to type out a line
  const typeLine = (element, fullText, speed, onComplete) => {
    gsap.set(element, { opacity: 1, y: 0, filter: 'blur(0px)' });
    element.appendChild(cursor);

    let charIndex = 0;
    const interval = setInterval(() => {
      if (charIndex >= fullText.length) {
        clearInterval(interval);
        cursor.remove();
        element.classList.add('mind-line-animated');
        if (onComplete) onComplete();
        return;
      }

      const nextChar = fullText[charIndex];
      const textNode = document.createTextNode(nextChar);
      element.insertBefore(textNode, cursor);
      charIndex++;

      // Soft keystroke feedback tick occasionally on letters
      if (audioEngine && audioEngine.initialised && audioEngine.pianoSynth && !audioEngine.muted) {
        if (Math.random() < 0.18 && nextChar !== ' ') {
          const notes = ['C5', 'E5', 'G5', 'A5', 'C6'];
          const note = notes[Math.floor(Math.random() * notes.length)];
          try {
            audioEngine.pianoSynth.triggerAttackRelease(note, '32n', undefined, 0.06);
          } catch (e) {}
        }
      }
    }, speed);
  };

  // Special typing for Line 3 to wrap Kanak in a glowing rose span
  const typeLine3 = (onComplete) => {
    gsap.set(line3El, { opacity: 1, y: 0, filter: 'blur(0px)' });
    line3El.appendChild(cursor);

    let charIndex = 0;
    // Step 1: Type "It was always "
    const interval1 = setInterval(() => {
      if (charIndex >= text3Part1.length) {
        clearInterval(interval1);

        // Climax: Trigger the beautiful chime sound effect right as Kanak's highlight text starts typing
        if (audioEngine && audioEngine.initialised && !audioEngine.muted) {
          audioEngine.playSFX('section-chime');
        }

        // Step 2: Create the rose glow span and type "you, Kanak." inside it
        const span = document.createElement('span');
        span.className = 'text-glow-rose';
        line3El.insertBefore(span, cursor);

        let subIndex = 0;
        const interval2 = setInterval(() => {
          if (subIndex >= text3Part2.length) {
            clearInterval(interval2);
            cursor.remove();
            line3El.classList.add('mind-line-animated');
            // Subtle elastic pop at completion to settle in
            gsap.fromTo(line3El, { scale: 0.98 }, { scale: 1, duration: 0.6, ease: 'power2.out' });
            if (onComplete) onComplete();
            return;
          }

          span.innerHTML += text3Part2[subIndex];
          subIndex++;

          // Soft keytick audio while typing name
          if (audioEngine && audioEngine.initialised && audioEngine.pianoSynth && !audioEngine.muted) {
            if (Math.random() < 0.18) {
              try {
                audioEngine.pianoSynth.triggerAttackRelease('E5', '32n', undefined, 0.06);
              } catch (e) {}
            }
          }
        }, 75); // slightly slower typing for Kanak's name to make it feel deliberate and romantic

        return;
      }

      const nextChar = text3Part1[charIndex];
      const textNode = document.createTextNode(nextChar);
      line3El.insertBefore(textNode, cursor);
      charIndex++;

      if (audioEngine && audioEngine.initialised && audioEngine.pianoSynth && !audioEngine.muted) {
        if (Math.random() < 0.18 && nextChar !== ' ') {
          try {
            audioEngine.pianoSynth.triggerAttackRelease('C5', '32n', undefined, 0.06);
          } catch (e) {}
        }
      }
    }, 45);
  };

  // Build sequential GSAP timeline
  gsap.timeline({ delay: 0.4 })
    .fromTo(kicker, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 1.0, ease: 'power2.out', onComplete: () => {
      // 1. Type Line 1
      typeLine(line1El, text1, 40, () => {
        setTimeout(() => {
          // 2. Type Line 2
          typeLine(line2El, text2, 35, () => {
            setTimeout(() => {
              // 3. Type Line 3 (Climax line)
              typeLine3(() => {
                setTimeout(() => {
                  // 4. Gracefully reveal cues
                  gsap.timeline()
                    .fromTo(whisper, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' })
                    .fromTo(scrollCue, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 1.0, ease: 'power2.out' }, '-=0.8');
                }, 400);
              });
            }, 500);
          });
        }, 400);
      });
    } });
}

function typeHeartLine(lineEl, fullText, speed) {
  if (lineEl.dataset.typingStarted === 'true') return;
  lineEl.dataset.typingStarted = 'true';

  lineEl.innerHTML = '';
  gsap.set(lineEl, { opacity: 1, y: 0, filter: 'blur(0px)' });

  const cursor = document.createElement('span');
  cursor.className = 'mind-cursor'; // Reuse vertical cursor style
  cursor.innerHTML = '|';
  lineEl.appendChild(cursor);

  let charIndex = 0;

  if (lineEl.classList.contains('heart-line-2')) {
    const part1 = "my heart stopped searching. It had found ";
    const part2 = "home in you.";

    const interval1 = setInterval(() => {
      if (charIndex >= part1.length) {
        clearInterval(interval1);

        if (audioEngine && audioEngine.initialised && !audioEngine.muted) {
          audioEngine.playSFX('section-chime');
        }

        const span = document.createElement('span');
        span.className = 'text-glow-gold';
        lineEl.insertBefore(span, cursor);

        let subIndex = 0;
        const interval2 = setInterval(() => {
          if (subIndex >= part2.length) {
            clearInterval(interval2);
            cursor.remove();
            lineEl.classList.add('mind-line-animated');

            // Fade in pulse signature
            const sig = document.querySelector('#scene-heart .pulse-signature');
            if (sig) {
              gsap.to(sig, { opacity: 1, duration: 1.2, ease: 'power2.out' });
            }
            return;
          }

          span.innerHTML += part2[subIndex];
          subIndex++;

          if (audioEngine && audioEngine.initialised && audioEngine.pianoSynth && !audioEngine.muted) {
            if (Math.random() < 0.18) {
              try {
                audioEngine.pianoSynth.triggerAttackRelease('G5', '32n', undefined, 0.06);
              } catch (e) {}
            }
          }
        }, 75);

        return;
      }

      const nextChar = part1[charIndex];
      const textNode = document.createTextNode(nextChar);
      lineEl.insertBefore(textNode, cursor);
      charIndex++;

      if (audioEngine && audioEngine.initialised && audioEngine.pianoSynth && !audioEngine.muted) {
        if (Math.random() < 0.18 && nextChar !== ' ') {
          const notes = ['D5', 'F#5', 'A5', 'B5', 'D6'];
          const note = notes[Math.floor(Math.random() * notes.length)];
          try {
            audioEngine.pianoSynth.triggerAttackRelease(note, '32n', undefined, 0.06);
          } catch (e) {}
        }
      }
    }, speed);
  } else {
    const interval = setInterval(() => {
      if (charIndex >= fullText.length) {
        clearInterval(interval);
        cursor.remove();
        lineEl.classList.add('mind-line-animated');
        lineEl.dataset.typingComplete = 'true';
        if (lineEl.classList.contains('heart-line-1')) {
          const line2El = document.querySelector('.heart-line-2');
          if (line2El) {
            typeHeartLine(line2El, "my heart stopped searching. It had found home in you.", 35);
          }
        }
        return;
      }

      const nextChar = fullText[charIndex];
      const textNode = document.createTextNode(nextChar);
      lineEl.insertBefore(textNode, cursor);
      charIndex++;

      if (audioEngine && audioEngine.initialised && audioEngine.pianoSynth && !audioEngine.muted) {
        if (Math.random() < 0.18 && nextChar !== ' ') {
          const notes = ['D5', 'F#5', 'A5', 'B5', 'D6'];
          const note = notes[Math.floor(Math.random() * notes.length)];
          try {
            audioEngine.pianoSynth.triggerAttackRelease(note, '32n', undefined, 0.06);
          } catch (e) {}
        }
      }
    }, speed);
  }
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
   Enhancement 4: Sparkle Cursor Trail
   Emits tiny glowing particles on mousemove after envelope opens.
   ═══════════════════════════════════════════════════════════════ */
class SparkleTrail {
  constructor() {
    this.active = false;
    this.lastTime = 0;
    this.throttle = 50; // ms between sparkles
    this._onMove = this._onMove.bind(this);
  }

  start() {
    this.active = true;
    document.addEventListener('mousemove', this._onMove, { passive: true });
  }

  _onMove(e) {
    const now = Date.now();
    if (now - this.lastTime < this.throttle) return;
    this.lastTime = now;
    this._emit(e.clientX, e.clientY);
  }

  _emit(x, y) {
    const count = Math.random() > 0.6 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      const isStar = Math.random() > 0.65;
      el.className = 'sparkle-particle' + (isStar ? ' sparkle-star' : '');

      const dx = (Math.random() - 0.5) * 60;
      const dy = -(Math.random() * 50 + 20);
      const duration = 0.6 + Math.random() * 0.5;
      const size = isStar ? (4 + Math.random() * 6) : (3 + Math.random() * 5);

      el.style.cssText = `
        left: ${x}px;
        top: ${y}px;
        width: ${size}px;
        height: ${size}px;
        --sparkle-dx: ${dx}px;
        --sparkle-dy: ${dy}px;
        --sparkle-duration: ${duration}s;
      `;

      document.body.appendChild(el);
      setTimeout(() => el.remove(), duration * 1000 + 50);
    }
  }
}

/* ═══════════════════════════════════════════════════════════════
   Enhancement 6: Love Counter
   Live elapsed time from Feb 14, 2024.
   ═══════════════════════════════════════════════════════════════ */
class LoveCounter {
  constructor() {
    this.startDate = new Date('2026-02-15T00:00:00');
    this.el = document.getElementById('love-counter');
    this.daysEl = document.getElementById('lc-days');
    this.hoursEl = document.getElementById('lc-hours');
    this.minsEl = document.getElementById('lc-mins');
    this.secsEl = document.getElementById('lc-secs');
    this._interval = null;
  }

  start() {
    if (!this.el) return;
    this._update();
    this._interval = setInterval(() => this._update(), 1000);
    // Delay the visual entrance
    setTimeout(() => this.el.classList.add('visible'), 2000);
  }

  _update() {
    const now = new Date();
    let diff = Math.max(0, Math.floor((now - this.startDate) / 1000));

    const days = Math.floor(diff / 86400);
    diff %= 86400;
    const hours = Math.floor(diff / 3600);
    diff %= 3600;
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;

    if (this.daysEl) this.daysEl.textContent = String(days).padStart(3, '0');
    if (this.hoursEl) this.hoursEl.textContent = String(hours).padStart(2, '0');
    if (this.minsEl) this.minsEl.textContent = String(mins).padStart(2, '0');
    if (this.secsEl) this.secsEl.textContent = String(secs).padStart(2, '0');
  }
}

/* ═══════════════════════════════════════════════════════════════
   Envelope open → start the experience
   ═══════════════════════════════════════════════════════════════ */
function onEnvelopeOpen() {
  // Force scroll to top instantly
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  document.body.classList.add('experience-started');

  // Let browser layout stabilize and overflow change before caching rects and triggers
  setTimeout(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    updatePhaseUI('mind');

    // Start the background ThreeScene WebGL renderer
    if (threeScene) {
      threeScene.start();
    }

    // Cache coordinates for active phase detection to avoid layout reflows during scroll
    cachePhaseRects();

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
    ScrollTrigger.refresh();
    playOpeningCopy();

    // Enhancement 4: Start sparkle cursor trail
    const sparkleTrail = new SparkleTrail();
    sparkleTrail.start();

    // Enhancement 6: Start love counter
    const loveCounter = new LoveCounter();
    loveCounter.start();
  }, 100);

  // Initialize proposal controller with WebGL celebration hooks
  proposalController = new ProposalController({
    onCelebration: () => {
      if (audioEngine) audioEngine.triggerCelebration();

      if (threeScene) {
        threeScene.isCelebrating = true;
      }

      // WebGL: Surge particles into vortex swirl
      if (threeScene && threeScene.particleUniforms) {
        gsap.to(threeScene.particleUniforms.uPortalDiveProgress, {
          value: 2.2,
          duration: 3.0,
          ease: 'power2.inOut',
        });
      }

      // WebGL: Scale up the central glass heart with elastic bounce
      if (threeScene && threeScene.centerHeartGroup) {
        gsap.to(threeScene.centerHeartGroup.scale, {
          x: 2.8, y: 2.8, z: 2.8,
          duration: 2.5,
          ease: 'elastic.out(1, 0.4)',
        });
        gsap.to(threeScene.centerHeartGroup.rotation, {
          y: Math.PI * 2,
          duration: 4.0,
          ease: 'power1.inOut',
        });
      }

      // WebGL: Surge heart light and gold light
      if (threeScene && threeScene.centerHeartLight) {
        gsap.to(threeScene.centerHeartLight, {
          intensity: 25,
          duration: 2.0,
          ease: 'power2.out',
        });
      }
      if (threeScene && threeScene.goldLight) {
        gsap.to(threeScene.goldLight, {
          intensity: 8,
          duration: 2.0,
          ease: 'power2.out',
        });
      }
    },
    onDecline: () => {
      if (audioEngine) audioEngine.triggerSadMoment();

      if (threeScene) {
        threeScene.isCelebrating = true;
      }

      // WebGL: Dim the heart
      if (threeScene && threeScene.centerHeartGroup) {
        gsap.to(threeScene.centerHeartGroup.scale, {
          x: 0.5, y: 0.5, z: 0.5,
          duration: 2.0,
          ease: 'power2.inOut',
        });
      }
      if (threeScene && threeScene.centerHeartLight) {
        gsap.to(threeScene.centerHeartLight, {
          intensity: 1,
          duration: 2.0,
          ease: 'power2.inOut',
        });
      }
    },
    onReconsider: () => {
      // WebGL: Smoothly reset everything back to scroll-linked state
      if (threeScene && threeScene.particleUniforms) {
        gsap.to(threeScene.particleUniforms.uPortalDiveProgress, {
          value: 0,
          duration: 2.0,
          ease: 'power2.inOut',
        });
      }
      if (threeScene && threeScene.centerHeartGroup) {
        gsap.to(threeScene.centerHeartGroup.scale, {
          x: 0, y: 0, z: 0,
          duration: 1.5,
          ease: 'power2.inOut',
          onComplete: () => {
            if (threeScene) threeScene.isCelebrating = false;
          }
        });
        gsap.to(threeScene.centerHeartGroup.rotation, {
          y: 0,
          duration: 1.5,
          ease: 'power2.inOut',
        });
      }
      if (threeScene && threeScene.centerHeartLight) {
        gsap.to(threeScene.centerHeartLight, { intensity: 0, duration: 1.5 });
      }
      if (threeScene && threeScene.goldLight) {
        gsap.to(threeScene.goldLight, { intensity: 0, duration: 1.5 });
      }
    }
  });
  proposalController.init(contentLoader?.data);

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
  const scrapbookContainer = document.getElementById('scrapbook-container');
  if (scrapbookContainer) {
    scrapbookContainer.addEventListener('click', (e) => {
      const card = e.target.closest('.scrapbook-polaroid');
      if (!card) return;

      const index = parseInt(card.dataset.index || '0');
      const items = contentLoader?.data?.gallery?.items;
      if (!items || !items[index]) return;

      const item = items[index];

      // Play chime SFX
      window.dispatchEvent(new CustomEvent('play-sound', { detail: { name: 'section-chime' } }));

      // Dispatch gallery-dive-in event
      window.dispatchEvent(new CustomEvent('gallery-dive-in', {
        detail: {
          emoji: item.emoji,
          caption: item.caption,
          date: item.date,
          story: item.story,
          previewUrl: item.image,
          videoSrc: item.video
        }
      }));
    });
  }

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
          videoEl.play().catch(() => { });
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

      // Start the popup aquatic caustics rendering
      if (lightboxAquatic) {
        lightboxAquatic.start();
      }
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

      // Stop the popup aquatic caustics rendering to save cycles
      if (lightboxAquatic) {
        lightboxAquatic.stop();
      }
    }
  });

  // Detail overlay close
  const detailCloseBtn = document.getElementById('detail-close-btn');
  if (detailCloseBtn) {
    detailCloseBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('gallery-dive-out'));
    });
  }

  const detailOverlay = document.getElementById('gallery-detail-overlay');
  if (detailOverlay) {
    detailOverlay.addEventListener('click', (e) => {
      if (e.target === detailOverlay) {
        window.dispatchEvent(new CustomEvent('gallery-dive-out'));
      }
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
  if (!dot || !ring) return;

  // Initialize elements to top-left to delegate all movement to GPU-accelerated translate3d
  dot.style.left = '0px';
  dot.style.top = '0px';
  ring.style.left = '0px';
  ring.style.top = '0px';
  trails.forEach(trail => {
    trail.style.left = '0px';
    trail.style.top = '0px';
  });

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
    dot.style.transform = `translate3d(${dotPos.x}px, ${dotPos.y}px, 0) translate(-50%, -50%)`;

    ringPos.x += (mouse.x - ringPos.x) * 0.12;
    ringPos.y += (mouse.y - ringPos.y) * 0.12;
    ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) translate(-50%, -50%)`;

    trails.forEach((trail, i) => {
      const prev = i === 0 ? dotPos : trailPositions[i - 1];
      const lerpFactor = 0.2 - i * 0.02;
      trailPositions[i].x += (prev.x - trailPositions[i].x) * lerpFactor;
      trailPositions[i].y += (prev.y - trailPositions[i].y) * lerpFactor;
      
      trail.style.opacity = `${0.3 - i * 0.035}`;
      trail.style.transform = `translate3d(${trailPositions[i].x}px, ${trailPositions[i].y}px, 0) translate(-50%, -50%) scale(${1 - i * 0.08})`;
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
  if (history.scrollRestoration) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);

  initGlobalCursor();

  // Init cursor particle trails (ActiveTheory-style dripping from edges)
  // const tubesCanvas = document.getElementById('tubes-canvas');
  // if (tubesCanvas) {
  //   mouseTubes = new MouseTubes(tubesCanvas);
  //   mouseTubes.bind();
  // }

  // Boot loader
  const loaderRoot = document.getElementById('at-loader');
  const atLoader = new (await import('./at-loader.js')).ATLoader(loaderRoot);
  atLoader.start();

  // Load content
  contentLoader = new ContentLoader();
  contentLoader.resetLocal();
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

      // HeartScene is disabled (removed by request), using fallback mock
      heartScene = {
        onProgress() { },
        setVisible() { },
        update() { },
        dispose() { }
      };

      atLoader.bump(15);

      // Mouse parallax for 3D scene
      window.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -(e.clientY / window.innerHeight) * 2 + 1;
        threeScene.onMouseMove(x, y);
      });

      // ThreeScene WebGL particle universe is initialized below
      atLoader.bump(25);
    } catch (err) {
      console.error("WebGL Setup failed, falling back to 2D UI:", err);
      if (!threeScene) {
        threeScene = {
          fallback: true,
          isFallback() { return true; },
          updateScroll() { },
          onMouseMove() { },
          onResize() { },
          toggleHelixZoom() { },
          zoomedMesh: null,
          particleUniforms: null,
          destroy() { }
        };
      } else {
        threeScene.fallback = true;
      }

      heartScene = {
        onProgress() { },
        setVisible() { },
        update() { },
        dispose() { }
      };

      try {
        canvas.style.display = 'none';
      } catch (_) { }

      // Show fallback CSS grid gallery
      const galleryGrid = document.getElementById('gallery-grid');
      if (galleryGrid) {
        galleryGrid.style.display = 'grid';
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

  // Init mirror scene
  mirrorScene = new MirrorScene();
  mirrorScene.init();
  atLoader.bump(5);

  // Init aquatic caustics loops
  mainAquatic = new AquaticCaustics('aquatic-caustics-canvas');
  lightboxAquatic = new AquaticCaustics('lightbox-caustics-canvas');
  atLoader.bump(5);

  // No longer using tunnel gallery, so just bump loader
  atLoader.bump(10);

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
    cachePhaseRects();
    ScrollTrigger.refresh();
  });

  // Handle mute button
  const muteBtn = document.getElementById('mute-btn');
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      if (!audioEngine) return;
      const state = !audioEngine.isMuted();
      audioEngine.setMuted(state);
      const textSpan = muteBtn.querySelector('.audio-btn-text');
      if (textSpan) {
        textSpan.textContent = state ? 'Muted' : 'Audio';
      } else {
        muteBtn.textContent = state ? 'Muted' : 'Audio';
      }
      muteBtn.classList.toggle('is-muted', state);
    });
  }

  // ESC key handling
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const overlay = document.getElementById('gallery-detail-overlay');
      if (overlay && overlay.classList.contains('active')) {
        window.dispatchEvent(new CustomEvent('gallery-dive-out'));
      }
    }
  });

  // Init video shader
  const videoShaderContainer = document.getElementById('video-shader-container');
  if (videoShaderContainer) {
    videoShader = new VideoShader(videoShaderContainer);
  }

  // Space for other scroll integrations
  initLoveVideoPlayer();
}

/**
 * Initialize custom video player controls
 */
function initLoveVideoPlayer() {
  const video = document.getElementById('love-video');
  const bigPlayBtn = document.getElementById('video-play-btn');
  const ctrlPlayBtn = document.getElementById('video-control-play');
  const ctrlMuteBtn = document.getElementById('video-control-mute');
  const progressFill = document.querySelector('.video-progress-bar-fill');
  const progressContainer = document.querySelector('.video-progress-bar-container');

  if (!video || !bigPlayBtn) return;

  const playIcon = ctrlPlayBtn?.querySelector('.play-icon');
  const pauseIcon = ctrlPlayBtn?.querySelector('.pause-icon');
  const unmuteIcon = ctrlMuteBtn?.querySelector('.unmute-icon');
  const muteIcon = ctrlMuteBtn?.querySelector('.mute-icon');

  let wasMutedBeforeVideo = false;

  function setWaveformActive(active) {
    const bars = document.querySelectorAll('.waveform-bar');
    if (active) {
      bars.forEach((bar, i) => {
        gsap.to(bar, {
          scaleY: 0.3 + Math.random() * 0.7,
          duration: 0.3 + Math.random() * 0.3,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.04,
          overwrite: 'auto'
        });
      });
    } else {
      bars.forEach(bar => {
        gsap.killTweensOf(bar);
        gsap.to(bar, { scaleY: 0.15, duration: 0.5, overwrite: 'auto' });
      });
    }
  }

  function togglePlay() {
    if (video.paused || video.ended) {
      // Fade out background music
      if (audioEngine) {
        wasMutedBeforeVideo = audioEngine.isMuted();
        audioEngine.setMuted(true);
      }

      video.play().catch(err => console.log("Video play error:", err));
      bigPlayBtn.classList.add('playing');

      playIcon?.classList.add('hidden');
      pauseIcon?.classList.remove('hidden');

      setWaveformActive(true);
    } else {
      video.pause();
      bigPlayBtn.classList.remove('playing');

      playIcon?.classList.remove('hidden');
      pauseIcon?.classList.add('hidden');

      // Restore background music
      if (audioEngine && !wasMutedBeforeVideo) {
        audioEngine.setMuted(false);
      }

      setWaveformActive(false);
    }
  }

  bigPlayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });

  video.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });

  ctrlPlayBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });

  // Update progress bar
  video.addEventListener('timeupdate', () => {
    if (video.duration) {
      const pct = (video.currentTime / video.duration) * 100;
      if (progressFill) progressFill.style.width = `${pct}%`;
    }
  });

  // Click progress bar to seek
  progressContainer?.addEventListener('click', (e) => {
    e.stopPropagation();
    const rect = progressContainer.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  });

  // Video volume toggle
  ctrlMuteBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    video.muted = !video.muted;
    if (video.muted) {
      unmuteIcon?.classList.add('hidden');
      muteIcon?.classList.remove('hidden');
    } else {
      unmuteIcon?.classList.remove('hidden');
      muteIcon?.classList.add('hidden');
    }
  });

  // Restore music when video ends
  video.addEventListener('ended', () => {
    bigPlayBtn.classList.remove('playing');
    playIcon?.classList.remove('hidden');
    pauseIcon?.classList.add('hidden');
    if (audioEngine && !wasMutedBeforeVideo) {
      audioEngine.setMuted(false);
    }
    setWaveformActive(false);
  });
}

/* ═══════════════════════════════════════════════════════════════
   Start
   ═══════════════════════════════════════════════════════════════ */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
