import { drawText, rect, frame, clamp } from '../util.js';
import { C, easeOutExpo, halftone, sparkle, stamp } from '../theme.js';
import { Ceremony } from './results.js';

const W = 960, H = 540;
const ACCENT = '#d94f30';
const CART_SX = 300;   // the cart holds this screen x; the lobby scrolls past it
const FLOOR = 430;
const WORLD = 2600;
const ELEVATOR_X = 2470;
const TIME_LIMIT = 65;
const LEAN_LIMIT = 0.5;

const ZONES = [260, 540, 820, 1100, 1380, 1660, 1940, 2220];
const DOORS = [{ x: 700, phase: 0 }, { x: 1520, phase: 0.5 }];
const WET = { x0: 1150, x1: 1330 };
const GUESTS = [{ x: 950, phase: 0 }, { x: 1800, phase: 0.6 }];
const BAG_COLORS = ['#8a5a3a', '#3a5a6e', '#6e3a52', '#52663a', '#5a4a7a', '#7a6a3a', '#3a6e5e', '#9b6fd1'];

export class LuggageScene {
  constructor(game) {
    this.game = game;
    this.ceremony = new Ceremony(game);
  }

  enter() {
    this.tAll = 0;
    this.state = 'intro';
    this.t = 0;
    this.reset();
  }

  reset() {
    this.cx = 80;
    this.v = 0;
    this.lean = 0;
    this.omega = 0;
    this.stack = [];
    this.drops = 0;
    this.timeLeft = TIME_LIMIT;
    this.zones = ZONES.map((x, i) => ({ x, status: 'pending', fallT: 0, color: BAG_COLORS[i] }));
    this.guestCd = GUESTS.map(() => 0);
    this.shake = 0;
    this.flash = 0;
    this.particles = [];
    this.floaters = [];
    this.failLine = '';
  }

  burst(x, y, color, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 180 * (0.4 + Math.random() * 0.8);
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0, max: 0.5 + Math.random() * 0.3, r: 3 + Math.random() * 4, color, rot: Math.random() * 3, vr: (Math.random() - 0.5) * 8 });
    }
  }

  float(text, x, y, color) { this.floaters.push({ text, x, y, t: 0, color }); }

  doorOpen(door) { return ((this.tAll * 0.45 + door.phase) % 1) < 0.62; }

  guestY(g) {
    // guests cross the cart's lane near the floor, not up the wall
    const u = (this.tAll * 0.35 + g.phase) % 1;
    return u < 0.5 ? 330 + u * 2 * 140 : 330 + (1 - u) * 2 * 140;
  }

  fail(line) {
    this.failLine = line;
    this.state = 'fail';
    this.t = 0;
    this.game.audio.lose();
  }

  finish() {
    const score = Math.max(0, this.stack.length * 120 + Math.round(this.timeLeft) * 8 - this.drops * 40);
    const stars = score >= 1000 ? 3 : score >= 760 ? 2 : 1;
    const sv = this.game.save;
    sv.data.stars.luggage = Math.max(sv.data.stars.luggage, stars);
    sv.data.best.luggage = Math.max(sv.data.best.luggage, score);
    sv.data.tips += 10 + this.stack.length * 3;
    sv.write();
    this.game.audio.win();
    this.ceremony.start({
      label: 'LEVEL 01 — LUGGAGE RUSH',
      stars, score,
      best: sv.data.best.luggage,
      statLine: `${this.stack.length}/8 BAGS ABOARD · ${this.drops} DROPPED · ${Math.round(this.timeLeft)}S TO SPARE`,
      hintLine: 'EVERY BAG ABOARD AND NO DROPS IS A 3-STAR SHIFT',
      nextLabel: 'ENTER → NEXT SHIFT: VALET PRECISION',
    });
    this.state = 'stars';
  }

  update(dt) {
    this.tAll += dt;
    this.t += dt;
    this.shake = Math.max(0, this.shake - dt * 1.8);
    this.flash = Math.max(0, this.flash - dt * 4);
    for (const p of this.particles) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 520 * dt; p.rot += p.vr * dt; }
    this.particles = this.particles.filter((p) => p.life < p.max);
    for (const f of this.floaters) { f.t += dt; f.y -= 30 * dt; }
    this.floaters = this.floaters.filter((f) => f.t < 1);

    const inp = this.game.input;
    const confirm = inp.pressed.has('Enter') || inp.pressed.has('Space') || inp.pointer.clicked;

    if (this.state === 'intro') {
      if (this.t > 1.6 || (confirm && this.t > 0.3)) {
        this.state = this.game.save.data.seenHowTo.luggage ? 'play' : 'howto';
        this.t = 0;
      }
      return;
    }
    if (this.state === 'howto') {
      if (confirm) {
        this.game.save.data.seenHowTo.luggage = true;
        this.game.save.write();
        this.state = 'play';
        this.t = 0;
      }
      return;
    }
    if (this.state === 'fail') {
      if ((confirm || inp.pressed.has('KeyR')) && this.t > 0.5) { this.reset(); this.state = 'play'; this.t = 0; }
      return;
    }
    if (this.state === 'stars') {
      if (this.ceremony.update(dt)) this.game.go('valet');
      return;
    }

    // ── play
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) { this.fail('THE ELEVATOR LEFT WITHOUT YOU. CLASSIC.'); return; }

    const right = inp.down.has('ArrowRight') || inp.down.has('KeyD');
    const left = inp.down.has('ArrowLeft') || inp.down.has('KeyA');
    const prevV = this.v;
    let a = 0;
    if (right) a += 300;
    if (left) a -= 380;
    if (!right && !left) a -= Math.sign(this.v) * 55;
    this.v = clamp(this.v + a * dt, 0, 280);

    // doors block when closed
    for (const door of DOORS) {
      if (!this.doorOpen(door) && this.cx + 34 > door.x && this.cx < door.x + 10) {
        this.cx = door.x - 34;
        if (this.v > 40) { this.game.audio.thump(); this.shake = 0.3; }
        this.v = 0;
      }
    }

    // momentum transfer: speed changes tip the stack
    const dv = this.v - prevV;
    this.omega -= dv * 0.0045;

    // wet floor punishes speed
    if (this.cx > WET.x0 && this.cx < WET.x1 && this.v > 120) {
      this.omega += Math.sin(this.tAll * 13) * 1.4 * dt;
    }

    // guests crossing the lobby
    GUESTS.forEach((g, i) => {
      this.guestCd[i] = Math.max(0, this.guestCd[i] - dt);
      const gy = this.guestY(g);
      if (Math.abs(this.cx - g.x) < 34 && gy > 390 && this.v > 25 && this.guestCd[i] <= 0) {
        this.guestCd[i] = 2;
        this.omega += this.v * 0.004;
        this.v *= 0.25;
        this.game.audio.thump();
        this.shake = 0.3;
        this.float('PARDON ME!', CART_SX, 300, C.red);
      }
    });

    // bag drops
    for (const z of this.zones) {
      if (z.status === 'pending') {
        if (Math.abs(this.cx - z.x) < 55) { z.status = 'falling'; z.fallT = 0; this.game.audio.ride(); }
        else if (this.cx - z.x > 70) { z.status = 'missed'; this.game.audio.thump(); this.float('MISSED', CART_SX, 200, C.faint); }
      } else if (z.status === 'falling') {
        z.fallT += dt;
        if (z.fallT >= 0.35) {
          z.status = 'caught';
          const off = clamp((this.cx - z.x) / 55, -1, 1);
          this.omega += off * 1.1;
          this.stack.push(z.color);
          this.game.audio.bell(1 + this.stack.length * 0.06);
          this.burst(CART_SX, FLOOR - 30 - this.stack.length * 22, C.mustard, 8);
          this.float(`BAG ${this.stack.length}/8`, CART_SX, FLOOR - 80 - this.stack.length * 22, C.cream);
        }
      }
    }

    // stack lean physics — taller stack, twitchier balance
    const k = 2.0 * (0.35 + 0.16 * this.stack.length);
    this.omega += this.lean * k * dt;
    this.omega *= Math.max(0, 1 - 1.1 * dt);
    this.lean += this.omega * dt;
    if (Math.abs(this.lean) > LEAN_LIMIT && this.stack.length > 0) {
      this.stack.pop();
      this.drops++;
      this.lean *= 0.45;
      this.omega *= 0.3;
      this.game.audio.thump();
      this.shake = 0.4;
      this.burst(CART_SX + Math.sign(this.lean) * 50, FLOOR - 40, ACCENT, 12);
      this.float('BAG DOWN!', CART_SX, FLOOR - 120, ACCENT);
    }

    this.cx = clamp(this.cx + this.v * dt, 60, WORLD - 40);
    if (this.cx >= ELEVATOR_X - 60) this.finish();
  }

  draw(ctx) {
    ctx.save();
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * 10 * this.shake, (Math.random() - 0.5) * 8 * this.shake);
    rect(ctx, 0, 0, W, H, C.ink);

    if (this.state === 'intro') { this.drawIntro(ctx); ctx.restore(); return; }
    if (this.state === 'howto') { this.drawHowTo(ctx); ctx.restore(); return; }
    if (this.state === 'stars') { this.ceremony.draw(ctx); ctx.restore(); return; }

    const cam = clamp(this.cx - CART_SX, 0, WORLD - W);

    // lobby wall + pillars
    rect(ctx, 0, 104, W, FLOOR - 104, '#131017');
    for (let wx = 0; wx < WORLD; wx += 240) {
      const sx = wx - cam;
      if (sx < -40 || sx > W + 40) continue;
      rect(ctx, sx, 104, 18, FLOOR - 104, '#1a1620');
      sparkle(ctx, sx + 9, 150, 5, C.mustard, { alpha: 0.5 });
    }
    rect(ctx, 0, FLOOR, W, H - FLOOR, '#0f0d12');
    rect(ctx, 0, FLOOR, W, 2, C.cream, 0.18);

    // wet floor
    if (WET.x1 - cam > 0 && WET.x0 - cam < W) {
      rect(ctx, WET.x0 - cam, FLOOR, WET.x1 - WET.x0, 24, C.teal, 0.12);
      ctx.fillStyle = C.mustard;
      ctx.beginPath();
      ctx.moveTo(WET.x0 - cam + 10, FLOOR);
      ctx.lineTo(WET.x0 - cam + 34, FLOOR);
      ctx.lineTo(WET.x0 - cam + 22, FLOOR - 30);
      ctx.fill();
      drawText(ctx, 'SLOW — WET FLOOR', WET.x0 - cam + 50, FLOOR - 24, { size: 9, weight: 700, color: C.teal, spacing: 1 });
    }

    // bell rail + drop zones
    rect(ctx, -cam, 116, WORLD, 3, C.cream, 0.25);
    for (const z of this.zones) {
      const sx = z.x - cam;
      if (sx < -80 || sx > W + 80) continue;
      if (z.status === 'pending' || z.status === 'falling') {
        const fy = z.status === 'falling' ? 122 + easeOutExpo(z.fallT / 0.35) * (FLOOR - 180) : 122;
        rect(ctx, sx - 19, fy, 38, 26, z.color);
        frame(ctx, sx - 19, fy, 38, 26, C.cream, 1);
        ctx.fillStyle = ACCENT;
        ctx.beginPath();
        ctx.moveTo(sx - 12, FLOOR - 6 - Math.abs(Math.sin(this.tAll * 4)) * 6);
        ctx.lineTo(sx + 12, FLOOR - 6 - Math.abs(Math.sin(this.tAll * 4)) * 6);
        ctx.lineTo(sx, FLOOR + 6 - Math.abs(Math.sin(this.tAll * 4)) * 6);
        ctx.fill();
      } else if (z.status === 'missed') {
        drawText(ctx, '×', sx, 124, { font: 'display', size: 22, color: C.faint, align: 'center' });
      }
    }

    // sliding doors
    for (const door of DOORS) {
      const sx = door.x - cam;
      if (sx < -120 || sx > W + 120) continue;
      const open = this.doorOpen(door);
      const gap = open ? 78 : 14;
      rect(ctx, sx - gap - 22, 104, 22, FLOOR - 104, '#241f2b');
      rect(ctx, sx + gap, 104, 22, FLOOR - 104, '#241f2b');
      frame(ctx, sx - gap - 22, 104, 22, FLOOR - 104, open ? C.teal : ACCENT, 1);
      frame(ctx, sx + gap, 104, 22, FLOOR - 104, open ? C.teal : ACCENT, 1);
      drawText(ctx, open ? 'AUTO DOOR' : 'WAIT', sx, 116, { size: 8, weight: 700, color: open ? C.teal : ACCENT, align: 'center', spacing: 1 });
    }

    // guests
    for (const g of GUESTS) {
      const sx = g.x - cam;
      if (sx < -40 || sx > W + 40) continue;
      const gy = this.guestY(g);
      rect(ctx, sx - 10, gy - 26, 20, 30, '#2c2532');
      ctx.fillStyle = '#2c2532';
      ctx.beginPath();
      ctx.arc(sx, gy - 34, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    // elevator
    const ex = ELEVATOR_X - cam;
    if (ex < W + 160) {
      rect(ctx, ex - 10, 104, 130, FLOOR - 104, '#1a1620');
      frame(ctx, ex - 10, 104, 130, FLOOR - 104, C.mustard, 2);
      const doorW = clamp(this.timeLeft / TIME_LIMIT, 0, 1) * 50 + 6;
      rect(ctx, ex + 55 - doorW, 130, doorW, FLOOR - 134, '#0f0d12');
      rect(ctx, ex + 55, 130, doorW, FLOOR - 134, '#0f0d12');
      frame(ctx, ex + 55 - doorW, 130, doorW * 2, FLOOR - 134, C.cream, 1);
      drawText(ctx, 'ELEVATOR', ex + 55, 112, { size: 9, weight: 700, color: C.mustard, align: 'center', spacing: 2 });
    }

    // the cart + stack
    ctx.save();
    ctx.translate(CART_SX, FLOOR - 2);
    ctx.rotate(this.lean * 0.18);
    rect(ctx, -52, -14, 104, 9, '#a87f2a');
    rect(ctx, -48, -74, 5, 60, '#a87f2a');
    rect(ctx, 43, -74, 5, 60, '#a87f2a');
    rect(ctx, -48, -76, 96, 4, '#a87f2a');
    ctx.fillStyle = '#0a0a0c';
    [[-36, 0], [36, 0]].forEach(([wx, wy]) => {
      ctx.beginPath();
      ctx.arc(wx, wy, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.cream;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
    ctx.restore();
    ctx.save();
    ctx.translate(CART_SX, FLOOR - 16);
    ctx.rotate(this.lean);
    this.stack.forEach((color, i) => {
      const bw = 78 - i * 4;
      rect(ctx, -bw / 2 + (i % 2 ? 3 : -3), -22 * (i + 1), bw, 20, color);
      frame(ctx, -bw / 2 + (i % 2 ? 3 : -3), -22 * (i + 1), bw, 20, C.ink, 1);
    });
    ctx.restore();

    // ── HUD
    drawText(ctx, 'LEVEL 01 · LUGGAGE RUSH', 36, 12, { size: 10, weight: 700, color: ACCENT, spacing: 3 });
    drawText(ctx, 'SHIFT 1 — THE LODGE LOBBY', 36, 24, { font: 'display', size: 30, color: C.cream, spacing: 1 });
    drawText(ctx, 'BAGS', 36, 60, { size: 9, weight: 700, color: C.faint, spacing: 2 });
    this.zones.forEach((z, i) => {
      const col = z.status === 'caught' ? C.mustard : z.status === 'missed' ? '#3a3342' : '#241f2b';
      rect(ctx, 76 + i * 14, 60, 9, 9, col);
    });
    drawText(ctx, String(Math.ceil(this.timeLeft)), 924, 6, { font: 'display', size: 44, color: this.timeLeft < 12 ? ACCENT : C.cream, align: 'right' });
    drawText(ctx, 'ELEVATOR LEAVES IN', 924, 52, { size: 9, weight: 700, color: C.faint, align: 'right', spacing: 2 });

    // balance meter
    drawText(ctx, 'BALANCE', 480, 14, { size: 9, weight: 700, color: C.mustard, align: 'center', spacing: 3 });
    rect(ctx, 360, 28, 240, 10, C.panel);
    frame(ctx, 360, 28, 240, 10, C.edge, 1);
    rect(ctx, 360, 28, 14, 10, ACCENT, 0.6);
    rect(ctx, 586, 28, 14, 10, ACCENT, 0.6);
    const needle = 480 + clamp(this.lean / LEAN_LIMIT, -1, 1) * 112;
    rect(ctx, needle - 2, 26, 4, 14, Math.abs(this.lean) > LEAN_LIMIT * 0.7 ? ACCENT : C.cream);

    drawText(ctx, '→ ROLL · ← BRAKE · BE UNDER THE DROPS · COUNTER THE LEAN', W / 2, 514, { size: 10, weight: 500, color: C.faint, align: 'center', spacing: 2 });

    // fx
    for (const p of this.particles) sparkle(ctx, p.x, p.y, p.r * (1 - p.life / p.max), p.color, { rot: p.rot, alpha: 1 - p.life / p.max });
    for (const f of this.floaters) drawText(ctx, f.text, f.x, f.y, { font: 'display', size: 18, color: f.color, align: 'center', alpha: 1 - f.t * 0.9 });
    if (this.flash > 0) rect(ctx, 0, 0, W, H, C.cream, this.flash * 0.45);

    if (this.state === 'fail') {
      rect(ctx, 0, 0, W, H, C.ink, 0.88);
      drawText(ctx, 'MISSED IT.', W / 2, 180, { font: 'display', size: 80, color: ACCENT, align: 'center', shadow: { color: '#4a1812', dx: 5, dy: 5 } });
      drawText(ctx, this.failLine, W / 2, 286, { size: 13, weight: 500, color: C.dim, align: 'center' });
      if (Math.sin(this.tAll * 5.5) > -0.25) drawText(ctx, 'ENTER → CLOCK BACK IN', W / 2, 340, { font: 'display', size: 24, color: C.mustard, align: 'center', spacing: 2 });
    }
    ctx.restore();
  }

  drawIntro(ctx) {
    const t = this.t;
    rect(ctx, 0, 0, W, H, ACCENT);
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = halftone(ctx);
    ctx.fillRect(W / 2, 0, W / 2, H);
    ctx.restore();
    const slide = easeOutExpo(clamp(t / 0.45, 0, 1));
    drawText(ctx, 'LEVEL', -216 + slide * 280, 96, { font: 'display', size: 44, color: C.ink, spacing: 14 });
    drawText(ctx, '01', 64, 120 + (1 - slide) * 60, { font: 'display', size: 230, color: C.ink, alpha: slide });
    const bandT = easeOutExpo(clamp((t - 0.45) / 0.4, 0, 1));
    if (bandT > 0) {
      rect(ctx, 0, 380, W, 160, C.ink, bandT);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 380, W, 160);
      ctx.clip();
      drawText(ctx, 'LUGGAGE RUSH', 64, 396 + (1 - bandT) * 60, { font: 'display', size: 60, color: C.cream, spacing: 2 });
      drawText(ctx, 'SKILL ON DISPLAY — GRACE UNDER PRESSURE', 64, 472 + (1 - bandT) * 60, { size: 12, weight: 700, color: ACCENT, spacing: 3 });
      ctx.restore();
    }
    if (t > 0.7) drawText(ctx, 'ENTER → SKIP', 924, 350, { size: 10, weight: 700, color: C.ink, align: 'right', spacing: 2, alpha: 0.65 });
  }

  drawHowTo(ctx) {
    rect(ctx, 0, 0, W, H, C.ink);
    rect(ctx, 0, 60, W, 4, ACCENT);
    drawText(ctx, 'LEVEL 01', W / 2, 84, { size: 11, weight: 700, color: ACCENT, align: 'center', spacing: 5 });
    drawText(ctx, 'HOW TO PLAY — LUGGAGE RUSH', W / 2, 98, { font: 'display', size: 58, color: C.cream, align: 'center', spacing: 2 });
    const rules = [
      'Roll the bell cart through the lobby, left to right.',
      'Bags drop from the rail — be UNDER them when they fall.',
      'Off-centre catches tip the stack. Counter the lean:',
      'leaning forward → speed up. Leaning back → ease off.',
      'Doors cycle, guests wander, wet floor wants you slow.',
      'Catch the elevator with every bag still aboard.',
    ];
    rules.forEach((ln, i) => drawText(ctx, ln, W / 2, 186 + i * 26, { size: 15, weight: 500, color: i === 5 ? C.mustard : C.cream, align: 'center' }));
    drawText(ctx, '→ / D ROLL   ·   ← / A BRAKE   ·   M MUTE   ·   P PAUSE', W / 2, 380, { size: 10, weight: 700, color: C.faint, align: 'center', spacing: 2 });
    if (Math.sin(this.tAll * 5.5) > -0.25) drawText(ctx, 'ENTER → CLOCK IN', W / 2, 430, { font: 'display', size: 26, color: C.mustard, align: 'center', spacing: 3 });
  }
}
