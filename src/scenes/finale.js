import { drawText, wrap, rect, frame, clamp } from '../util.js';
import { C, easeOutExpo, easeOutBack, halftone, sparkle } from '../theme.js';
import { PLAYER_NAME } from '../config.js';

const W = 960, H = 540;

// The point of the whole game: the case for the promotion, in writing.
const LETTER = [
  `Dear ${PLAYER_NAME},`,
  'We watched three shifts this week.',
  'You kept a tower of luggage upright through a crowded lobby — grace under pressure, with a smile.',
  "You backed a guest's Denali XL into a stall with a hand's width to spare — precision and care with what guests value most.",
  'And at the Sales Centre you listened first, matched the need, and never pushed. Marisol booked the patio at sunset. Gord played the Ridge. The Albrights asked for the Woodside floor plans.',
  'That is not bell work. That is sales work.',
  'Effective immediately, you are promoted to:',
];
const TITLE_LINE = 'SALES ASSISTANT — REAL ESTATE';
const TITLE_SUB = 'ELLISON LANDING SALES CENTRE';
const SIGNOFF = ['Welcome to the other side of the bell desk.', '— Management, Predator Ridge'];

export class FinaleScene {
  constructor(game) { this.game = game; }

  enter() {
    this.t = 0;
    this.tAll = 0;
    this.state = 'walk';
    this.flash = 0;
    this.stamped = false;
    this.particles = [];
    const sv = this.game.save;
    sv.data.finaleSeen = true;
    sv.write();
  }

  burst(x, y, color, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 230 * (0.4 + Math.random() * 0.8);
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: 0, max: 0.6 + Math.random() * 0.4, r: 4 + Math.random() * 5, color, rot: Math.random() * 3, vr: (Math.random() - 0.5) * 8 });
    }
  }

  update(dt) {
    this.t += dt;
    this.tAll += dt;
    this.flash = Math.max(0, this.flash - dt * 4);
    for (const p of this.particles) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 480 * dt; p.rot += p.vr * dt; }
    this.particles = this.particles.filter((p) => p.life < p.max);

    const inp = this.game.input;
    const confirm = inp.pressed.has('Enter') || inp.pressed.has('Space') || inp.pointer.clicked;

    if (this.state === 'walk') {
      if (this.t > 3.4 || (confirm && this.t > 0.4)) { this.state = 'letter'; this.t = 0; }
      return;
    }
    // letter
    if (!this.stamped && this.t > 2.4) {
      this.stamped = true;
      this.game.audio.win();
      this.game.audio.stab(1.5, { when: 0.2 });
      this.flash = 0.8;
      this.burst(700, 150, C.mustard, 20);
      this.burst(260, 420, C.red, 12);
    }
    if (confirm && this.t > 3.2) this.game.go('hub');
  }

  draw(ctx) {
    rect(ctx, 0, 0, W, H, C.ink);
    if (this.state === 'walk') { this.drawWalk(ctx); return; }

    // ── the letter
    const rise = easeOutExpo(clamp(this.t / 0.5, 0, 1));
    const ly = 30 + (1 - rise) * 540;
    ctx.save();
    ctx.translate(0, ly);
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 34;
    ctx.shadowOffsetY = 14;
    rect(ctx, 180, 0, 600, 484, C.cream);
    ctx.shadowColor = 'transparent';
    const paper = ctx.createLinearGradient(0, 0, 0, 484);
    paper.addColorStop(0, 'rgba(255,255,255,0.35)');
    paper.addColorStop(0.2, 'rgba(255,255,255,0)');
    paper.addColorStop(1, 'rgba(120,100,70,0.18)');
    ctx.fillStyle = paper;
    ctx.fillRect(180, 0, 600, 484);
    frame(ctx, 190, 10, 580, 464, '#c9bfa8', 1);

    drawText(ctx, 'PREDATOR RIDGE', 220, 34, { font: 'display', size: 34, color: C.ink, spacing: 3 });
    drawText(ctx, 'MANAGEMENT OFFICE — INTERNAL CORRESPONDENCE', 220, 72, { size: 9, weight: 700, color: '#6b6357', spacing: 2 });
    rect(ctx, 220, 88, 160, 3, C.red);

    let y = 104;
    const reveal = Math.floor((this.t - 0.3) / 0.22);
    LETTER.forEach((para, i) => {
      if (i > reveal) return;
      const lines = wrap(ctx, para, 520, { size: 12.5, weight: 500 });
      lines.forEach((ln) => {
        drawText(ctx, ln, 220, y, { size: 12.5, weight: 500, color: C.ink });
        y += 17;
      });
      y += 5;
    });

    if (reveal >= LETTER.length) {
      drawText(ctx, TITLE_LINE, 220, y + 2, { font: 'display', size: 30, color: C.red, spacing: 1 });
      drawText(ctx, TITLE_SUB, 220, y + 36, { size: 10, weight: 700, color: '#6b6357', spacing: 3 });
      let sy = y + 58;
      SIGNOFF.forEach((ln) => {
        drawText(ctx, ln, 220, sy, { size: 12.5, weight: 500, italic: true, color: C.ink });
        sy += 18;
      });
    }
    ctx.restore();

    // career stats, stacked in the dark margin beside the letter
    const sv = this.game.save;
    const statLines = ['CAREER', `${sv.totalStars()}/9 STARS`, `${sv.data.tips} TIPS`, '', 'NEW GAME+', 'REPLAY ANY SHIFT', 'CHASE 9 STARS'];
    statLines.forEach((ln, i) => {
      if (ln) drawText(ctx, ln, 24, 40 + i * 16, { size: 9, weight: 700, color: i === 0 || i === 4 ? C.mustard : C.faint, spacing: 2 });
    });

    // PROMOTED stamp
    if (this.stamped) {
      const k = easeOutBack(clamp((this.t - 2.4) / 0.25, 0, 1));
      ctx.save();
      ctx.translate(700, 150 + ly - 30);
      ctx.rotate(-0.16);
      ctx.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k);
      ctx.globalAlpha = 0.92;
      frame(ctx, -118, -42, 236, 84, C.red, 5);
      frame(ctx, -108, -32, 216, 64, C.red, 2);
      drawText(ctx, 'PROMOTED', 0, -26, { font: 'display', size: 52, color: C.red, align: 'center', spacing: 4 });
      ctx.restore();
    }

    for (const p of this.particles) sparkle(ctx, p.x, p.y, p.r * (1 - p.life / p.max), p.color, { rot: p.rot, alpha: 1 - p.life / p.max });
    if (this.flash > 0) rect(ctx, 0, 0, W, H, C.cream, this.flash * 0.45);

    if (this.t > 3.2 && Math.sin(this.tAll * 5.5) > -0.25) {
      drawText(ctx, 'ENTER → BACK TO THE RESORT', W / 2, 512, { size: 12, weight: 700, color: C.mustard, align: 'center', spacing: 2 });
    }
  }

  drawWalk(ctx) {
    // sunset over the Okanagan, lodge to sales centre, left to right
    rect(ctx, 0, 0, W, 200, '#2a1f3d');
    rect(ctx, 0, 200, W, 90, '#6e3a52');
    rect(ctx, 0, 290, W, 70, '#d94f30');
    rect(ctx, 0, 360, W, 40, '#f2b63a');
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = halftone(ctx);
    ctx.fillRect(0, 200, W, 200);
    ctx.restore();
    ctx.fillStyle = '#f8e3b0';
    ctx.beginPath();
    ctx.arc(620, 330, 38, 0, Math.PI * 2);
    ctx.fill();
    rect(ctx, 0, 400, W, H - 400, C.ink);

    // lodge silhouette (left) and sales centre (right)
    rect(ctx, 40, 280, 220, 120, '#0a0a0c');
    rect(ctx, 80, 240, 140, 50, '#0a0a0c');
    drawText(ctx, 'THE LODGE', 150, 414, { size: 9, weight: 700, color: C.faint, align: 'center', spacing: 2 });
    rect(ctx, 740, 300, 170, 100, '#0a0a0c');
    rect(ctx, 770, 270, 110, 36, '#0a0a0c');
    sparkle(ctx, 825, 254, 9, C.mustard);
    drawText(ctx, 'REAL ESTATE SALES CENTRE', 825, 414, { size: 9, weight: 700, color: C.mustard, align: 'center', spacing: 2 });

    // one last run in the Porsche NXT cart — box on the back, left to right
    const wx = 150 + easeOutExpo(clamp(this.t / 3.2, 0, 1)) * 560;
    const bob = Math.sin(this.tAll * 7) * 1.5;
    ctx.save();
    ctx.translate(wx, 374 + bob);
    ctx.fillStyle = '#0a0a0c';
    // chassis + sloped nose
    ctx.fillRect(-34, -14, 64, 14);
    ctx.beginPath();
    ctx.moveTo(30, -14);
    ctx.quadraticCurveTo(46, -12, 48, 0);
    ctx.lineTo(30, 0);
    ctx.fill();
    // cargo box on the back, luggage strapped on top
    ctx.fillRect(-58, -28, 26, 28);
    ctx.fillRect(-54, -35, 18, 7);
    // canopy
    ctx.fillRect(-26, -46, 4, 32);
    ctx.fillRect(20, -46, 4, 32);
    ctx.fillRect(-30, -51, 58, 5);
    // driver
    ctx.beginPath();
    ctx.arc(0, -33, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-7, -27, 14, 13);
    // wheels with spinning hubs
    [[-22, 1], [34, 1]].forEach(([hx, hy]) => {
      ctx.beginPath();
      ctx.arc(hx, hy + 8, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.cream;
      ctx.lineWidth = 2;
      const a = this.tAll * 9;
      ctx.beginPath();
      ctx.moveTo(hx + Math.cos(a) * 4, hy + 8 + Math.sin(a) * 4);
      ctx.lineTo(hx - Math.cos(a) * 4, hy + 8 - Math.sin(a) * 4);
      ctx.stroke();
    });
    ctx.restore();

    drawText(ctx, 'THAT EVENING — ONE LAST RUN IN THE NXT CART...', W / 2, 452, { size: 11, weight: 700, color: C.dim, align: 'center', spacing: 3 });
    if (this.t > 0.7) drawText(ctx, 'ENTER → SKIP', 924, 480, { size: 10, weight: 700, color: C.faint, align: 'right', spacing: 2 });
  }
}
