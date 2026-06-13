import { drawText, wrap, rect, frame, pointIn } from '../util.js';
import { C, bokehBg, easeOutExpo, halftone, motes, panel, sparkle, stamp } from '../theme.js';
import { PLAYER_NAME } from '../config.js';

const W = 960, H = 540;

// Career order, left to right. Each shift unlocks the next.
const LEVELS = [
  { id: 'luggage', num: '01', name: 'LUGGAGE RUSH', sub: 'THE LODGE', accent: '#d94f30', x: 48, y: 206, w: 272, h: 240, tilt: -0.012, scene: 'luggage' },
  { id: 'valet', num: '02', name: 'SHUTTLE PRECISION', sub: 'RESORT SHUTTLE', accent: '#3fb8a8', x: 344, y: 206, w: 272, h: 240, tilt: 0.008, scene: 'valet' },
  { id: 'pitch', num: '03', name: 'THE PITCH', sub: 'REAL ESTATE SALES OFFICE', accent: '#f2b63a', x: 640, y: 206, w: 272, h: 240, tilt: -0.008, scene: 'pitch' },
];

const PROMO = { x: 48, y: 452, w: 560, h: 40 };

// Poster silhouettes — flat ink shapes on the accent block, all original.
function silhouette(ctx, id, cx, cy, accent) {
  ctx.fillStyle = C.ink;
  if (id === 'luggage') {
    ctx.fillRect(cx - 44, cy + 6, 88, 26);
    ctx.fillRect(cx - 34, cy - 18, 68, 20);
    ctx.fillRect(cx - 22, cy - 38, 44, 16);
    ctx.fillRect(cx - 8, cy - 46, 16, 8);
  } else if (id === 'valet') {
    ctx.beginPath();
    ctx.moveTo(cx - 56, cy + 18);
    ctx.lineTo(cx - 48, cy - 2);
    ctx.quadraticCurveTo(cx - 30, cy - 22, cx - 4, cy - 22);
    ctx.quadraticCurveTo(cx + 30, cy - 22, cx + 44, cy - 4);
    ctx.lineTo(cx + 56, cy + 2);
    ctx.lineTo(cx + 56, cy + 18);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - 30, cy + 18, 10, 0, Math.PI * 2);
    ctx.arc(cx + 30, cy + 18, 10, 0, Math.PI * 2);
    ctx.fill();
  } else {
    [-0.22, 0, 0.22].forEach((a, i) => {
      ctx.save();
      ctx.translate(cx, cy + 16);
      ctx.rotate(a);
      const ry = -52 + (i === 1 ? -6 : 0);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.strokeRect(-20, ry, 40, 58);
      ctx.fillRect(-20, ry, 40, 58);
      ctx.restore();
    });
  }
}

export class HubScene {
  constructor(game) { this.game = game; }

  isOpen(i) {
    const st = this.game.save.data.stars;
    if (i === 0) return true;
    if (i === 1) return st.luggage > 0;
    return st.valet > 0;
  }

  allDone() {
    const st = this.game.save.data.stars;
    return st.luggage > 0 && st.valet > 0 && st.pitch > 0;
  }

  enter() {
    // cursor lands on the next shift in the career
    const st = this.game.save.data.stars;
    this.sel = st.luggage === 0 ? 0 : st.valet === 0 ? 1 : st.pitch === 0 ? 2 : 0;
    this.toast = null;
    this.showBook = false;
    this.t = 0;
  }

  update(dt) {
    this.t += dt;
    if (this.toast) { this.toast.t -= dt; if (this.toast.t <= 0) this.toast = null; }
    const inp = this.game.input;
    const p = inp.pointer;

    if (inp.pressed.has('KeyG')) {
      this.showBook = !this.showBook;
      if (this.showBook) {
        this.game.save.data.bookSeen = this.game.save.data.guestBook.length;
        this.game.save.write();
      }
      // paper, not brass: the book opens with a page turn
      this.game.audio.noise(0.14, { vol: 0.05, band: 900 });
      this.game.audio.noise(0.08, { vol: 0.03, when: 0.07, high: 2400 });
      return;
    }
    if (this.showBook) {
      if (inp.pressed.has('Enter') || p.clicked) this.showBook = false;
      return;
    }

    const nItems = LEVELS.length + (this.allDone() ? 1 : 0);
    if (inp.pressed.has('ArrowLeft') || inp.pressed.has('KeyA')) { this.sel = (this.sel + nItems - 1) % nItems; this.game.audio.ride(); }
    if (inp.pressed.has('ArrowRight') || inp.pressed.has('KeyD')) { this.sel = (this.sel + 1) % nItems; this.game.audio.ride(); }

    LEVELS.forEach((l, i) => {
      if (pointIn(p, l.x, l.y, l.w, l.h)) {
        this.game.cursor = 'pointer';
        if (this.sel !== i) { this.sel = i; this.game.audio.ride(); }
      }
    });
    if (this.allDone() && pointIn(p, PROMO.x, PROMO.y, PROMO.w, PROMO.h)) {
      this.game.cursor = 'pointer';
      this.sel = LEVELS.length;
    }

    let activate = -1;
    if (p.clicked) {
      LEVELS.forEach((l, i) => { if (pointIn(p, l.x, l.y, l.w, l.h)) activate = i; });
      if (this.allDone() && pointIn(p, PROMO.x, PROMO.y, PROMO.w, PROMO.h)) activate = LEVELS.length;
    }
    if (inp.pressed.has('Enter') || inp.pressed.has('Space')) activate = this.sel;

    if (activate === LEVELS.length) {
      this.game.audio.stab(1.5, { vol: 0.04 });
      this.game.go('finale');
    } else if (activate >= 0) {
      const l = LEVELS[activate];
      if (this.isOpen(activate)) {
        this.game.audio.stab(1.2, { vol: 0.04 });
        this.game.go(l.scene);
      } else {
        this.game.audio.thump();
        this.toast = { text: `FINISH SHIFT ${LEVELS[activate - 1].num} FIRST`, t: 1.6 };
      }
    }
  }

  draw(ctx) {
    const sv = this.game.save.data;
    // after the promotion the whole resort map turns golden hour
    const golden = this.allDone() && sv.finaleSeen;
    if (golden) bokehBg(ctx, 'hubGold', { top: '#2b1f16', mid: '#181017', bottom: '#0a080d', glowA: '#f2b63a', glowB: '#f2b63a' });
    else bokehBg(ctx, 'hub', { top: '#1c1524', mid: '#120e18', bottom: '#0a080d', glowA: '#f2b63a', glowB: '#d94f30' });
    motes(ctx, this.t);

    // ── Masthead: rotated mustard block with offset red misprint layer
    const intro = easeOutExpo(Math.min(1, this.t / 0.6));
    ctx.save();
    ctx.rotate(-0.045);
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 10;
    rect(ctx, -36, 26, 640 * intro, 142, C.red);
    ctx.shadowColor = 'transparent';
    rect(ctx, -44, 14, 640 * intro, 142, C.mustard);
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = halftone(ctx);
    ctx.fillRect(330, 14, 230, 142);
    ctx.restore();
    if (intro > 0.85) drawText(ctx, 'BELL TO SELL', 34, 26, { font: 'display', size: 104, color: C.ink, spacing: 3 });
    ctx.restore();

    drawText(ctx, golden
      ? 'CAREER COMPLETE — EVERY SHIFT IS YOURS TO REPLAY. CHASE 9 STARS.'
      : 'THE CASE FOR A PROMOTION — THREE SHIFTS, LEFT TO RIGHT', 48, 178, { size: 11, weight: 700, color: golden ? C.mustard : C.dim, spacing: 4 });

    drawText(ctx, `${sv.tips}`, 924, 16, { font: 'display', size: 44, color: C.mustard, align: 'right' });
    drawText(ctx, 'TIPS', 924, 62, { size: 10, weight: 700, color: C.faint, align: 'right', spacing: 3 });
    drawText(ctx, `${golden ? 'SALES ASSISTANT' : 'BELLMAN'} ${PLAYER_NAME.toUpperCase()}`, 924, 84, { size: 11, weight: 700, color: golden ? C.mustard : C.cream, align: 'right', spacing: 2 });
    if (sv.guestBook.length > (sv.bookSeen || 0)) {
      drawText(ctx, 'G → NEW LINE IN YOUR GUEST BOOK', 924, 106, { size: 10, weight: 700, color: C.teal, align: 'right', spacing: 2, alpha: 0.6 + 0.4 * Math.sin(this.t * 4) });
    }

    // ── Level posters
    LEVELS.forEach((l, i) => {
      const isSel = i === this.sel;
      const open = this.isOpen(i);
      ctx.save();
      // posters breathe a little, like a wall of prints in a draft
      const bob = Math.sin(this.t * 1.3 + i * 1.9) * 2.5;
      ctx.translate(l.x + l.w / 2, l.y + l.h / 2 - (isSel ? 8 : 0) + bob);
      ctx.rotate(l.tilt + Math.sin(this.t * 0.9 + i * 2.3) * 0.004);
      if (isSel) ctx.scale(1.03, 1.03);
      const x = -l.w / 2, y = -l.h / 2;
      panel(ctx, x, y, l.w, l.h, { border: isSel ? C.mustard : C.edge, borderW: isSel ? 2 : 1, glow: isSel ? C.mustard : null });

      // accent header with halftone, light falloff and silhouette
      rect(ctx, x + 10, y + 10, l.w - 20, 112, open ? l.accent : '#3a3342');
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = halftone(ctx);
      ctx.fillRect(x + 10 + (l.w - 20) / 2, y + 10, (l.w - 20) / 2, 112);
      ctx.restore();
      const hg = ctx.createLinearGradient(0, y + 10, 0, y + 122);
      hg.addColorStop(0, 'rgba(255,255,255,0.13)');
      hg.addColorStop(0.5, 'rgba(0,0,0,0)');
      hg.addColorStop(1, 'rgba(0,0,0,0.32)');
      ctx.fillStyle = hg;
      ctx.fillRect(x + 10, y + 10, l.w - 20, 112);
      silhouette(ctx, l.id, x + l.w / 2, y + 72, open ? l.accent : '#3a3342');
      drawText(ctx, l.num, x + 18, y + 16, { font: 'display', size: 26, color: C.ink, alpha: 0.65 });
      if (!open) {
        stamp(ctx, `AFTER SHIFT ${LEVELS[i - 1].num}`, x + l.w / 2, y + 66, { size: 15, bg: C.mustard, rot: -0.12 });
      }

      drawText(ctx, l.name, x + 16, y + 132, { font: 'display', size: 27, color: open ? C.cream : C.faint, spacing: 1 });
      drawText(ctx, `PREDATOR RIDGE · ${l.sub}`, x + 16, y + 164, { size: 9, weight: 700, color: C.faint, spacing: 2 });

      const stars = sv.stars[l.id] || 0;
      for (let s = 0; s < 3; s++) {
        sparkle(ctx, x + 26 + s * 26, y + 198, 9, s < stars ? C.mustard : '#241f2b');
      }
      if (open) {
        stamp(ctx, stars > 0 ? 'REPLAY' : 'NOW OPEN', x + l.w - 56, y + 196, { size: 12, bg: C.teal, rot: -0.08 });
        drawText(ctx, `BEST ${sv.best[l.id] || 0}`, x + 16, y + 216, { size: 10, weight: 700, color: C.dim, spacing: 1 });
      }
      ctx.restore();
    });

    // ── Promotion: banner once the career is complete, progress track always
    const total = this.game.save.totalStars();
    if (this.allDone()) {
      const selBanner = this.sel === LEVELS.length;
      rect(ctx, PROMO.x, PROMO.y, PROMO.w, PROMO.h, C.mustard);
      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = halftone(ctx);
      ctx.fillRect(PROMO.x + PROMO.w / 2, PROMO.y, PROMO.w / 2, PROMO.h);
      ctx.restore();
      frame(ctx, PROMO.x, PROMO.y, PROMO.w, PROMO.h, selBanner ? C.cream : C.mustard, selBanner ? 3 : 1);
      sparkle(ctx, PROMO.x + 24, PROMO.y + 20, 10, C.ink);
      drawText(ctx, sv.finaleSeen ? 'READ YOUR PROMOTION LETTER AGAIN' : 'YOUR PROMOTION MEETING IS READY — WALK OVER', PROMO.x + 44, PROMO.y + 8, { font: 'display', size: 24, color: C.ink, spacing: 1 });
    } else {
      drawText(ctx, 'FINISH ALL THREE SHIFTS TO EARN YOUR PROMOTION MEETING', PROMO.x, PROMO.y + 12, { size: 10, weight: 700, color: C.faint, spacing: 2 });
    }
    drawText(ctx, 'STARS', 636, 458, { size: 9, weight: 700, color: C.mustard, spacing: 2 });
    for (let i = 0; i < 9; i++) {
      const x = 690 + i * 26;
      rect(ctx, x, 454, 18, 18, C.panel);
      frame(ctx, x, 454, 18, 18, C.edge, 1);
      if (i < total) sparkle(ctx, x + 9, 463, 7, C.mustard);
    }
    drawText(ctx, `${total}/9 — STARS ARE YOUR HIGH-SCORE CHASE`, 690, 478, { size: 9, weight: 700, color: C.faint, spacing: 1 });

    if (this.toast) {
      stamp(ctx, this.toast.text, W / 2, 430, { size: 18, bg: C.mustard, rot: -0.04 });
    } else if (this.sel < LEVELS.length) {
      // one clear next action, always
      const l = LEVELS[this.sel];
      const open = this.isOpen(this.sel);
      const label = open
        ? `ENTER → ${sv.stars[l.id] > 0 ? 'REPLAY' : 'CLOCK IN'}: ${l.name}`
        : `FINISH SHIFT ${LEVELS[this.sel - 1].num} TO UNLOCK ${l.name}`;
      drawText(ctx, label, W / 2, 426, { font: 'display', size: 21, color: open ? C.mustard : C.faint, align: 'center', spacing: 2, alpha: 0.65 + 0.35 * Math.sin(this.t * 4.5) });
    }

    drawText(ctx, `←/→ CHOOSE   ·   ENTER WALK IN   ·   G GUEST BOOK (${sv.guestBook.length})   ·   F FULLSCREEN   ·   M MUTE   ·   P PAUSE`, W / 2, 514, { size: 10, weight: 500, color: C.faint, align: 'center', spacing: 2 });

    if (golden) {
      // thin gold proscenium — the quiet "you did it" frame around every replay
      ctx.save();
      ctx.globalAlpha = 0.4 + 0.12 * Math.sin(this.t * 1.6);
      frame(ctx, 5, 5, W - 10, H - 10, C.mustard, 2);
      ctx.restore();
    }

    if (this.showBook) this.drawBook(ctx);
  }

  drawBook(ctx) {
    const entries = this.game.save.data.guestBook;
    rect(ctx, 0, 0, W, H, C.ink, 0.85);
    // cream paper panel, ink type — the one bright surface in the game
    rect(ctx, 120, 56, 720, 428, C.cream);
    frame(ctx, 130, 66, 700, 408, '#c9bfa8', 1);
    drawText(ctx, 'GUEST BOOK', 160, 88, { font: 'display', size: 44, color: C.ink, spacing: 2 });
    rect(ctx, 160, 138, 200, 4, C.red);
    drawText(ctx, 'YOUR WINNING LINES LIVE HERE — STUDY THEM BEFORE A REAL SHIFT', 160, 152, { size: 10, weight: 700, color: '#6b6357', spacing: 2 });

    if (!entries.length) {
      drawText(ctx, 'No guests charmed yet.', 480, 260, { size: 16, weight: 500, color: C.ink, align: 'center' });
      drawText(ctx, 'THE PITCH IS OPEN AT THE SALES OFFICE →', 480, 290, { size: 10, weight: 700, color: '#6b6357', align: 'center', spacing: 2 });
    } else {
      let y = 186;
      for (const g of entries.slice(0, 3)) {
        drawText(ctx, g.guest.toUpperCase(), 160, y, { font: 'display', size: 26, color: C.red, spacing: 1 });
        drawText(ctx, g.place.toUpperCase(), 160 + 200, y + 8, { size: 9, weight: 700, color: '#6b6357', spacing: 1 });
        const lines = wrap(ctx, '"' + g.line + '"', 620, { size: 14, weight: 500, italic: true });
        lines.slice(0, 2).forEach((ln, i) =>
          drawText(ctx, ln, 160, y + 32 + i * 20, { size: 14, weight: 500, italic: true, color: C.ink }));
        y += 44 + Math.min(lines.length, 2) * 20 + 14;
      }
    }
    drawText(ctx, 'G → CLOSE', 480, 452, { size: 11, weight: 700, color: '#6b6357', align: 'center', spacing: 3 });
  }
}
