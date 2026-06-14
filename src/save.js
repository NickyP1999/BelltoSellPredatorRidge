const KEY = 'bell-to-sell-v1';

const DEFAULTS = {
  stars: { luggage: 0, valet: 0, pitch: 0 },
  best: { luggage: 0, valet: 0, pitch: 0 },
  tips: 0,
  playTime: 0,
  guestBook: [],
  bookSeen: 0,
  finaleSeen: false,
  seenHowTo: {},
  muted: false,
};

export class Save {
  constructor() {
    let stored = {};
    try { stored = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { /* corrupt save -> fresh start */ }
    this.data = {
      ...JSON.parse(JSON.stringify(DEFAULTS)),
      ...stored,
      stars: { ...DEFAULTS.stars, ...(stored.stars || {}) },
      best: { ...DEFAULTS.best, ...(stored.best || {}) },
      seenHowTo: { ...(stored.seenHowTo || {}) },
    };
  }

  totalStars() {
    const s = this.data.stars;
    return s.luggage + s.valet + s.pitch;
  }

  write() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* private mode: play on without saving */ }
  }
}
