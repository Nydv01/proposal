/**
 * ActiveTheory-style bottom music chrome: <<  Title — Artist  >>
 */
export class MusicPlayer {
  constructor(audioEngine, tracks = []) {
    this.audioEngine = audioEngine;
    this.tracks = tracks.length ? tracks : DEFAULT_TRACKS;
    this.index = 0;
    this.root = document.getElementById('at-music-player');
    this.titleEl = document.getElementById('music-title');
    this.artistEl = document.getElementById('music-artist');
    this.prevBtn = document.getElementById('music-prev');
    this.nextBtn = document.getElementById('music-next');
  }

  show() {
    if (!this.root) return;
    this.root.classList.remove('hidden');
    this.updateUI();
    this.bind();
  }

  bind() {
    this.prevBtn?.addEventListener('click', () => this.prev());
    this.nextBtn?.addEventListener('click', () => this.next());
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' && e.altKey) this.prev();
      if (e.key === 'ArrowRight' && e.altKey) this.next();
    });
  }

  updateUI() {
    const t = this.tracks[this.index];
    if (this.titleEl) this.titleEl.textContent = t.title;
    if (this.artistEl) this.artistEl.textContent = t.artist;
  }

  async playIndex(i) {
    this.index = (i + this.tracks.length) % this.tracks.length;
    this.updateUI();
    if (this.audioEngine?.playTrack) {
      await this.audioEngine.playTrack(this.tracks[this.index]);
    }
  }

  prev() {
    this.playIndex(this.index - 1);
    window.dispatchEvent(new CustomEvent('play-sound', { detail: { name: 'track-change' } }));
  }

  next() {
    this.playIndex(this.index + 1);
    window.dispatchEvent(new CustomEvent('play-sound', { detail: { name: 'track-change' } }));
  }

  /** Auto-advance playlist on scroll phase */
  onPhaseChange(phaseId) {
    const map = { mind: 0, poem: 1, story: 2, memories: 3, forever: 4 };
    const idx = map[phaseId] ?? this.index;
    if (idx !== this.index) this.playIndex(idx);
  }
}

const DEFAULT_TRACKS = [
  { title: 'Tum Ho Toh (Intro)', artist: 'Saiyaara x Lana Del Rey', src: '/audio/tum-ho-toh.mp3', theme: 0 },
  { title: 'Say Yes to Heaven', artist: 'Saiyaara x Lana Del Rey', src: '/audio/tum-ho-toh.mp3', theme: 1 },
  { title: 'Saiyaara x Lana', artist: 'Tum Ho Toh Mashup', src: '/audio/tum-ho-toh.mp3', theme: 2 },
  { title: 'Tum Ho Toh (Soothing)', artist: 'Saiyaara x Lana Del Rey', src: '/audio/tum-ho-toh.mp3', theme: 3 },
  { title: 'Tum Ho Toh (Climax)', artist: 'Saiyaara x Lana Del Rey', src: '/audio/tum-ho-toh.mp3', theme: 4 }
];
