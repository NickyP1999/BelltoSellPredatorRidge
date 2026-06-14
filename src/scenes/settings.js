import { drawText, rect, frame, pointIn } from '../util.js';
import { C, bokehBg, motes, panel, sparkle, intro, setReducedMotion } from '../theme.js';

const W = 960, H = 540;

const PANEL = { x: 258, y: 156, w: 444, h: 322 };
const ROW_H = 46;
const ROW0 = 182;

// A small cog, drawn in code (no asset) — the settings motif.
function cog(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((i / 8) * Math.PI * 2);
    ctx.fillRect(-1.7, -r - 2.6, 3.4, 5.2);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// The main-menu settings panel. Sound, music, motion, fullscreen, reset.
// Everything persists to the save so it's remembered next visit.
export class SettingsScene {
  constructor(game) { this.game = game; }

  enter(params = {}) {
    this.from = params.from || 'title';
    this.t = 0;
    this.sel = 0;
    this.confirm = false;     // reset-career confirmation overlay
    this.confirmSel = 0;      // 0 = NO (safe default), 1 = YES
    this.toast = null;
    this.items = this.buildItems();
  }

  buildItems() {
    const g = this.game;
    const a = g.audio;
    const sv = g.save;
    return [
      { label: 'SOUND', hint: 'all sound effects and music',
        value: () => (a.muted ? 'OFF' : 'ON'), on: () => !a.muted,
        toggle: () => { a.muted = !a.muted; sv.data.muted = a.muted; sv.write(); if (!a.muted) a.ride(); } },
      { label: 'MUSIC', hint: 'the lounge underscore',
        value: () => (a.musicEnabled ? 'ON' : 'OFF'), on: () => a.musicEnabled,
        toggle: () => { a.musicEnabled = !a.musicEnabled; sv.data.music = a.musicEnabled; sv.write(); a.ride(); } },
      { label: 'MOTION', hint: 'reduce animation if it bothers you',
        value: () => (g.reducedMotion ? 'REDUCED' : 'FULL'), on: () => !g.reducedMotion,
        toggle: () => { g.reducedMotion = !g.reducedMotion; sv.data.reducedMotion = g.reducedMotion; setReducedMotion(g.reducedMotion); sv.write(); a.ride(); } },
      { label: 'FULLSCREEN', hint: 'fill the whole screen',
        value: () => (document.fullscreenElement ? 'ON' : 'OFF'), on: () => !!document.fullscreenElement,
        toggle: () => { if (g.toggleFullscreen) g.toggleFullscreen(); a.ride(); } },
      { label: 'RESET CAREER', hint: 'erase stars, tips and the Guest Book', danger: true,
        value: () => 'ERASE', on: () => false,
        toggle: () => { this.confirm = true; this.confirmSel = 0; g.audio.thump(); } },
      { label: 'BACK', back: true,
        value: () => '', on: () => false,
        toggle: () => this.leave() },
    ];
  }

  leave() {
    this.game.audio.stab(1.1, { vol: 0.04 });
    this.game.go(this.from);
  }

  doReset() {
    const sv = this.game.save;
    sv.data.stars = { luggage: 0, valet: 0, pitch: 0 };
    sv.data.best = { luggage: 0, valet: 0, pitch: 0 };
    sv.data.tips = 0;
    sv.data.playTime = 0;
    sv.data.guestBook = [];
    sv.data.bookSeen = 0;
    sv.data.finaleSeen = false;
    sv.data.seenHowTo = {};
    sv.write(); // settings (muted / music / reducedMotion) are intentionally kept
    this.confirm = false;
    this.toast = { text: 'CAREER RESET — A CLEAN SLATE', t: 2.2 };
    this.game.audio.bell(0.9);
  }

  rowRect(i) {
    return { x: PANEL.x + 16, y: ROW0 + i * ROW_H - 4, w: PANEL.w - 32, h: ROW_H - 6 };
  }

  update(dt) {
    this.t += dt;
    if (this.toast) { this.toast.t -= dt; if (this.toast.t <= 0) this.toast = null; }
    const inp = this.game.input;
    const p = inp.pointer;

    if (this.confirm) {
      // YES / NO buttons live in the confirm overlay (drawn in drawConfirm).
      const yes = { x: W / 2 - 168, y: 322, w: 150, h: 44 };
      const no = { x: W / 2 + 18, y: 322, w: 150, h: 44 };
      if (pointIn(p, yes.x, yes.y, yes.w, yes.h)) { this.game.cursor = 'pointer'; this.confirmSel = 1; }
      if (pointIn(p, no.x, no.y, no.w, no.h)) { this.game.cursor = 'pointer'; this.confirmSel = 0; }
      if (inp.pressed.has('ArrowLeft') || inp.pressed.has('ArrowRight') || inp.pressed.has('KeyA') || inp.pressed.has('KeyD')) {
        this.confirmSel = this.confirmSel ? 0 : 1;
        this.game.audio.ride();
      }
      const clickYes = p.clicked && pointIn(p, yes.x, yes.y, yes.w, yes.h);
      const clickNo = p.clicked && pointIn(p, no.x, no.y, no.w, no.h);
      if (inp.pressed.has('KeyY') || clickYes) { this.doReset(); return; }
      if (inp.pressed.has('KeyN') || inp.pressed.has('Escape') || clickNo) { this.confirm = false; this.game.audio.ride(); return; }
      if (inp.pressed.has('Enter') || inp.pressed.has('Space')) {
        if (this.confirmSel === 1) this.doReset(); else this.confirm = false;
      }
      return;
    }

    if (inp.pressed.has('Escape')) { this.leave(); return; }

    // keyboard navigation
    if (inp.pressed.has('ArrowDown') || inp.pressed.has('KeyS')) { this.sel = (this.sel + 1) % this.items.length; this.game.audio.ride(); }
    if (inp.pressed.has('ArrowUp') || inp.pressed.has('KeyW')) { this.sel = (this.sel + this.items.length - 1) % this.items.length; this.game.audio.ride(); }

    // pointer hover selects the row under the cursor
    this.items.forEach((it, i) => {
      const r = this.rowRect(i);
      if (pointIn(p, r.x, r.y, r.w, r.h)) { this.game.cursor = 'pointer'; this.sel = i; }
    });

    let activate = -1;
    if (p.clicked) this.items.forEach((it, i) => { const r = this.rowRect(i); if (pointIn(p, r.x, r.y, r.w, r.h)) activate = i; });
    if (inp.pressed.has('Enter') || inp.pressed.has('Space') ||
        inp.pressed.has('ArrowLeft') || inp.pressed.has('ArrowRight')) activate = this.sel;

    if (activate >= 0) this.items[activate].toggle();
  }

  draw(ctx) {
    bokehBg(ctx, 'hub', { top: '#1c1524', mid: '#120e18', bottom: '#0a080d', glowA: '#f2b63a', glowB: '#d94f30' });
    motes(ctx, this.t);

    // masthead
    const a0 = intro(this.t, 0);
    cog(ctx, W / 2 - 132, 58 - (1 - a0) * 8, 11, C.mustard);
    drawText(ctx, 'SETTINGS', W / 2 + 6, 30 - (1 - a0) * 8, { font: 'display', size: 64, color: C.cream, align: 'center', spacing: 4, alpha: a0 });
    rect(ctx, W / 2 - 60, 96, 120, 3, C.red, intro(this.t, 0.05));
    drawText(ctx, "ADJUST ANYTHING — IT'S SAVED FOR NEXT TIME", W / 2, 112, { size: 10, weight: 700, color: C.faint, align: 'center', spacing: 3, alpha: intro(this.t, 0.1) });

    panel(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, { border: C.edge });

    const p = this.game.input.pointer;
    this.items.forEach((it, i) => {
      const a = intro(this.t, 0.16 + i * 0.05);
      const r = this.rowRect(i);
      const sel = i === this.sel;
      const cy = r.y + r.h / 2;
      ctx.save();
      ctx.globalAlpha *= a;
      ctx.translate((1 - a) * 12, 0);

      if (sel) {
        rect(ctx, r.x, r.y, r.w, r.h, it.danger ? 'rgba(217,79,48,0.16)' : 'rgba(242,182,58,0.12)');
        frame(ctx, r.x, r.y, r.w, r.h, it.danger ? C.red : C.mustard, 2);
      }

      if (it.back) {
        drawText(ctx, '← BACK', W / 2, cy - 8, { font: 'display', size: 26, color: sel ? C.cream : C.dim, align: 'center', spacing: 2 });
      } else {
        const labelColor = it.danger ? C.red : (sel ? C.cream : C.dim);
        drawText(ctx, it.label, r.x + 20, cy - 11, { font: 'display', size: 24, color: labelColor, spacing: 1 });
        if (sel && it.hint) drawText(ctx, it.hint.toUpperCase(), r.x + 20, cy + 8, { size: 8, weight: 700, color: C.faint, spacing: 2 });

        // value pill, right-aligned
        const val = it.value();
        const on = it.on();
        const pillW = it.danger ? 86 : 74;
        const pillX = r.x + r.w - pillW - 14;
        const pillCol = it.danger ? C.red : (on ? C.teal : '#3a3342');
        rect(ctx, pillX, cy - 13, pillW, 26, it.danger ? 'rgba(217,79,48,0.16)' : (on ? 'rgba(63,184,168,0.16)' : 'rgba(255,255,255,0.04)'));
        frame(ctx, pillX, cy - 13, pillW, 26, pillCol, 1.5);
        drawText(ctx, val, pillX + pillW / 2, cy - 7, { size: 12, weight: 700, color: pillCol === '#3a3342' ? C.faint : pillCol, align: 'center', spacing: 2 });
      }
      ctx.restore();
    });

    // footer hint
    const fade = intro(this.t, 0.5);
    const hint = this.game.touch
      ? 'TAP A ROW TO CHANGE IT'
      : '↑ ↓ SELECT   ·   ENTER / ← → CHANGE   ·   ESC BACK';
    drawText(ctx, hint, W / 2, 502, { size: 10, weight: 700, color: C.faint, align: 'center', spacing: 2, alpha: fade });

    if (this.toast) {
      const k = Math.min(1, (2.2 - this.toast.t) / 0.2);
      sparkle(ctx, W / 2 - 150, 132, 7, C.mustard, { alpha: k });
      drawText(ctx, this.toast.text, W / 2, 126, { font: 'display', size: 22, color: C.mustard, align: 'center', spacing: 2, alpha: k });
    }

    if (this.confirm) this.drawConfirm(ctx);
  }

  drawConfirm(ctx) {
    rect(ctx, 0, 0, W, H, C.ink, 0.86);
    const px = W / 2 - 230, py = 188, pw = 460, ph = 200;
    panel(ctx, px, py, pw, ph, { border: C.red, borderW: 2, glow: C.red });
    drawText(ctx, 'ERASE ALL PROGRESS?', W / 2, py + 22, { font: 'display', size: 40, color: C.cream, align: 'center', spacing: 2 });
    drawText(ctx, 'Stars, tips and your Guest Book will be cleared.', W / 2, py + 70, { size: 13, weight: 500, color: C.dim, align: 'center' });
    drawText(ctx, 'Your settings are kept. This cannot be undone.', W / 2, py + 90, { size: 13, weight: 500, color: C.dim, align: 'center' });

    const p = this.game.input.pointer;
    const btns = [
      { label: 'YES, ERASE', x: W / 2 - 168, sel: this.confirmSel === 1, col: C.red },
      { label: 'NO, KEEP IT', x: W / 2 + 18, sel: this.confirmSel === 0, col: C.teal },
    ];
    for (const b of btns) {
      const r = { x: b.x, y: 322, w: 150, h: 44 };
      const hover = pointIn(p, r.x, r.y, r.w, r.h);
      if (b.sel || hover) {
        rect(ctx, r.x, r.y, r.w, r.h, b.col === C.red ? 'rgba(217,79,48,0.18)' : 'rgba(63,184,168,0.18)');
        frame(ctx, r.x, r.y, r.w, r.h, b.col, 2);
      } else {
        frame(ctx, r.x, r.y, r.w, r.h, C.edge, 1);
      }
      drawText(ctx, b.label, r.x + r.w / 2, r.y + 14, { size: 13, weight: 700, color: b.sel || hover ? C.cream : C.dim, align: 'center', spacing: 2 });
    }
  }
}
