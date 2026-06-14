// All SFX synthesized via WebAudio — nothing copyrighted. The sound identity:
// the bellman's brass bell carries scoring, jazz brass stabs carry the drama,
// brushed-noise percussion carries the UI. Pitch rises with streaks.

// ── S4: lounge underscore ────────────────────────────────────────────────
// A sparse jazz-noir vamp for the title/hub scenes. 8 bars of 4/4 at 88 BPM
// (1 beat = 60/88 ≈ 0.682 s), looping over 32 beats. Per beat:
//   bass — walking triangle quarter notes from LOUNGE.bass (one entry per
//          beat; 0 = rest, so bars 4 and 8 breathe). Roots/fifths/chromatic
//          approaches over Dm7 | Gm7 | Dm7 | A7 | Dm7 | Bb7 | A7 | Dm.
//   ride — brushed bandpassed-noise tap on every beat; beats 2 and 4 are
//          accented and followed by a swung skip note at +2/3 beat (the
//          long-short triplet feel).
//   pad  — barely-there D2+A2 sines under bars 1–2 of each 4-bar phrase.
// A 100 ms setInterval looks ahead on the WebAudio clock and schedules any
// beats inside the next 0.25 s at exact audio times, so the loop never
// drifts or clicks.
const LOUNGE = {
  level: 0.06, // musicGain base — an underscore, not a song (must survive laptop speakers)
  beat: 60 / 88,
  bass: [
    73.42, 82.41, 87.31, 92.50, // Dm7: D2 walks up, F# approaches G
    98.00, 87.31, 82.41, 77.78, // Gm7: G2 walks down, Eb approaches D
    73.42, 55.00, 58.27, 61.74, // Dm7: drop to A1, chromatic climb
    69.30, 55.00, 0,     69.30, // A7: C#2/A1, breathe, C# leads to D
    73.42, 65.41, 61.74, 58.27, // Dm7: walk down to Bb
    58.27, 73.42, 87.31, 58.27, // Bb7: arpeggio, Bb1 approaches A
    55.00, 69.30, 82.41, 98.00, // A7: arpeggio up
    73.42, 0,     55.00, 69.30, // Dm: breathe, C# leads back to the top
  ],
  pad: [73.42, 110], // D2 + A2
};

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.noiseBuf = null;
    this.musicGain = null;
    this.musicReq = null; // requested track; remembered until ensure() runs
    this.musicTimer = null;
    this.musicBeat = 0;
    this.musicNext = 0;
    this._visBound = false;
  }

  // SFX check the flag per call, but the music loop is continuous — snap
  // musicGain the instant the flag flips so M feels immediate.
  get muted() { return this._muted; }
  set muted(v) {
    this._muted = !!v;
    if (this.ctx && this.musicGain) {
      const g = this.musicGain.gain;
      g.cancelScheduledValues(this.ctx.currentTime);
      g.setValueAtTime(this._muted || !this.musicReq ? 0 : LOUNGE.level, this.ctx.currentTime);
    }
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
    if (this.ctx && !this.musicGain) {
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0;
      this.musicGain.connect(this.ctx.destination);
    }
    if (!this._visBound && typeof document !== 'undefined') {
      this._visBound = true;
      document.addEventListener('visibilitychange', () => {
        // A backgrounded tab throttles the scheduler; coming back, hard-restart
        // the loop so the vamp realigns in phase. (Mute is preserved: musicOn ->
        // _musicStart ramps to 0 while muted and _musicTick stays a no-op.)
        if (document.visibilityState === 'visible' && this.musicReq) {
          const name = this.musicReq;
          this.musicOff();
          this.musicOn(name);
        }
      });
    }
    if (this.musicReq && !this.musicTimer) this._musicStart();
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
    this._duck();
    this.tone(880 * pitch, 0.5, { vol: 0.12 });
    this.tone(880 * pitch * 2.4, 0.35, { vol: 0.05 });
  }

  // Jazz brass stab — a tight dom7-ish hit.
  stab(pitch = 1, { minor = false, when = 0, vol = 0.05 } = {}) {
    this._duck();
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
  whoosh() { this.noise(0.28, { vol: 0.09, band: 700 }); this.noise(0.2, { vol: 0.05, when: 0.05, band: 1600 }); }
  blip() { this.tone(1150 + Math.random() * 350, 0.03, { type: 'square', vol: 0.016 }); }
  pickup() { this.noise(0.06, { vol: 0.06, high: 3000 }); this.tone(520, 0.06, { type: 'triangle', vol: 0.045 }); }
  place() { this.noise(0.07, { vol: 0.06, band: 700 }); }
  deal() { this.noise(0.05, { vol: 0.05, high: 2500 }); this.tone(740, 0.04, { type: 'triangle', vol: 0.03 }); }

  crit(pitch = 1) {
    this.stab(pitch);
    this.bell(pitch);
  }

  win() {
    this._duck();
    this.stab(1);
    this.stab(1.3348, { when: 0.18 });
    [1, 1.25, 1.5].forEach((p, i) => {
      this.tone(880 * p, 0.5, { vol: 0.1, when: 0.3 + i * 0.12 });
      this.tone(880 * p * 2.4, 0.3, { vol: 0.04, when: 0.3 + i * 0.12 });
    });
  }

  lose() {
    this._duck();
    this.thump();
    this.stab(0.75, { minor: true, when: 0.06, vol: 0.04 });
  }

  // ── Music (see LOUNGE comment block above) ───────────────────────────────

  musicOn(name = 'lounge') {
    this.musicReq = name; // if no ctx yet, ensure() starts it on first gesture
    this._musicStart();
  }

  musicOff() {
    this.musicReq = null;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (!this.ctx || !this.musicGain) return;
    const g = this.musicGain.gain;
    const t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0, t + 0.25); // quick fade, not a cut
  }

  // Big SFX moments dip the underscore to ~40% for ~350ms, then it recovers.
  _duck() {
    if (!this.ctx || !this.musicGain || !this.musicReq || this._muted) return;
    const g = this.musicGain.gain;
    const t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.min(g.value, LOUNGE.level), t);
    g.linearRampToValueAtTime(LOUNGE.level * 0.4, t + 0.05);
    g.setTargetAtTime(LOUNGE.level, t + 0.35, 0.12);
    // setTargetAtTime only approaches the target asymptotically; finish with an
    // explicit linear ramp so the underscore actually returns to full level.
    g.linearRampToValueAtTime(LOUNGE.level, t + 0.5);
  }

  _musicStart() {
    if (!this.ctx || this.musicTimer) return;
    const g = this.musicGain.gain;
    const t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(this._muted ? 0 : LOUNGE.level, t + 0.5);
    this.musicBeat = 0;
    this.musicNext = t + 0.15;
    this.musicTimer = setInterval(() => this._musicTick(), 100);
    this._musicTick();
  }

  // Lookahead scheduler: runs every 100ms, schedules beats up to 0.25s out.
  _musicTick() {
    if (!this.ctx || this._muted) return; // muted pauses scheduling entirely
    const t = this.ctx.currentTime;
    if (this.musicNext < t) {
      // Resync after mute/tab throttle: reset the beat phase too so the vamp
      // restarts in phase (bar structure realigns instead of the bass landing
      // on the wrong beats).
      this.musicNext = t + 0.1;
      this.musicBeat = 0;
    }
    while (this.musicNext < t + 0.25) {
      this._musicBeat(this.musicBeat, this.musicNext);
      this.musicBeat = (this.musicBeat + 1) % 32;
      this.musicNext += LOUNGE.beat;
    }
  }

  _musicBeat(beat, t0) {
    const bar = beat >> 2;
    const step = beat & 3;
    const swing = LOUNGE.beat * 2 / 3; // long-short triplet eighths

    const f = LOUNGE.bass[beat];
    if (f) {
      const vol = (step === 0 ? 0.95 : 0.8) * (0.92 + Math.random() * 0.16);
      this._mTone(f, t0, LOUNGE.beat * 0.9, { type: 'triangle', vol, lowpass: 380 });
    }

    const back = step === 1 || step === 3; // ride accents on 2 and 4
    this._mRide(t0, back ? 0.5 : 0.3);
    if (back) this._mRide(t0 + swing, 0.2); // the swung skip note

    if (step === 0 && (bar & 3) === 0) { // pad under bars 1–2 of each phrase
      this._mPad(LOUNGE.pad[0], t0, LOUNGE.beat * 8, 0.16);
      this._mPad(LOUNGE.pad[1], t0, LOUNGE.beat * 8, 0.11);
    }
  }

  // Music voices mirror tone()/noise() but route through musicGain (so duck
  // and mute apply) and take absolute audio-clock times from the scheduler.
  _mTone(freq, t0, dur, { type = 'sine', vol = 0.5, lowpass = null } = {}) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    let node = osc;
    if (lowpass) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lowpass;
      osc.connect(f);
      node = f;
    }
    node.connect(g).connect(this.musicGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _mRide(t0, vol) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 5200;
    f.Q.value = 1.8;
    const g = this.ctx.createGain();
    const dur = 0.09;
    g.gain.setValueAtTime(vol * (0.85 + Math.random() * 0.3), t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f).connect(g).connect(this.musicGain);
    src.start(t0, Math.random() * 0.5); // random brush spot in the noise buffer
    src.stop(t0 + dur + 0.02);
  }

  _mPad(freq, t0, dur, vol) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 1.2);
    g.gain.setValueAtTime(vol, t0 + dur - 1.2);
    g.gain.linearRampToValueAtTime(0, t0 + dur);
    osc.connect(g).connect(this.musicGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }
}
