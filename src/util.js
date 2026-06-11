// Canvas text + geometry helpers shared by all scenes.

export const FONT = {
  display: '"Bebas Neue", "Arial Narrow", sans-serif',
  body: '"Space Grotesk", "Segoe UI", sans-serif',
};

export function fontString(font = 'body', size = 14, weight = 400, italic = false) {
  const fam = FONT[font] || FONT.body;
  const w = font === 'display' ? 400 : weight;
  return `${italic ? 'italic ' : ''}${w} ${size}px ${fam}`;
}

export function drawText(ctx, text, x, y, opts = {}) {
  const {
    font = 'body', size = 14, weight = 400, color = '#f2e9d8',
    align = 'left', baseline = 'top', spacing = 0, alpha = 1,
    rotate = 0, italic = false, shadow = null, // shadow: {color, dx, dy}
  } = opts;
  ctx.save();
  ctx.globalAlpha *= alpha; // compose with any outer dimming
  ctx.font = fontString(font, size, weight, italic);
  if (spacing) { try { ctx.letterSpacing = spacing + 'px'; } catch { /* older browsers */ } }
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.translate(x, y);
  if (rotate) ctx.rotate(rotate);
  if (shadow) { ctx.fillStyle = shadow.color; ctx.fillText(text, shadow.dx, shadow.dy); }
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

export function measure(ctx, text, opts = {}) {
  ctx.save();
  ctx.font = fontString(opts.font, opts.size, opts.weight, opts.italic);
  if (opts.spacing) { try { ctx.letterSpacing = opts.spacing + 'px'; } catch { /* older browsers */ } }
  const w = ctx.measureText(text).width;
  ctx.restore();
  return w;
}

export function wrap(ctx, text, maxWidth, opts = {}) {
  ctx.save();
  ctx.font = fontString(opts.font, opts.size, opts.weight, opts.italic);
  if (opts.spacing) { try { ctx.letterSpacing = opts.spacing + 'px'; } catch { /* older browsers */ } }
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const candidate = line ? line + ' ' + w : w;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  ctx.restore();
  return lines;
}

export function rect(ctx, x, y, w, h, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha; // compose with any outer dimming
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

export function frame(ctx, x, y, w, h, color, t = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, t);
  ctx.fillRect(x, y + h - t, w, t);
  ctx.fillRect(x, y, t, h);
  ctx.fillRect(x + w - t, y, t, h);
}

export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function pointIn(p, x, y, w, h) { return p.x >= x && p.x < x + w && p.y >= y && p.y < y + h; }

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
