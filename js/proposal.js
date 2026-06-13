/**
 * proposal.js — The emotional climax of the experience.
 * Features: dramatic buildup with line-by-line text reveals,
 * particle convergence, light surge, heartbeat audio, 
 * cinematic question reveal, and celebration/decline handling.
 */
import gsap from 'gsap';

export class ProposalController {
  constructor({ onCelebration, onDecline } = {}) {
    this.onCelebrationCb = onCelebration || (() => {});
    this.onDeclineCb = onDecline || (() => {});
    this.hasProposed = false;
    this.answered = false;
    this.declineAttempts = 0;
    this.buildupTimeline = null;
  }

  init(contentData) {
    this.data = contentData?.proposal || {};
    this._cacheDOM();
    if (!this.proposalContainer) return;
    this._applyContent();
  }

  _cacheDOM() {
    this.proposalContainer = document.querySelector('.proposal-container');
    this.buildupEl = document.getElementById('proposal-buildup');
    this.buildupLines = document.querySelectorAll('.buildup-line');
    this.questionWrapper = document.getElementById('proposal-question-wrapper');
    this.questionEl = document.getElementById('proposal-question');
    this.buttonsEl = document.getElementById('proposal-buttons');
    this.acceptBtn = document.getElementById('accept-btn');
    this.declineBtn = document.getElementById('decline-btn');
    this.celebrationEl = document.getElementById('celebration');
    this.declineEl = document.getElementById('gentle-decline');
    this.reconsiderBtn = document.getElementById('reconsider-btn');
  }

  _applyContent() {
    if (this.data.question && this.questionEl) {
      this.questionEl.textContent = this.data.question;
    }
    if (this.data.yesText && this.acceptBtn) {
      this.acceptBtn.textContent = this.data.yesText;
    }
    if (this.data.noText && this.declineBtn) {
      this.declineBtn.textContent = this.data.noText;
    }
  }

  /**
   * Called by the scene engine when entering the proposal scene.
   * Starts the dramatic buildup sequence.
   */
  startProposal() {
    if (this.hasProposed || this.answered) return;
    this.hasProposed = true;

    // Dim the background
    document.body.classList.add('proposal-active');

    // Play buildup sound
    window.dispatchEvent(new CustomEvent('play-sound', {
      detail: { name: 'heartbeat-start' }
    }));

    this._animateBuildup();
  }

  /**
   * Scroll-driven progress for the buildup
   */
  onProgress(progress) {
    if (this.answered) return;

    // Begin early enough that the full sequence can breathe before the footer.
    if (progress > 0.16 && !this.hasProposed) {
      this.startProposal();
    }
  }

  /**
   * Dramatic buildup animation sequence
   */
  _animateBuildup() {
    const tl = gsap.timeline({
      onComplete: () => this._revealQuestion()
    });
    this.buildupTimeline = tl;

    // Reveal buildup lines one by one with pauses
    this.buildupLines.forEach((line, i) => {
      tl.fromTo(line,
        {
          opacity: 0,
          y: 30,
          filter: 'blur(10px)',
        },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.95,
          ease: 'power2.out',
        },
        `+=${i === 0 ? 0.35 : 0.55}`
      );

      // Fade out previous lines slightly
      if (i > 0) {
        tl.to(this.buildupLines[i - 1], {
          opacity: 0.3,
          duration: 0.6,
        }, '<');
      }
    });

    // Dramatic pause before question
    tl.to({}, { duration: 1.15 });

    // Fade out all buildup lines
    tl.to(this.buildupLines, {
      opacity: 0,
      y: -20,
      duration: 0.8,
      stagger: 0.1,
      ease: 'power2.in',
    });
  }

  /**
   * Reveal the proposal question with a light surge
   */
  _revealQuestion() {
    // Sound: rising swell
    window.dispatchEvent(new CustomEvent('play-sound', {
      detail: { name: 'proposal-swell' }
    }));

    // Hide buildup, show question
    if (this.buildupEl) this.buildupEl.style.display = 'none';

    const tl = gsap.timeline();

    // Question appears with a dramatic reveal
    if (this.questionWrapper) {
      this.questionWrapper.classList.remove('hidden');

      tl.fromTo(this.questionWrapper,
        {
          opacity: 0,
          scale: 0.8,
          filter: 'blur(20px)',
        },
        {
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          duration: 2.0,
          ease: 'power2.out',
        }
      );
    }

    // Buttons appear after question
    tl.add(() => {
      if (this.buttonsEl) {
        this.buttonsEl.classList.remove('hidden');
        gsap.fromTo(this.buttonsEl,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }
        );
      }
      this._attachButtonHandlers();
    }, '+=1.0');
  }

  /**
   * Button interaction handlers
   */
  _attachButtonHandlers() {
    if (this.acceptBtn) {
      this.acceptBtn.addEventListener('click', () => this._onAccept());
    }

    if (this.declineBtn) {
      this.declineBtn.addEventListener('click', () => this._onDecline());
    }
  }

  /**
   * Celebration: she said yes!
   */
  async _onAccept() {
    if (this.answered) return;
    this.answered = true;

    // Hide question and buttons
    gsap.to([this.questionWrapper, this.buttonsEl], {
      opacity: 0,
      duration: 0.5,
      onComplete: () => {
        this.questionWrapper?.classList.add('hidden');
        this.buttonsEl?.classList.add('hidden');
      }
    });

    // Show celebration
    if (this.celebrationEl) {
      this.celebrationEl.classList.remove('hidden');
      gsap.fromTo(this.celebrationEl,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 1.0, ease: 'power2.out' }
      );
    }

    // Trigger celebration effects
    this.onCelebrationCb();

    // Fire confetti
    this._fireConfetti();

    // Create heart rain
    this._createHeartRain();

    // Sound
    window.dispatchEvent(new CustomEvent('play-sound', {
      detail: { name: 'celebration' }
    }));

    // Add golden glow to body
    document.body.classList.add('celebration-active');
  }

  /**
   * Gentle decline
   */
  _onDecline() {
    if (this.answered) return;
    this.answered = true;

    gsap.to([this.questionWrapper, this.buttonsEl], {
      opacity: 0,
      duration: 0.5,
      onComplete: () => {
        this.questionWrapper?.classList.add('hidden');
        this.buttonsEl?.classList.add('hidden');
      }
    });

    if (this.declineEl) {
      this.declineEl.classList.remove('hidden');
      gsap.fromTo(this.declineEl,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }
      );
    }

    this.onDeclineCb();

    // Reconsider button
    if (this.reconsiderBtn) {
      this.reconsiderBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
          this.hasProposed = false;
          this.answered = false;
          this.declineAttempts = 0;
          if (this.buildupEl) {
            this.buildupEl.style.display = '';
            this.buildupLines.forEach(line => {
              gsap.set(line, { opacity: 0, y: 30, filter: 'blur(10px)' });
            });
          }
          this.declineEl?.classList.add('hidden');
          document.body.classList.remove('proposal-active');
        }, 1500);
      });
    }
  }

  /**
   * Fire confetti burst
   */
  async _fireConfetti() {
    try {
      const { default: confetti } = await import('canvas-confetti');
      const duration = 6000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#ff6b8a', '#ffd700', '#c084fc', '#f472b6'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#ff6b8a', '#ffd700', '#c084fc', '#f472b6'],
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

  /**
   * Create falling hearts animation
   */
  _createHeartRain() {
    const rain = document.querySelector('.heart-rain');
    if (!rain) return;

    for (let i = 0; i < 32; i++) {
      const light = document.createElement('span');
      light.className = 'falling-heart';
      light.style.left = `${Math.random() * 100}%`;
      light.style.animationDelay = `${Math.random() * 5}s`;
      light.style.animationDuration = `${3 + Math.random() * 4}s`;
      light.style.opacity = `${0.35 + Math.random() * 0.55}`;
      light.style.transform = `scale(${0.6 + Math.random() * 1.4})`;
      rain.appendChild(light);
    }
  }
}
