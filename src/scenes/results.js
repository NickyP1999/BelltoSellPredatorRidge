import { drawText, rect, measure } from '../util.js';
import { C, easeOutBack, easeOutExpo, sparkle, stamp, intro } from '../theme.js';
import { clamp } from '../util.js';

// Shared end-of-level star ceremony (Levels 1 & 2 — The Pitch has its own).
export class Ceremony {
  constructor(game) { this.game = game; }

  start({ label, stars, score, best, statLine, hintLine, nextLabel, newBest = false }) {
    this.label = label;
    this.stars = stars;
    this.score = score;
    this.best = best;
    this.statLine = statLine;
    this.hintLine = hintLine;
    this.nextLabel = nextLabel;
    this.newBest = newBest;
    this.t = 0;
    this.shown = 0;
    this.flash = 0;
    this.confetti = [];
    this.popped = false;
  }

  pop() {
    const colors = [C.mustard, C.red, C.teal, C.cream, C.violet];
    for (let i = 0; i < 46; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const v = 180 + Math.random() * 260;
      this.confetti.push({
        x: 480 + (Math.random() - 0.5) * 300, y: 256,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: 0, max: 0.9 + Math.random() * 0.6,
        r: 4 + Math.random() * 6, color: colors[i % colors.length],
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 10,
      });
    }
  }

  // Returns true when the player confirms past the ceremony.
  update(dt) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 4);
    for (const p of this.confetti) {
      p.life += dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 460 * dt; p.rot += p.vr * dt;
    }
    this.confetti = this.confetti.filter((p) => p.life < p.max);
    const target = Math.min(this.stars, Math.floor(Math.max(0, this.t - 0.6) / 0.55));
    while (this.shown < target) {
      this.shown++;
      this.game.audio.bell(1 + this.shown * 0.2);
      if (this.shown === this.stars) this.game.audio.stab(1.5, { when: 0.1 });
      if (this.shown === 3 && !this.popped) { this.popped = true; this.pop(); }
      this.flash = 0.7;
    }
    const inp = this.game.input;
    const confirm = inp.pressed.has('Enter') || inp.pressed.has('Space') || inp.pointer.clicked;
    return confirm && this.t > 0.6 + this.stars * 0.55 + 0.3;
  }

  draw(ctx) {
    const W = 960, H = 540;
    rect(ctx, 0, 0, W, H, C.ink);

    // The Ceremony assembles in a calm cadence: eyebrow, then headline drop in,
    // then the stars count up, then the score, then the supporting lines. Each
    // text element eases in with a small slide so nothing pops fully formed.
    const aEyebrow = intro(this.t, 0.0);
    drawText(ctx, this.label, W / 2, 68 + (1 - aEyebrow) * 8, { size: 11, weight: 700, color: C.mustard, align: 'center', spacing: 5, alpha: aEyebrow });
    const aHead = intro(this.t, 0.12);
    drawText(ctx, 'SHIFT COMPLETE', W / 2, 102 + (1 - aHead) * 12, { font: 'display', size: 80, color: C.cream, align: 'center', spacing: 3, alpha: aHead });

    for (let i = 0; i < 3; i++) {
      const x = W / 2 - 110 + i * 110;
      if (i < this.shown) {
        const st = clamp((this.t - 0.6 - i * 0.55) / 0.3, 0, 1);
        const s = 1 + (1 - easeOutBack(st)) * 1.4;
        sparkle(ctx, x, 256, 38 * s, C.mustard, { rot: 0.2 - st * 0.2 });
      } else {
        sparkle(ctx, x, 256, 30, '#241f2b');
      }
    }

    const reveal = easeOutExpo(clamp((this.t - 0.25) / 1.0, 0, 1));
    const scoreText = `SCORE  ${Math.round(this.score * reveal)}`;
    drawText(ctx, scoreText, W / 2, 330, { font: 'display', size: 40, color: C.cream, align: 'center', spacing: 2 });
    if (this.newBest && this.t > 1.3) {
      // anchor the stamp to the (final) score's right edge so it tracks any width
      const finalScore = `SCORE  ${this.score}`;
      const scoreRight = W / 2 + measure(ctx, finalScore, { font: 'display', size: 40, spacing: 2 }) / 2;
      const stampHalfW = (measure(ctx, 'NEW BEST!', { font: 'display', size: 15, spacing: 1 }) + 18) / 2;
      stamp(ctx, 'NEW BEST!', scoreRight + 18 + stampHalfW, 346, { size: 15, bg: C.teal, rot: 0.08 });
    }
    // supporting lines arrive only after the count-up settles, with room to breathe
    const aStat = intro(this.t, 1.2);
    drawText(ctx, `BEST ${this.best}   ·   ${this.statLine}`, W / 2, 388 + (1 - aStat) * 6, { size: 12, weight: 700, color: C.faint, align: 'center', spacing: 2, alpha: aStat });
    if (this.hintLine) {
      const aHint = intro(this.t, 1.34);
      drawText(ctx, this.hintLine, W / 2, 414 + (1 - aHint) * 6, { size: 10, weight: 500, color: C.faint, align: 'center', spacing: 1, alpha: aHint });
    }

    if (Math.sin(this.t * 5.5) > -0.25 && this.t > 0.6 + this.stars * 0.55 + 0.3) {
      drawText(ctx, this.nextLabel, W / 2, 454, { size: 12, weight: 700, color: C.mustard, align: 'center', spacing: 2 });
    }
    for (const p of this.confetti) {
      sparkle(ctx, p.x, p.y, p.r * (1 - p.life / p.max), p.color, { rot: p.rot, alpha: 1 - p.life / p.max });
    }
    if (this.flash > 0) rect(ctx, 0, 0, W, H, C.cream, this.flash * 0.45);
  }
}
