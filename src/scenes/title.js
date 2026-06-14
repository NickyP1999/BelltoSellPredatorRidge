import { drawText, rect, pointIn } from '../util.js';
import { C, bokehBg, easeOutExpo, halftone, motes, sparkle, intro, breath } from '../theme.js';
import { PLAYER_NAME } from '../config.js';

const W = 960, H = 540;
const SETTINGS_BTN = { x: 766, y: 16, w: 178, h: 36 };

// A small cog drawn in code (no asset) — the settings affordance.
function cog(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((i / 8) * Math.PI * 2);
    ctx.fillRect(-1.5, -r - 2.4, 3, 4.8);
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

// The opening moment: logo slam, one prompt, a settings cog.
export class TitleScene {
  constructor(game) { this.game = game; }

  enter() { this.t = 0; this.overSettings = false; }

  update(dt) {
    this.t += dt;
    const inp = this.game.input;
    const p = inp.pointer;
    this.overSettings = pointIn(p, SETTINGS_BTN.x, SETTINGS_BTN.y, SETTINGS_BTN.w, SETTINGS_BTN.h);
    if (this.overSettings) this.game.cursor = 'pointer';
    if (this.t <= 0.5) return;

    // Settings takes precedence over the "click anywhere to start" affordance.
    if (inp.pressed.has('KeyS') || (p.clicked && this.overSettings)) {
      this.game.audio.stab(1.1, { vol: 0.04 });
      this.game.go('settings', { from: 'title' });
      return;
    }
    if (inp.pressed.has('Enter') || inp.pressed.has('Space') || (p.clicked && !this.overSettings)) {
      this.game.audio.bell(1.25);
      this.game.audio.stab(1.2, { vol: 0.04 });
      this.game.go('hub');
    }
  }

  draw(ctx) {
    bokehBg(ctx, 'title', { top: '#1c1524', mid: '#120e18', bottom: '#0a080d', glowA: '#f2b63a', glowB: '#d94f30' });
    motes(ctx, this.t);

    // ambient: a brass bell cart rolls the lower third, end to end, forever
    const cartX = ((this.t * 52) % (960 + 260)) - 130;
    const cartBob = Math.sin(this.t * 6) * 1.2;
    ctx.save();
    ctx.translate(cartX, 488 + cartBob);
    ctx.fillStyle = '#1d1827';
    ctx.fillRect(-36, -10, 72, 6);            // deck
    ctx.fillRect(-34, -44, 4, 36);            // posts
    ctx.fillRect(30, -44, 4, 36);
    ctx.beginPath();                          // arched top bar
    ctx.moveTo(-32, -44);
    ctx.quadraticCurveTo(0, -60, 32, -44);
    ctx.quadraticCurveTo(0, -52, -32, -44);
    ctx.fill();
    ctx.fillRect(-26, -28, 22, 18);           // luggage stack
    ctx.fillRect(-2, -34, 18, 24);
    ctx.fillRect(8, -42, 12, 8);
    const wa = this.t * 7;
    [-22, 22].forEach((hx) => {
      ctx.beginPath();
      ctx.arc(hx, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(242,233,216,0.16)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(hx + Math.cos(wa) * 4, Math.sin(wa) * 4);
      ctx.lineTo(hx - Math.cos(wa) * 4, -Math.sin(wa) * 4);
      ctx.stroke();
    });
    ctx.restore();

    const k = easeOutExpo(Math.min(1, this.t / 0.8));
    ctx.save();
    ctx.translate(480, 214 + breath(this.t, 1.1, 3));
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
      // periodic sheen sweep across the slab
      const sweep = (this.t % 3.4) / 3.4;
      if (sweep < 0.3) {
        const sx = -390 + (sweep / 0.3) * 780;
        ctx.save();
        ctx.beginPath();
        ctx.rect(-330, -80, 660, 160);
        ctx.clip();
        const sg = ctx.createLinearGradient(sx - 70, 0, sx + 70, 0);
        sg.addColorStop(0, 'rgba(255,255,255,0)');
        sg.addColorStop(0.5, 'rgba(255,255,255,0.16)');
        sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(sx - 70, -80, 140, 160);
        ctx.restore();
      }
    }
    ctx.restore();

    // Staggered reveal: once the logo has slammed home (~0.85s), the eyebrow,
    // sparkle, credit, CTA and footer cascade in left-to-right-in-time, each
    // easing up a few px so the card assembles rather than dumping all at once.
    const BASE = 0.85;
    const a1 = intro(this.t, BASE);
    if (a1 > 0.001) {
      drawText(ctx, 'A PREDATOR RIDGE CAREER GAME', 480, 332 + (1 - a1) * 10, { size: 12, weight: 700, color: C.dim, align: 'center', spacing: 6, alpha: a1 });
    }
    const a2 = intro(this.t, BASE + 0.12);
    if (a2 > 0.001) {
      sparkle(ctx, 480, 372, 9 * a2, C.mustard, { alpha: 0.85 * a2, rot: this.t * 0.4 });
      drawText(ctx, `STARRING BELLMAN ${PLAYER_NAME.toUpperCase()}`, 480, 394 + (1 - a2) * 8, { size: 10, weight: 700, color: C.faint, align: 'center', spacing: 3, alpha: a2 });
    }
    const a3 = intro(this.t, BASE + 0.28);
    if (a3 > 0.001) {
      drawText(ctx, this.game.touch ? 'TAP → CLOCK IN' : 'ENTER → CLOCK IN', 480, 448 + (1 - a3) * 8, { font: 'display', size: 28, color: C.mustard, align: 'center', spacing: 3, alpha: a3 * (0.6 + 0.4 * Math.sin(this.t * 4.5)) });
    }
    // settings cog, top-right — staggers in with the rest, brightens on hover
    const as = intro(this.t, BASE + 0.18);
    if (as > 0.001) {
      const lit = this.overSettings;
      const col = lit ? C.mustard : C.dim;
      cog(ctx, 786, 35, 8, col);
      drawText(ctx, this.game.touch ? 'SETTINGS' : 'SETTINGS · S', 936, 28, { size: 11, weight: 700, color: col, align: 'right', spacing: 2, alpha: as * (lit ? 1 : 0.8) });
    }

    const a4 = intro(this.t, BASE + 0.42);
    drawText(ctx, 'CONFIDENTIAL — FOR PREDATOR RIDGE MANAGEMENT ONLY · NOT TO BE SHARED OUTSIDE MANAGEMENT', 480, 504, { size: 8, weight: 700, color: C.mustard, align: 'center', spacing: 2, alpha: 0.85 * a4 });
    drawText(ctx, 'ORIGINAL TRIBUTE — NOT AFFILIATED WITH PREDATOR RIDGE RESORT', 480, 518, { size: 8, weight: 500, color: C.faint, align: 'center', spacing: 2, alpha: 0.7 * a4 });
  }
}
