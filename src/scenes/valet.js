import { drawText, rect, frame, clamp, lerp } from '../util.js';
import { C, easeOutExpo, easeOutBack, halftone, sparkle, stamp } from '../theme.js';
import { Ceremony } from './results.js';

const W = 960, H = 540;
const ACCENT = '#3fb8a8';
const CAR = { len: 92, wid: 42, wheelbase: 58 };
const WALL_Y = 110;

// Real shuttle stops, tightest bay last. (No valet exists at Predator Ridge —
// bellmen shuttle; the skill is backing the Yukon XL into tight spots.)
const ROUNDS = [
  {
    stallW: 76, par: 40, stop: 'THE LODGE',
    pylons: [[420, 250], [560, 360]],
    rects: [[200, 150, 110, 46, 'cart'], [520, 140, 90, 40, 'cart']],
  },
  {
    stallW: 64, par: 40, stop: 'FALCON POINT',
    pylons: [[420, 250], [560, 360], [640, 200]],
    rects: [[200, 150, 110, 46, 'cart'], [520, 140, 90, 40, 'cart'], [330, 330, 70, 70, 'planter']],
  },
  {
    stallW: 54, par: 45, stop: 'SPARKLING HILL RUN',
    pylons: [[420, 250], [560, 360], [640, 200], [500, 470]],
    rects: [[200, 150, 110, 46, 'cart'], [520, 140, 90, 40, 'cart'], [330, 330, 70, 70, 'planter'], [760, 330, 110, 46, 'cart']],
  },
];

// Ground dressing — fixed, drawn under everything that moves.
// Oil stains [x, y, scale, alpha]: years of shuttles idling in the same spots.
const OIL = [
  [170, 290, 1, 0.15], [455, 175, 0.8, 0.12], [350, 470, 1.1, 0.16],
  [620, 462, 0.9, 0.13], [766, 432, 0.8, 0.18], [878, 256, 0.7, 0.14],
];
// Painted lane arrows [x, y] — left to right, always forward, toward the bay.
const ARROWS = [[250, 430], [450, 430], [650, 430]];

function stallRect(round) {
  const w = ROUNDS[round].stallW;
  return { x: 740 - w / 2, y: 118, w, h: 118 };
}

function corners(x, y, th) {
  const c = Math.cos(th), s = Math.sin(th);
  const hl = CAR.len / 2, hw = CAR.wid / 2;
  // corners plus edge midpoints — pylons can't slip between sample points
  return [
    [hl, hw], [hl, -hw], [-hl, -hw], [-hl, hw],
    [hl, 0], [-hl, 0], [0, hw], [0, -hw],
  ].map(([px, py]) => [x + px * c - py * s, y + px * s + py * c]);
}

export class ValetScene {
  constructor(game) {
    this.game = game;
    this.ceremony = new Ceremony(game);
  }

  enter() {
    this.tAll = 0;
    this.state = 'intro';
    this.t = 0;
    this.round = 0;
    this.total = 0;
    this.roundScores = [];
    this.resetRound();
  }

  resetRound() {
    this.x = 110;
    this.y = 400;
    this.th = 0;
    this.v = 0;
    this.steer = 0;
    this.bumps = 0;
    this.elapsed = 0;
    this.dog = { x: 470, y: 320, tx: 470, ty: 320, retarget: 0 };
    // stop 3 only: a guest crosses the lot with RANGE takeout — right of way, always
    this.walker = this.round === 2 ? { x: -40, y: 430 } : null;
    this.autoBrakeT = 0;
    this.brakeLabel = '';
    this.shake = 0;
    this.flash = 0;
    this.splash = null;
    this.notice = null;
  }

  say(text, color = C.mustard) { this.notice = { text, color, t: 1.4 }; }

  inStall() {
    const st = stallRect(this.round);
    return corners(this.x, this.y, this.th).every(([px, py]) =>
      px >= st.x - 4 && px <= st.x + st.w + 4 && py >= st.y - 6 && py <= st.y + st.h + 8);
  }

  tryPark() {
    if (Math.abs(this.v) > 8) { this.say('STOP FIRST, THEN PARK'); return;
    }
    if (!this.inStall()) { this.say('GET FULLY BETWEEN THE LINES'); return; }
    // backed in = nose pointing out at the road (down the screen)
    let err = this.th - Math.PI / 2;
    while (err > Math.PI) err -= Math.PI * 2;
    while (err < -Math.PI) err += Math.PI * 2;
    const angleDeg = Math.abs(err) * 180 / Math.PI;
    if (angleDeg > 40) { this.say('REVERSE IN — REAR BUMPER FIRST'); return; }
    const st = stallRect(this.round);
    const centerOff = Math.abs(this.x - (st.x + st.w / 2));
    const angleScore = Math.max(0, 70 - angleDeg * 3);
    const centerScore = Math.max(0, 50 - centerOff * 2.5);
    const timeBonus = Math.max(0, Math.round((ROUNDS[this.round].par - this.elapsed) * 2));
    const bumpPenalty = Math.max(0, this.bumps - 1) * 15; // first bump is free
    const score = Math.max(10, Math.round(angleScore + centerScore + timeBonus - bumpPenalty));
    this.roundScores.push(score);
    this.total += score;
    this.splash = { score, angleDeg: Math.round(angleDeg), centerOff: Math.round(centerOff), timeBonus, bumpPenalty };
    this.game.audio.win();
    this.flash = 0.7;
    this.state = 'parked';
    this.t = 0;
  }

  finish() {
    const stars = this.total >= 390 ? 3 : this.total >= 260 ? 2 : 1;
    const sv = this.game.save;
    const prevBest = sv.data.best.valet;
    sv.data.stars.valet = Math.max(sv.data.stars.valet, stars);
    sv.data.best.valet = Math.max(sv.data.best.valet, this.total);
    sv.data.tips += 10 + Math.round(this.total / 20);
    sv.write();
    this.ceremony.start({
      label: 'LEVEL 02 — SHUTTLE PRECISION',
      stars,
      score: this.total,
      best: sv.data.best.valet,
      statLine: `ROUNDS ${this.roundScores.join(' · ')}`,
      hintLine: 'STRAIGHT, CENTERED AND QUICK — NO BUMPS — IS A 3-STAR SHIFT',
      nextLabel: 'ENTER → NEXT SHIFT: THE PITCH',
      newBest: this.total > prevBest && prevBest > 0,
    });
    this.state = 'stars';
  }

  update(dt) {
    this.tAll += dt;
    this.t += dt;
    this.shake = Math.max(0, this.shake - dt * 1.8);
    this.flash = Math.max(0, this.flash - dt * 4);
    if (this.notice) { this.notice.t -= dt; if (this.notice.t <= 0) this.notice = null; }

    const inp = this.game.input;
    const confirm = inp.pressed.has('Enter') || inp.pressed.has('Space') || inp.pointer.clicked;

    if (this.state === 'intro') {
      if (this.t > 1.6 || (confirm && this.t > 0.3)) {
        this.state = this.game.save.data.seenHowTo.valet ? 'play' : 'howto';
        this.t = 0;
        if (this.state === 'play') this.say(`STOP 1/3 — ${ROUNDS[0].stop} · BACK IN, REAR FIRST`);
      }
      return;
    }
    if (this.state === 'howto') {
      if (confirm) {
        this.game.save.data.seenHowTo.valet = true;
        this.game.save.write();
        this.state = 'play';
        this.t = 0;
        this.say(`STOP 1/3 — ${ROUNDS[0].stop} · BACK IN, REAR FIRST`);
      }
      return;
    }
    if (this.state === 'parked') {
      if (confirm && this.t > 0.7) {
        this.round++;
        if (this.round >= ROUNDS.length) { this.finish(); return; }
        this.resetRound();
        this.state = 'play';
        this.t = 0;
        this.say(`STOP ${this.round + 1}/3 — ${ROUNDS[this.round].stop} · TIGHTER BAY`);
      }
      return;
    }
    if (this.state === 'retry') {
      if ((confirm || inp.pressed.has('KeyR')) && this.t > 0.5) {
        this.resetRound();
        this.state = 'play';
        this.t = 0;
        this.say(`STOP ${this.round + 1}/3 — FRESH START, SAME BAY`);
      }
      return;
    }
    if (this.state === 'stars') {
      if (this.ceremony.update(dt)) this.game.go('pitch');
      return;
    }

    // ── play
    this.elapsed += dt;
    this.autoBrakeT = Math.max(0, this.autoBrakeT - dt);

    const left = inp.down.has('ArrowLeft') || inp.down.has('KeyA');
    const right = inp.down.has('ArrowRight') || inp.down.has('KeyD');
    const fwd = inp.down.has('ArrowUp') || inp.down.has('KeyW');
    const rev = inp.down.has('ArrowDown') || inp.down.has('KeyS');

    this.steer = lerp(this.steer, ((right ? 1 : 0) - (left ? 1 : 0)) * 0.52, Math.min(1, dt * 6));
    if (fwd) this.v += 170 * dt;
    else if (rev) this.v -= 190 * dt;
    else this.v -= Math.sign(this.v) * Math.min(Math.abs(this.v), 150 * dt);
    this.v = clamp(this.v, -115, 150);

    // dog wanders the loop; never gets hit — the car auto-brakes
    const dog = this.dog;
    dog.retarget -= dt;
    if (dog.retarget <= 0) {
      dog.retarget = 2 + Math.random() * 2;
      dog.tx = 160 + Math.random() * 560;
      dog.ty = 260 + Math.random() * 200;
    }
    const dd = Math.hypot(dog.tx - dog.x, dog.ty - dog.y);
    if (dd > 4) {
      dog.x += (dog.tx - dog.x) / dd * 42 * dt;
      dog.y += (dog.ty - dog.y) / dd * 42 * dt;
    }
    if (Math.hypot(this.x - dog.x, this.y - dog.y) < 92 && Math.abs(this.v) > 14 && this.autoBrakeT <= 0) {
      this.v = 0;
      this.autoBrakeT = 1.2;
      this.brakeLabel = 'DOG! AUTO-BRAKE';
      this.elapsed += 2;
      this.game.audio.thump();
      this.say('DOG! AUTO-BRAKE · +2S', ACCENT);
    }

    const wk = this.walker;
    if (wk) {
      wk.x += 36 * dt;
      if (wk.x > 1000) wk.x = -40;
      if (Math.hypot(this.x - wk.x, this.y - wk.y) < 84 && Math.abs(this.v) > 14 && this.autoBrakeT <= 0) {
        this.v = 0;
        this.autoBrakeT = 1.2;
        this.brakeLabel = 'TAKEOUT — RIGHT OF WAY';
        this.elapsed += 2;
        this.game.audio.thump();
        this.say('RANGE TAKEOUT COMING THROUGH · +2S', ACCENT);
      }
    }

    const px = this.x, py = this.y, pth = this.th;
    this.th += (this.v / CAR.wheelbase) * Math.tan(this.steer) * dt;
    this.x += Math.cos(this.th) * this.v * dt;
    this.y += Math.sin(this.th) * this.v * dt;

    // collisions: bounds, building wall (except the bay opening), props
    const st = stallRect(this.round);
    let hit = false;
    for (const [cx, cy] of corners(this.x, this.y, this.th)) {
      if (cx < 20 || cx > 940 || cy > 524) { hit = true; break; }
      if (cy < WALL_Y + 6 && !(cx > st.x - 2 && cx < st.x + st.w + 2)) { hit = true; break; }
      for (const [ox, oy] of ROUNDS[this.round].pylons) {
        if (Math.hypot(cx - ox, cy - oy) < 13) { hit = true; break; }
      }
      if (hit) break;
      for (const [rx, ry, rw, rh] of ROUNDS[this.round].rects) {
        if (cx > rx && cx < rx + rw && cy > ry && cy < ry + rh) { hit = true; break; }
      }
      if (hit) break;
    }
    if (hit) {
      this.x = px; this.y = py; this.th = pth;
      if (Math.abs(this.v) > 18) {
        this.bumps++;
        this.shake = 0.4;
        this.game.audio.thump();
        if (this.bumps >= 3) {
          // three bumps ends the round gracefully — scored low, never repeated
          const score = 25;
          this.roundScores.push(score);
          this.total += score;
          this.splash = { score, rough: true };
          this.game.audio.lose();
          this.state = 'parked';
          this.t = 0;
          return;
        }
        this.say(this.bumps === 1 ? 'CLOSE ONE — FIRST BUMP IS FREE' : 'BUMP 2/3 — EASY NOW', this.bumps === 1 ? ACCENT : C.red);
      }
      this.v = -this.v * 0.3;
    }

    if (inp.pressed.has('Space')) this.tryPark();
  }

  draw(ctx) {
    ctx.save();
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * 10 * this.shake, (Math.random() - 0.5) * 8 * this.shake);
    rect(ctx, 0, 0, W, H, C.ink);

    if (this.state === 'intro') { this.drawIntro(ctx); ctx.restore(); return; }
    if (this.state === 'howto') { this.drawHowTo(ctx); ctx.restore(); return; }
    if (this.state === 'stars') { this.ceremony.draw(ctx); ctx.restore(); return; }

    // tarmac + building front
    rect(ctx, 0, WALL_Y, W, H - WALL_Y, '#121016');
    // expansion joints — poured slabs, not flat fill (under the light pools)
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 4; i++) ctx.fillRect(190 + i * 190, WALL_Y, 1, H - WALL_Y);
    ctx.fillRect(0, 300, W, 1);
    ctx.fillRect(0, 490, W, 1);
    // oil stains — overlapping blobs at the usual idling spots
    for (const [sx, sy, sc, sa] of OIL) {
      ctx.fillStyle = `rgba(2,1,4,${sa})`;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 26 * sc, 14 * sc, 0.4, 0, Math.PI * 2);
      ctx.ellipse(sx + 14 * sc, sy + 7 * sc, 16 * sc, 9 * sc, -0.3, 0, Math.PI * 2);
      ctx.ellipse(sx - 12 * sc, sy + 5 * sc, 11 * sc, 7 * sc, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    // warm light pools spilling from the building
    for (let i = 0; i < 4; i++) {
      const lx = 165 + i * 215;
      const grad = ctx.createRadialGradient(lx, WALL_Y, 8, lx, WALL_Y, 190);
      grad.addColorStop(0, 'rgba(242,182,58,0.12)');
      grad.addColorStop(1, 'rgba(242,182,58,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(lx - 190, WALL_Y, 380, 190);
    }
    // old tire sweeps
    ctx.strokeStyle = 'rgba(242,233,216,0.045)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(120, 470);
    ctx.quadraticCurveTo(430, 420, 700, 250);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(80, 430);
    ctx.quadraticCurveTo(420, 380, 740, 244);
    ctx.stroke();
    // worn painted arrows — the lot only flows one way
    ctx.fillStyle = C.cream;
    ctx.globalAlpha = 0.12;
    for (const [ax, ay] of ARROWS) {
      ctx.beginPath();
      ctx.moveTo(ax - 30, ay - 5);
      ctx.lineTo(ax + 6, ay - 5);
      ctx.lineTo(ax + 6, ay - 12);
      ctx.lineTo(ax + 30, ay);
      ctx.lineTo(ax + 6, ay + 12);
      ctx.lineTo(ax + 6, ay + 5);
      ctx.lineTo(ax - 30, ay + 5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 5; i++) rect(ctx, 60 + i * 200, 330, 90, 3, C.cream, 0.07);
    // rubber scuffs at the bay mouth — years of the same turn-in
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(712, 304, 52, -2.45, -1.75);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(764, 312, 60, -1.95, -1.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(742, 288, 34, -2.7, -2.0);
    ctx.stroke();
    rect(ctx, 0, 0, W, WALL_Y, '#16131a');
    rect(ctx, 0, WALL_Y - 4, W, 4, '#241f2b');
    for (let i = 0; i < 7; i++) {
      rect(ctx, 50 + i * 145, 20, 14, WALL_Y - 24, '#241f2b');
      rect(ctx, 48 + i * 145, WALL_Y - 10, 18, 6, '#2c2532');
    }
    for (let i = 0; i < 7; i++) sparkle(ctx, 57 + i * 145, 30, 4, C.mustard, { alpha: 0.5 });
    drawText(ctx, `SHUTTLE STOP — ${ROUNDS[this.round].stop}`, 480, 78, { font: 'display', size: 20, color: C.cream, align: 'center', spacing: 3, alpha: 0.55 });

    // the stall
    const st = stallRect(this.round);
    const inside = this.inStall();
    ctx.save();
    ctx.strokeStyle = inside ? ACCENT : C.cream;
    ctx.globalAlpha = inside ? 0.95 : 0.5;
    ctx.setLineDash([10, 7]);
    ctx.lineWidth = 3;
    ctx.strokeRect(st.x, st.y, st.w, st.h);
    ctx.restore();
    rect(ctx, st.x + st.w / 2 - 1, st.y + 10, 2, st.h - 20, inside ? ACCENT : C.cream, 0.2);
    // painted corner brackets
    ctx.save();
    ctx.strokeStyle = inside ? ACCENT : C.cream;
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 4;
    [[st.x, st.y, 1, 1], [st.x + st.w, st.y, -1, 1], [st.x, st.y + st.h, 1, -1], [st.x + st.w, st.y + st.h, -1, -1]].forEach(([cx2, cy2, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(cx2 + dx * 14, cy2);
      ctx.lineTo(cx2, cy2);
      ctx.lineTo(cx2, cy2 + dy * 14);
      ctx.stroke();
    });
    ctx.restore();
    drawText(ctx, 'BAY', st.x + st.w / 2, st.y - 14, { size: 9, weight: 700, color: inside ? ACCENT : C.faint, align: 'center', spacing: 2 });
    if (inside && this.state === 'play') {
      let err = (this.th - Math.PI / 2) * 180 / Math.PI;
      while (err > 180) err -= 360;
      while (err < -180) err += 360;
      drawText(ctx, `ANGLE ${Math.abs(Math.round(err))}° · OFF-CENTRE ${Math.abs(Math.round(this.x - (st.x + st.w / 2)))}PX · SPACE TO PARK`, st.x + st.w / 2, st.y + st.h + 10, { size: 9, weight: 700, color: ACCENT, align: 'center', spacing: 1 });
    }

    // props
    for (const [rx, ry, rw, rh, kind] of ROUNDS[this.round].rects) {
      if (kind === 'planter') {
        rect(ctx, rx, ry, rw, rh, '#1d2418');
        frame(ctx, rx, ry, rw, rh, '#3a4a30', 2);
        ctx.fillStyle = '#2c3a24';
        ctx.beginPath();
        ctx.arc(rx + rw / 2, ry + rh / 2, rw / 3, 0, Math.PI * 2);
        ctx.fill();
        // okanagan blooms
        [[0.32, 0.4, C.red], [0.62, 0.3, C.mustard], [0.5, 0.66, '#d97aa0'], [0.72, 0.6, C.red]].forEach(([fx, fy, col]) => {
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(rx + rw * fx, ry + rh * fy, 3, 0, Math.PI * 2);
          ctx.fill();
        });
      } else {
        rect(ctx, rx, ry, rw, rh, '#241f2b');
        frame(ctx, rx, ry, rw, rh, C.edge, 1);
        rect(ctx, rx + 6, ry + 6, rw - 12, 8, C.cream, 0.15);
        drawText(ctx, 'CART', rx + rw / 2, ry + rh / 2 - 4, { size: 8, weight: 700, color: C.faint, align: 'center', spacing: 1 });
      }
    }
    for (const [ox, oy] of ROUNDS[this.round].pylons) {
      ctx.fillStyle = C.red;
      ctx.beginPath();
      ctx.arc(ox, oy, 9, 0, Math.PI * 2);
      ctx.fill();
      rect(ctx, ox - 9, oy - 2, 18, 4, C.cream, 0.8);
    }

    // dog (with a little shadow)
    const dog = this.dog;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(dog.x + 2, dog.y + 7, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(dog.x, dog.y);
    const da = Math.atan2(dog.ty - dog.y, dog.tx - dog.x);
    ctx.rotate(da);
    ctx.fillStyle = '#8a5a3a';
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(13, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a5a3a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(-19, Math.sin(this.tAll * 10) * 5);
    ctx.stroke();
    ctx.restore();
    // the RANGE takeout guest, mid-stride
    if (this.walker) {
      const wk = this.walker;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(wk.x, wk.y + 17, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.translate(wk.x, wk.y + Math.sin(this.tAll * 8) * 1.5);
      const ph = Math.sin(this.tAll * 8);
      ctx.strokeStyle = '#2c2532';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-2, 4); ctx.lineTo(-2 + ph * 5, 16); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2, 4); ctx.lineTo(2 - ph * 5, 16); ctx.stroke();
      ctx.fillStyle = '#3a5a6e';
      ctx.beginPath();
      ctx.roundRect(-7, -12, 14, 18, 5);
      ctx.fill();
      ctx.fillStyle = '#c98c5a';
      ctx.beginPath();
      ctx.arc(0, -18, 6, 0, Math.PI * 2);
      ctx.fill();
      // takeout bag held ahead, RANGE red band on cream
      ctx.fillStyle = C.cream;
      ctx.fillRect(10, -8, 11, 13);
      ctx.fillStyle = C.red;
      ctx.fillRect(10, -8, 11, 3);
      ctx.restore();
    }

    if (this.autoBrakeT > 0.4) {
      stamp(ctx, this.brakeLabel || 'DOG! AUTO-BRAKE', this.x, this.y - 50, { size: 14, bg: ACCENT, rot: -0.06 });
    }

    // the Yukon XL (grounded by its shadow)
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.th);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(2, 5, CAR.len / 2 + 7, CAR.wid / 2 + 7, 0, 0, Math.PI * 2);
    ctx.fill();
    if (this.v < -2) {
      ctx.strokeStyle = C.cream;
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(this.tAll * 9);
      for (let r = 14; r <= 30; r += 8) {
        ctx.beginPath();
        ctx.arc(-CAR.len / 2 - 6, 0, r, Math.PI * 0.7, Math.PI * 1.3);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#1a1620';
    ctx.beginPath();
    ctx.roundRect(-CAR.len / 2, -CAR.wid / 2, CAR.len, CAR.wid, 9);
    ctx.fill();
    ctx.strokeStyle = C.cream;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;
    rect(ctx, -CAR.len / 2 + 16, -CAR.wid / 2 + 5, 24, CAR.wid - 10, '#332c3d');
    rect(ctx, -CAR.len / 2 + 46, -CAR.wid / 2 + 5, 30, CAR.wid - 10, '#332c3d');
    rect(ctx, -CAR.len / 2 + 14, -2, CAR.len - 28, 4, '#0e0c10');
    rect(ctx, CAR.len / 2 - 5, -CAR.wid / 2 + 6, 3, 8, C.cream);
    rect(ctx, CAR.len / 2 - 5, CAR.wid / 2 - 14, 3, 8, C.cream);
    rect(ctx, -CAR.len / 2 + 2, -CAR.wid / 2 + 6, 3, 8, this.v < -2 ? '#ffffff' : C.red);
    rect(ctx, -CAR.len / 2 + 2, CAR.wid / 2 - 14, 3, 8, this.v < -2 ? '#ffffff' : C.red);
    ctx.restore();

    // ── HUD
    drawText(ctx, 'LEVEL 02 · SHUTTLE PRECISION', 36, 12, { size: 10, weight: 700, color: ACCENT, spacing: 3 });
    drawText(ctx, `SHIFT 2 — ROUND ${this.round + 1}/3`, 36, 24, { font: 'display', size: 30, color: C.cream, spacing: 1 });
    drawText(ctx, 'BUMPS', 36, 60, { size: 9, weight: 700, color: C.faint, spacing: 2 });
    for (let i = 0; i < 3; i++) rect(ctx, 84 + i * 14, 60, 9, 9, i < this.bumps ? C.red : '#241f2b');
    drawText(ctx, String(Math.floor(this.elapsed)), 924, 6, { font: 'display', size: 44, color: this.elapsed > ROUNDS[this.round].par ? C.red : C.cream, align: 'right' });
    drawText(ctx, `SECONDS · PAR ${ROUNDS[this.round].par}`, 924, 52, { size: 9, weight: 700, color: C.faint, align: 'right', spacing: 2 });

    if (this.notice) {
      stamp(ctx, this.notice.text, W / 2, 86, { size: 15, bg: this.notice.color, rot: -0.04 });
    }
    drawText(ctx, '↑ DRIVE · ↓ REVERSE · ←/→ STEER · SPACE PARK — REVERSE IN, REAR FIRST', W / 2, 514, { size: 10, weight: 500, color: C.faint, align: 'center', spacing: 2 });

    if (this.flash > 0) rect(ctx, 0, 0, W, H, C.cream, this.flash * 0.45);

    if (this.state === 'parked' && this.splash) {
      const sp = this.splash;
      rect(ctx, 0, 0, W, H, C.ink, 0.88);
      const k = easeOutBack(clamp(this.t / 0.3, 0, 1));
      ctx.save();
      ctx.translate(W / 2, 190);
      ctx.scale(k, k);
      drawText(ctx, sp.rough ? 'ROUGH ROUND.' : 'PARKED.', 0, -46, { font: 'display', size: 84, color: sp.rough ? C.red : ACCENT, align: 'center', shadow: { color: sp.rough ? '#4a1812' : '#123832', dx: 5, dy: 5 } });
      ctx.restore();
      if (this.t > 0.2) {
        const detail = sp.rough
          ? 'THREE BUMPS — THE GUEST PRETENDED NOT TO SEE'
          : `ANGLE ${sp.angleDeg}°   ·   OFF-CENTRE ${sp.centerOff}PX   ·   TIME +${sp.timeBonus}   ·   BUMPS −${sp.bumpPenalty}`;
        drawText(ctx, detail, W / 2, 268, { size: 12, weight: 700, color: C.dim, align: 'center', spacing: 2, alpha: Math.min(1, (this.t - 0.2) / 0.3) });
      }
      const rev = easeOutExpo(clamp((this.t - 0.35) / 0.7, 0, 1));
      drawText(ctx, `+${Math.round(sp.score * rev)}`, W / 2, 300, { font: 'display', size: 56, color: C.mustard, align: 'center' });
      const next = this.round + 1 < ROUNDS.length ? `ENTER → ROUND ${this.round + 2} (TIGHTER STALL)` : 'ENTER → COLLECT YOUR STARS';
      if (Math.sin(this.tAll * 5.5) > -0.25) drawText(ctx, next, W / 2, 392, { size: 12, weight: 700, color: C.mustard, align: 'center', spacing: 2 });
    }

    if (this.state === 'retry') {
      rect(ctx, 0, 0, W, H, C.ink, 0.88);
      drawText(ctx, 'THREE BUMPS.', W / 2, 180, { font: 'display', size: 80, color: C.red, align: 'center', shadow: { color: '#4a1812', dx: 5, dy: 5 } });
      drawText(ctx, "The Yukon XL is longer than it looks. Management is watching the paint.", W / 2, 286, { size: 13, weight: 500, color: C.dim, align: 'center' });
      if (Math.sin(this.tAll * 5.5) > -0.25) drawText(ctx, 'ENTER → RESET THE ROUND', W / 2, 340, { font: 'display', size: 24, color: C.mustard, align: 'center', spacing: 2 });
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
    drawText(ctx, '02', 64, 120 + (1 - slide) * 60, { font: 'display', size: 230, color: C.ink, alpha: slide });
    const bandT = easeOutExpo(clamp((t - 0.45) / 0.4, 0, 1));
    if (bandT > 0) {
      rect(ctx, 0, 380, W, 160, C.ink, bandT);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 380, W, 160);
      ctx.clip();
      drawText(ctx, 'SHUTTLE PRECISION', 64, 396 + (1 - bandT) * 60, { font: 'display', size: 60, color: C.cream, spacing: 2 });
      drawText(ctx, 'SKILL ON DISPLAY — PRECISION WITH GUESTS ABOARD', 64, 472 + (1 - bandT) * 60, { size: 12, weight: 700, color: ACCENT, spacing: 3 });
      ctx.restore();
    }
    if (t > 0.7) drawText(ctx, 'ENTER → SKIP', 924, 350, { size: 10, weight: 700, color: C.ink, align: 'right', spacing: 2, alpha: 0.65 });
  }

  drawHowTo(ctx) {
    rect(ctx, 0, 0, W, H, C.ink);
    rect(ctx, 0, 60, W, 4, ACCENT);
    drawText(ctx, 'LEVEL 02', W / 2, 84, { size: 11, weight: 700, color: ACCENT, align: 'center', spacing: 5 });
    drawText(ctx, 'HOW TO PLAY — SHUTTLE PRECISION', W / 2, 98, { font: 'display', size: 58, color: C.cream, align: 'center', spacing: 2 });
    const rules = [
      'The resort Yukon XL. Three shuttle stops. The bays get tighter.',
      'Drive across the lot and REVERSE into the bay, rear first.',
      'Straight and centered scores big. Quick scores more.',
      'Three bumps ends the stop with a rough score — guests notice.',
      'The dog owns this lot — the shuttle brakes for it, you lose time.',
      'Stop inside the lines, then press SPACE to park.',
    ];
    rules.forEach((ln, i) => drawText(ctx, ln, W / 2, 186 + i * 26, { size: 15, weight: 500, color: i === 5 ? C.mustard : C.cream, align: 'center' }));
    drawText(ctx, '↑ DRIVE   ·   ↓ REVERSE   ·   ←/→ STEER   ·   SPACE PARK   ·   M MUTE   ·   P PAUSE', W / 2, 380, { size: 10, weight: 700, color: C.faint, align: 'center', spacing: 2 });
    if (Math.sin(this.tAll * 5.5) > -0.25) drawText(ctx, 'ENTER → TAKE THE KEYS', W / 2, 430, { font: 'display', size: 26, color: C.mustard, align: 'center', spacing: 3 });
  }
}
