// ── audio.js ────────────────────────────────────────────────────────────
// Procedural 8-bit WebAudio. Every sound is a generated tone, so the game
// ships with no audio assets at all.
//

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.bgmTimer = null;
    this.bgmStep = 0;
  }
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  playTone(f1, f2, dur, type='square', vol=0.08) {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(f1, t);
    osc.frequency.exponentialRampToValueAtTime(f2, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
  click() { this.playTone(440, 660, 0.06, 'sine', 0.05); }
  jump() { this.playTone(280, 580, 0.16, 'triangle', 0.12); }
  dodge() { this.playTone(340, 260, 0.08, 'sine', 0.05); }
  coin() { this.playTone(980, 1400, 0.1, 'sine', 0.08); }
  crash() { this.playTone(160, 40, 0.45, 'sawtooth', 0.2); }
  // Added for the power-up set: pickup, multiplier and near-miss each get
  // their own tone so the player can tell what happened without looking.
  powerup() { this.playTone(420, 900, 0.22, 'square', 0.09); }
  multiplier() { this.playTone(660, 1320, 0.28, 'sine', 0.1); }
  nearMiss() { this.playTone(1200, 520, 0.13, 'sine', 0.07); }

  // ── Procedural Synthwave Arcade BGM ─────────────────────────────────────
  // Zero external MP3 downloads. Generates a retro driving bassline & kick
  // using WebAudio oscillators at 128 BPM.
  startBgm() {
    if (!this.enabled) return;
    this.init();
    if (this.bgmTimer) return;
    this.bgmStep = 0;

    // Driving 16-step bassline in D minor (D2, F2, G2, A2, C2)
    const bassline = [
      73.4, 0, 73.4, 73.4,
      87.3, 0, 87.3, 73.4,
      98.0, 0, 98.0, 110.0,
      87.3, 73.4, 65.4, 73.4
    ];

    const stepMs = 120; // ~125 BPM 16th notes
    this.bgmTimer = setInterval(() => {
      if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
      const step = this.bgmStep % 16;
      this.bgmStep++;

      const freq = bassline[step];
      const t = this.ctx.currentTime;

      // Punchy Synth Bass
      if (freq > 0) {
        try {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();

          osc.type = (step % 4 === 0) ? 'sawtooth' : 'triangle';
          osc.frequency.setValueAtTime(freq, t);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(420, t);
          filter.frequency.exponentialRampToValueAtTime(130, t + 0.1);

          gain.gain.setValueAtTime(0.045, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

          osc.connect(filter).connect(gain).connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + 0.12);
        } catch (_) {}
      }

      // Subtle Kick Thud on quarter notes (0, 4, 8, 12)
      if (step % 4 === 0) {
        try {
          const kickOsc = this.ctx.createOscillator();
          const kickGain = this.ctx.createGain();
          kickOsc.type = 'sine';
          kickOsc.frequency.setValueAtTime(110, t);
          kickOsc.frequency.exponentialRampToValueAtTime(42, t + 0.08);

          kickGain.gain.setValueAtTime(0.05, t);
          kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

          kickOsc.connect(kickGain).connect(this.ctx.destination);
          kickOsc.start(t);
          kickOsc.stop(t + 0.095);
        } catch (_) {}
      }

      // High-hat crisp tick on offbeats
      if (step % 2 === 1) {
        try {
          const hhOsc = this.ctx.createOscillator();
          const hhGain = this.ctx.createGain();
          hhOsc.type = 'square';
          hhOsc.frequency.setValueAtTime(2600 + (step % 4) * 300, t);

          hhGain.gain.setValueAtTime(0.01, t);
          hhGain.gain.exponentialRampToValueAtTime(0.0005, t + 0.035);

          hhOsc.connect(hhGain).connect(this.ctx.destination);
          hhOsc.start(t);
          hhOsc.stop(t + 0.04);
        } catch (_) {}
      }
    }, stepMs);
  }

  stopBgm() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}
export const audio = new AudioEngine();
