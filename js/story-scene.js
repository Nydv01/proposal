/**
 * story-scene.js — Cinematic story timeline with milestone reveals.
 * Each milestone animates in with scroll-driven timing, creating a
 * visual journey through the relationship timeline.
 */
import gsap from 'gsap';

export class StoryScene {
  constructor() {
    this.milestones = [];
    this.timelineLine = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the story scene
   */
  init() {
    this.timelineLine = document.querySelector('.timeline-line');
    this.milestones = Array.from(document.querySelectorAll('.story-milestone'));

    if (!this.milestones.length) return;

    // Set initial states
    this.milestones.forEach((milestone, i) => {
      const card = milestone.querySelector('.milestone-card');
      const date = milestone.querySelector('.milestone-date');
      const dot = milestone.querySelector('.milestone-dot');
      const isLeft = i % 2 === 0;

      gsap.set(card, {
        opacity: 0,
        x: isLeft ? -60 : 60,
        filter: 'blur(12px)',
        scale: 0.9,
      });

      gsap.set(date, {
        opacity: 0,
        y: -20,
      });

      gsap.set(dot, {
        scale: 0,
        opacity: 0,
      });
    });

    if (this.timelineLine) {
      gsap.set(this.timelineLine, { scaleY: 0, transformOrigin: 'top center' });
    }

    this.isInitialized = true;
  }

  /**
   * Update based on scroll progress through the story scene
   * @param {number} progress - 0 to 1
   */
  onProgress(progress) {
    if (!this.isInitialized) return;

    // Animate the timeline line growing
    if (this.timelineLine) {
      gsap.to(this.timelineLine, {
        scaleY: Math.min(1, progress * 1.3),
        duration: 0.3,
        ease: 'none',
      });
    }

    // Reveal milestones based on progress
    const totalMilestones = this.milestones.length;
    // Distribute milestones across 80% of the scroll (10% padding each end)
    const adjustedProgress = Math.max(0, (progress - 0.08) / 0.84);

    this.milestones.forEach((milestone, i) => {
      const threshold = i / totalMilestones;
      const card = milestone.querySelector('.milestone-card');
      const date = milestone.querySelector('.milestone-date');
      const dot = milestone.querySelector('.milestone-dot');
      const isLeft = i % 2 === 0;

      if (adjustedProgress >= threshold && !milestone.classList.contains('milestone-revealed')) {
        milestone.classList.add('milestone-revealed');

        const stagger = i * 0.15;

        // Animate dot first
        gsap.to(dot, {
          scale: 1,
          opacity: 1,
          duration: 0.5,
          delay: stagger,
          ease: 'back.out(2)',
        });

        // Then date
        gsap.to(date, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          delay: stagger + 0.15,
          ease: 'power2.out',
        });

        // Then card with directional slide
        gsap.to(card, {
          opacity: 1,
          x: 0,
          filter: 'blur(0px)',
          scale: 1,
          duration: 0.9,
          delay: stagger + 0.25,
          ease: 'power3.out',
        });

        // Add mood-specific glow
        const mood = milestone.dataset.mood;
        if (mood) {
          milestone.classList.add(`mood-${mood}`);
        }
      }
    });
  }

  /**
   * Called when entering the story scene
   */
  onEnter() {
    document.body.classList.add('story-active');
  }

  /**
   * Called when leaving the story scene
   */
  onLeave() {
    document.body.classList.remove('story-active');
  }

  /**
   * Reset all milestones
   */
  reset() {
    this.milestones.forEach(milestone => {
      milestone.classList.remove('milestone-revealed');
      const card = milestone.querySelector('.milestone-card');
      const date = milestone.querySelector('.milestone-date');
      const dot = milestone.querySelector('.milestone-dot');

      gsap.set(card, { opacity: 0, x: -60, filter: 'blur(12px)', scale: 0.9 });
      gsap.set(date, { opacity: 0, y: -20 });
      gsap.set(dot, { scale: 0, opacity: 0 });
    });

    if (this.timelineLine) {
      gsap.set(this.timelineLine, { scaleY: 0 });
    }
  }

  destroy() {
    this.milestones = [];
    this.isInitialized = false;
  }
}
