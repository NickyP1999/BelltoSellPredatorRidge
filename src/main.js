import '@fontsource/bebas-neue';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import { GameAudio } from './audio.js';
import { Save } from './save.js';
import { TitleScene } from './scenes/title.js';
import { HubScene } from './scenes/hub.js';
import { LuggageScene } from './scenes/luggage.js';
import { ValetScene } from './scenes/valet.js';
import { PitchScene } from './scenes/pitch.js';
import { FinaleScene } from './scenes/finale.js';
import { drawText, rect, pointIn } from './util.js';
import { C, filmLook, setReducedMotion } from './theme.js';

const W = 960, H = 540;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Fit to window at native sharpness (DPR-aware), letterboxed.
let viewScale = 1;
function fit() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  const cssW = Math.max(320, Math.floor(W * s));
  const cssH = Math.floor(cssW * H / W);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  viewScale = canvas.width / W;
}
window.addEventListener('resize', fit);
fit();

const input = {
  down: new Set(),
  pressed: new Set(),
  // Primary pointer — drives taps and card drag (clicked/held/released/x/y).
  // Semantics are unchanged from the single-pointer era for mouse AND touch.
  pointer: { x: -1, y: -1, clicked: false, held: false, released: false },
  // ALL active pointers, in 960x540 logical coords. Rebuilt each pointer event
  // from the internal `pointers` Map below. Scenes read this for multi-touch
  // hold-buttons (e.g. steer-left + throttle held at once).
  touches: [],
  // True if ANY active touch/pointer lies within the given logical rect.
  // The contract scenes use for on-screen hold-buttons.
  touchInRect(x, y, w, h) {
    for (const p of this.touches) {
      if (p.x >= x && p.x < x + w && p.y >= y && p.y < y + h) return true;
    }
    return false;
  },
};

// Internal registry of every live pointer, keyed by pointerId. We rebuild
// input.touches from this on every pointer event so scenes get a fresh array.
const pointers = new Map();
function rebuildTouches() {
  input.touches = [];
  for (const [id, p] of pointers) input.touches.push({ id, x: p.x, y: p.y });
}

const reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
setReducedMotion(reducedMotion);

// Touch-capable device? Scenes show on-screen hold-buttons when true.
const touch = !!(
  ('ontouchstart' in window) ||
  navigator.maxTouchPoints > 0 ||
  (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
);

const game = {
  input,
  touch,
  save: new Save(),
  audio: new GameAudio(),
  paused: false,
  reducedMotion,
  cursor: 'default',
  scenes: {},
  scene: null,
  transition: null,
  go(name, params) {
    if (!this.scene) {
      this.scene = this.scenes[name];
      this.scene.enter(params || {});
      syncMusic(name);
      return;
    }
    if (this.transition) return; // one wipe at a time
    this.transition = { t: 0, to: name, params: params || {}, switched: false };
    this.audio.whoosh();
  },
};
game.scenes.title = new TitleScene(game);
game.scenes.hub = new HubScene(game);
game.scenes.luggage = new LuggageScene(game);
game.scenes.valet = new ValetScene(game);
game.scenes.pitch = new PitchScene(game);
game.scenes.finale = new FinaleScene(game);
game.audio.muted = !!game.save.data.muted;

// The lounge vamp underscores the title and hub; gameplay levels stay SFX-only.
function syncMusic(name) {
  if (name === 'title' || name === 'hub') game.audio.musicOn('lounge');
  else game.audio.musicOff();
}

// The three actual shifts — the only scenes where "RESTART THIS SHIFT" is meaningful.
function isShiftScene(s) {
  return s === game.scenes.luggage || s === game.scenes.valet || s === game.scenes.pitch;
}

// playTime should only accrue while a shift is actually being played, not while
// a howto/cutscene/ceremony screen waits for input. Block all non-play states.
const NON_PLAY_STATES = new Set([
  'intro', 'howto', 'stars', 'won', 'lost', 'handoff',
  'parked', 'retry', 'session', 'meet', 'walk', 'letter', 'card',
]);
function isCountingPlayTime() {
  return isShiftScene(game.scene) && !NON_PLAY_STATES.has(game.scene.state);
}

function toggleFullscreen() {
  // Fullscreen must be requested inside a user-gesture handler.
  if (document.fullscreenElement) document.exitFullscreen();
  else if (canvas.requestFullscreen) canvas.requestFullscreen();
}
function toggleMute() {
  game.audio.muted = !game.audio.muted;
  game.save.data.muted = game.audio.muted;
  game.save.write();
}

window.addEventListener('keydown', (e) => {
  game.audio.ensure();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyF' && !e.repeat) toggleFullscreen();
  if (!e.repeat) {
    input.down.add(e.code);
    input.pressed.add(e.code);
  }
});
window.addEventListener('keyup', (e) => input.down.delete(e.code));
// Alt-Tab / focus loss: drop held keys so movement doesn't stick on return.
window.addEventListener('blur', () => input.down.clear());

function toCanvas(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
}
canvas.addEventListener('pointermove', (e) => {
  const p = toCanvas(e);
  // Primary pointer (unchanged single-pointer semantics for taps/drag).
  input.pointer.x = p.x;
  input.pointer.y = p.y;
  // Multi-touch: only track a pointer we've already seen go down. A bare
  // mouse-move has no button held, so it shouldn't register as a "touch".
  if (pointers.has(e.pointerId)) {
    pointers.set(e.pointerId, { x: p.x, y: p.y });
    rebuildTouches();
  }
});
canvas.addEventListener('pointerdown', (e) => {
  game.audio.ensure();
  canvas.setPointerCapture(e.pointerId);
  const p = toCanvas(e);
  input.pointer.x = p.x;
  input.pointer.y = p.y;
  input.pointer.clicked = true;
  input.pointer.held = true;
  // Multi-touch: register this pointer as active.
  pointers.set(e.pointerId, { x: p.x, y: p.y });
  rebuildTouches();
});
canvas.addEventListener('pointerup', (e) => {
  const p = toCanvas(e);
  input.pointer.x = p.x;
  input.pointer.y = p.y;
  input.pointer.held = false;
  input.pointer.released = true;
  // Multi-touch: this pointer is gone.
  pointers.delete(e.pointerId);
  rebuildTouches();
});
canvas.addEventListener('pointercancel', (e) => {
  input.pointer.held = false;
  input.pointer.released = true;
  pointers.delete(e.pointerId);
  rebuildTouches();
});
// Pointer leaving the canvas: park it off-screen and drop any drag so hover
// highlights clear and no stale drag survives an Alt-Tab. Also drop it from
// the touches registry so off-canvas holds don't linger.
canvas.addEventListener('pointerleave', (e) => {
  input.pointer.x = -1;
  input.pointer.y = -1;
  input.pointer.held = false;
  pointers.delete(e.pointerId);
  rebuildTouches();
});

window.__game = game; // debug handle for dev-tools poking

// Diagonal ink-and-mustard wipe between scenes.
function drawWipe(ctx, p) {
  const skew = 140;
  ctx.save();
  if (p < 0.5) {
    const e = (p / 0.5) * (W + skew);
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.moveTo(-10, 0); ctx.lineTo(e, 0); ctx.lineTo(e - skew, H); ctx.lineTo(-10, H);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.mustard;
    ctx.beginPath();
    ctx.moveTo(e, 0); ctx.lineTo(e + 16, 0); ctx.lineTo(e + 16 - skew, H); ctx.lineTo(e - skew, H);
    ctx.closePath(); ctx.fill();
  } else {
    const e = ((p - 0.5) / 0.5) * (W + skew) - skew;
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.moveTo(e, 0); ctx.lineTo(W + 10, 0); ctx.lineTo(W + 10, H); ctx.lineTo(e - skew, H);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.mustard;
    ctx.beginPath();
    ctx.moveTo(e - 16, 0); ctx.lineTo(e, 0); ctx.lineTo(e - skew, H); ctx.lineTo(e - 16 - skew, H);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (input.pressed.has('KeyM')) toggleMute();
  // Pause only when there's a real shift/hub to pause — never mid-wipe, and
  // never on the title or finale (where R/B are meaningless or destructive).
  const pausable = !game.transition && game.scene !== game.scenes.title && game.scene !== game.scenes.finale;
  if ((input.pressed.has('KeyP') || input.pressed.has('Escape')) && (pausable || game.paused)) {
    game.paused = !game.paused;
  }

  game.cursor = 'default';
  const tr = game.transition;
  if (tr) {
    tr.t += dt * 2.0;
    if (tr.t >= 0.5 && !tr.switched) {
      tr.switched = true;
      game.scene = game.scenes[tr.to];
      game.paused = false; // a wipe always lands on a fresh, unpaused scene
      game.scene.enter(tr.params);
      game.save.write(); // persists accumulated playTime without per-frame writes
      syncMusic(tr.to);
    }
    if (tr.t >= 1) game.transition = null;
  } else if (!game.paused) {
    game.scene.update(dt);
    // Only count time while a shift is actively being played — not while a
    // howto/cutscene/ceremony screen idles waiting for input (that would pad
    // the forwarded Career Report stat).
    if (isCountingPlayTime()) game.save.data.playTime = (game.save.data.playTime || 0) + dt;
  }

  ctx.setTransform(viewScale, 0, 0, viewScale, 0, 0);
  rect(ctx, 0, 0, W, H, C.ink);
  game.scene.draw(ctx);
  if (game.transition) drawWipe(ctx, Math.min(1, game.transition.t));

  if (game.paused) {
    rect(ctx, 0, 0, W, H, C.ink, 0.84);
    drawText(ctx, 'PAUSED', W / 2, 158, { font: 'display', size: 72, color: C.mustard, align: 'center', spacing: 4 });
    // Each row carries its own action so keyboard and mouse share one path.
    // RESTART only appears on real shifts; BACK only away from the hub.
    const restart = () => { game.paused = false; game.scene.enter({}); };
    const back = () => { game.paused = false; game.go('hub'); };
    const opts = [
      { key: 'P', label: 'RESUME THE SHIFT', act: () => { game.paused = false; } },
    ];
    if (isShiftScene(game.scene)) opts.push({ key: 'R', label: 'RESTART THIS SHIFT', act: restart });
    if (game.scene !== game.scenes.hub) opts.push({ key: 'B', label: 'BACK TO THE RESORT MAP', act: back });
    opts.push({ key: 'M', label: game.audio.muted ? 'SOUND ON' : 'SOUND OFF', act: toggleMute });
    opts.push({ key: 'F', label: 'FULLSCREEN', act: toggleFullscreen });

    const p = input.pointer;
    opts.forEach((opt, i) => {
      const y = 268 + i * 34;
      // Clickable band spanning the key + label, centered around the column.
      const rx = W / 2 - 150, ry = y - 18, rw = 300, rh = 30;
      const hover = pointIn(p, rx, ry, rw, rh);
      if (hover) game.cursor = 'pointer';
      // M and F keys are handled globally (anywhere); only honor P/R/B keys here
      // so they don't double-fire. Clicks trigger every row.
      const keyOn = (opt.key !== 'M' && opt.key !== 'F') && input.pressed.has('Key' + opt.key);
      if (keyOn || (hover && input.pointer.clicked)) opt.act();
      const lit = i === 0 || hover;
      drawText(ctx, opt.key, W / 2 - 30, y - 4, { font: 'display', size: 22, color: C.mustard, align: 'right' });
      drawText(ctx, opt.label, W / 2 - 10, y, { size: 12, weight: 700, color: lit ? C.cream : C.dim, spacing: 2 });
    });
  }
  if (game.audio.muted) {
    drawText(ctx, 'MUTED', W - 14, H - 22, { size: 10, weight: 700, color: C.faint, align: 'right', spacing: 2 });
  }
  filmLook(ctx, W, H, now / 1000);
  canvas.style.cursor = game.cursor;

  input.pressed.clear();
  input.pointer.clicked = false;
  input.pointer.released = false;
  requestAnimationFrame(tick);
}

async function start() {
  try {
    await Promise.all([
      document.fonts.load('400 64px "Bebas Neue"'),
      document.fonts.load('400 16px "Space Grotesk"'),
      document.fonts.load('500 16px "Space Grotesk"'),
      document.fonts.load('700 16px "Space Grotesk"'),
    ]);
  } catch { /* fall back to system fonts rather than block the game */ }
  game.go('title');
  requestAnimationFrame(tick);
}
start();
