/**
 * poem-scene.js — Cinematic poem reveal with line-by-line animation.
 * Uses SplitType for character-level animation, blur-to-clear reveals,
 * and subtle particle atmosphere between lines.
 */
import gsap from 'gsap';

export class PoemScene {
  constructor() {
    this.container = null;
    this.lines = [];
    this.isInitialized = false;
    this.currentLineIndex = -1;
  }

  /**
   * Initialize the poem scene
   * @param {string[]} poemLines - Array of poem line strings
   */
  init(poemLines) {
    this.container = document.getElementById('poem-container');
    if (!this.container || !poemLines?.length) return;

    // Clear and populate with styled lines
    this.container.innerHTML = '';
    
    poemLines.forEach((line, i) => {
      const lineEl = document.createElement('div');
      lineEl.className = 'poem-line';
      lineEl.dataset.index = i;

      if (line === '') {
        // Empty line = stanza break
        lineEl.classList.add('poem-stanza-break');
        lineEl.innerHTML = '<span class="stanza-spacer"></span>';
      } else if (i === 0) {
        // First line = salutation
        lineEl.classList.add('poem-salutation');
        lineEl.textContent = line;
      } else if (line.startsWith('—') || line.startsWith('With all')) {
        // Signature lines
        lineEl.classList.add('poem-closing');
        lineEl.textContent = line;
      } else {
        lineEl.textContent = line;
      }

      // Start invisible
      gsap.set(lineEl, {
        opacity: 0,
        y: 20,
        filter: 'blur(8px)',
      });

      this.container.appendChild(lineEl);
      this.lines.push(lineEl);
    });

    this.isInitialized = true;
  }

  /**
   * Animate poem lines based on scroll progress
   * @param {number} progress - 0 to 1 scroll progress through poem scene
   */
  onProgress(progress) {
    if (!this.isInitialized || !this.lines.length) return;

    const totalLines = this.lines.length;
    // Reserve 10% at start for scene entrance, 10% at end for breathing room
    const adjustedProgress = Math.max(0, Math.min(1, (progress - 0.05) / 0.9));
    const targetLine = Math.floor(adjustedProgress * totalLines);

    // Reveal lines up to the current target
    this.lines.forEach((lineEl, i) => {
      if (i <= targetLine && !lineEl.classList.contains('poem-revealed')) {
        lineEl.classList.add('poem-revealed');

        const isStanzaBreak = lineEl.classList.contains('poem-stanza-break');
        const delay = isStanzaBreak ? 0 : 0.1;

        gsap.to(lineEl, {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: isStanzaBreak ? 0.3 : 0.8,
          delay,
          ease: 'power2.out',
        });
      }
    });

    // Auto-scroll the poem container to keep current line visible
    if (targetLine >= 0 && targetLine < this.lines.length) {
      const currentLine = this.lines[targetLine];
      if (currentLine && this.container) {
        const containerRect = this.container.getBoundingClientRect();
        const lineRect = currentLine.getBoundingClientRect();
        const offset = lineRect.top - containerRect.top - containerRect.height / 2;

        if (Math.abs(offset) > 50) {
          gsap.to(this.container, {
            scrollTop: this.container.scrollTop + offset,
            duration: 0.6,
            ease: 'power2.out',
          });
        }
      }
    }
  }

  /**
   * Called when entering the poem scene
   */
  onEnter() {
    // Add atmospheric class for CSS effects
    document.body.classList.add('poem-active');
  }

  /**
   * Called when leaving the poem scene
   */
  onLeave() {
    document.body.classList.remove('poem-active');
  }

  /**
   * Reset all lines to hidden state
   */
  reset() {
    this.lines.forEach(lineEl => {
      lineEl.classList.remove('poem-revealed');
      gsap.set(lineEl, {
        opacity: 0,
        y: 20,
        filter: 'blur(8px)',
      });
    });
    this.currentLineIndex = -1;
  }

  destroy() {
    this.lines = [];
    this.isInitialized = false;
  }
}
