/**
 * ActiveTheory-style minimal UI chrome — pill nav, scroll counter, phase label.
 */
import gsap from 'gsap';

const PHASES = [
  { id: 'mind', label: 'Mind', range: [0, 0.18] },
  { id: 'poem', label: 'Poem', range: [0.18, 0.38] },
  { id: 'story', label: 'Story', range: [0.38, 0.55] },
  { id: 'memories', label: 'Memories', range: [0.55, 0.82] },
  { id: 'forever', label: 'Forever', range: [0.82, 1] }
];

export class ExperienceChrome {
  constructor({ onNavigate } = {}) {
    this.root = document.getElementById('at-chrome');
    this.pctEl = document.getElementById('at-scroll-pct');
    this.phaseEl = document.getElementById('at-phase-label');
    this.pills = this.root?.querySelectorAll('[data-phase]') ?? [];
    this.onNavigate = onNavigate ?? null;
    this.progress = 0;
  }

  show() {
    if (!this.root) return;
    this.root.classList.remove('hidden');
    gsap.fromTo(this.root, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', delay: 0.3 });
    this.pills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const phase = pill.dataset.phase;
        const def = PHASES.find((p) => p.id === phase);
        if (def && this.onNavigate) {
          const mid = (def.range[0] + def.range[1]) / 2;
          this.onNavigate(mid);
        }
      });
    });
  }

  updateProgress(progress) {
    this.progress = progress;
    const pct = Math.round(progress * 100);
    if (this.pctEl) this.pctEl.textContent = `/${pct}/`;

    const phase = PHASES.find((p) => progress >= p.range[0] && progress < p.range[1]) ?? PHASES[PHASES.length - 1];
    if (this.phaseEl) this.phaseEl.textContent = phase.label;

    this.pills.forEach((pill) => {
      pill.classList.toggle('active', pill.dataset.phase === phase.id);
    });

    window.dispatchEvent(new CustomEvent('phase-change', { detail: { phase: phase.id } }));
  }
}
