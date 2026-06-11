import '@fontsource/bebas-neue';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import { GameAudio } from './audio.js';
import { Save } from './save.js';
import { HubScene } from './scenes/hub.js';
import { LuggageScene } from './scenes/luggage.js';
import { ValetScene } from './scenes/valet.js';
import { PitchScene } from './scenes/pitch.js';
import { FinaleScene } from './scenes/finale.js';
import { drawText, rect } from './util.js';
import { C, filmLook } from './theme.js';

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
  pointer: { x: -1, y: -1, clicked: false },
};

const game = {
  input,
  save: new Save(),
  audio: new GameAudio(),
  paused: false,
  scenes: {},
  scene: null,
  go(name, params) {
    this.scene = this.scenes[name];
    this.scene.enter(params || {});
  },
};
game.scenes.hub = new HubScene(game);
game.scenes.luggage = new LuggageScene(game);
game.scenes.valet = new ValetScene(game);
game.scenes.pitch = new PitchScene(game);
game.scenes.finale = new FinaleScene(game);

window.addEventListener('keydown', (e) => {
  game.audio.ensure();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyF' && !e.repeat) {
    // Fullscreen must be requested inside the gesture handler itself.
    if (document.fullscreenElement) document.exitFullscreen();
    else if (canvas.requestFullscreen) canvas.requestFullscreen();
  }
  if (!e.repeat) {
    input.down.add(e.code);
    input.pressed.add(e.code);
  }
});
window.addEventListener('keyup', (e) => input.down.delete(e.code));

function toCanvas(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
}
canvas.addEventListener('pointermove', (e) => {
  const p = toCanvas(e);
  input.pointer.x = p.x;
  input.pointer.y = p.y;
});
canvas.addEventListener('pointerdown', (e) => {
  game.audio.ensure();
  const p = toCanvas(e);
  input.pointer.x = p.x;
  input.pointer.y = p.y;
  input.pointer.clicked = true;
});

window.__game = game; // debug handle for dev-tools poking

let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (input.pressed.has('KeyM')) game.audio.muted = !game.audio.muted;
  if (input.pressed.has('KeyP') || input.pressed.has('Escape')) game.paused = !game.paused;

  if (!game.paused) game.scene.update(dt);

  ctx.setTransform(viewScale, 0, 0, viewScale, 0, 0);
  rect(ctx, 0, 0, W, H, C.ink);
  game.scene.draw(ctx);

  if (game.paused) {
    rect(ctx, 0, 0, W, H, C.ink, 0.78);
    drawText(ctx, 'PAUSED', W / 2, 210, { font: 'display', size: 72, color: C.mustard, align: 'center', spacing: 4 });
    drawText(ctx, 'P → RESUME', W / 2, 300, { size: 12, weight: 700, color: C.dim, align: 'center', spacing: 3 });
  }
  if (game.audio.muted) {
    drawText(ctx, 'MUTED', W - 14, H - 22, { size: 10, weight: 700, color: C.faint, align: 'right', spacing: 2 });
  }
  filmLook(ctx, W, H, now / 1000);

  input.pressed.clear();
  input.pointer.clicked = false;
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
  game.go('hub');
  requestAnimationFrame(tick);
}
start();
