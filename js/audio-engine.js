/**
 * Premium audio — AT-style playlist + blur-to-clear scroll sweep + generative fallback.
 */
let Tone = null;

const THEMES = [
  { bpm: 62, root: 'C', mood: 'ethereal' },
  { bpm: 68, root: 'F', mood: 'warm' },
  { bpm: 72, root: 'G', mood: 'romantic' },
  { bpm: 66, root: 'A', mood: 'dream' },
  { bpm: 70, root: 'D', mood: 'cinematic' }
];

const SCALE = {
  C: ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'E5'],
  F: ['F4', 'G4', 'A4', 'C5', 'D5', 'F5', 'A5'],
  G: ['G4', 'A4', 'B4', 'D5', 'E5', 'G5', 'B5'],
  A: ['A4', 'B4', 'C#5', 'E5', 'F#5', 'A5', 'C#6'],
  D: ['D4', 'E4', 'F#4', 'A4', 'B4', 'D5', 'F#5']
};

export class AudioEngine {
  constructor() {
    this.initialised = false;
    this.muted = false;
    this.scrollProgress = 0;
    this.isClimax = false;
    this.currentTrack = null;
    this.currentTheme = 0;
    this.players = new Map();
    this.generativeActive = false;
    this._loops = [];
    this.isFocused = false;
    this.focusDrone = null;
  }

  async init() {
    if (this.initialised) return;
    try {
      if (!Tone) {
        Tone = await import('tone');
      }
      await Tone.start();
      this.buildAudioGraph();
      this.initialised = true;
    } catch (e) {
      console.warn('AudioEngine init failed:', e);
    }
  }

  buildAudioGraph() {
    this.masterFilter = new Tone.Filter({
      type: 'lowpass',
      frequency: 120,
      Q: 0.9,
      rolloff: -24
    });

    this.trackGain = new Tone.Gain(0);
    this.generativeGain = new Tone.Gain(0);

    this.reverb = new Tone.Reverb({ decay: 7.5, wet: 0.62 }).toDestination();
    this.delay = new Tone.FeedbackDelay({
      delayTime: '8n.',
      feedback: 0.38,
      wet: 0.22
    });

    this.masterFilter.connect(this.delay);
    this.delay.connect(this.reverb);
    this.trackGain.connect(this.masterFilter);
    this.generativeGain.connect(this.masterFilter);

    this.pianoSynth = new Tone.Synth({
      oscillator: { type: 'triangle8' },
      envelope: { attack: 0.1, decay: 1.4, sustain: 0.06, release: 2.8 }
    }).connect(this.generativeGain);
    this.pianoSynth.volume.value = -14;

    this.padSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine4' },
      envelope: { attack: 2.8, decay: 2.0, sustain: 0.65, release: 4.5 }
    }).connect(this.generativeGain);
    this.padSynth.volume.value = -22;

    this.sparkleSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.6, sustain: 0, release: 1.8 }
    }).connect(this.generativeGain);
    this.sparkleSynth.volume.value = -20;

    this.bassSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.06, decay: 0.9, sustain: 0.12, release: 1.2 }
    }).connect(this.generativeGain);
    this.bassSynth.volume.value = -28;
  }

  async playTrack(track) {
    if (!this.initialised) await this.init();
    this.currentTrack = track;
    this.currentTheme = track.theme ?? 0;
    this.stopGenerative();

    const existing = this.players.get(track.src);
    if (existing) {
      await this.crossfadeTo(existing);
      return;
    }

    try {
      const buffer = await Tone.Buffer.fromUrl(track.src);
      const player = new Tone.Player(buffer).connect(this.trackGain);
      player.loop = true;
      await this.crossfadeTo(player);
      this.players.set(track.src, player);
    } catch {
      this.startGenerativeForTheme(this.currentTheme);
    }
  }

  async crossfadeTo(player) {
    this.players.forEach((p) => {
      if (p !== player && p.state === 'started') {
        p.rampTo(0, 1.2);
        setTimeout(() => p.stop(), 1300);
      }
    });

    this.generativeGain.gain.rampTo(0, 1.0);
    this.generativeActive = false;

    if (player.state !== 'started') player.start();
    player.loop = true;
    player.volume.value = -8;
    this.trackGain.gain.rampTo(1, 1.4);
    this.generativeGain.gain.rampTo(0, 1.4);
  }

  startGenerativeForTheme(themeIndex) {
    this.stopGenerative();
    this.generativeActive = true;
    this.trackGain.gain.rampTo(0, 0.8);
    this.generativeGain.gain.rampTo(1, 1.2);

    const theme = THEMES[themeIndex % THEMES.length];
    const notes = SCALE[theme.root] || SCALE.C;
    Tone.Transport.bpm.value = theme.bpm;

    const pianoLoop = new Tone.Loop((time) => {
      if (this.isClimax || !this.generativeActive || this.isFocused) return;
      if (Math.random() > 0.32) {
        const note = notes[Math.floor(Math.random() * notes.length)];
        this.pianoSynth.triggerAttackRelease(note, '2n', time);
      }
    }, '2n').start(0);

    const sparkleLoop = new Tone.Loop((time) => {
      if (this.isClimax || !this.generativeActive || this.isFocused) return;
      if (Math.random() > 0.65) {
        this.sparkleSynth.triggerAttackRelease(notes[notes.length - 1], '16n', time);
      }
    }, '1m').start(0);

    const padLoop = new Tone.Loop((time) => {
      if (this.isClimax || !this.generativeActive || this.isFocused) return;
      const chord = [notes[0], notes[2], notes[4], notes[5]].map((n) => n.replace('5', '3'));
      this.padSynth.triggerAttackRelease(chord, '1m', time);
    }, '2m').start(0);

    this._loops = [pianoLoop, sparkleLoop, padLoop];
    if (Tone.Transport.state !== 'started') Tone.Transport.start();
  }

  stopGenerative() {
    this._loops.forEach((l) => l.dispose());
    this._loops = [];
  }

  setFocusedState(isActive) {
    if (!this.initialised || this.muted) return;
    this.isFocused = isActive;
    const now = Tone.now();

    if (isActive) {
      // Muffle master filter down to low ambient drone ranges
      this.masterFilter.frequency.rampTo(140, 1.2);
      this.reverb.wet.rampTo(0.92, 1.2);

      // Soften main gains
      this.generativeGain.gain.rampTo(0.1, 1.0);
      this.trackGain.gain.rampTo(0.1, 1.0);

      // Synthesize deep baseline resonant hum (Sine at 110Hz)
      if (!this.focusDrone) {
        this.focusDrone = new Tone.Oscillator(110, 'sine').connect(this.reverb);
        this.focusDrone.volume.value = -30;
      }
      this.focusDrone.start(now);
      this.focusDrone.volume.rampTo(-18, 1.4);
    } else {
      // Fade and stop focus drone
      this.focusDrone?.volume.rampTo(-40, 1.0);
      setTimeout(() => {
        if (!this.isFocused) {
          this.focusDrone?.stop();
        }
      }, 1050);

      this.generativeGain.gain.rampTo(1.0, 1.2);
      this.trackGain.gain.rampTo(1.0, 1.2);

      // Restore scroll-synced frequency offsets
      this.updateScrollPosition(this.scrollProgress);
    }
  }

  updateScrollPosition(progress) {
    if (!this.initialised || this.muted) return;
    this.scrollProgress = progress;

    if (this.isFocused) return;

    const targetFreq = 100 + progress * 17900;
    this.masterFilter.frequency.rampTo(targetFreq, 0.35);
    this.masterFilter.Q.rampTo(0.7 + Math.sin(progress * Math.PI) * 1.8, 0.35);

    if (this.generativeActive) {
      this.pianoSynth.volume.rampTo(-14 + progress * 10, 0.4);
      this.padSynth.volume.rampTo(-22 + progress * 10, 0.4);
    } else {
      const vol = -14 + progress * 6;
      this.players.forEach((p) => {
        if (p.state === 'started') p.volume.rampTo(vol, 0.4);
      });
    }

    this.reverb.wet.rampTo(0.62 - progress * 0.28, 0.5);
  }

  playSFX(name) {
    if (!this.initialised || this.muted) return;

    if (name === 'wax-seal-crack') {
      const noise = new Tone.Noise('white').start();
      const f = new Tone.Filter(2800, 'bandpass').connect(this.reverb);
      noise.connect(f);
      const env = new Tone.AmplitudeEnvelope({ attack: 0.004, decay: 0.14, sustain: 0, release: 0.1 }).connect(f);
      noise.connect(env);
      env.triggerAttackRelease(0.18);
      const thud = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.35, sustain: 0, release: 0.25 } }).connect(this.reverb);
      thud.volume.value = -6;
      thud.triggerAttackRelease('C2', '8n');
      setTimeout(() => { noise.dispose(); f.dispose(); env.dispose(); thud.dispose(); }, 1200);
    } else if (name === 'section-chime' || name === 'track-change') {
      const chime = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.9, sustain: 0, release: 1.6 } }).connect(this.reverb);
      chime.volume.value = -12;
      chime.triggerAttackRelease(name === 'track-change' ? 'G5' : 'E5', '8n');
      setTimeout(() => chime.dispose(), 3000);
    }
  }

  triggerCelebration() {
    if (!this.initialised) return;
    this.isClimax = true;
    this.masterFilter.frequency.rampTo(20000, 0.5);

    const celeb = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.08, decay: 0.5, sustain: 0.45, release: 3.2 }
    }).connect(this.reverb);
    celeb.volume.value = -4;
    const notes = ['C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6'];
    const now = Tone.now();
    notes.forEach((n, i) => celeb.triggerAttackRelease(n, '1m', now + i * 0.09));
  }

  triggerSadMoment() {
    if (!this.initialised) return;
    this.masterFilter.frequency.rampTo(180, 1.5);
    this.generativeGain.gain.rampTo(0.3, 1);
  }

  setMuted(muted) {
    this.muted = muted;
    if (Tone) {
      Tone.Destination.mute = muted;
    }
  }

  isMuted() {
    return this.muted;
  }

  destroy() {
    if (Tone) {
      try {
        Tone.Transport.stop();
      } catch (e) { }
      this.stopGenerative();
      this.players.forEach((p) => p.dispose());
    }
    this.initialised = false;
  }
}
