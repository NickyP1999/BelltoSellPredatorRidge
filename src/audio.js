// All SFX synthesized via WebAudio — nothing copyrighted. The sound identity:
// the bellman's brass bell carries scoring, jazz brass stabs carry the drama,
// brushed-noise percussion carries the UI. Pitch rises with streaks.
export class GameAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.noiseBuf = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    if (this.ctx && !this.noiseBuf) {
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
  }

  tone(freq, dur, { type = 'sine', vol = 0.15, when = 0, glideTo = null, lowpass = null } = {}) {
    if (this.muted || !this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    let node = osc;
    if (lowpass) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lowpass;
      osc.connect(f);
      node = f;
    }
    node.connect(g).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise(dur, { vol = 0.1, when = 0, band = null, high = null } = {}) {
    if (this.muted || !this.ctx || !this.noiseBuf) return;
    const t0 = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    let node = src;
    if (band) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = band; f.Q.value = 1.2;
      node.connect(f); node = f;
    }
    if (high) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = high;
      node.connect(f); node = f;
    }
    node.connect(g).connect(this.ctx.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  // Brass bell: fundamental + inharmonic partial.
  bell(pitch = 1) {
    this.tone(880 * pitch, 0.5, { vol: 0.12 });
    this.tone(880 * pitch * 2.4, 0.35, { vol: 0.05 });
  }

  // Jazz brass stab — a tight dom7-ish hit.
  stab(pitch = 1, { minor = false, when = 0, vol = 0.05 } = {}) {
    const root = 196 * pitch;
    const ratios = minor ? [1, 1.1892, 1.4983, 1.7818] : [1, 1.2599, 1.4983, 1.7818];
    ratios.forEach((r, i) => {
      this.tone(root * r * (1 + (i % 2 ? 0.0025 : -0.0025)), 0.3, { type: 'sawtooth', vol, when, lowpass: 1500 });
    });
    this.noise(0.06, { vol: 0.04, when, band: 3000 });
  }

  ride() { this.noise(0.05, { vol: 0.05, high: 5500 }); }
  click() { this.ride(); }
  snare() { this.noise(0.1, { vol: 0.12, band: 1700 }); }
  thump() { this.tone(120, 0.24, { vol: 0.25, glideTo: 48 }); }

  crit(pitch = 1) {
    this.stab(pitch);
    this.bell(pitch);
  }

  win() {
    this.stab(1);
    this.stab(1.3348, { when: 0.18 });
    [1, 1.25, 1.5].forEach((p, i) => {
      this.tone(880 * p, 0.5, { vol: 0.1, when: 0.3 + i * 0.12 });
      this.tone(880 * p * 2.4, 0.3, { vol: 0.04, when: 0.3 + i * 0.12 });
    });
  }

  lose() {
    this.thump();
    this.stab(0.75, { minor: true, when: 0.06, vol: 0.04 });
  }
}
