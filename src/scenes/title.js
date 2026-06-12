import { drawText, rect } from '../util.js';
import { C, bokehBg, easeOutExpo, halftone, motes, sparkle } from '../theme.js';
import { PLAYER_NAME } from '../config.js';

const W = 960, H = 540;

// The opening moment: logo slam, one prompt, nothing else.
export class TitleScene {
  constructor(game) { this.game = game; }

  enter() { this.t = 0; }

  update(dt) {
    this.t += dt;
    const inp = this.game.input;
    if ((inp.pressed.has('Enter') || inp.pressed.has('Space') || inp.pointer.clicked) && this.t > 0.5) {
      this.game.audio.bell(1.25);
      this.game.audio.stab(1.2, { vol: 0.04 });
      this.game.go('hub');
    }
  }

  draw(ctx) {
    bokehBg(ctx, 'title', { top: '#1c1524', mid: '#120e18', bottom: '#0a080d', glowA: '#f2b63a', glowB: '#d94f30' });
    motes(ctx, this.t);

    const k = easeOutExpo(Math.min(1, this.t / 0.8));
    ctx.save();
    ctx.translate(480, 220);
    ctx.rotate(-0.045);
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;
    rect(ctx, -330 * k + 12, -68, 660 * k, 160, C.red);
    ctx.shadowColor = 'transparent';
    rect(ctx, -330 * k, -80, 660 * k, 160, C.mustard);
    if (k > 0.92) {
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = halftone(ctx);
      ctx.fillRect(120, -80, 210, 160);
      ctx.restore();
      drawText(ctx, 'BELL TO SELL', 0, -62, { font: 'display', size: 116, color: C.ink, align: 'center', spacing: 3 });
    }
    ctx.restore();

    if (this.t > 0.9) {
      drawText(ctx, 'A PREDATOR RIDGE CAREER GAME', 480, 330, { size: 12, weight: 700, color: C.dim, align: 'center', spacing: 6 });
      sparkle(ctx, 480, 372, 9, C.mustard, { alpha: 0.85, rot: this.t * 0.4 });
      drawText(ctx, `STARRING BELLMAN ${PLAYER_NAME.toUpperCase()}`, 480, 394, { size: 10, weight: 700, color: C.faint, align: 'center', spacing: 3 });
    }
    if (this.t > 1.2) {
      drawText(ctx, 'ENTER → CLOCK IN', 480, 444, { font: 'display', size: 28, color: C.mustard, align: 'center', spacing: 3, alpha: 0.6 + 0.4 * Math.sin(this.t * 4.5) });
    }
    drawText(ctx, 'ORIGINAL TRIBUTE — NOT AFFILIATED WITH PREDATOR RIDGE RESORT', 480, 516, { size: 8, weight: 500, color: C.faint, align: 'center', spacing: 2, alpha: 0.7 });
  }
}
