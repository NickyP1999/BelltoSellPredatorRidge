import { drawText, rect, frame, clamp } from '../util.js';
import { C, easeOutExpo, easeOutBack, halftone, sparkle, stamp, intro } from '../theme.js';
import { Ceremony } from './results.js';

const W = 960, H = 540;
const ACCENT = '#d94f30';
const CART_SX = 300;   // the cart holds this screen x; the world scrolls past
const FLOOR = 430;
const LEAN_LIMIT = 0.6;

// On-screen hold-buttons for touch devices. Tucked into the bottom corners so
// they clear the cart (screen x 300), the bag drops, the hazards, and the HUD.
// Drawn ONLY when game.touch — keyboard/mouse users never see them.
const BTN = 84, BTN_PAD = 24;
const BTN_L = { x: BTN_PAD, y: H - BTN - BTN_PAD, w: BTN, h: BTN };
const BTN_R = { x: W - BTN - BTN_PAD, y: H - BTN - BTN_PAD, w: BTN, h: BTN };

// ── leg 1: the lobby
const WORLD = 2600;
const ELEVATOR_X = 2470;
const TIME_LIMIT = 60;
const ZONES = [260, 540, 820, 1100, 1380, 1660, 1940, 2220];
const DOORS = [{ x: 700, phase: 0 }, { x: 1520, phase: 0.5 }];
const WET = { x0: 1150, x1: 1330 };
const GUESTS = [{ x: 950, phase: 0 }, { x: 1800, phase: 0.6 }];
const BAG_COLORS = ['#8a5a3a', '#3a5a6e', '#6e3a52', '#52663a', '#5a4a7a', '#7a6a3a', '#3a6e5e', '#9b6fd1'];
// framed Okanagan prints between the columns — static palette, hoisted out of drawLobby
const ART = [['#3fb8a8', '#d94f30'], ['#9b6fd1', '#f2b63a'], ['#d94f30', '#3a5a6e'], ['#f2b63a', '#3fb8a8']];

// ── leg 2: the cottage run, on the Porsche NXT cart
const RUN = { len: 2800, cottage: 2680, time: 30, safeV: 215 };
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
    this.rushed = false;
    this.dropForgiven = false;
    this.leanWarned = false;
    this.leanShown = 0;   // eased needle position — glides toward the real lean
    this.legT = 0;        // leg-local clock, drives the staggered HUD entrance
  }

  resetRun() {
    this.cx2 = 60;
    this.v2 = 0;
    this.cyOff = 0;
    this.vyOff = 0;
    this.timeLeft = RUN.time;
    this.bumpsDone = new Set();
    this.marmotCd = 0;
    this.speedWarned = false;
    this.lateFinish = false;
    this.stack = this.bagsAtRun.slice();
    this.vShown = 0;   // eased speed bar — glides toward the real velocity
    this.legT = 0;     // leg-local clock, drives the staggered HUD entrance
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

  finish() {
    const timeScore = this.lateFinish ? 0 : Math.round(this.timeBank + this.timeLeft) * 6;
    // clean-run bonus: every bag delivered with nothing dropped always clears 1000 → 3★,
    // making the ceremony's "every bag, nothing dropped is a 3-star shift" promise true
    const cleanBonus = this.stack.length === 8 && this.drops === 0 ? 50 : 0;
    const score = Math.max(0, this.stack.length * 120 + timeScore - this.drops * 40 + cleanBonus);
    const stars = score >= 1000 ? 3 : score >= 750 ? 2 : 1;
    const sv = this.game.save;
    const prevBest = sv.data.best.luggage;
    sv.data.stars.luggage = Math.max(sv.data.stars.luggage, stars);
    sv.data.best.luggage = Math.max(sv.data.best.luggage, score);
    sv.data.tips += 10 + this.stack.length * 3;
    sv.write();
    this.game.audio.win();
    this.ceremony.start({
      label: 'LEVEL 01 — LUGGAGE RUSH',
      stars, score,
      best: sv.data.best.luggage,
      statLine: this.lateFinish
        ? `${this.stack.length}/8 BAGS — THE GUESTS MET YOU ON THE PATH`
        : `${this.stack.length}/8 BAGS DELIVERED · ${this.drops} LOST · LOBBY + COTTAGE RUN`,
      hintLine: 'EVERY BAG DELIVERED AND NOTHING DROPPED IS A 3-STAR SHIFT',
      nextLabel: 'ENTER → NEXT SHIFT: SHUTTLE PRECISION',
      newBest: score > prevBest && prevBest > 0,
    });
    this.state = 'stars';
  }

  update(dt) {
    this._dt = dt;   // remembered for frame-rate-independent meter easing in draw()
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

    // ── leg 1: the lobby. Out of time never strands you — the cart simply
    // leaves now, with whatever you caught.
    this.legT += dt;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeBank = 0;
      this.bagsAtRun = this.stack.slice();
      this.rushed = true;
      this.game.audio.thump();
      this.state = 'handoff';
      this.t = 0;
      return;
    }

    // ROLL/BRAKE: keyboard OR the on-screen touch buttons (bottom corners).
    const right = inp.down.has('ArrowRight') || inp.down.has('KeyD') || inp.touchInRect(BTN_R.x, BTN_R.y, BTN_R.w, BTN_R.h);
    const left = inp.down.has('ArrowLeft') || inp.down.has('KeyA') || inp.touchInRect(BTN_L.x, BTN_L.y, BTN_L.w, BTN_L.h);
    const prevV = this.v;
    let a = 0;
    if (right) a += 300;
    if (left) a -= 380;
    // stronger idle friction so coasting to a stop reads as intentional, not a long drift
    if (!right && !left) a -= Math.sign(this.v) * 95;
    this.v = clamp(this.v + a * dt, 0, 280);

    for (const door of DOORS) {
      if (!this.doorOpen(door) && this.cx + 34 > door.x && this.cx < door.x + 10) {
        this.cx = door.x - 34;
        if (this.v > 40) { this.game.audio.thump(); this.shake = 0.3; }
        this.v = 0;
      }
    }

    // velocity changes nudge the stack — but a deliberate brake should feel safe.
    // Only feed the lean from acceleration; skip the kick while the player is braking.
    const dv = this.v - prevV;
    if (!left) this.omega -= dv * 0.003;

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

    // reward recovering a dangerous lean: arm on entering the warning band, then a
    // soft tick + sparkle once the cart settles back under it (fires once per excursion)
    const mag = Math.abs(this.lean);
    if (mag > LEAN_LIMIT * 0.6) {
      this.leanWarned = true;
    } else if (this.leanWarned) {
      this.leanWarned = false;
      this.game.audio.blip();
      this.burst(CART_SX, FLOOR - 60 - this.stack.length * 22, '#3fb8a8', 6);
    }

    if (Math.abs(this.lean) > LEAN_LIMIT && this.stack.length > 0) {
      this.stack.pop();
      this.lean *= 0.45;
      this.omega *= 0.3;
      this.game.audio.thump();
      this.shake = 0.4;
      this.burst(CART_SX + Math.sign(this.lean) * 50, FLOOR - 40, ACCENT, 12);
      if (!this.dropForgiven) {
        // first one's free — happens to everyone
        this.dropForgiven = true;
        this.float('BAG DOWN — FIRST ONE FORGIVEN', CART_SX, FLOOR - 120, '#3fb8a8');
      } else {
        this.drops++;
        this.float('BAG DOWN!', CART_SX, FLOOR - 120, ACCENT);
      }
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
    this.legT += dt;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      // the guests meet you on the path — deliver what you carry, no time bonus
      this.lateFinish = true;
      this.finish();
      return;
    }
    this.marmotCd = Math.max(0, this.marmotCd - dt);

    // GO/BRAKE: keyboard OR the on-screen touch buttons (bottom corners).
    const right = inp.down.has('ArrowRight') || inp.down.has('KeyD') || inp.touchInRect(BTN_R.x, BTN_R.y, BTN_R.w, BTN_R.h);
    const left = inp.down.has('ArrowLeft') || inp.down.has('KeyA') || inp.touchInRect(BTN_L.x, BTN_L.y, BTN_L.w, BTN_L.h);
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
          if (!this.speedWarned) {
            this.speedWarned = true;
            this.float('TOO FAST — NEXT BUMP COSTS A BAG', CART_SX, FLOOR - 130, '#3fb8a8');
          } else {
            this.stack.pop();
            this.drops++;
            this.game.audio.thump();
            this.burst(CART_SX - 40, FLOOR - 70, ACCENT, 12);
            this.float('BAG OVERBOARD!', CART_SX, FLOOR - 130, ACCENT);
          }
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

    if (this.state === 'play2') this.drawRun(ctx);
    else this.drawLobby(ctx);

    if (this.state === 'handoff') this.drawHandoff(ctx);

    // fx shared by both legs
    for (const p of this.particles) sparkle(ctx, p.x, p.y, p.r * (1 - p.life / p.max), p.color, { rot: p.rot, alpha: 1 - p.life / p.max });
    for (const f of this.floaters) drawText(ctx, f.text, f.x, f.y, { font: 'display', size: 18, color: f.color, align: 'center', alpha: 1 - f.t * 0.9, shadow: { color: C.ink, dx: 1, dy: 1 } });
    if (this.flash > 0) rect(ctx, 0, 0, W, H, C.cream, this.flash * 0.45);
    ctx.restore();
  }

  drawLobby(ctx) {
    const cam = clamp(this.cx - CART_SX, 0, WORLD - W);

    if (!this._wallG) {
      this._wallG = ctx.createLinearGradient(0, 104, 0, FLOOR);
      this._wallG.addColorStop(0, '#1a1422');
      this._wallG.addColorStop(1, '#0f0c13');
    }
    ctx.fillStyle = this._wallG;
    ctx.fillRect(0, 104, W, FLOOR - 104);

    // wainscoting with brass trim, panel seams scrolling with the room
    rect(ctx, 0, 348, W, FLOOR - 348, '#1c1623');
    rect(ctx, 0, 348, W, 2, '#a87f2a', 0.35);
    for (let wx = 0; wx < WORLD; wx += 80) {
      const sx = wx - cam;
      if (sx < -4 || sx > W + 4) continue;
      rect(ctx, sx, 354, 2, FLOOR - 360, '#15101b');
    }

    // framed Okanagan prints between the columns — cream mats, brass frames (ART is module-scoped)
    let ai = 0;
    for (let wx = 120; wx < WORLD - 200; wx += 480) {
      ai++;
      const sx = wx - cam;
      if (sx < -90 || sx > W + 90) continue;
      if (DOORS.some((d) => Math.abs(d.x - wx) < 140)) continue;
      const [c1, c2] = ART[ai % ART.length];
      rect(ctx, sx - 34, 168, 68, 52, '#a87f2a');
      rect(ctx, sx - 30, 172, 60, 44, C.cream);
      rect(ctx, sx - 25, 177, 50, 34, '#161019');
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx - 25, 177, 50, 34);
      ctx.clip();
      ctx.fillStyle = c1;
      ctx.beginPath();
      ctx.moveTo(sx - 25, 211);
      ctx.lineTo(sx - 7, 188);
      ctx.lineTo(sx + 2, 211);
      ctx.fill();
      ctx.fillStyle = c2;
      ctx.beginPath();
      ctx.moveTo(sx - 6, 211);
      ctx.lineTo(sx + 12, 184);
      ctx.lineTo(sx + 25, 211);
      ctx.fill();
      ctx.fillStyle = C.mustard;
      ctx.beginPath();
      ctx.arc(sx + 14, 185, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // reception desk — the lobby's anchor piece, with a clerk on the late shift
    {
      const dx = 60 - cam;
      if (dx > -220 && dx < W + 30) {
        ctx.fillStyle = '#241c2c';
        ctx.beginPath();
        ctx.arc(dx + 130, 332, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(dx + 119, 340, 22, 22);
        rect(ctx, dx, 356, 180, FLOOR - 356, '#221a2a');
        rect(ctx, dx, 356, 180, 4, '#a87f2a');
        for (let p = 0; p < 4; p++) rect(ctx, dx + 8 + p * 44, 372, 36, 46, '#1a1422');
        const lampG = ctx.createRadialGradient(dx + 26, 346, 4, dx + 26, 346, 60);
        lampG.addColorStop(0, 'rgba(242,182,58,0.30)');
        lampG.addColorStop(1, 'rgba(242,182,58,0)');
        ctx.fillStyle = lampG;
        ctx.fillRect(dx - 34, 296, 120, 110);
        rect(ctx, dx + 20, 338, 12, 4, C.mustard, 0.9);
        rect(ctx, dx + 24, 342, 4, 14, '#a87f2a');
        drawText(ctx, 'FRONT DESK', dx + 90, 384, { size: 8, weight: 700, color: '#a87f2a', align: 'center', spacing: 2 });
      }
    }

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
      // polished-floor reflection streak under each column
      const rg = ctx.createLinearGradient(0, FLOOR, 0, FLOOR + 64);
      rg.addColorStop(0, 'rgba(242,233,216,0.07)');
      rg.addColorStop(1, 'rgba(242,233,216,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(sx - 2, FLOOR, 22, 64);
      // potted plant at every other column, clear of the auto doors
      if (wx % 480 === 0 && wx > 0 && !DOORS.some((d) => Math.abs(d.x - wx) < 150)) {
        rect(ctx, sx + 26, FLOOR - 26, 26, 26, '#241c2c');
        rect(ctx, sx + 24, FLOOR - 28, 30, 4, '#a87f2a', 0.5);
        ctx.strokeStyle = '#2c3a24';
        ctx.lineWidth = 3;
        for (const la of [-0.5, 0, 0.5]) {
          ctx.beginPath();
          ctx.moveTo(sx + 39, FLOOR - 26);
          ctx.quadraticCurveTo(sx + 39 + la * 22, FLOOR - 48, sx + 39 + la * 30, FLOOR - 60);
          ctx.stroke();
        }
      }
    }
    rect(ctx, 0, FLOOR, W, H - FLOOR, '#0f0d12');
    rect(ctx, 0, FLOOR, W, 2, C.cream, 0.18);

    // burgundy runner under the cart path, brass edge rails, diamond motif
    rect(ctx, 0, FLOOR + 8, W, 26, '#2e1518');
    rect(ctx, 0, FLOOR + 8, W, 2, '#a87f2a', 0.5);
    rect(ctx, 0, FLOOR + 32, W, 2, '#a87f2a', 0.5);
    for (let wx = 0; wx < WORLD; wx += 120) {
      const sx = wx - cam;
      if (sx < -20 || sx > W + 20) continue;
      ctx.save();
      ctx.translate(sx, FLOOR + 21);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = 'rgba(242,182,58,0.10)';
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    }

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

    const GLOOK = [{ shirt: '#41566b', skin: '#c98c5a' }, { shirt: '#6b4156', skin: '#a9744c' }];
    GUESTS.forEach((g, gi) => {
      const sx = g.x - cam;
      if (sx < -40 || sx > W + 40) return;
      const gy = this.guestY(g);
      const lk = GLOOK[gi % GLOOK.length];
      const bob = Math.sin(this.tAll * 6 + g.phase * 7) * 1.2;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(sx, gy + 5, 13, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = lk.shirt;
      ctx.beginPath();
      ctx.roundRect(sx - 10, gy - 26 + bob, 20, 30, 6);
      ctx.fill();
      ctx.fillStyle = lk.skin;
      ctx.beginPath();
      ctx.arc(sx, gy - 34 + bob, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#221c29';
      ctx.beginPath();
      ctx.arc(sx, gy - 37 + bob, 8, Math.PI, Math.PI * 2);
      ctx.fill();
    });

    const ex = ELEVATOR_X - cam;
    if (ex < W + 160) {
      // the exit is the goal — it reads as inviting, not sealing. As the cart nears
      // ELEVATOR_X the doorway opens wider and the mustard frame glows / pulses warmly.
      const near = clamp(1 - Math.abs(this.cx - ELEVATOR_X) / 520, 0, 1);
      const pulse = 0.5 + 0.5 * Math.sin(this.tAll * 4);
      const glow = 1 + near * (0.6 + 0.4 * pulse);
      const doorW = 22 + near * 30; // wider-open as you approach (was: shrinks with timer)
      rect(ctx, ex - 10, 104, 130, FLOOR - 104, '#1a1620');
      // warm interior light spilling from the open doorway when the cart is close
      if (near > 0) {
        rect(ctx, ex + 55 - doorW - 4, 126, doorW * 2 + 8, FLOOR - 130, C.mustard, 0.10 + near * 0.12);
      }
      frame(ctx, ex - 10, 104, 130, FLOOR - 104, C.mustard, 2 * glow);
      rect(ctx, ex + 55 - doorW, 130, doorW, FLOOR - 134, '#0f0d12');
      rect(ctx, ex + 55, 130, doorW, FLOOR - 134, '#0f0d12');
      frame(ctx, ex + 55 - doorW, 130, doorW * 2, FLOOR - 134, C.cream, 1);
      drawText(ctx, 'SERVICE EXIT', ex + 55, 112, { size: 9, weight: 700, color: C.mustard, align: 'center', spacing: 2 });
    }

    // brass cart + stack — arched crown bar, brass highlights, rolling spokes
    ctx.save();
    ctx.translate(CART_SX, FLOOR - 2);
    ctx.rotate(this.lean * 0.18);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(2, 8, 58, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    rect(ctx, -52, -14, 104, 9, '#a87f2a');
    rect(ctx, -52, -14, 104, 2, '#d9b25a');
    rect(ctx, -48, -74, 5, 60, '#a87f2a');
    rect(ctx, 43, -74, 5, 60, '#a87f2a');
    rect(ctx, -48, -74, 2, 60, '#d9b25a');
    rect(ctx, 43, -74, 2, 60, '#d9b25a');
    ctx.fillStyle = '#a87f2a';
    ctx.beginPath();
    ctx.moveTo(-48, -72);
    ctx.quadraticCurveTo(0, -92, 48, -72);
    ctx.quadraticCurveTo(0, -82, -48, -72);
    ctx.fill();
    ctx.strokeStyle = '#d9b25a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-44, -73);
    ctx.quadraticCurveTo(0, -90, 44, -73);
    ctx.stroke();
    ctx.fillStyle = '#0a0a0c';
    const spoke = this.cx / 9;
    [[-36, 0], [36, 0]].forEach(([wx]) => {
      ctx.beginPath();
      ctx.arc(wx, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.cream;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(wx + Math.cos(spoke) * 5, Math.sin(spoke) * 5);
      ctx.lineTo(wx - Math.cos(spoke) * 5, -Math.sin(spoke) * 5);
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

    // ── HUD — staggered in over the first beat of the leg, three calm zones:
    // top-left (identity + bags), top-centre (balance), top-right (timer).
    this.leanShown += (this.lean - this.leanShown) * Math.min(1, 18 * (this._dt || 0.016));

    // top-left: kebab + leg title, then a clear gap before the bag pips
    const aTitle = intro(this.legT, 0);
    ctx.save();
    ctx.globalAlpha = aTitle;
    ctx.translate(0, (1 - aTitle) * -10);
    drawText(ctx, 'LEVEL 01 · LUGGAGE RUSH', 36, 16, { size: 10, weight: 700, color: ACCENT, spacing: 3 });
    drawText(ctx, 'THE LODGE LOBBY', 36, 28, { font: 'display', size: 30, color: C.cream, spacing: 1 });
    ctx.restore();

    const aBags = intro(this.legT, 0.08);
    ctx.save();
    ctx.globalAlpha = aBags;
    drawText(ctx, 'BAGS', 36, 72, { size: 9, weight: 700, color: C.faint, spacing: 2 });
    this.zones.forEach((z, i) => {
      const col = z.status === 'caught' ? C.mustard : z.status === 'missed' ? '#3a3342' : '#241f2b';
      rect(ctx, 80 + i * 15, 71, 9, 9, col);
    });
    ctx.restore();

    // top-right: the clock, the loudest single element — given its own corner
    const aTime = intro(this.legT, 0.16);
    ctx.save();
    ctx.globalAlpha = aTime;
    ctx.translate((1 - aTime) * 10, 0);
    drawText(ctx, String(Math.ceil(Math.max(0, this.timeLeft))), 924, 14, { font: 'display', size: 44, color: this.timeLeft < 12 ? ACCENT : C.cream, align: 'right' });
    drawText(ctx, 'CART LEAVES IN', 924, 60, { size: 9, weight: 700, color: C.faint, align: 'right', spacing: 2 });
    ctx.restore();

    // top-centre: the balance meter, easing toward the live lean so it glides
    const aMeter = intro(this.legT, 0.12);
    ctx.save();
    ctx.globalAlpha = aMeter;
    drawText(ctx, 'BALANCE', 480, 16, { size: 9, weight: 700, color: C.mustard, align: 'center', spacing: 3 });
    rect(ctx, 360, 30, 240, 10, C.panel);
    frame(ctx, 360, 30, 240, 10, C.edge, 1);
    if (Math.abs(this.lean) > LEAN_LIMIT * 0.6) {
      frame(ctx, 357, 27, 246, 16, ACCENT, 2);
    }
    rect(ctx, 360, 30, 14, 10, ACCENT, 0.6);
    rect(ctx, 586, 30, 14, 10, ACCENT, 0.6);
    const needle = 480 + clamp(this.leanShown / LEAN_LIMIT, -1, 1) * 112;
    rect(ctx, needle - 2, 28, 4, 14, Math.abs(this.lean) > LEAN_LIMIT * 0.7 ? ACCENT : C.cream);
    ctx.restore();

    // bottom hint — short and spaced. On touch the buttons carry the controls,
    // so the line drops to a one-word objective.
    const hint = this.game.touch ? 'CATCH EVERY BAG' : '← BRAKE   ·   ROLL →   ·   COUNTER THE LEAN';
    drawText(ctx, hint, W / 2, 514, { size: 10, weight: 500, color: C.faint, align: 'center', spacing: 2 });

    this.drawTouchControls(ctx, 'BRAKE', '›', 'ROLL');
  }

  drawRun(ctx) {
    const cam = clamp(this.cx2 - CART_SX, 0, RUN.len - W);

    // dusk over the Okanagan — smooth gradient with a sinking sun (static, cached once)
    if (!this._skyG) {
      this._skyG = ctx.createLinearGradient(0, 0, 0, 172);
      this._skyG.addColorStop(0, '#241c38');
      this._skyG.addColorStop(0.52, '#52304a');
      this._skyG.addColorStop(0.8, '#a8503a');
      this._skyG.addColorStop(1, '#1a2418');
    }
    ctx.fillStyle = this._skyG;
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

    // far Okanagan hills — sine ridges are seamless across the whole run
    ctx.fillStyle = '#2e2347';
    ctx.beginPath();
    ctx.moveTo(-8, 192);
    for (let sx = -8; sx <= W + 24; sx += 24) {
      const wx = sx + cam * 0.3;
      ctx.lineTo(sx, 192 - (34 + 22 * Math.sin(wx * 0.0036) + 9 * Math.sin(wx * 0.0093 + 2.0)));
    }
    ctx.lineTo(W + 24, 192);
    ctx.fill();

    // the lake — the near ridge below is its shoreline
    rect(ctx, 0, 192, W, 56, '#123438');
    rect(ctx, 0, 192, W, 1.5, C.teal, 0.3);
    const sunRef = ctx.createLinearGradient(620, 0, 790, 0);
    sunRef.addColorStop(0, 'rgba(242,182,58,0)');
    sunRef.addColorStop(0.5, 'rgba(242,182,58,0.2)');
    sunRef.addColorStop(1, 'rgba(242,182,58,0)');
    ctx.fillStyle = sunRef;
    ctx.fillRect(620, 192, 170, 34);
    ctx.save();
    for (let i = 0; i < 9; i++) {
      const dx = ((i * 287.3 - cam * 0.42) % (W + 60) + W + 60) % (W + 60) - 30;
      const dy = 195 + ((i * 37.7) % 14);
      ctx.globalAlpha = 0.08 + 0.2 * (0.5 + 0.5 * Math.sin(this.tAll * (1.2 + (i % 4) * 0.3) + i * 2.1));
      ctx.fillStyle = i % 3 === 2 ? C.red : C.mustard;
      ctx.fillRect(dx, dy, 12 + (i % 3) * 7, 1.5);
    }
    ctx.restore();

    // near hills
    ctx.fillStyle = '#1a1330';
    ctx.beginPath();
    ctx.moveTo(-8, 248);
    for (let sx = -8; sx <= W + 24; sx += 24) {
      const wx = sx + cam * 0.6;
      ctx.lineTo(sx, 248 - (34 + 12 * Math.sin(wx * 0.0052 + 0.8) + 7 * Math.sin(wx * 0.013 + 4.2)));
    }
    ctx.lineTo(W + 24, 248);
    ctx.fill();

    // cottage lights wake up in the mid-distance on the final stretch
    const cotFade = clamp((this.cx2 - 2100) / 220, 0, 1);
    if (cotFade > 0) {
      ctx.save();
      for (let i = 0; i < 3; i++) {
        const sx = 1500 + i * 270 - cam * 0.75;
        if (sx < -90 || sx > W + 90) continue;
        const by = 356 - (i % 2) * 10;
        const glow = ctx.createRadialGradient(sx + 32, by - 16, 4, sx + 32, by - 16, 56);
        glow.addColorStop(0, 'rgba(242,182,58,0.16)');
        glow.addColorStop(1, 'rgba(242,182,58,0)');
        ctx.globalAlpha = cotFade;
        ctx.fillStyle = glow;
        ctx.fillRect(sx - 26, by - 74, 116, 92);
        ctx.fillStyle = '#100d15';
        ctx.fillRect(sx, by - 34, 64, 34);
        ctx.beginPath();
        ctx.moveTo(sx - 7, by - 34);
        ctx.lineTo(sx + 32, by - 56);
        ctx.lineTo(sx + 71, by - 34);
        ctx.fill();
        ctx.globalAlpha = cotFade * 0.85;
        ctx.fillStyle = C.mustard;
        ctx.fillRect(sx + 10, by - 24, 9, 12);
        ctx.fillRect(sx + 42, by - 24, 9, 12);
      }
      ctx.restore();
    }

    // distant back row of pines — smaller, hazier, more parallax, for depth
    for (let px = 60; px < RUN.len; px += 130) {
      const sx = px - cam * 0.7;
      if (sx < -40 || sx > W + 40) continue;
      const hgt = 54 + ((px / 130) % 3) * 16;
      ctx.fillStyle = '#14182a';
      ctx.beginPath();
      ctx.moveTo(sx, FLOOR - 30);
      ctx.lineTo(sx + 17, FLOOR - 30 - hgt);
      ctx.lineTo(sx + 34, FLOOR - 30);
      ctx.fill();
    }

    // grass tufts scattering the bank, dusk-lit
    for (let gx = 30; gx < RUN.len; gx += 95) {
      const sx = gx - cam * 0.92;
      if (sx < -10 || sx > W + 10) continue;
      const gy = FLOOR - 6 - ((gx / 95) % 3) * 3;
      ctx.strokeStyle = ((gx / 95) % 2) ? '#1c2a16' : '#243516';
      ctx.lineWidth = 1.5;
      for (const ga of [-0.4, 0, 0.4]) {
        ctx.beginPath();
        ctx.moveTo(sx, gy);
        ctx.lineTo(sx + ga * 7, gy - 9);
        ctx.stroke();
      }
    }

    // foreground pines — layered tiers, a trunk, and a dusk rim on the sun side
    for (let px = 0; px < RUN.len; px += 170) {
      const sx = px - cam * 0.85; // slight parallax
      if (sx < -60 || sx > W + 60) continue;
      const hgt = 90 + ((px / 170) % 3) * 28;
      const cx = sx + 26;
      rect(ctx, cx - 3, FLOOR - 14, 6, 10, '#2a1d12'); // trunk
      // three stacked tiers, widest at the base
      for (let tier = 0; tier < 3; tier++) {
        const ty = FLOOR - 8 - tier * (hgt * 0.3);
        const tw = 26 - tier * 6;
        const th = hgt * 0.46;
        ctx.fillStyle = '#0c1410';
        ctx.beginPath();
        ctx.moveTo(cx - tw, ty);
        ctx.lineTo(cx, ty - th);
        ctx.lineTo(cx + tw, ty);
        ctx.fill();
        // dusk light catches the right face of each tier
        ctx.fillStyle = 'rgba(168,80,58,0.22)';
        ctx.beginPath();
        ctx.moveTo(cx, ty - th);
        ctx.lineTo(cx + tw, ty);
        ctx.lineTo(cx + tw * 0.4, ty);
        ctx.fill();
      }
    }

    // the cart path: packed gravel with edge stones, twin tire ruts, a center seam
    rect(ctx, 0, FLOOR, W, 30, '#1b170f');
    if (!this._pathG) {
      this._pathG = ctx.createLinearGradient(0, FLOOR, 0, FLOOR + 30);
      this._pathG.addColorStop(0, 'rgba(242,182,58,0.05)');
      this._pathG.addColorStop(1, 'rgba(0,0,0,0.25)');
    }
    ctx.fillStyle = this._pathG;
    ctx.fillRect(0, FLOOR, W, 30);
    rect(ctx, 0, FLOOR, W, 2, C.cream, 0.15);
    rect(ctx, 0, FLOOR + 9, W, 1, C.cream, 0.05);   // worn tire ruts
    rect(ctx, 0, FLOOR + 19, W, 1, C.cream, 0.05);
    // edge stones lining the path, scrolling with the world
    for (let sx2 = 0; sx2 < RUN.len; sx2 += 46) {
      const ex = sx2 - cam;
      if (ex < -8 || ex > W + 8) continue;
      ctx.fillStyle = (sx2 / 46) % 2 ? '#2a2419' : '#231e15';
      ctx.beginPath();
      ctx.ellipse(ex, FLOOR + 2, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    rect(ctx, 0, FLOOR + 30, W, H - FLOOR - 30, '#0d0c0a');

    // roadside lamps casting warm pools onto the path
    for (let lx = 90; lx < RUN.len; lx += 360) {
      const sx = lx - cam;
      if (sx < -30 || sx > W + 30) continue;
      const pool = ctx.createRadialGradient(sx, FLOOR + 2, 4, sx, FLOOR + 2, 70);
      pool.addColorStop(0, 'rgba(242,182,58,0.16)');
      pool.addColorStop(1, 'rgba(242,182,58,0)');
      ctx.fillStyle = pool;
      ctx.fillRect(sx - 70, FLOOR - 30, 140, 80);
      rect(ctx, sx - 1.5, FLOOR - 56, 3, 52, '#241c14'); // post
      rect(ctx, sx - 5, FLOOR - 60, 10, 6, '#a87f2a');   // lantern head
      sparkle(ctx, sx, FLOOR - 57, 4, C.mustard, { alpha: 0.85 });
    }

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

    // fireflies come out past the halfway mark
    const ffFade = clamp((this.cx2 - 1400) / 220, 0, 1);
    if (ffFade > 0) {
      ctx.save();
      ctx.fillStyle = C.mustard;
      for (let i = 0; i < 10; i++) {
        const sp = 9 + (i % 4) * 5;
        const fx = ((i * 211.7 + this.tAll * sp - cam * 0.92) % (W + 60) + W + 60) % (W + 60) - 30;
        const fy = 310 + ((i * 53.9) % 96) + Math.sin(this.tAll * (0.9 + (i % 3) * 0.4) + i * 1.9) * 13;
        ctx.globalAlpha = ffFade * (0.2 + 0.55 * (0.5 + 0.5 * Math.sin(this.tAll * (1.6 + (i % 5) * 0.33) + i * 2.4)));
        ctx.beginPath();
        ctx.arc(fx, fy, 1.5 + (i % 3) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
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
    // rim light — the dusk catches the cart's upper edge
    ctx.strokeStyle = C.cream;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(-42, -21);
    ctx.lineTo(39, -21);
    ctx.quadraticCurveTo(58, -18, 60, -6);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // canopy
    rect(ctx, -34, -62, 5, 42, '#0c0a0e');
    rect(ctx, 26, -62, 5, 42, '#0c0a0e');
    rect(ctx, -38, -68, 74, 6, '#0c0a0e');
    rect(ctx, -38, -69.5, 74, 1.5, C.cream, 0.8);
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

    // ── HUD — same three calm zones as leg 1, staggered in over the first beat.
    this.vShown += (this.v2 - this.vShown) * Math.min(1, 14 * (this._dt || 0.016));
    const unsafe = this.v2 > RUN.safeV;

    // top-left: kebab + leg title, gap, then the bag pips
    const aTitle = intro(this.legT, 0);
    ctx.save();
    ctx.globalAlpha = aTitle;
    ctx.translate(0, (1 - aTitle) * -10);
    drawText(ctx, 'LEVEL 01 · LUGGAGE RUSH', 36, 16, { size: 10, weight: 700, color: ACCENT, spacing: 3 });
    drawText(ctx, 'THE COTTAGE RUN', 36, 28, { font: 'display', size: 30, color: C.cream, spacing: 1 });
    ctx.restore();

    const aBags = intro(this.legT, 0.08);
    ctx.save();
    ctx.globalAlpha = aBags;
    drawText(ctx, 'BAGS ABOARD', 36, 72, { size: 9, weight: 700, color: C.faint, spacing: 2 });
    for (let i = 0; i < 8; i++) {
      rect(ctx, 130 + i * 15, 71, 9, 9, i < this.stack.length ? C.mustard : '#241f2b');
    }
    ctx.restore();

    // top-right: the clock
    const aTime = intro(this.legT, 0.16);
    ctx.save();
    ctx.globalAlpha = aTime;
    ctx.translate((1 - aTime) * 10, 0);
    drawText(ctx, String(Math.ceil(Math.max(0, this.timeLeft))), 924, 14, { font: 'display', size: 44, color: this.timeLeft < 10 ? ACCENT : C.cream, align: 'right' });
    drawText(ctx, 'GUESTS ARRIVE IN', 924, 60, { size: 9, weight: 700, color: C.faint, align: 'right', spacing: 2 });
    ctx.restore();

    // top-centre: speed meter easing toward the live velocity, with the safe
    // line and a km/h readout tucked clear to the right. Real calibration: the
    // NXT tops out at 24 km/h, so full bar (360 units) = 24, safe line near 14.
    const aMeter = intro(this.legT, 0.12);
    ctx.save();
    ctx.globalAlpha = aMeter;
    drawText(ctx, 'SPEED', 466, 16, { size: 9, weight: 700, color: unsafe ? ACCENT : C.mustard, align: 'center', spacing: 3 });
    rect(ctx, 346, 30, 240, 10, C.panel);
    frame(ctx, 346, 30, 240, 10, C.edge, 1);
    rect(ctx, 348, 32, clamp(this.vShown / 360, 0, 1) * 236, 6, unsafe ? ACCENT : C.teal);
    rect(ctx, 346 + (RUN.safeV / 360) * 240 - 1, 28, 2, 14, C.cream, 0.7);
    drawText(ctx, `${Math.round(this.v2 / 15)}`, 602, 26, { font: 'display', size: 22, color: unsafe ? ACCENT : C.cream });
    drawText(ctx, 'KM/H · MAX 24', 602, 47, { size: 7.5, weight: 700, color: C.faint, spacing: 1 });
    ctx.restore();

    // bottom hint — short and spaced; touch buttons carry the controls.
    const hint = this.game.touch ? 'SLOW OVER THE BUMPS' : '← BRAKE   ·   GO →   ·   SLOW OVER BUMPS';
    drawText(ctx, hint, W / 2, 514, { size: 10, weight: 500, color: C.faint, align: 'center', spacing: 2 });

    this.drawTouchControls(ctx, 'BRAKE', '›', 'GO');
  }

  drawHandoff(ctx) {
    rect(ctx, 0, 0, W, H, C.ink, 0.88);
    const k = easeOutBack(clamp(this.t / 0.3, 0, 1));
    ctx.save();
    ctx.translate(W / 2, 196);
    ctx.scale(k, k);
    drawText(ctx, this.rushed ? 'CUTTING IT CLOSE.' : 'LOBBY CLEARED.', 0, -46, { font: 'display', size: 76, color: C.cream, align: 'center', shadow: { color: ACCENT, dx: 5, dy: 5 } });
    ctx.restore();
    // one focal headline, one count line, one objective — generously spaced.
    const a1 = intro(this.t, 0.18);
    drawText(ctx, `${this.stack.length}/8 BAGS ABOARD — LOAD THE PORSCHE NXT`, W / 2, 262, { size: 13, weight: 700, color: C.mustard, align: 'center', spacing: 2, alpha: a1 });
    const a2 = intro(this.t, 0.30);
    drawText(ctx, 'RUN THEM OUT TO PEREGRINE COTTAGES — SLOW OVER THE BUMPS', W / 2, 300, { size: 12, weight: 500, color: C.dim, align: 'center', alpha: a2 });
    if (this.blinkOk()) drawText(ctx, this.game.touch ? 'TAP → TAKE THE WHEEL' : 'ENTER → TAKE THE WHEEL', W / 2, 366, { font: 'display', size: 26, color: C.mustard, align: 'center', spacing: 2 });
  }

  blinkOk() { return Math.sin(this.tAll * 5.5) > -0.25; }

  // One minimalistic jazz-noir hold-button: ink fill, accent ring that lights up
  // while held, a glyph + short label. Large (84px) and semi-transparent so it
  // reads as tappable without covering the play field.
  touchBtn(ctx, b, glyph, label, accent) {
    const inp = this.game.input;
    const held = inp.touchInRect(b.x, b.y, b.w, b.h);
    ctx.save();
    // ink pad
    ctx.globalAlpha = held ? 0.9 : 0.66;
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 16);
    ctx.fill();
    // accent ring — brightens and thickens on press
    ctx.globalAlpha = held ? 1 : 0.8;
    ctx.strokeStyle = accent;
    ctx.lineWidth = held ? 3 : 2;
    ctx.beginPath();
    ctx.roundRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3, 14);
    ctx.stroke();
    ctx.restore();
    const cx = b.x + b.w / 2;
    drawText(ctx, glyph, cx, b.y + 16, { font: 'display', size: 40, color: accent, align: 'center', alpha: held ? 1 : 0.92 });
    drawText(ctx, label, cx, b.y + b.h - 18, { size: 9, weight: 700, color: C.cream, align: 'center', spacing: 2, alpha: held ? 0.95 : 0.7 });
  }

  drawTouchControls(ctx, leftLabel, rightGlyph, rightLabel) {
    if (!this.game.touch) return;
    this.touchBtn(ctx, BTN_L, '‹', leftLabel, C.teal);
    this.touchBtn(ctx, BTN_R, rightGlyph, rightLabel, C.mustard);
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
    rect(ctx, 0, 66, W, 4, ACCENT);
    drawText(ctx, 'LEVEL 01', W / 2, 94, { size: 11, weight: 700, color: ACCENT, align: 'center', spacing: 5 });
    drawText(ctx, 'HOW TO PLAY — LUGGAGE RUSH', W / 2, 110, { font: 'display', size: 52, color: C.cream, align: 'center', spacing: 2 });
    const rules = [
      'LEG 1 — the lobby. Bags drop from the rail: be UNDER them.',
      'Off-centre catches tip the stack — counter the lean.',
      'Leaning forward, speed up; leaning back, ease off.',
      'LEG 2 — load the Porsche NXT and run for the cottages.',
      'The box bounces. Slow over bumps or bags go overboard.',
      'Deliver every bag. The marmot has right of way.',
    ];
    // staggered reveal, each line given real breathing room (34px lead)
    rules.forEach((ln, i) => {
      const a = intro(this.t, 0.1 + i * 0.05);
      drawText(ctx, ln, W / 2, 212 + i * 34, { size: 15, weight: 500, color: i === 5 ? C.mustard : C.cream, align: 'center', alpha: a });
    });
    const controls = this.game.touch
      ? 'HOLD THE ON-SCREEN BRAKE / GO PADS'
      : '→ / D ROLL   ·   ← / A BRAKE   ·   M MUTE   ·   P PAUSE';
    drawText(ctx, controls, W / 2, 422, { size: 10, weight: 700, color: C.faint, align: 'center', spacing: 2 });
    if (this.blinkOk()) drawText(ctx, this.game.touch ? 'TAP → CLOCK IN' : 'ENTER → CLOCK IN', W / 2, 470, { font: 'display', size: 26, color: C.mustard, align: 'center', spacing: 3 });
  }
}
