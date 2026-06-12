// Art direction: jazz-noir anime. Flat color blocking, halftone dots, film
// grain, hard shadows, big condensed type. Inspired by 90s anime title cards
// and Saul Bass poster design — all artwork original, nothing copied.
import { measure, fontString } from './util.js';

export const C = {
  ink: '#0e0c10',      // page black
  panel: '#16131a',    // card/panel surface
  edge: '#2c2532',     // panel borders
  cream: '#f2e9d8',    // primary type
  dim: '#a39a8a',      // secondary type
  faint: '#6e6759',    // tertiary type
  mustard: '#f2b63a',  // signature accent
  red: '#d94f30',
  teal: '#3fb8a8',
  violet: '#9b6fd1',
  green: '#8fc97a',
};

export const easeOutCubic = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
export const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * Math.max(0, t)));
export const easeOutBack = (t) => {
  t = Math.min(1, Math.max(0, t)) - 1;
  const c = 2.0;
  return 1 + t * t * ((c + 1) * t + c);
};

let grain = null;
function makeGrain() {
  // Fine enough that the grain stays filmic (not blobby) on a 1080p monitor.
  const c = document.createElement('canvas');
  c.width = 480; c.height = 272;
  const g = c.getContext('2d');
  const img = g.createImageData(c.width, c.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 80 + Math.random() * 175;
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
    img.data[i + 3] = Math.random() * 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

let vig = null;
function makeVignette(W, H) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(W / 2, H / 2, H * 0.46, W / 2, H / 2, H * 0.95);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  return c;
}

// Film pass drawn over every frame: animated grain + vignette.
export function filmLook(ctx, W, H, time) {
  if (!grain) grain = makeGrain();
  if (!vig) vig = makeVignette(W, H);
  ctx.save();
  ctx.globalAlpha = 0.05;
  const ox = (Math.floor(time * 19) % 4) * 13;
  const oy = (Math.floor(time * 23) % 4) * 9;
  ctx.drawImage(grain, -ox, -oy, W + 52, H + 36);
  ctx.globalAlpha = 1;
  ctx.drawImage(vig, 0, 0);
  ctx.restore();
}

let dotPat = null;
export function halftone(ctx) {
  if (!dotPat) {
    const c = document.createElement('canvas');
    c.width = 7; c.height = 7;
    const g = c.getContext('2d');
    g.fillStyle = C.ink;
    g.beginPath();
    g.arc(3.5, 3.5, 1.7, 0, Math.PI * 2);
    g.fill();
    dotPat = ctx.createPattern(c, 'repeat');
  }
  return dotPat;
}

// 4-point sparkle star (the recurring motif: stars, rarity pips, particles).
export function sparkle(ctx, x, y, r, color, opts = {}) {
  const { rot = 0, alpha = 1, pinch = 0.22 } = opts;
  const p = r * pinch;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(p, -p, r, 0);
  ctx.quadraticCurveTo(p, p, 0, r);
  ctx.quadraticCurveTo(-p, p, -r, 0);
  ctx.quadraticCurveTo(-p, -p, 0, -r);
  ctx.fill();
  ctx.restore();
}

// Radial anime impact lines, t goes 0 → 1.
export function speedlines(ctx, cx, cy, t, color) {
  if (t >= 1) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = (1 - t) * 0.55;
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.37 + (i % 2) * 0.1;
    const r0 = 70 + 230 * easeOutCubic(t) + (i % 3) * 18;
    const len = 80 * (1 - t) + 12;
    ctx.lineWidth = 1.5 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.72);
    ctx.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len) * 0.72);
    ctx.stroke();
  }
  ctx.restore();
}

// Slow-drifting dust motes — ambient life over any dark scene.
export function motes(ctx, t, n = 12, color = '#f2e9d8') {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const sp = 6 + (i % 5) * 3;
    const x = (i * 173.3 + t * sp) % 1000 - 20;
    const y = (i * 97.7 + Math.sin(t * 0.5 + i * 1.7) * 36 + t * 3) % 580 - 20;
    ctx.globalAlpha = 0.04 + 0.035 * (1 + Math.sin(t * 0.8 + i * 2.1));
    ctx.beginPath();
    ctx.arc(x, y, 1.4 + (i % 3) * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Small rotated label chip — tag stamps, status flags.
export function stamp(ctx, text, x, y, opts = {}) {
  const { size = 13, bg = C.mustard, color = C.ink, rot = -0.07, padX = 9, padY = 4, alpha = 1 } = opts;
  const w = measure(ctx, text, { font: 'display', size, spacing: 1 }) + padX * 2;
  const h = size + padY * 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = bg;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = color;
  ctx.font = fontString('display', size);
  try { ctx.letterSpacing = '1px'; } catch { /* older browsers */ }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 2);
  ctx.restore();
  return { w, h };
}
