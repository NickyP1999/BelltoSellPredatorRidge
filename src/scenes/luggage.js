import { drawText, rect, frame, clamp } from '../util.js';
import { C, easeOutExpo, easeOutBack, halftone, sparkle, stamp } from '../theme.js';
import { Ceremony } from './results.js';

const W = 960, H = 540;
const ACCENT = '#d94f30';
const CART_SX = 300;   // the cart holds this screen x; the world scrolls past
const FLOOR = 430;
const LEAN_LIMIT = 0.5;

// ── leg 1: the lobby
const WORLD = 2600;
const ELEVATOR_X = 2470;
const TIME_LIMIT = 60;
const ZONES = [260, 540, 820, 1100, 1380, 1660, 1940, 2220];
const DOORS = [{ x: 700, phase: 0 }, { x: 1520, phase: 0.5 }];
const WET = { x0: 1150, x1: 1330 };
const GUESTS = [{ x: 950, phase: 0 }, { x: 1800, phase: 0.6 }];
const BAG_COLORS = ['#8a5a3a', '#3a5a6e', '#6e3a52', '#52663a', '#5a4a7a', '#7a6a3a', '#3a6e5e', '#9b6fd1'];

// ── leg 2: the cottage run, on the Porsche NXT cart
const RUN = { len: 2800, cottage: 2680, time: 30, safeV: 190 };
const BUMPS = [420, 820, 1260, 1690, 2160];
const SPRINKLERS = [{ x: 620, phase: 0 }, { x: 1480, phase: 0.5 }, { x: 2380, phase: 0.25 }];
const MARMOT_X = 1040;

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
    this.timeBank = 0;
    this.zones = ZONES.map((x, i) => ({ x, status: 'pending', fallT: 0, color: BAG_COLORS[i] }));
    this.guestCd = GUESTS.map(() => 0);
    this.shake = 0;
    this.flash = 0;
    this.particles = [];
    this.floaters = [];
    this.failLine = '';
    this.failPhase = 1;
  }

  resetRun() {
    this.cx2 = 60;
    this.v2 = 0;
    this.cyOff = 0;
    this.vyOff = 0;
    this.timeLeft = RUN.time;
    this.bumpsDone = new Set();
    this.marmotCd = 0;
    this.stack = this.bagsAtRun.slice();
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
    const u = (this.tAll * 0.35 + g.phase) % 1;
    return u < 0.5 ? 330 + u * 2 * 140 : 330 + (1 - u) * 2 * 140;
  }

  sprinklerOn(s) { return ((this.tAll * 0.42 + s.phase) % 1) < 0.5; }

  marmotY() {
    const u = (this.tAll * 0.3) % 1;
    return u < 0.5 ? 340 + u * 2 * 130 : 340 + (1 - u) * 2 * 130;
  }

  fail(line, phase) {
    this.failLine = line;
    this.failPhase = phase;
    this.state = 'fail';
    this.t = 0;
    this.game.audio.lose();
  }

  finish() {
    const score = Math.max(0, this.stack.length * 120 + Math.round(this.timeBank + this.timeLeft) * 6 - this.drops * 40);
    const stars = score >= 1000 ? 3 : score >= 750 ? 2 : 1;
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
      statLine: `${this.stack.length}/8 BAGS DELIVERED · ${this.drops} LOST · LOBBY + COTTAGE RUN`,
      hintLine: 'EVERY BAG DELIVERED AND NOTHING DROPPED IS A 3-STAR SHIFT',
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
      if ((confirm || inp.pressed.has('KeyR')) && this.t > 0.5) {
        if (this.failPhase === 2) { this.resetRun(); this.state = 'play2'; }
        else { this.reset(); this.state = 'play'; }
        this.t = 0;
      }
      return;
    }
    if (this.state === 'handoff') {
      if (this.t > 2.4 || (confirm && this.t > 0.4)) {
        this.resetRun();
        this.state = 'play2';
        this.t = 0;
      }
      return;
    }
    if (this.state === 'stars') {
      if (this.ceremony.update(dt)) this.game.go('valet');
      return;
    }
    if (this.state === 'play2') { this.updateRun(dt, inp); return; }

    // ── leg 1: the lobby
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) { this.fail('THE GUESTS REACHED THE DESK BEFORE THEIR BAGS DID.', 1); return; }

    const right = inp.down.has('ArrowRight') || inp.down.has('KeyD');
    const left = inp.down.has('ArrowLeft') || inp.down.has('KeyA');
    const prevV = this.v;
    let a = 0;
    if (right) a += 300;
    if (left) a -= 380;
    if (!right && !left) a -= Math.sign(this.v) * 55;
    this.v = clamp(this.v + a * dt, 0, 280);

    for (const door of DOORS) {
      if (!this.doorOpen(door) && this.cx + 34 > door.x && this.cx < door.x + 10) {
        this.cx = door.x - 34;
        if (this.v > 40) { this.game.audio.thump(); this.shake = 0.3; }
        this.v = 0;
      }
    }

    const dv = this.v - prevV;
    this.omega -= dv * 0.0045;

    if (this.cx > WET.x0 && this.cx < WET.x1 && this.v > 120) {
      this.omega += Math.sin(this.tAll * 13) * 1.4 * dt;
    }

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
    if (this.cx >= ELEVATOR_X - 60) {
      this.timeBank = Math.max(0, this.timeLeft);
      this.bagsAtRun = this.stack.slice();
      this.game.audio.stab(1.2, { vol: 0.04 });
      this.state = 'handoff';
      this.t = 0;
    }
  }

  // ── leg 2: drive the NXT cart to Peregrine Cottages
  updateRun(dt, inp) {
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) { this.fail('THE GUESTS BEAT YOU TO THE PORCH.', 2); return; }
    this.marmotCd = Math.max(0, this.marmotCd - dt);

    const right = inp.down.has('ArrowRight') || inp.down.has('KeyD');
    const left = inp.down.has('ArrowLeft') || inp.down.has('KeyA');
    if (right) this.v2 += 380 * dt;
    if (left) this.v2 -= 460 * dt;
    if (!right && !left) this.v2 -= 60 * dt;
    this.v2 = clamp(this.v2, 0, 360);

    // bumps launch the box — too fast and a bag goes overboard
    for (const bx of BUMPS) {
      if (!this.bumpsDone.has(bx) && this.cx2 >= bx) {
        this.bumpsDone.add(bx);
        this.vyOff = -(110 + this.v2 * 0.45);
        this.game.audio.snare();
        this.shake = 0.2 + this.v2 / 800;
        if (this.v2 > RUN.safeV && this.stack.length > 0) {
          this.stack.pop();
          this.drops++;
          this.game.audio.thump();
          this.burst(CART_SX - 40, FLOOR - 70, ACCENT, 12);
          this.float('BAG OVERBOARD!', CART_SX, FLOOR - 130, ACCENT);
        }
      }
    }

    // sprinklers soak fast drivers
    for (const s of SPRINKLERS) {
      if (Math.abs(this.cx2 - s.x) < 34 && this.sprinklerOn(s) && this.v2 > 60) {
        this.v2 *= 1 - 1.6 * dt;
        if (Math.random() < dt * 18) this.burst(CART_SX + 10, FLOOR - 60, '#3fb8a8', 2);
      }
    }

    // the marmot has right of way
    const my = this.marmotY();
    if (Math.abs(this.cx2 - MARMOT_X) < 42 && my > 380 && this.v2 > 40 && this.marmotCd <= 0) {
      this.v2 = 0;
      this.marmotCd = 2;
      this.game.audio.thump();
      this.float('MARMOT CROSSING!', CART_SX, 300, '#3fb8a8');
    }

    this.vyOff += 900 * dt;
    this.cyOff = Math.min(0, this.cyOff + this.vyOff * dt);
    if (this.cyOff === 0 && this.vyOff > 0) this.vyOff = 0;

    this.cx2 = clamp(this.cx2 + this.v2 * dt, 60, RUN.len - 40);
    if (this.cx2 >= RUN.cottage - 50) this.finish();
  }

  draw(ctx) {
    ctx.save();
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * 10 * this.shake, (Math.random() - 0.5) * 8 * this.shake);
    rect(ctx, 0, 0, W, H, C.ink);

    if (this.state === 'intro') { this.drawIntro(ctx); ctx.restore(); return; }
    if (this.state === 'howto') { this.drawHowTo(ctx); ctx.restore(); return; }
    if (this.state === 'stars') { this.ceremony.draw(ctx); ctx.restore(); return; }

    if (this.state === 'play2' || (this.state === 'fail' && this.failPhase === 2)) this.drawRun(ctx);
    else this.drawLobby(ctx);

    if (this.state === 'handoff') this.drawHandoff(ctx);

    // fx + fail overlay shared by both legs
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

  drawLobby(ctx) {
    const cam = clamp(this.cx - CART_SX, 0, WORLD - W);

    const wallG = ctx.createLinearGradient(0, 104, 0, FLOOR);
    wallG.addColorStop(0, '#1a1422');
    wallG.addColorStop(1, '#0f0c13');
    ctx.fillStyle = wallG;
    ctx.fillRect(0, 104, W, FLOOR - 104);
    for (let wx = 0; wx < WORLD; wx += 240) {
      const sx = wx - cam;
      if (sx < -110 || sx > W + 110) continue;
      // sconce light pools on the wall
      const pool = ctx.createRadialGradient(sx + 9, 152, 6, sx + 9, 152, 100);
      pool.addColorStop(0, 'rgba(242,182,58,0.13)');
      pool.addColorStop(1, 'rgba(242,182,58,0)');
      ctx.fillStyle = pool;
      ctx.fillRect(sx - 91, 104, 200, 200);
      rect(ctx, sx, 104, 18, FLOOR - 104, '#1d1725');
      sparkle(ctx, sx + 9, 150, 5, C.mustard, { alpha: 0.7 });
    }
    rect(ctx, 0, FLOOR, W, H - FLOOR, '#0f0d12');
    rect(ctx, 0, FLOOR, W, 2, C.cream, 0.18);

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

    const ex = ELEVATOR_X - cam;
    if (ex < W + 160) {
      rect(ctx, ex - 10, 104, 130, FLOOR - 104, '#1a1620');
      frame(ctx, ex - 10, 104, 130, FLOOR - 104, C.mustard, 2);
      const doorW = clamp(this.timeLeft / TIME_LIMIT, 0, 1) * 50 + 6;
      rect(ctx, ex + 55 - doorW, 130, doorW, FLOOR - 134, '#0f0d12');
      rect(ctx, ex + 55, 130, doorW, FLOOR - 134, '#0f0d12');
      frame(ctx, ex + 55 - doorW, 130, doorW * 2, FLOOR - 134, C.cream, 1);
      drawText(ctx, 'SERVICE EXIT', ex + 55, 112, { size: 9, weight: 700, color: C.mustard, align: 'center', spacing: 2 });
    }

    // brass cart + stack
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

    // HUD
    drawText(ctx, 'LEVEL 01 · LUGGAGE RUSH', 36, 12, { size: 10, weight: 700, color: ACCENT, spacing: 3 });
    drawText(ctx, 'LEG 1 — THE LODGE LOBBY', 36, 24, { font: 'display', size: 30, color: C.cream, spacing: 1 });
    drawText(ctx, 'BAGS', 36, 60, { size: 9, weight: 700, color: C.faint, spacing: 2 });
    this.zones.forEach((z, i) => {
      const col = z.status === 'caught' ? C.mustard : z.status === 'missed' ? '#3a3342' : '#241f2b';
      rect(ctx, 76 + i * 14, 60, 9, 9, col);
    });
    drawText(ctx, String(Math.ceil(Math.max(0, this.timeLeft))), 924, 6, { font: 'display', size: 44, color: this.timeLeft < 12 ? ACCENT : C.cream, align: 'right' });
    drawText(ctx, 'CART LEAVES IN', 924, 52, { size: 9, weight: 700, color: C.faint, align: 'right', spacing: 2 });

    drawText(ctx, 'BALANCE', 480, 14, { size: 9, weight: 700, color: C.mustard, align: 'center', spacing: 3 });
    rect(ctx, 360, 28, 240, 10, C.panel);
    frame(ctx, 360, 28, 240, 10, C.edge, 1);
    rect(ctx, 360, 28, 14, 10, ACCENT, 0.6);
    rect(ctx, 586, 28, 14, 10, ACCENT, 0.6);
    const needle = 480 + clamp(this.lean / LEAN_LIMIT, -1, 1) * 112;
    rect(ctx, needle - 2, 26, 4, 14, Math.abs(this.lean) > LEAN_LIMIT * 0.7 ? ACCENT : C.cream);

    drawText(ctx, '→ ROLL · ← BRAKE · BE UNDER THE DROPS · COUNTER THE LEAN', W / 2, 514, { size: 10, weight: 500, color: C.faint, align: 'center', spacing: 2 });
  }

  drawRun(ctx) {
    const cam = clamp(this.cx2 - CART_SX, 0, RUN.len - W);

    // dusk over the Okanagan — smooth gradient with a sinking sun
    const sky = ctx.createLinearGradient(0, 0, 0, 172);
    sky.addColorStop(0, '#241c38');
    sky.addColorStop(0.52, '#52304a');
    sky.addColorStop(0.8, '#a8503a');
    sky.addColorStop(1, '#1a2418');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, 172);
    const sun = ctx.createRadialGradient(700, 152, 8, 700, 152, 130);
    sun.addColorStop(0, 'rgba(248,227,176,0.32)');
    sun.addColorStop(1, 'rgba(248,227,176,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(560, 30, 280, 142);
    rect(ctx, 0, 172, W, FLOOR - 172, '#121710');
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = halftone(ctx);
    ctx.fillRect(0, 0, W, 146);
    ctx.restore();

    // pines along the path
    for (let px = 0; px < RUN.len; px += 170) {
      const sx = px - cam * 0.85; // slight parallax
      if (sx < -60 || sx > W + 60) continue;
      const hgt = 90 + ((px / 170) % 3) * 28;
      ctx.fillStyle = '#0c1410';
      ctx.beginPath();
      ctx.moveTo(sx, FLOOR - 8);
      ctx.lineTo(sx + 26, FLOOR - 8 - hgt);
      ctx.lineTo(sx + 52, FLOOR - 8);
      ctx.fill();
    }

    rect(ctx, 0, FLOOR, W, 30, '#171410');
    rect(ctx, 0, FLOOR, W, 2, C.cream, 0.15);
    rect(ctx, 0, FLOOR + 30, W, H - FLOOR - 30, '#0d0c0a');

    // bumps
    for (const bx of BUMPS) {
      const sx = bx - cam;
      if (sx < -60 || sx > W + 60) continue;
      ctx.fillStyle = '#241c16';
      ctx.beginPath();
      ctx.ellipse(sx, FLOOR + 2, 30, 10, 0, Math.PI, 0);
      ctx.fill();
      drawText(ctx, 'BUMP', sx, FLOOR - 26, { size: 8, weight: 700, color: this.v2 > RUN.safeV ? ACCENT : C.faint, align: 'center', spacing: 1 });
    }

    // sprinklers
    for (const s of SPRINKLERS) {
      const sx = s.x - cam;
      if (sx < -80 || sx > W + 80) continue;
      rect(ctx, sx - 2, FLOOR - 18, 4, 18, '#2c2532');
      if (this.sprinklerOn(s)) {
        ctx.fillStyle = '#3fb8a8';
        for (let k = 0; k < 7; k++) {
          const a = Math.PI * (0.15 + 0.7 * (k / 6));
          const rr = 26 + ((this.tAll * 60 + k * 9) % 22);
          ctx.globalAlpha = 0.7 - rr / 60;
          ctx.beginPath();
          ctx.arc(sx + Math.cos(a) * rr, FLOOR - 18 - Math.sin(a) * rr, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        rect(ctx, sx - 30, FLOOR, 60, 6, '#3fb8a8', 0.15);
      }
    }

    // the marmot
    const mx = MARMOT_X - cam;
    if (mx > -40 && mx < W + 40) {
      const my = this.marmotY();
      ctx.save();
      ctx.translate(mx, my);
      ctx.fillStyle = '#8a5a3a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(9, -3, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a5a3a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-16, Math.sin(this.tAll * 12) * 4 - 2);
      ctx.stroke();
      ctx.restore();
    }

    // Peregrine Cottages at the end of the path
    const cx = RUN.cottage - cam;
    if (cx < W + 220) {
      ctx.fillStyle = '#0a0a0c';
      ctx.fillRect(cx - 20, FLOOR - 120, 180, 120);
      ctx.beginPath();
      ctx.moveTo(cx - 36, FLOOR - 120);
      ctx.lineTo(cx + 70, FLOOR - 178);
      ctx.lineTo(cx + 176, FLOOR - 120);
      ctx.fill();
      rect(ctx, cx + 24, FLOOR - 76, 34, 40, C.mustard, 0.85);
      rect(ctx, cx + 96, FLOOR - 76, 34, 40, C.mustard, 0.5);
      drawText(ctx, 'PEREGRINE COTTAGES', cx + 70, FLOOR - 200, { size: 9, weight: 700, color: C.mustard, align: 'center', spacing: 2 });
      ctx.fillStyle = ACCENT;
      ctx.beginPath();
      ctx.moveTo(cx - 60, FLOOR - 8 - Math.abs(Math.sin(this.tAll * 4)) * 6);
      ctx.lineTo(cx - 36, FLOOR - 8 - Math.abs(Math.sin(this.tAll * 4)) * 6);
      ctx.lineTo(cx - 48, FLOOR + 4 - Math.abs(Math.sin(this.tAll * 4)) * 6);
      ctx.fill();
    }

    // the Porsche NXT cart, box on the back, bags visible
    ctx.save();
    ctx.translate(CART_SX, FLOOR - 4 + this.cyOff * 0.12);
    ctx.fillStyle = '#0c0a0e';
    ctx.strokeStyle = C.cream;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-44, -20, 84, 20, 4);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(40, -20);
    ctx.quadraticCurveTo(60, -17, 62, 0);
    ctx.lineTo(40, 0);
    ctx.fill();
    // canopy
    rect(ctx, -34, -62, 5, 42, '#0c0a0e');
    rect(ctx, 26, -62, 5, 42, '#0c0a0e');
    rect(ctx, -38, -68, 74, 6, '#0c0a0e');
    // driver
    ctx.fillStyle = '#1a1620';
    ctx.beginPath();
    ctx.arc(2, -44, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-7, -36, 18, 17);
    // cargo box with the remaining bags stacked inside
    ctx.fillStyle = '#0c0a0e';
    ctx.fillRect(-78, -42, 34, 42);
    frame(ctx, -78, -42, 34, 42, C.cream, 1);
    this.stack.forEach((color, i) => {
      const row = Math.floor(i / 2), col = i % 2;
      rect(ctx, -74 + col * 14, -14 - row * 9 + this.cyOff * 0.06 * (row + 1), 12, 7, color);
    });
    // wheels
    ctx.fillStyle = '#0a0a0c';
    [[-26, 0], [44, 0]].forEach(([wx]) => {
      ctx.beginPath();
      ctx.arc(wx, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.cream;
      ctx.lineWidth = 2;
      const a = this.cx2 * 0.05;
      ctx.beginPath();
      ctx.moveTo(wx + Math.cos(a) * 5, Math.sin(a) * 5);
      ctx.lineTo(wx - Math.cos(a) * 5, -Math.sin(a) * 5);
      ctx.stroke();
    });
    ctx.restore();

    // HUD
    drawText(ctx, 'LEVEL 01 · LUGGAGE RUSH', 36, 12, { size: 10, weight: 700, color: ACCENT, spacing: 3 });
    drawText(ctx, 'LEG 2 — THE COTTAGE RUN', 36, 24, { font: 'display', size: 30, color: C.cream, spacing: 1 });
    drawText(ctx, 'BAGS ABOARD', 36, 60, { size: 9, weight: 700, color: C.faint, spacing: 2 });
    for (let i = 0; i < 8; i++) {
      rect(ctx, 126 + i * 14, 60, 9, 9, i < this.stack.length ? C.mustard : '#241f2b');
    }
    drawText(ctx, String(Math.ceil(Math.max(0, this.timeLeft))), 924, 6, { font: 'display', size: 44, color: this.timeLeft < 10 ? ACCENT : C.cream, align: 'right' });
    drawText(ctx, 'GUESTS ARRIVE IN', 924, 52, { size: 9, weight: 700, color: C.faint, align: 'right', spacing: 2 });

    // speed readout — red when bump-unsafe
    const unsafe = this.v2 > RUN.safeV;
    drawText(ctx, 'SPEED', 480, 14, { size: 9, weight: 700, color: unsafe ? ACCENT : C.mustard, align: 'center', spacing: 3 });
    rect(ctx, 360, 28, 240, 10, C.panel);
    frame(ctx, 360, 28, 240, 10, C.edge, 1);
    rect(ctx, 362, 30, clamp(this.v2 / 360, 0, 1) * 236, 6, unsafe ? ACCENT : C.teal);
    rect(ctx, 360 + (RUN.safeV / 360) * 240 - 1, 26, 2, 14, C.cream, 0.7);

    drawText(ctx, '→ GO · ← BRAKE · SLOW OVER BUMPS — FAST LAUNCHES BAGS', W / 2, 514, { size: 10, weight: 500, color: C.faint, align: 'center', spacing: 2 });
  }

  drawHandoff(ctx) {
    rect(ctx, 0, 0, W, H, C.ink, 0.88);
    const k = easeOutBack(clamp(this.t / 0.3, 0, 1));
    ctx.save();
    ctx.translate(W / 2, 190);
    ctx.scale(k, k);
    drawText(ctx, 'LOBBY CLEARED.', 0, -46, { font: 'display', size: 76, color: C.cream, align: 'center', shadow: { color: ACCENT, dx: 5, dy: 5 } });
    ctx.restore();
    drawText(ctx, `${this.stack.length}/8 BAGS — NOW LOAD THE PORSCHE NXT CART`, W / 2, 250, { size: 13, weight: 700, color: C.mustard, align: 'center', spacing: 2 });
    drawText(ctx, 'LEG 2: RUN THE BAGS OUT TO PEREGRINE COTTAGES.', W / 2, 282, { size: 12, weight: 500, color: C.dim, align: 'center' });
    drawText(ctx, 'THE BOX BOUNCES — SLOW OVER BUMPS OR BAGS GO OVERBOARD.', W / 2, 302, { size: 12, weight: 500, color: C.dim, align: 'center' });
    if (this.blinkOk()) drawText(ctx, 'ENTER → TAKE THE WHEEL', W / 2, 360, { font: 'display', size: 26, color: C.mustard, align: 'center', spacing: 2 });
  }

  blinkOk() { return Math.sin(this.tAll * 5.5) > -0.25; }

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
      'LEG 1 — the lobby. Bags drop from the rail: be UNDER them.',
      'Off-centre catches tip the stack. Counter the lean:',
      'leaning forward → speed up. Leaning back → ease off.',
      'LEG 2 — load the Porsche NXT cart and run for the cottages.',
      'The box bounces. Slow over bumps or bags go overboard.',
      'Deliver every bag. The marmot has right of way.',
    ];
    rules.forEach((ln, i) => drawText(ctx, ln, W / 2, 186 + i * 26, { size: 15, weight: 500, color: i === 5 ? C.mustard : C.cream, align: 'center' }));
    drawText(ctx, '→ / D ROLL   ·   ← / A BRAKE   ·   M MUTE   ·   P PAUSE', W / 2, 380, { size: 10, weight: 700, color: C.faint, align: 'center', spacing: 2 });
    if (this.blinkOk()) drawText(ctx, 'ENTER → CLOCK IN', W / 2, 430, { font: 'display', size: 26, color: C.mustard, align: 'center', spacing: 3 });
  }
}
