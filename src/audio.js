// ── audio.js ────────────────────────────────────────────────────────────
// Procedural 8-bit WebAudio. Every sound is a generated tone, so the game
// ships with no audio assets at all.
//

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
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
}
export const audio = new AudioEngine();
