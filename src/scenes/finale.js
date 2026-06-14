import { drawText, wrap, rect, frame, clamp } from '../util.js';
import { C, easeOutExpo, easeOutBack, halftone, motes, panel, sparkle, intro } from '../theme.js';
import { PLAYER_NAME } from '../config.js';

const W = 960, H = 540;

// The point of the whole game: the case for the promotion, in writing.
const LETTER = [
  `Dear ${PLAYER_NAME},`,
  'We watched three shifts this week.',
  'You kept a tower of luggage upright through a crowded lobby — grace under pressure, with a smile.',
  "You backed the Yukon XL into the tightest bay on the property with a hand's width to spare — precision, with guests aboard.",
  'And at the Sales Office you listened first, matched the need, and never pushed. Marisol booked the patio at sunset. Gord played the Ridge. The Albrights asked for the Woodside floor plans.',
  "Besides — since your first week in May, you've been putting Ellison Landing into guests' hands. Two bottles of water, every room.",
  'That is not bell work. That is sales work.',
  'Effective immediately, you are promoted to:',
];
const TITLE_LINE = 'SALES ASSISTANT — REAL ESTATE';
const TITLE_SUB = 'REAL ESTATE SALES OFFICE — SELLING ELLISON LANDING';
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
    if (this.state === 'card') {
      if (confirm && this.t > 0.8) this.game.go('hub');
      return;
    }
    // letter paragraphs land with soft type blips
    const reveal = Math.floor((this.t - 0.3) / 0.22);
    if (reveal > (this.revealSeen || 0) && reveal <= LETTER.length) {
      this.revealSeen = reveal;
      if (reveal === LETTER.length) this.game.audio.bell(1.1);
      else this.game.audio.blip();
    }
    if (!this.stamped && this.t > 2.4) {
      this.stamped = true;
      this.game.audio.win();
      this.game.audio.stab(1.5, { when: 0.2 });
      this.flash = 0.8;
      this.burst(700, 150, C.mustard, 20);
      this.burst(260, 420, C.red, 12);
    }
    if (confirm && this.t > 3.2) {
      this.state = 'card';
      this.t = 0;
      this.game.audio.stab(1.4, { vol: 0.04 });
      this.burst(480, 120, C.mustard, 16);
    }
  }

  draw(ctx) {
    rect(ctx, 0, 0, W, H, C.ink);
    if (this.state === 'walk') { this.drawWalk(ctx); return; }
    if (this.state === 'card') { this.drawCard(ctx); return; }

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

    drawText(ctx, 'PREDATOR RIDGE', 220, 30, { font: 'display', size: 32, color: C.ink, spacing: 3 });
    drawText(ctx, 'MANAGEMENT OFFICE — INTERNAL CORRESPONDENCE', 220, 66, { size: 9, weight: 700, color: '#6b6357', spacing: 2 });
    rect(ctx, 220, 82, 160, 3, C.red);

    // Overflow guard: the signoff must clear the inner frame bottom (474) by
    // ≥16px on a full reveal, no matter how the body wraps. Pre-measure the
    // whole composed letter once, then tighten line-height / paragraph gap (and
    // nudge the body up) until it fits. No paragraph text is ever cut.
    const BODY_TOP = 98;
    const FRAME_BOTTOM = 474;
    const wrapped = LETTER.map((para) => wrap(ctx, para, 520, { size: 12.5, weight: 500 }));
    const nLines = wrapped.reduce((s, l) => s + l.length, 0);
    // composed height below body top = body + (gap to title) + title + sub gap +
    // signoff lines; reserve ~13px past the last signoff baseline for descenders
    const TAIL = 89; // y+58 signoff start + 18 (2nd line) + 13 descender slack
    let lh = 17, gap = 5;
    const fits = (lhT, gapT) => BODY_TOP + nLines * lhT + LETTER.length * gapT + TAIL <= FRAME_BOTTOM - 16;
    if (!fits(lh, gap)) { lh = 16; }
    if (!fits(lh, gap)) { gap = 4; }
    if (!fits(lh, gap)) { lh = 15; }

    let y = BODY_TOP;
    const reveal = Math.floor((this.t - 0.3) / 0.22);
    wrapped.forEach((lines, i) => {
      if (i > reveal) return;
      lines.forEach((ln) => {
        drawText(ctx, ln, 220, y, { size: 12.5, weight: 500, color: C.ink });
        y += lh;
      });
      y += gap;
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

    // (the dark-margin career stat-stack lived here; removed so the letter
    // breathes — the Career Report screen right after is the stats surface)

    // PROMOTED stamp — seated in the letterhead's top-right whitespace so it
    // reads as a triumphant seal and never covers a readable word. Half-width
    // ~96 keeps the right edge (~676+96=772) inside the paper (780).
    if (this.stamped) {
      const k = easeOutBack(clamp((this.t - 2.4) / 0.25, 0, 1));
      ctx.save();
      ctx.translate(676, ly + 46);
      ctx.rotate(-0.16);
      ctx.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k);
      ctx.globalAlpha = 0.92;
      frame(ctx, -96, -34, 192, 68, C.red, 5);
      frame(ctx, -87, -25, 174, 50, C.red, 2);
      drawText(ctx, 'PROMOTED', 0, -21, { font: 'display', size: 42, color: C.red, align: 'center', spacing: 3 });
      ctx.restore();
    }

    for (const p of this.particles) sparkle(ctx, p.x, p.y, p.r * (1 - p.life / p.max), p.color, { rot: p.rot, alpha: 1 - p.life / p.max });
    if (this.flash > 0) rect(ctx, 0, 0, W, H, C.cream, this.flash * 0.45);

    // the only exit from this screen — smooth eased pulse over a faint ink
    // underlay so it always reads through the vignette
    if (this.t > 3.2) {
      rect(ctx, W / 2 - 150, 490, 300, 24, C.ink, 0.55);
      drawText(ctx, this.game.touch ? 'TAP → YOUR CAREER REPORT' : 'ENTER → YOUR CAREER REPORT', W / 2, 500, { size: 12, weight: 700, color: C.mustard, align: 'center', spacing: 2, alpha: 0.6 + 0.4 * Math.sin(this.t * 4.5) });
    }
  }

  fmtTime(s) {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  // The shareable end-card: the whole career on one screen, composed for a
  // screenshot a supervisor can forward. No real names beyond the fiction.
  drawCard(ctx) {
    const sv = this.game.save;
    const d = sv.data;
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = halftone(ctx);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    const rise = easeOutExpo(clamp(this.t / 0.6, 0, 1));
    ctx.save();
    ctx.globalAlpha = rise;
    ctx.translate(0, (1 - rise) * 36);

    // small masthead slab, same misprint language as the title
    ctx.save();
    ctx.translate(68, 52);
    ctx.rotate(-0.045);
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 7;
    rect(ctx, -6, 8, 244, 50, C.red);
    ctx.shadowColor = 'transparent';
    rect(ctx, -12, 0, 244, 50, C.mustard);
    drawText(ctx, 'BELL TO SELL', 110, 4, { font: 'display', size: 38, color: C.ink, align: 'center', spacing: 2 });
    // subtle foil sheen sweeping the masthead, same language as the title slab
    const sweep = (this.tAll % 3.4) / 3.4;
    if (sweep < 0.3) {
      const sx = -40 + (sweep / 0.3) * 320;
      ctx.save();
      ctx.beginPath();
      ctx.rect(-12, 0, 244, 50);
      ctx.clip();
      const sg = ctx.createLinearGradient(sx - 34, 0, sx + 34, 0);
      sg.addColorStop(0, 'rgba(255,255,255,0)');
      sg.addColorStop(0.5, 'rgba(255,255,255,0.20)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(sx - 34, 0, 68, 50);
      ctx.restore();
    }
    ctx.restore();

    drawText(ctx, 'CAREER REPORT', 64, 96, { font: 'display', size: 72, color: C.cream, spacing: 3 });
    rect(ctx, 64, 174, 200, 4, C.red);
    drawText(ctx, `BELLMAN ${PLAYER_NAME.toUpperCase()}  →  SALES ASSISTANT, REAL ESTATE`, 64, 186, { size: 12, weight: 700, color: C.mustard, spacing: 2 });

    // PROMOTED stamp, top right
    ctx.save();
    ctx.translate(796, 110);
    ctx.rotate(-0.14);
    ctx.globalAlpha *= 0.92;
    frame(ctx, -104, -38, 208, 76, C.red, 5);
    frame(ctx, -95, -29, 190, 58, C.red, 2);
    drawText(ctx, 'PROMOTED', 0, -23, { font: 'display', size: 46, color: C.red, align: 'center', spacing: 3 });
    ctx.restore();

    // headline stats — ease in left-to-right just after the masthead lands
    const stats = [
      { label: 'STARS EARNED', value: `${sv.totalStars()}/9`, starsRow: true },
      { label: 'TIPS EARNED', value: `${d.tips}` },
      { label: 'CAREER TIME', value: this.fmtTime(d.playTime || 0) },
    ];
    stats.forEach((s, i) => {
      const aIn = intro(this.t, 0.34 + i * 0.1);
      const x = 64 + i * 284, y = 208, w = 264, h = 112;
      ctx.save();
      ctx.globalAlpha *= aIn;
      ctx.translate(0, (1 - aIn) * 14);
      panel(ctx, x, y, w, h, { border: C.edge, borderW: 1 });
      drawText(ctx, s.label, x + 18, y + 16, { size: 10, weight: 700, color: C.faint, spacing: 3 });
      drawText(ctx, s.value, x + 18, y + 32, { font: 'display', size: 54, color: C.cream, spacing: 1 });
      if (s.starsRow) for (let k = 0; k < 9; k++) sparkle(ctx, x + 25 + k * 26, y + 98, 7, k < sv.totalStars() ? C.mustard : '#241f2b');
      ctx.restore();
    });

    // the verdict — the letter's own closing line, the hero caption of the
    // report (in-fiction only; pulled verbatim from Management's letter)
    const aHero = intro(this.t, 0.7);
    drawText(ctx, 'That is not bell work. That is sales work.', W / 2, 338 + (1 - aHero) * 8, { size: 18, weight: 500, italic: true, color: C.mustard, align: 'center', spacing: 1, alpha: aHero });

    // the case, shift by shift — each row pairs the score with the skill it
    // proves; rows cascade in top-to-bottom after the verdict
    const rows = [
      ['01', 'LUGGAGE RUSH', 'luggage', 'GRACE UNDER PRESSURE'],
      ['02', 'SHUTTLE PRECISION', 'valet', 'PRECISION, WITH GUESTS ABOARD'],
      ['03', 'THE PITCH', 'pitch', 'LISTEN, MATCH, CLOSE — HONESTLY'],
    ];
    rows.forEach(([num, name, id, proof], i) => {
      const aRow = intro(this.t, 0.84 + i * 0.09);
      const y = 366 + i * 38;
      ctx.save();
      ctx.globalAlpha *= aRow;
      ctx.translate((1 - aRow) * -16, 0);
      rect(ctx, 64, y - 8, 832, 32, i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.055)');
      drawText(ctx, num, 78, y - 3, { font: 'display', size: 22, color: C.mustard });
      drawText(ctx, name, 118, y, { size: 12, weight: 700, color: C.cream, spacing: 2 });
      for (let s = 0; s < 3; s++) sparkle(ctx, 392 + s * 24, y + 7, 8, s < (d.stars[id] || 0) ? C.mustard : '#241f2b');
      drawText(ctx, `BEST ${d.best[id] || 0}`, 488, y, { size: 11, weight: 700, color: C.dim, spacing: 1 });
      drawText(ctx, proof, 896, y, { size: 10, weight: 700, color: C.faint, align: 'right', spacing: 2 });
      ctx.restore();
    });

    drawText(ctx, 'CONFIDENTIAL — FOR PREDATOR RIDGE MANAGEMENT ONLY', 64, 498, { size: 9, weight: 700, color: C.mustard, spacing: 2, alpha: 0.85 });
    if (this.t > 0.8 && Math.sin(this.tAll * 5) > -0.3) {
      drawText(ctx, this.game.touch ? 'TAP → BACK TO THE RESORT' : 'ENTER → BACK TO THE RESORT', 896, 496, { size: 11, weight: 700, color: C.cream, align: 'right', spacing: 2 });
    }
    ctx.restore();

    for (const p of this.particles) sparkle(ctx, p.x, p.y, p.r * (1 - p.life / p.max), p.color, { rot: p.rot, alpha: 1 - p.life / p.max });
  }

  drawWalk(ctx) {
    // sunset over the Okanagan, lodge to the sales office, left to right —
    // blended into a single vertical gradient so the bands read as real sky,
    // with the same bokeh/mote/glow depth as the rest of the game
    const sky = ctx.createLinearGradient(0, 0, 0, 400);
    sky.addColorStop(0, '#241a36');
    sky.addColorStop(0.42, '#3a2440');
    sky.addColorStop(0.62, '#6e3a52');
    sky.addColorStop(0.78, '#b8452f');
    sky.addColorStop(0.9, '#d94f30');
    sky.addColorStop(1, '#f2b63a');
    rect(ctx, 0, 0, W, 400, '#241a36');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, 400);
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = halftone(ctx);
    ctx.fillRect(0, 180, W, 220);
    ctx.restore();
    motes(ctx, this.tAll, 14, '#f8e3b0');

    // soft radial glow around the sinking sun, then the disc itself
    const sunX = 620, sunY = 330;
    ctx.save();
    const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 150);
    glow.addColorStop(0, 'rgba(248,227,176,0.55)');
    glow.addColorStop(0.4, 'rgba(242,182,58,0.22)');
    glow.addColorStop(1, 'rgba(242,182,58,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sunX - 150, sunY - 150, 300, 300);
    ctx.restore();
    ctx.fillStyle = '#f8e3b0';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 38, 0, Math.PI * 2);
    ctx.fill();

    // a faint lake glint band catching the sun, just above the foreground
    ctx.save();
    const lake = ctx.createLinearGradient(0, 366, 0, 392);
    lake.addColorStop(0, 'rgba(248,227,176,0.20)');
    lake.addColorStop(0.5, 'rgba(242,182,58,0.10)');
    lake.addColorStop(1, 'rgba(242,182,58,0)');
    ctx.fillStyle = lake;
    ctx.fillRect(0, 366, W, 26);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#f8e3b0';
    for (let i = 0; i < 7; i++) {
      const gx = sunX - 120 + i * 40 + Math.sin(this.tAll * 1.2 + i) * 4;
      ctx.fillRect(gx, 372 + (i % 2) * 6, 20 + (i % 3) * 8, 2);
    }
    ctx.restore();

    rect(ctx, 0, 400, W, H - 400, C.ink);

    // a hint of depth: silhouette pines along the ridgeline behind the lodge
    ctx.save();
    ctx.fillStyle = '#150f1c';
    [[300, 300, 26], [340, 286, 32], [382, 308, 22], [690, 296, 30], [724, 312, 24]].forEach(([px, py, ph]) => {
      ctx.beginPath();
      ctx.moveTo(px, py - ph);
      ctx.lineTo(px - ph * 0.5, py);
      ctx.lineTo(px + ph * 0.5, py);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();

    // lodge silhouette (left) and the sales office (right)
    rect(ctx, 40, 280, 220, 120, '#0a0a0c');
    rect(ctx, 80, 240, 140, 50, '#0a0a0c');
    drawText(ctx, 'THE LODGE', 150, 414, { size: 9, weight: 700, color: C.faint, align: 'center', spacing: 2 });
    rect(ctx, 740, 300, 170, 100, '#0a0a0c');
    rect(ctx, 770, 270, 110, 36, '#0a0a0c');
    sparkle(ctx, 825, 254, 9, C.mustard);
    drawText(ctx, 'REAL ESTATE SALES OFFICE', 825, 414, { size: 9, weight: 700, color: C.mustard, align: 'center', spacing: 2 });

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
    // cream rim-light catching the sunset, like the Cottage Run — top/front edges
    ctx.save();
    ctx.strokeStyle = 'rgba(242,233,216,0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-30, -51); ctx.lineTo(28, -51);   // canopy roof
    ctx.moveTo(24, -46); ctx.lineTo(24, -16);     // front canopy post
    ctx.moveTo(30, -14); ctx.quadraticCurveTo(46, -12, 48, 0); // sloped nose
    ctx.stroke();
    ctx.restore();
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
    if (this.t > 0.7) drawText(ctx, this.game.touch ? 'TAP → SKIP' : 'ENTER → SKIP', 924, 480, { size: 10, weight: 700, color: C.faint, align: 'right', spacing: 2 });
  }
}
