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
    this.timelineContainer = null;
    this.activePath = null;
    this.bgPath = null;
    this.glowDot = null;
    this.activePathLength = 0;
    this.resizeHandler = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the story scene
   */
  init() {
    this.timelineLine = document.querySelector('.timeline-line');
    this.timelineContainer = document.querySelector('.story-timeline');
    this.activePath = document.querySelector('.timeline-path-active');
    this.bgPath = document.querySelector('.timeline-path-bg');
    this.glowDot = document.querySelector('.timeline-glow-dot');
    this.milestones = Array.from(document.querySelectorAll('.story-milestone'));

    if (!this.milestones.length) return;

    // Set initial states
    this.milestones.forEach((milestone, i) => {
      const card = milestone.querySelector('.milestone-card');
      const date = milestone.querySelector('.milestone-date');
      const dot = milestone.querySelector('.milestone-dot');
      const isLeft = i % 2 === 0;

      if (card) {
        gsap.set(card, {
          opacity: 0,
          x: isLeft ? -60 : 60,
          filter: 'blur(12px)',
          scale: 0.9,
        });
      }

      if (date) {
        gsap.set(date, {
          opacity: 0,
          y: -20,
        });
      }

      if (dot) {
        gsap.set(dot, {
          scale: 0,
          opacity: 0,
        });
      }
    });

    // Compute the curvy path after a brief layout settling delay
    setTimeout(() => {
      this.updatePath();
    }, 150);

    // Setup window resize handler
    this.resizeHandler = () => this.updatePath();
    window.addEventListener('resize', this.resizeHandler);

    this.isInitialized = true;
  }

  /**
   * Calculates dot center coordinates relative to the timeline container
   * and builds a smooth alternating cubic Bezier path.
   */
  updatePath() {
    if (!this.milestones.length || !this.activePath || !this.bgPath || !this.timelineContainer) return;

    const timelineRect = this.timelineContainer.getBoundingClientRect();

    // Map dot centers relative to the timeline container
    const points = this.milestones.map(milestone => {
      const dot = milestone.querySelector('.milestone-dot');
      if (!dot) return null;

      const dotRect = dot.getBoundingClientRect();
      return {
        x: dotRect.left + dotRect.width / 2 - timelineRect.left,
        y: dotRect.top + dotRect.height / 2 - timelineRect.top
      };
    }).filter(Boolean);

    if (points.length < 2) return;

    const isMobile = window.innerWidth <= 768;
    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const h = p2.y - p1.y;
      const midY = (p1.y + p2.y) / 2;

      const isRight = i % 2 === 0;
      // Alternate bulge direction: swing right next to date, left next to date
      const sweep = isMobile ? (isRight ? 12 : -12) : (isRight ? 90 : -90);
      const midX = (p1.x + p2.x) / 2 + sweep;

      // Two-segment Bezier curves to enforce vertical start/end tangents and horizontal mid-point tangent
      const cp1_1x = p1.x;
      const cp1_1y = p1.y + h * 0.25;
      const cp1_2x = midX - sweep * 0.35;
      const cp1_2y = midY;

      const cp2_1x = midX + sweep * 0.35;
      const cp2_1y = midY;
      const cp2_2x = p2.x;
      const cp2_2y = p2.y - h * 0.25;

      d += ` C ${cp1_1x} ${cp1_1y}, ${cp1_2x} ${cp1_2y}, ${midX} ${midY}`;
      d += ` C ${cp2_1x} ${cp2_1y}, ${cp2_2x} ${cp2_2y}, ${p2.x} ${p2.y}`;
    }

    this.bgPath.setAttribute('d', d);
    this.activePath.setAttribute('d', d);

    const totalLength = this.activePath.getTotalLength();
    this.activePathLength = totalLength;

    this.activePath.style.strokeDasharray = totalLength;
    this.activePath.style.strokeDashoffset = totalLength;
  }

  /**
   * Update based on scroll progress through the story scene
   * @param {number} progress - 0 to 1
   */
  onProgress(progress) {
    if (!this.isInitialized) return;

    // Scale progress so the line fully draws slightly before the end of scroll
    const fillProgress = Math.min(1, progress * 1.15);

    // Draw the active line
    const totalLength = this.activePathLength || 0;
    if (totalLength > 0 && this.activePath) {
      const drawOffset = totalLength * (1 - fillProgress);
      gsap.to(this.activePath, {
        strokeDashoffset: Math.max(0, drawOffset),
        duration: 0.15,
        ease: 'none',
        overwrite: 'auto',
      });

      // Position leading glow dot
      if (this.glowDot) {
        const currentLength = fillProgress * totalLength;
        if (currentLength > 0.01) {
          try {
            const point = this.activePath.getPointAtLength(currentLength);
            gsap.to(this.glowDot, {
              cx: point.x,
              cy: point.y,
              opacity: progress > 0.02 && progress < 0.98 ? 1 : 0,
              scale: progress > 0.02 && progress < 0.98 ? 1.2 : 0,
              duration: 0.15,
              ease: 'none',
              overwrite: 'auto',
            });
          } catch (e) {
            // Fallback for edge cases
          }
        } else {
          gsap.to(this.glowDot, { opacity: 0, scale: 0, duration: 0.15, overwrite: 'auto' });
        }
      }
    }

    // Reveal milestones based on progress
    const totalMilestones = this.milestones.length;
    const adjustedProgress = Math.max(0, (progress - 0.08) / 0.84);

    this.milestones.forEach((milestone, i) => {
      const threshold = i / totalMilestones;
      const card = milestone.querySelector('.milestone-card');
      const date = milestone.querySelector('.milestone-date');
      const dot = milestone.querySelector('.milestone-dot');

      if (adjustedProgress >= threshold && !milestone.classList.contains('milestone-revealed')) {
        milestone.classList.add('milestone-revealed');

        const stagger = i * 0.15;

        // Animate dot first
        if (dot) {
          gsap.to(dot, {
            scale: 1,
            opacity: 1,
            duration: 0.5,
            delay: stagger,
            ease: 'back.out(2)',
          });
        }

        // Then date
        if (date) {
          gsap.to(date, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            delay: stagger + 0.15,
            ease: 'power2.out',
          });
        }

        // Then card with directional slide
        if (card) {
          gsap.to(card, {
            opacity: 1,
            x: 0,
            filter: 'blur(0px)',
            scale: 1,
            duration: 0.9,
            delay: stagger + 0.25,
            ease: 'power3.out',
          });
        }

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
    // Re-verify the path layout on entry to make sure coordinates match perfectly
    this.updatePath();
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
    this.milestones.forEach((milestone, i) => {
      milestone.classList.remove('milestone-revealed');
      const card = milestone.querySelector('.milestone-card');
      const date = milestone.querySelector('.milestone-date');
      const dot = milestone.querySelector('.milestone-dot');
      const isLeft = i % 2 === 0;

      if (card) gsap.set(card, { opacity: 0, x: isLeft ? -60 : 60, filter: 'blur(12px)', scale: 0.9 });
      if (date) gsap.set(date, { opacity: 0, y: -20 });
      if (dot) gsap.set(dot, { scale: 0, opacity: 0 });
    });

    if (this.activePath) {
      this.activePath.style.strokeDashoffset = this.activePathLength;
    }
    if (this.glowDot) {
      gsap.set(this.glowDot, { opacity: 0, scale: 0 });
    }
  }

  destroy() {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    this.milestones = [];
    this.isInitialized = false;
  }
}
