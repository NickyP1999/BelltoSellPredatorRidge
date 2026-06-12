import { drawText, rect } from '../util.js';
import { C, easeOutBack, easeOutExpo, sparkle, stamp } from '../theme.js';
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
  }

  // Returns true when the player confirms past the ceremony.
  update(dt) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 4);
    const target = Math.min(this.stars, Math.floor(Math.max(0, this.t - 0.6) / 0.55));
    while (this.shown < target) {
      this.shown++;
      this.game.audio.bell(1 + this.shown * 0.2);
      if (this.shown === this.stars) this.game.audio.stab(1.5, { when: 0.1 });
      this.flash = 0.7;
    }
    const inp = this.game.input;
    const confirm = inp.pressed.has('Enter') || inp.pressed.has('Space') || inp.pointer.clicked;
    return confirm && this.t > 0.6 + this.stars * 0.55 + 0.3;
  }

  draw(ctx) {
    const W = 960, H = 540;
    rect(ctx, 0, 0, W, H, C.ink);
    drawText(ctx, this.label, W / 2, 96, { size: 11, weight: 700, color: C.mustard, align: 'center', spacing: 5 });
    drawText(ctx, 'SHIFT COMPLETE', W / 2, 110, { font: 'display', size: 80, color: C.cream, align: 'center', spacing: 3 });

    for (let i = 0; i < 3; i++) {
      const x = W / 2 - 110 + i * 110;
      if (i < this.shown) {
        const st = clamp((this.t - 0.6 - i * 0.55) / 0.3, 0, 1);
        const s = 1 + (1 - easeOutBack(st)) * 1.4;
        sparkle(ctx, x, 252, 38 * s, C.mustard, { rot: 0.2 - st * 0.2 });
      } else {
        sparkle(ctx, x, 252, 30, '#241f2b');
      }
    }

    const reveal = easeOutExpo(clamp((this.t - 0.25) / 1.0, 0, 1));
    drawText(ctx, `SCORE  ${Math.round(this.score * reveal)}`, W / 2, 322, { font: 'display', size: 40, color: C.cream, align: 'center', spacing: 2 });
    if (this.newBest && this.t > 1.3) {
      stamp(ctx, 'NEW BEST!', W / 2 + 178, 338, { size: 15, bg: C.teal, rot: 0.08 });
    }
    drawText(ctx, `BEST ${this.best}   ·   ${this.statLine}`, W / 2, 374, { size: 12, weight: 700, color: C.faint, align: 'center', spacing: 2 });
    if (this.hintLine) drawText(ctx, this.hintLine, W / 2, 398, { size: 10, weight: 500, color: C.faint, align: 'center', spacing: 1 });

    if (Math.sin(this.t * 5.5) > -0.25 && this.t > 0.6 + this.stars * 0.55 + 0.3) {
      drawText(ctx, this.nextLabel, W / 2, 442, { size: 12, weight: 700, color: C.mustard, align: 'center', spacing: 2 });
    }
    if (this.flash > 0) rect(ctx, 0, 0, W, H, C.cream, this.flash * 0.45);
  }
}
