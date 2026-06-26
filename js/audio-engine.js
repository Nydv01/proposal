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
    this.pencilStrokePlayers = [];
  }

  async init() {
    if (this.initialised) return;
    try {
      if (!Tone) {
        Tone = await import('tone');
      }
      await Tone.start();
      this.buildAudioGraph();

      // Load 4 distinct short pencil stroke files for instant zero-latency keyboard syncing
      try {
        this.pencilStrokePlayers = [];
        const strokeFiles = [
          '/audio/pencil-stroke-1.mp3',
          '/audio/pencil-stroke-2.mp3',
          '/audio/pencil-stroke-3.mp3',
          '/audio/pencil-stroke-4.mp3'
        ];

        for (let i = 0; i < strokeFiles.length; i++) {
          const p = new Tone.Player({
            url: strokeFiles[i],
            autostart: false
          }).toDestination();
          p.fadeOut = 0.04; // smooth tail
          this.pencilStrokePlayers.push(p);
        }
      } catch (err) {
        console.warn('Failed to load pencil-stroke sounds:', err);
      }

      // Load vocal celebration track
      try {
        this.vocalPlayer = new Tone.Player({
          url: '/audio/tum-ho-toh-vocals.mp3',
          autostart: false,
          loop: true
        }).toDestination();
      } catch (err) {
        console.warn('Failed to load vocal track:', err);
      }

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
    });
    this.pianoSynth.volume.value = -14;

    this.padSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine4' },
      envelope: { attack: 2.8, decay: 2.0, sustain: 0.65, release: 4.5 }
    });
    this.padSynth.volume.value = -22;

    this.sparkleSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.6, sustain: 0, release: 1.8 }
    });
    this.sparkleSynth.volume.value = -20;

    this.bassSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.06, decay: 0.9, sustain: 0.12, release: 1.2 }
    });
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
    player.volume.value = -16;
    this.trackGain.gain.rampTo(1, 1.4);
    this.generativeGain.gain.rampTo(0, 1.4);
  }

  startGenerativeForTheme(themeIndex) {
    // Generative synth fallback disabled to ensure only real audio tracks play
    return;
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
      // Open filter completely to 20kHz so the track becomes crystal clear immediately
      this.masterFilter.frequency.rampTo(20000, 1.0);
      this.reverb.wet.rampTo(0.15, 1.0); // clean presence, less reverb blur

      // Set full, clear volume for the track
      this.players.forEach((p) => {
        if (p.state === 'started') p.volume.rampTo(-8, 1.0); // clear volume level (-8dB)
      });

      // Stop focus drone if active to keep music crisp and clean
      if (this.focusDrone) {
        this.focusDrone.stop(now);
      }
    } else {
      // Restore scroll-synced muffled (blurry) and lower volume levels
      this.updateScrollPosition(this.scrollProgress);
    }
  }

  updateScrollPosition(progress) {
    if (!this.initialised || this.muted) return;
    this.scrollProgress = progress;

    if (this.isFocused) return;

    // Dreamy low-pass filter sweep range (intelligible but warm and muffled)
    const targetFreq = 500 + progress * 600; // 500Hz at top, 1100Hz at bottom
    this.masterFilter.frequency.rampTo(targetFreq, 0.35);
    this.masterFilter.Q.rampTo(0.8 + Math.sin(progress * Math.PI) * 0.4, 0.35);

    // Warm, ambient background volume levels
    const vol = -18 + progress * 8; // -18dB to -10dB (clearly audible but background)
    this.players.forEach((p) => {
      if (p.state === 'started') p.volume.rampTo(vol, 0.4);
    });

    this.reverb.wet.rampTo(0.65 - progress * 0.15, 0.5); // high-quality reverb spacing
  }

  playSFX(name) {
    if (!this.initialised || this.muted) return;

    if (name === 'typewriter-click') {
      // Only play a stroke sound on ~45% of characters to simulate natural pencil lifts and stroke grouping
      if (Math.random() > 0.45) return;

      if (this.pencilStrokePlayers && this.pencilStrokePlayers.length > 0) {
        try {
          // Select a random stroke player to vary the scratch sound
          const randomIndex = Math.floor(Math.random() * this.pencilStrokePlayers.length);
          const player = this.pencilStrokePlayers[randomIndex];

          if (player && player.loaded) {
            // Play from beginning (offset = 0) for absolute instant, zero-latency trigger
            // Wider pitch/speed variation (0.75 to 1.35) for highly organic handwriting strokes
            player.playbackRate = 0.75 + Math.random() * 0.6;

            // Highly randomized volume (-36dB to -28dB) to mimic natural hand pressure changes
            player.volume.value = -36 + Math.random() * 8;

            player.start(Tone.now());
            return;
          }
        } catch (e) {
          console.warn('Error playing pencil stroke:', e);
        }
      }

      // Fallback click
      try {
        const sine = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.002, decay: 0.015, sustain: 0, release: 0.015 }
        }).toDestination();
        sine.volume.value = -48; // extremely quiet fallback click
        const pitch = 850 + Math.random() * 250;
        sine.triggerAttackRelease(pitch, '64n');
        setTimeout(() => sine.dispose(), 100);
      } catch (e) { }
    }
  }

  triggerCelebration() {
    if (!this.initialised) return;
    this.isClimax = true;
    this.masterFilter.frequency.rampTo(20000, 0.5);

    // Fade out any active background music players
    this.players.forEach((p) => {
      if (p.state === 'started') {
        p.volume.rampTo(-60, 1.2);
        setTimeout(() => {
          if (this.isClimax) p.stop();
        }, 1300);
      }
    });

    // Play vocal track
    if (this.vocalPlayer) {
      if (this.vocalPlayer.state !== 'started') {
        this.vocalPlayer.volume.value = -6;
        this.vocalPlayer.start();
      }
    }
  }

  triggerReconsider() {
    if (!this.initialised) return;
    this.isClimax = false;

    // Stop vocal player
    if (this.vocalPlayer && this.vocalPlayer.state === 'started') {
      this.vocalPlayer.stop();
    }

    // Resume background instrumental track (ramp its volume back up)
    if (this.currentTrack) {
      const p = this.players.get(this.currentTrack.src);
      if (p) {
        p.volume.value = -16;
        if (p.state !== 'started') {
          p.start();
        }
      }
    }
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

  startHeartbeat() {
    if (!this.initialised) return;
    this.stopHeartbeat(); // safety: stop any existing heartbeat loop

    // Create the synth if it doesn't exist
    if (!this.heartbeatSynth) {
      this.heartbeatSynth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: {
          attack: 0.03,
          decay: 0.15,
          sustain: 0,
          release: 0.2
        }
      }).toDestination();
    }

    // Double beat helper
    const triggerDoubleBeat = () => {
      if (!this.heartbeatIntervalId) return;
      try {
        const now = Tone.now();
        // Lub (deep thump)
        this.heartbeatSynth.triggerAttackRelease(55, 0.12, now);
        // Dub (slightly quieter and lower)
        const dubVolume = this.heartbeatSynth.volume.value;
        this.heartbeatSynth.volume.setValueAtTime(dubVolume - 3, now + 0.25);
        this.heartbeatSynth.triggerAttackRelease(46, 0.12, now + 0.25);
        // Restore volume
        this.heartbeatSynth.volume.setValueAtTime(dubVolume, now + 0.4);
      } catch (e) {
        console.warn('Heartbeat play error:', e);
      }
    };

    triggerDoubleBeat(); // trigger first beat immediately
    this.heartbeatIntervalId = setInterval(triggerDoubleBeat, 1100); // repeat every 1.1 seconds (~54 bpm)
  }

  stopHeartbeat() {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  playMonologueAppear() {
    if (!this.initialised || this.muted) return;
    try {
      const noise = new Tone.Noise("pink").start();
      const filter = new Tone.Filter({
        type: "bandpass",
        frequency: 180,
        Q: 3.5
      }).toDestination();

      const gain = new Tone.Gain(0).connect(filter);
      noise.connect(gain);

      const now = Tone.now();
      // Ramp volume up and down
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.6); // very soft
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

      // Sweep filter frequency up (rising)
      filter.frequency.setValueAtTime(180, now);
      filter.frequency.exponentialRampToValueAtTime(550, now + 1.0);

      // Trigger a very quiet magical spark
      if (this.sparkleSynth) {
        this.sparkleSynth.volume.value = -24;
        const notes = ["C6", "E6", "G6"];
        const randNote = notes[Math.floor(Math.random() * notes.length)];
        this.sparkleSynth.triggerAttackRelease(randNote, "2n", now + 0.1);
      }

      setTimeout(() => {
        noise.stop();
        noise.dispose();
        filter.dispose();
        gain.dispose();
      }, 1800);
    } catch (e) {
      console.warn("Monologue appear play error:", e);
    }
  }

  playMonologueFade() {
    if (!this.initialised || this.muted) return;
    try {
      const noise = new Tone.Noise("pink").start();
      const filter = new Tone.Filter({
        type: "bandpass",
        frequency: 550,
        Q: 3.0
      }).toDestination();

      const gain = new Tone.Gain(0).connect(filter);
      noise.connect(gain);

      const now = Tone.now();
      // Ramp volume up and down
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.035, now + 0.4); // soft
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

      // Sweep filter frequency down (falling)
      filter.frequency.setValueAtTime(550, now);
      filter.frequency.exponentialRampToValueAtTime(150, now + 1.2);

      setTimeout(() => {
        noise.stop();
        noise.dispose();
        filter.dispose();
        gain.dispose();
      }, 1800);
    } catch (e) {
      console.warn("Monologue fade play error:", e);
    }
  }

  destroy() {
    if (Tone) {
      try {
        Tone.Transport.stop();
      } catch (e) { }
      this.stopGenerative();
      this.stopHeartbeat();
      this.players.forEach((p) => p.dispose());
      this.pencilStrokePlayers.forEach((p) => p.dispose());
      if (this.vocalPlayer) {
        this.vocalPlayer.dispose();
      }
      if (this.heartbeatSynth) {
        this.heartbeatSynth.dispose();
      }
    }
    this.initialised = false;
  }
}
