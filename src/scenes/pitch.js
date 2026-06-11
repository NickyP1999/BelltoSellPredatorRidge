import { drawText, wrap, rect, frame, clamp, lerp, pointIn, shuffle } from '../util.js';
import { C, easeOutCubic, easeOutExpo, easeOutBack, halftone, sparkle, speedlines, stamp } from '../theme.js';
import { ENCOUNTERS, TAGS, RARITY } from '../data/cards.js';
import { PLAYER_NAME } from '../config.js';

const W = 960, H = 540;
const PORT = { x: 36, y: 104, w: 170, h: 148 };
const SPEECH = { x: 230, y: 104, w: 694, h: 148 };
const PREV = { x: 36, y: 268, w: 888, h: 88 };
const STAMP_AT = { x: 577, y: 180 };
const CW = 188, CH = 140;            // card size
const HAND_Y = 452;                  // fan baseline
const PLAY_LINE = 350;               // drag a card above this to play it
const DECK_AT = { x: 64, y: 474 };
const DISCARD_AT = { x: 896, y: 474 };

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// Geometric tag icons — coin, clock, eye, crossroads.
function drawTagIcon(ctx, tag, cx, cy, r, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.6, r * 0.2);
  ctx.lineCap = 'round';
  if (tag === 'Price') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.8, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r * 0.8, cy);
    ctx.closePath();
    ctx.fill();
  } else if (tag === 'Time') {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - r * 0.52);
    ctx.moveTo(cx, cy); ctx.lineTo(cx + r * 0.42, cy + r * 0.14);
    ctx.stroke();
  } else if (tag === 'Skepticism') {
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.quadraticCurveTo(cx, cy - r * 0.95, cx + r, cy);
    ctx.quadraticCurveTo(cx, cy + r * 0.95, cx - r, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else { // Indecision — a fork in the road
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.85); ctx.lineTo(cx, cy + r * 0.1);
    ctx.moveTo(cx, cy + r * 0.1); ctx.lineTo(cx - r * 0.55, cy - r * 0.45);
    ctx.moveTo(cx, cy + r * 0.1); ctx.lineTo(cx + r * 0.55, cy - r * 0.45);
    ctx.stroke();
    [[-1, 0], [1, 0]].forEach(([sgn]) => {
      ctx.beginPath();
      ctx.moveTo(cx + sgn * r * 0.55, cy - r * 0.45);
      ctx.lineTo(cx + sgn * (r * 0.55 - r * 0.3), cy - r * 0.42);
      ctx.lineTo(cx + sgn * r * 0.45, cy - r * 0.12);
      ctx.closePath();
      ctx.fill();
    });
  }
  ctx.restore();
}

// Flat cel bust on an accent block — geometric, confident, original.
function drawGuestPanel(ctx, e, mood, tIn) {
  const { x, y, w, h } = PORT;
  const slide = 1 - easeOutExpo(clamp(tIn / 0.5, 0, 1));
  ctx.save();
  ctx.translate(-slide * 60, 0);
  ctx.globalAlpha = 1 - slide;

  rect(ctx, x, y, w, h, C.panel);
  frame(ctx, x, y, w, h, C.edge, 1);
  const bx = x + 7, by = y + 7, bw = w - 14, bh = h - 38;
  rect(ctx, bx, by, bw, bh, e.accent);
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = halftone(ctx);
  ctx.fillRect(bx + bw / 2, by, bw / 2, bh / 2);
  ctx.restore();

  const couple = e.guest.includes('&') || e.guest.startsWith('The ');
  const drawBust = (cx, base, s, look, m) => {
    ctx.fillStyle = look.shirt;
    ctx.beginPath();
    ctx.moveTo(cx - 44 * s, base);
    ctx.quadraticCurveTo(cx, base - 34 * s, cx + 44 * s, base);
    ctx.fill();
    ctx.fillStyle = look.skin;
    ctx.fillRect(cx - 7 * s, base - 40 * s, 14 * s, 16 * s);
    const hy = base - 88 * s;
    ctx.beginPath();
    ctx.moveTo(cx - 20 * s, hy + 10 * s);
    ctx.quadraticCurveTo(cx - 20 * s, hy, cx, hy);
    ctx.quadraticCurveTo(cx + 20 * s, hy, cx + 20 * s, hy + 10 * s);
    ctx.lineTo(cx + 20 * s, hy + 38 * s);
    ctx.quadraticCurveTo(cx + 20 * s, hy + 50 * s, cx, hy + 50 * s);
    ctx.quadraticCurveTo(cx - 20 * s, hy + 50 * s, cx - 20 * s, hy + 38 * s);
    ctx.fill();
    ctx.fillStyle = look.hair;
    ctx.beginPath();
    ctx.moveTo(cx - 22 * s, hy + 26 * s);
    ctx.quadraticCurveTo(cx - 24 * s, hy - 6 * s, cx, hy - 5 * s);
    ctx.quadraticCurveTo(cx + 24 * s, hy - 6 * s, cx + 22 * s, hy + 26 * s);
    ctx.lineTo(cx + 14 * s, hy + 12 * s);
    ctx.quadraticCurveTo(cx, hy + 4 * s, cx - 14 * s, hy + 12 * s);
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.4 * s;
    ctx.lineCap = 'round';
    const ey = hy + 24 * s;
    ctx.beginPath();
    if (m === 'happy') {
      ctx.moveTo(cx - 13 * s, ey); ctx.quadraticCurveTo(cx - 9 * s, ey - 4 * s, cx - 5 * s, ey);
      ctx.moveTo(cx + 5 * s, ey); ctx.quadraticCurveTo(cx + 9 * s, ey - 4 * s, cx + 13 * s, ey);
    } else {
      ctx.moveTo(cx - 13 * s, ey); ctx.lineTo(cx - 5 * s, ey + (m === 'cold' ? 2 * s : 0));
      ctx.moveTo(cx + 13 * s, ey); ctx.lineTo(cx + 5 * s, ey + (m === 'cold' ? 2 * s : 0));
    }
    ctx.stroke();
    const my = hy + 38 * s;
    ctx.beginPath();
    if (m === 'happy') ctx.arc(cx, my - 2 * s, 6 * s, 0.2 * Math.PI, 0.8 * Math.PI);
    else if (m === 'cold') ctx.arc(cx, my + 5 * s, 6 * s, 1.2 * Math.PI, 1.8 * Math.PI);
    else { ctx.moveTo(cx - 5 * s, my); ctx.lineTo(cx + 5 * s, my); }
    ctx.stroke();
  };

  const base = by + bh - 2;
  if (couple) {
    drawBust(bx + bw / 2 - 34, base, 0.82, { ...e.look, hair: '#3d3346' }, mood);
    drawBust(bx + bw / 2 + 26, base, 1, e.look, mood);
  } else {
    drawBust(bx + bw / 2, base, 1.05, e.look, mood);
  }

  drawText(ctx, e.guest.toUpperCase(), x + w / 2, y + h - 26, { font: 'display', size: 19, color: C.cream, align: 'center', spacing: 1 });
  ctx.restore();
}

export class PitchScene {
  constructor(game) { this.game = game; }

  enter() {
    this.runScore = 0;
    this.turnsBanked = 0;
    this.combo = 0;
    this.shake = 0;
    this.flash = 0;
    this.hitstop = 0;
    this.tAll = 0;
    this.hintT = 0;
    this.hintIdx = -1;
    this.drag = null;
    this.particles = [];
    this.floaters = [];
    this.startEncounter(0);
    if (!this.game.save.data.seenHowTo.pitch) this.state = 'howto';
  }

  mkSprite(card, x = DECK_AT.x, y = DECK_AT.y) {
    return { card, x, y, vx: 0, vy: 0, rot: -0.3, scale: 0.5, tx: x, ty: y, trot: -0.3, tscale: 0.5, holdT: 0 };
  }

  startEncounter(i) {
    this.encIdx = i;
    this.enc = ENCOUNTERS[i];
    this.charm = 0;
    this.charmShown = 0;
    this.turnsLeft = this.enc.turns;
    this.deck = shuffle(this.enc.deck);
    this.discard = [];
    this.hand = [];
    for (let k = 0; k < 4; k++) this.hand.push(this.deck.pop());
    this.sprites = this.hand.map((c) => this.mkSprite(c));
    this.dealt = false;
    this.objs = shuffle(this.enc.objections);
    this.objIdx = 0;
    this.ensureMatchableObjection();
    this.playsMade = 0;
    this.beatIdx = 0;
    this.beat = null;
    this.beatOrder = [0, 1];
    this.history = [];
    this.bestPlay = null;
    this.sel = 0;
    this.typed = 0;
    this.pending = null;
    this.pendingDraw = false;
    this.feedback = null;
    this.drag = null;
    this.hintT = 0;
    this.state = 'session';
    this.t = 0;
    this.tMeet = 0;
  }

  startDeal() {
    if (this.dealt) return;
    this.dealt = true;
    this.sprites.forEach((s, i) => { s.holdT = 0.1 + i * 0.11; });
  }

  obj() { return this.objs[this.objIdx % this.objs.length]; }

  // The right play must always exist: advance to the next objection whose tag
  // is actually counterable with the current hand.
  ensureMatchableObjection() {
    const tags = new Set(this.hand.filter(Boolean).map((c) => c.tag));
    for (let k = 0; k < this.objs.length; k++) {
      if (tags.has(this.objs[(this.objIdx + k) % this.objs.length].tag)) {
        this.objIdx += k;
        return;
      }
    }
  }

  hintTarget() {
    let best = -1;
    for (let i = 0; i < this.hand.length; i++) {
      const c = this.hand[i];
      if (!c) continue;
      if (c.tag === this.obj().tag && (best < 0 || c.charm > this.hand[best].charm)) best = i;
    }
    if (best < 0) {
      for (let i = 0; i < this.hand.length; i++) {
        const c = this.hand[i];
        if (c && (best < 0 || c.charm > this.hand[best].charm)) best = i;
      }
    }
    return best;
  }

  drawFromDeck() {
    if (!this.deck.length) { this.deck = shuffle(this.discard); this.discard = []; }
    return this.deck.pop() || null;
  }

  // ── hand geometry ───────────────────────────────────────────────────────

  layoutHand() {
    const n = this.sprites.length;
    this.sprites.forEach((s, i) => {
      if (this.drag && this.drag.i === i) return;
      if (!this.dealt || s.holdT > 0) {
        s.tx = DECK_AT.x; s.ty = DECK_AT.y; s.trot = -0.3; s.tscale = 0.5;
        return;
      }
      const c = i - (n - 1) / 2;
      let tx = 480 + c * 150;
      let ty = HAND_Y + Math.abs(c) * 10;
      let trot = c * 0.045;
      let tscale = 1;
      if (this.state === 'choose' && !this.drag && i === this.sel) {
        ty -= 48; trot = 0; tscale = 1.13;
      } else if (this.state === 'choose' && !this.drag) {
        tx += Math.sign(i - this.sel) * 24;
      }
      s.tx = tx; s.ty = ty; s.trot = trot; s.tscale = tscale;
    });
  }

  updateSprites(dt) {
    const K = 230, DAMP = 9.5;
    for (let i = 0; i < this.sprites.length; i++) {
      const s = this.sprites[i];
      if (this.drag && this.drag.i === i) continue;
      if (s.holdT > 0) {
        s.holdT -= dt;
        if (s.holdT <= 0) this.game.audio.deal();
      }
      s.vx += (s.tx - s.x) * K * dt;
      s.vy += (s.ty - s.y) * K * dt;
      const d = Math.exp(-DAMP * dt);
      s.vx *= d; s.vy *= d;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rot += (s.trot - s.rot) * Math.min(1, dt * 12);
      s.scale += (s.tscale - s.scale) * Math.min(1, dt * 12);
    }
  }

  spriteAt(p) {
    for (let pass = 0; pass < 2; pass++) {
      for (let i = this.sprites.length - 1; i >= 0; i--) {
        if (pass === 0 && i !== this.sel) continue; // lifted card wins ties
        if (pass === 1 && i === this.sel) continue;
        const s = this.sprites[i];
        const hw = (CW / 2) * s.scale, hh = (CH / 2) * s.scale;
        if (p.x > s.x - hw && p.x < s.x + hw && p.y > s.y - hh && p.y < s.y + hh) return i;
      }
    }
    return -1;
  }

  // ── fx ─────────────────────────────────────────────────────────────────

  spawnBurst(x, y, color, n = 18, speed = 260) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60,
        life: 0, max: 0.5 + Math.random() * 0.45,
        r: 3 + Math.random() * 6, color,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 8,
      });
    }
  }

  float(text, x, y, color, size = 22) {
    this.floaters.push({ text, x, y, t: 0, color, size });
  }

  // ── core turn logic ─────────────────────────────────────────────────────

  playCard(idx) {
    const c = this.hand[idx];
    if (!c || this.state !== 'choose') return;
    const s = this.sprites[idx];
    const o = this.obj();
    this.pending = {
      card: c, crit: c.tag === o.tag,
      gained: c.tag === o.tag ? c.charm * 2 : c.charm,
      from: { x: s.x, y: s.y },
      hit: false,
    };
    this.hand.splice(idx, 1);
    this.sprites.splice(idx, 1);
    this.sel = clamp(this.sel, 0, Math.max(0, this.hand.length - 1));
    this.discard.push(c);
    this.playsMade++;
    this.turnsLeft--;
    this.hintT = 0;
    this.pendingDraw = true;
    this.game.audio.pickup();
    this.state = 'resolve';
    this.t = 0;
    this.layoutHand();
  }

  applyImpact() {
    const pd = this.pending;
    pd.hit = true;
    this.combo = pd.crit ? this.combo + 1 : 0;
    this.charm = clamp(this.charm + pd.gained, 0, 999);
    this.history.push({ card: pd.card, crit: pd.crit, gained: pd.gained });
    if (!this.bestPlay || pd.gained > this.bestPlay.gained) this.bestPlay = { card: pd.card, gained: pd.gained };
    const tagColor = TAGS[pd.card.tag].color;
    if (pd.crit) {
      this.game.audio.crit(1 + 0.12 * Math.min(this.combo, 4));
      this.hitstop = 0.09;
      this.shake = 0.55;
      this.flash = 1;
      this.spawnBurst(STAMP_AT.x, STAMP_AT.y, tagColor, 22);
      this.spawnBurst(STAMP_AT.x, STAMP_AT.y, C.cream, 8, 180);
    } else {
      this.game.audio.snare();
      this.game.audio.bell(1);
      this.shake = 0.12;
    }
    this.float(`+${pd.gained}`, 36 + clamp(this.charm / this.enc.charmTarget, 0, 1) * 880, 70, pd.crit ? C.mustard : C.cream, pd.crit ? 26 : 20);
  }

  finishResolve() {
    this.pending = null;
    if (this.charm >= this.enc.charmTarget) { this.winEncounter(); return; }
    if (this.turnsLeft <= 0) { this.state = 'lost'; this.t = 0; this.game.audio.lose(); return; }
    if ((this.playsMade === 2 || this.playsMade === 4) && this.beatIdx < this.enc.beats.length) {
      this.beat = this.enc.beats[this.beatIdx++];
      this.beatOrder = shuffle([0, 1]);
      this.typed = 0;
      this.state = 'beat';
      this.t = 0;
      return;
    }
    this.nextObjection();
  }

  nextObjection() {
    this.objIdx++;
    this.ensureMatchableObjection();
    this.typed = 0;
    this.state = 'objection';
    this.t = 0;
  }

  beatBox(i) { return { x: 36, y: 268 + i * 56, w: 888, h: 48 }; }

  hintBtn() { return { x: 836, y: 238, w: 88, h: 22 }; }

  pickBeat(slot) {
    const opt = this.beat.options[this.beatOrder[slot]];
    if (opt.good) {
      this.charm = clamp(this.charm + 8, 0, 999);
      this.feedback = { text: 'THEY LEANED IN — NICE READ', sub: '+8 charm for listening first', color: C.teal };
      this.game.audio.bell(1.25);
      this.game.audio.ride();
    } else {
      this.feedback = { text: 'TOO PUSHY — THEY PULLED BACK', sub: 'listen first, pitch second', color: C.red };
      this.game.audio.thump();
      this.shake = 0.2;
    }
    this.state = 'beatResolve';
    this.t = 0;
  }

  winEncounter() {
    const e = this.enc;
    this.turnsBanked += this.turnsLeft;
    this.tipsEarned = 10 + this.turnsLeft * 5 + Math.max(0, this.charm - e.charmTarget);
    this.runScore += this.turnsLeft * 100 + this.charm;
    const sv = this.game.save;
    sv.data.tips += this.tipsEarned;
    if (this.bestPlay) {
      const entry = { guest: e.guest, place: e.place, line: this.bestPlay.card.line };
      const gi = sv.data.guestBook.findIndex((g) => g.guest === e.guest);
      if (gi >= 0) sv.data.guestBook[gi] = entry; else sv.data.guestBook.push(entry);
    }
    sv.write();
    this.game.audio.win();
    this.state = 'won';
    this.t = 0;
  }

  finishRun() {
    const sv = this.game.save;
    this.starsEarned = this.turnsBanked >= 7 ? 3 : this.turnsBanked >= 4 ? 2 : 1;
    sv.data.stars.pitch = Math.max(sv.data.stars.pitch, this.starsEarned);
    sv.data.best.pitch = Math.max(sv.data.best.pitch, this.runScore);
    sv.write();
    const st = sv.data.stars;
    this.career = st.luggage > 0 && st.valet > 0 && st.pitch > 0
      ? { scene: 'finale', label: 'ENTER → YOUR PROMOTION MEETING' }
      : { scene: 'hub', label: 'ENTER → BACK TO THE RESORT' };
    this.starsShown = 0;
    this.outroTyped = 0;
    this.state = 'stars';
    this.t = 0;
  }

  // ── update ───────────────────────────────────────────────────────────────

  update(dt) {
    this.tAll += dt;
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    this.t += dt;
    this.tMeet += dt;
    this.shake = Math.max(0, this.shake - dt * 1.8);
    this.flash = Math.max(0, this.flash - dt * 4);
    this.hintT = Math.max(0, this.hintT - dt);
    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 540 * dt; p.rot += p.vr * dt;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
    for (const f of this.floaters) { f.t += dt; f.y -= 34 * dt; }
    this.floaters = this.floaters.filter((f) => f.t < 1);

    this.layoutHand();
    this.updateSprites(dt);

    const inp = this.game.input;
    const p = inp.pointer;
    const anyKey = inp.pressed.size > 0;
    const confirm = inp.pressed.has('Enter') || inp.pressed.has('Space') || p.clicked;

    switch (this.state) {
      case 'howto':
        if (confirm) {
          this.game.save.data.seenHowTo.pitch = true;
          this.game.save.write();
          this.state = 'session';
          this.t = 0;
        }
        break;

      case 'session':
        if (this.t > 1.5 || (confirm && this.t > 0.3)) { this.state = 'meet'; this.t = 0; this.tMeet = 0; }
        break;

      case 'meet':
        if (confirm && this.t > 0.3) {
          this.startDeal();
          this.typed = 0;
          this.state = 'objection';
          this.t = 0;
        }
        break;

      case 'objection': {
        const len = this.obj().text.length;
        if (this.typed < len) {
          const before = Math.floor(this.typed);
          this.typed += dt * 68;
          if (Math.floor(this.typed) > before && Math.floor(this.typed) % 3 === 0) this.game.audio.blip();
          if ((anyKey || p.clicked) && this.t > 0.15) this.typed = len;
        } else if (this.t > 0.25) {
          this.state = 'choose';
        }
        break;
      }

      case 'choose': {
        // hint button
        const hb = this.hintBtn();
        const overHint = pointIn(p, hb.x, hb.y, hb.w, hb.h);
        if (overHint) this.game.cursor = 'pointer';
        if (inp.pressed.has('KeyH') || (p.clicked && overHint)) {
          this.hintIdx = this.hintTarget();
          this.hintT = 2.4;
          this.game.audio.ride();
          if (p.clicked) break;
        }
        if (inp.pressed.has('ArrowLeft')) { this.sel = (this.sel + this.hand.length - 1) % this.hand.length; this.game.audio.ride(); }
        if (inp.pressed.has('ArrowRight')) { this.sel = (this.sel + 1) % this.hand.length; this.game.audio.ride(); }
        for (let i = 0; i < this.hand.length; i++) {
          if (inp.pressed.has('Digit' + (i + 1))) { this.playCard(i); return; }
        }
        if (inp.pressed.has('Enter') || inp.pressed.has('Space')) { this.playCard(this.sel); return; }

        // ── pick up / drag / drop
        if (!this.drag) {
          const hi = this.spriteAt(p);
          if (hi >= 0) {
            this.game.cursor = 'grab';
            if (this.sel !== hi) { this.sel = hi; this.game.audio.ride(); }
            if (p.clicked) {
              const s = this.sprites[hi];
              this.drag = { i: hi, dx: p.x - s.x, dy: p.y - s.y, sx: p.x, sy: p.y, moved: false, lastX: p.x };
              this.game.audio.pickup();
            }
          }
        }
        if (this.drag) {
          this.game.cursor = 'grabbing';
          const s = this.sprites[this.drag.i];
          s.x = p.x - this.drag.dx;
          s.y = p.y - this.drag.dy;
          s.tx = s.x; s.ty = s.y;
          s.vx = s.vy = 0;
          s.tscale = 1.12;
          s.trot = clamp((p.x - this.drag.lastX) * 0.02, -0.22, 0.22);
          s.rot += (s.trot - s.rot) * Math.min(1, dt * 14);
          s.scale += (s.tscale - s.scale) * Math.min(1, dt * 12);
          this.drag.lastX = p.x;
          this.sel = this.drag.i;
          if (Math.hypot(p.x - this.drag.sx, p.y - this.drag.sy) > 12) this.drag.moved = true;

          // live reorder while the card rides along the hand
          if (s.y > PLAY_LINE + 40) {
            let newIdx = 0;
            for (let i = 0; i < this.sprites.length; i++) {
              if (i === this.drag.i) continue;
              if (this.sprites[i].tx < s.x) newIdx++;
            }
            if (newIdx !== this.drag.i) {
              const [card] = this.hand.splice(this.drag.i, 1);
              const [spr] = this.sprites.splice(this.drag.i, 1);
              this.hand.splice(newIdx, 0, card);
              this.sprites.splice(newIdx, 0, spr);
              this.drag.i = newIdx;
              this.sel = newIdx;
              this.hintT = 0;
              this.game.audio.ride();
            }
          }

          if (p.released) {
            const di = this.drag.i;
            const playIt = !this.drag.moved || s.y < PLAY_LINE;
            this.drag = null;
            if (playIt) this.playCard(di);
            else { this.game.audio.place(); this.layoutHand(); }
          }
        }
        break;
      }

      case 'resolve':
        if (!this.pending.hit && this.t >= 0.16) this.applyImpact();
        if (this.pendingDraw && this.t >= 0.5) {
          this.pendingDraw = false;
          const nc = this.drawFromDeck();
          if (nc) {
            this.hand.push(nc);
            const s = this.mkSprite(nc);
            s.holdT = 0.05;
            this.sprites.push(s);
          }
        }
        if (this.t > 1.05) this.finishResolve();
        break;

      case 'beat': {
        const len = this.beat.prompt.length;
        if (this.typed < len) {
          const before = Math.floor(this.typed);
          this.typed += dt * 70;
          if (Math.floor(this.typed) > before && Math.floor(this.typed) % 3 === 0) this.game.audio.blip();
          if ((anyKey || p.clicked) && this.t > 0.15) this.typed = len;
          break;
        }
        for (let i = 0; i < 2; i++) {
          const b = this.beatBox(i);
          if (pointIn(p, b.x, b.y, b.w, b.h)) {
            this.game.cursor = 'pointer';
            if (p.clicked) { this.pickBeat(i); return; }
          }
        }
        if (inp.pressed.has('KeyA') || inp.pressed.has('Digit1')) this.pickBeat(0);
        else if (inp.pressed.has('KeyB') || inp.pressed.has('Digit2')) this.pickBeat(1);
        break;
      }

      case 'beatResolve':
        if (this.t > 1.25) { this.feedback = null; this.nextObjection(); }
        break;

      case 'won':
        if (confirm && this.t > 0.7) {
          if (this.encIdx + 1 < ENCOUNTERS.length) this.startEncounter(this.encIdx + 1);
          else this.finishRun();
        }
        break;

      case 'lost':
        if ((confirm || inp.pressed.has('KeyR')) && this.t > 0.6) this.startEncounter(this.encIdx);
        break;

      case 'stars': {
        const target = Math.min(this.starsEarned, Math.floor(Math.max(0, this.t - 0.6) / 0.55));
        while (this.starsShown < target) {
          this.starsShown++;
          this.game.audio.bell(1 + this.starsShown * 0.2);
          if (this.starsShown === this.starsEarned) this.game.audio.stab(1.5, { when: 0.1 });
          this.flash = 0.7;
          this.shake = 0.3;
          this.spawnBurst(W / 2 - 110 + (this.starsShown - 1) * 110, 250, C.mustard, 16, 220);
        }
        if (this.starsShown === this.starsEarned) this.outroTyped += dt * 22;
        if (confirm && this.t > 0.6 + this.starsEarned * 0.55 + 0.3) this.game.go(this.career.scene);
        break;
      }
    }
  }

  blink() { return Math.sin(this.tAll * 5.5) > -0.25; }

  // ── draw ─────────────────────────────────────────────────────────────────

  draw(ctx) {
    const e = this.enc;
    ctx.save();
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * 10 * this.shake, (Math.random() - 0.5) * 8 * this.shake);
    }

    rect(ctx, 0, 0, W, H, C.ink);

    if (this.state === 'howto') { this.drawHowTo(ctx); ctx.restore(); return; }
    if (this.state === 'session') { this.drawSession(ctx); ctx.restore(); return; }
    if (this.state === 'stars') { this.drawStars(ctx); this.drawFx(ctx); ctx.restore(); return; }

    this.drawBoard(ctx, e);
    if (this.state === 'won') this.drawWon(ctx);
    if (this.state === 'lost') this.drawLost(ctx);
    this.drawFx(ctx);
    ctx.restore();
  }

  drawFx(ctx) {
    for (const p of this.particles) {
      sparkle(ctx, p.x, p.y, p.r * (1 - p.life / p.max), p.color, { rot: p.rot, alpha: 1 - p.life / p.max });
    }
    for (const f of this.floaters) {
      drawText(ctx, f.text, f.x, f.y, { font: 'display', size: f.size, color: f.color, align: 'center', alpha: 1 - easeOutCubic(f.t) * 0.9 });
    }
    if (this.flash > 0) rect(ctx, -20, -20, W + 40, H + 40, C.cream, this.flash * 0.45);
  }

  drawBoard(ctx, e) {
    const p = this.game.input.pointer;

    // ── Header
    drawText(ctx, 'LEVEL 03 · THE PITCH', 36, 12, { size: 10, weight: 700, color: e.accent, spacing: 3 });
    drawText(ctx, `SESSION ${e.session} — ${e.title}`, 36, 24, { font: 'display', size: 30, color: C.cream, spacing: 1 });
    drawText(ctx, 'GUEST', 36, 60, { size: 9, weight: 700, color: C.faint, spacing: 2 });
    for (let i = 0; i < 3; i++) {
      rect(ctx, 82 + i * 14, 60, 9, 9, i <= this.encIdx ? e.accent : '#241f2b');
    }
    drawText(ctx, String(this.turnsLeft), 924, 6, { font: 'display', size: 44, color: this.turnsLeft <= 2 ? C.red : C.cream, align: 'right' });
    drawText(ctx, 'TURNS LEFT', 924, 52, { size: 9, weight: 700, color: C.faint, align: 'right', spacing: 2 });

    // ── Charm meter
    const target = e.charmTarget;
    drawText(ctx, 'CHARM', 36, 74, { size: 10, weight: 700, color: C.mustard, spacing: 3 });
    drawText(ctx, `${Math.round(this.charmShown)} / ${target}`, 924, 68, { font: 'display', size: 20, color: C.cream, align: 'right' });
    rect(ctx, 36, 88, 888, 12, C.panel);
    frame(ctx, 36, 88, 888, 12, C.edge, 1);
    const fw = clamp(this.charmShown / target, 0, 1) * 884;
    if (fw > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(38, 90);
      ctx.lineTo(38 + fw, 90);
      ctx.lineTo(38 + Math.max(0, fw - 5), 98);
      ctx.lineTo(38, 98);
      ctx.fillStyle = this.charm >= target ? C.mustard : e.accent;
      ctx.fill();
      ctx.restore();
      rect(ctx, 38 + Math.max(0, fw - 3), 88, 3, 12, C.cream, 0.9);
    }
    const gap = target - this.charm;
    if (this.state === 'choose' && gap > 0 && gap <= 24) {
      frame(ctx, 34, 86, 892, 16, C.mustard, 1);
      drawText(ctx, 'ONE GOOD CARD AWAY', 36, 104, { size: 8, weight: 700, color: C.mustard, spacing: 2, alpha: 0.5 + 0.5 * Math.sin(this.tAll * 6) });
    }
    if (this.combo >= 2) {
      stamp(ctx, `STREAK x${this.combo}`, 790, 78, { size: 12, bg: C.mustard, rot: -0.06 });
    }

    // ── Guest + speech
    const ratio = this.charm / target;
    const mood = this.state === 'lost' ? 'cold' : this.state === 'won' ? 'happy' : ratio < 0.35 ? 'cold' : ratio < 0.75 ? 'neutral' : 'happy';
    drawGuestPanel(ctx, e, mood, this.tMeet);

    rect(ctx, SPEECH.x, SPEECH.y, SPEECH.w, SPEECH.h, C.panel);
    frame(ctx, SPEECH.x, SPEECH.y, SPEECH.w, SPEECH.h, C.edge, 1);
    rect(ctx, SPEECH.x, SPEECH.y, 6, SPEECH.h, e.accent);
    drawText(ctx, '“', SPEECH.x + 22, SPEECH.y + 6, { font: 'display', size: 64, color: e.accent, alpha: 0.4 });

    const tx = SPEECH.x + 64;
    const tw = SPEECH.w - 110;

    if (this.state === 'meet') {
      drawText(ctx, `${e.guest.toUpperCase()} — ${e.guestDesc.toUpperCase()}`, tx, SPEECH.y + 16, { size: 10, weight: 700, color: C.dim, spacing: 2 });
      wrap(ctx, e.intro, tw, { size: 17, weight: 500 }).slice(0, 3).forEach((ln, i) =>
        drawText(ctx, ln, tx, SPEECH.y + 38 + i * 24, { size: 17, weight: 500, color: C.cream }));
      if (this.blink()) drawText(ctx, 'ENTER → DEAL ME IN', SPEECH.x + SPEECH.w - 18, SPEECH.y + SPEECH.h - 24, { size: 11, weight: 700, color: C.mustard, align: 'right', spacing: 2 });
    } else if (this.state === 'beat' || this.state === 'beatResolve') {
      drawText(ctx, 'THE CONVERSATION TURNS...', tx, SPEECH.y + 16, { size: 10, weight: 700, color: C.dim, spacing: 2 });
      const shown = this.state === 'beat' ? this.beat.prompt.slice(0, Math.floor(this.typed)) : this.beat.prompt;
      wrap(ctx, shown, tw, { size: 17, weight: 500 }).slice(0, 3).forEach((ln, i) =>
        drawText(ctx, ln, tx, SPEECH.y + 38 + i * 24, { size: 17, weight: 500, color: C.cream }));
    } else {
      const o = this.obj();
      const full = this.state !== 'objection';
      const shown = full ? o.text : o.text.slice(0, Math.floor(this.typed));
      const done = full || this.typed >= o.text.length;
      drawText(ctx, 'OBJECTION', tx, SPEECH.y + 16, { size: 10, weight: 700, color: C.dim, spacing: 3 });
      wrap(ctx, shown, tw, { size: 17, weight: 500 }).slice(0, 3).forEach((ln, i) =>
        drawText(ctx, ln, tx, SPEECH.y + 38 + i * 24, { size: 17, weight: 500, color: C.cream }));
      if (done) {
        const tag = TAGS[o.tag];
        stamp(ctx, o.tag.toUpperCase(), SPEECH.x + SPEECH.w - 64, SPEECH.y + 26, { size: 15, bg: tag.color, rot: -0.08 });
        drawTagIcon(ctx, o.tag, SPEECH.x + SPEECH.w - 116, SPEECH.y + 26, 9, tag.color);
        drawText(ctx, tag.hint, SPEECH.x + SPEECH.w - 18, SPEECH.y + 46, { size: 10, color: tag.color, align: 'right', italic: true });
      }
    }

    // drop-to-play target while dragging high
    if (this.drag && this.sprites[this.drag.i] && this.sprites[this.drag.i].y < PLAY_LINE) {
      const tag = TAGS[this.sprites[this.drag.i].card.tag];
      frame(ctx, SPEECH.x - 4, SPEECH.y - 4, SPEECH.w + 8, SPEECH.h + 8, tag.color, 2);
      stamp(ctx, 'RELEASE TO MAKE THE PITCH', STAMP_AT.x, STAMP_AT.y + 60, { size: 16, bg: tag.color, rot: -0.04, alpha: 0.6 + 0.4 * Math.sin(this.tAll * 7) });
    }

    // ── Mid zone: preview / hint / beats / feedback
    if (this.state === 'choose' && this.hand[this.sel]) {
      const c = this.hand[this.sel];
      const rar = RARITY[c.rarity];
      const hb = this.hintBtn();
      if (this.hintT > 0) {
        stamp(ctx, `THEIR WORRY IS ${this.obj().tag.toUpperCase()} — MATCH IT`, hb.x - 110, hb.y + 11, { size: 12, bg: TAGS[this.obj().tag].color, rot: 0 });
      } else {
        rect(ctx, hb.x, hb.y, hb.w, hb.h, C.panel);
        frame(ctx, hb.x, hb.y, hb.w, hb.h, pointIn(p, hb.x, hb.y, hb.w, hb.h) ? C.mustard : C.edge, 1);
        drawText(ctx, 'HINT · H', hb.x + hb.w / 2, hb.y + 5, { font: 'display', size: 14, color: C.mustard, align: 'center', spacing: 1 });
      }
      rect(ctx, PREV.x, PREV.y, PREV.w, PREV.h, C.panel);
      frame(ctx, PREV.x, PREV.y, PREV.w, PREV.h, rar.color, c.rarity === 'legendary' ? 2 : 1);
      drawText(ctx, `YOU'D SAY — ${c.name.toUpperCase()}`, PREV.x + 16, PREV.y + 10, { size: 10, weight: 700, color: rar.color, spacing: 2 });
      const lw = c.tag === this.obj().tag ? PREV.w - 200 : PREV.w - 60;
      wrap(ctx, '"' + c.line + '"', lw, { size: 15, weight: 500, italic: true }).slice(0, 2).forEach((ln, i) =>
        drawText(ctx, ln, PREV.x + 16, PREV.y + 30 + i * 22, { size: 15, weight: 500, italic: true, color: C.cream }));
      if (c.tag === this.obj().tag) {
        stamp(ctx, 'COUNTERS → DOUBLE CHARM', PREV.x + PREV.w - 100, PREV.y + 46, { size: 14, bg: TAGS[c.tag].color, rot: -0.07 });
      }
    }

    if (this.state === 'beat' && this.typed >= this.beat.prompt.length) {
      drawText(ctx, 'PICK YOUR LINE', 36, 250, { size: 10, weight: 700, color: C.mustard, spacing: 3 });
      for (let i = 0; i < 2; i++) {
        const b = this.beatBox(i);
        const hov = pointIn(p, b.x, b.y, b.w, b.h);
        rect(ctx, b.x + (hov ? 6 : 0), b.y, b.w - (hov ? 6 : 0), b.h, hov ? '#1d1822' : C.panel);
        frame(ctx, b.x + (hov ? 6 : 0), b.y, b.w - (hov ? 6 : 0), b.h, hov ? C.mustard : C.edge, 1);
        const opt = this.beat.options[this.beatOrder[i]];
        drawText(ctx, i === 0 ? 'A' : 'B', b.x + 22, b.y + 8, { font: 'display', size: 30, color: C.mustard });
        const lines = wrap(ctx, opt.text, b.w - 90, { size: 14, weight: 500 }).slice(0, 2);
        lines.forEach((ln, k) =>
          drawText(ctx, ln, b.x + 52, b.y + (lines.length === 1 ? 16 : 7) + k * 18, { size: 14, weight: 500, color: C.cream }));
      }
    }

    if (this.state === 'beatResolve' && this.feedback) {
      const k = easeOutBack(clamp(this.t / 0.25, 0, 1));
      ctx.save();
      ctx.translate(W / 2, 300);
      ctx.rotate(-0.04);
      ctx.scale(k, k);
      drawText(ctx, this.feedback.text, 0, -14, { font: 'display', size: 40, color: this.feedback.color, align: 'center', shadow: { color: C.ink, dx: 4, dy: 4 } });
      drawText(ctx, this.feedback.sub.toUpperCase(), 0, 30, { size: 11, weight: 700, color: C.dim, align: 'center', spacing: 2 });
      ctx.restore();
    }

    // ── Resolve: flying card + slam stamp
    if (this.state === 'resolve' && this.pending) {
      const pd = this.pending;
      const flyT = clamp(this.t / 0.16, 0, 1);
      if (flyT < 1) {
        const fx = lerp(pd.from.x, STAMP_AT.x, easeOutCubic(flyT));
        const fy = lerp(pd.from.y, STAMP_AT.y, easeOutCubic(flyT));
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(-0.12 * flyT);
        const s = lerp(1.05, 0.6, flyT);
        ctx.scale(s, s);
        this.drawCardFace(ctx, pd.card, { alpha: 1 });
        ctx.restore();
      } else if (pd.hit) {
        const st = this.t - 0.16;
        const tagColor = TAGS[pd.card.tag].color;
        if (pd.crit) {
          speedlines(ctx, STAMP_AT.x, STAMP_AT.y, clamp(st / 0.5, 0, 1), tagColor);
          const k = easeOutBack(clamp(st / 0.22, 0, 1));
          ctx.save();
          ctx.translate(STAMP_AT.x, STAMP_AT.y);
          ctx.rotate(-0.05);
          ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
          drawText(ctx, 'COUNTERED', 0, -44, { font: 'display', size: 76, color: tagColor, align: 'center', shadow: { color: C.ink, dx: 6, dy: 6 }, spacing: 2 });
          drawText(ctx, `+${pd.gained} CHARM${this.combo >= 2 ? `  ·  STREAK x${this.combo}` : ''}`, 0, 36, { font: 'display', size: 28, color: C.cream, align: 'center' });
          ctx.restore();
        } else {
          const k = easeOutBack(clamp(st / 0.2, 0, 1));
          ctx.save();
          ctx.translate(STAMP_AT.x, STAMP_AT.y);
          ctx.scale(k, k);
          drawText(ctx, `+${pd.gained}`, 0, -30, { font: 'display', size: 56, color: C.cream, align: 'center', shadow: { color: C.ink, dx: 5, dy: 5 } });
          drawText(ctx, `SOLID — BUT IT DIDN'T COUNTER THEIR ${this.obj().tag.toUpperCase()} WORRY`, 0, 28, { size: 11, weight: 700, color: C.dim, align: 'center', spacing: 1 });
          ctx.restore();
        }
      }
    }

    // ── Deck, discard, hand
    this.drawPiles(ctx);
    this.drawHandSprites(ctx);

    // teach the hand once, then get out of the way
    if (this.state === 'choose' && this.encIdx === 0 && this.playsMade === 0) {
      drawText(ctx, 'DRAG UP TO PLAY · DRAG ACROSS TO REARRANGE · CLICK PLAYS · H HINT', W / 2, 357, { size: 9, weight: 700, color: C.faint, align: 'center', spacing: 2 });
    }
  }

  drawPiles(ctx) {
    const dim = this.state === 'choose' ? 1 : 0.45;
    ctx.save();
    ctx.globalAlpha = dim;
    const drawPile = (at, count, label) => {
      if (count > 0) {
        for (let k = 0; k < Math.min(3, count); k++) {
          ctx.save();
          ctx.translate(at.x, at.y - k * 4);
          ctx.rotate(-0.05 + k * 0.025);
          ctx.scale(0.42, 0.42);
          this.drawCardBack(ctx);
          ctx.restore();
        }
      } else {
        ctx.save();
        ctx.strokeStyle = C.edge;
        ctx.setLineDash([6, 5]);
        ctx.lineWidth = 2;
        ctx.strokeRect(at.x - CW * 0.21, at.y - CH * 0.21, CW * 0.42, CH * 0.42);
        ctx.restore();
      }
      drawText(ctx, `${label} · ${count}`, at.x, at.y + 42, { size: 9, weight: 700, color: C.faint, align: 'center', spacing: 1 });
    };
    drawPile(DECK_AT, this.deck.length, 'DECK');
    drawPile(DISCARD_AT, this.discard.length, 'PLAYED');
    ctx.restore();
  }

  drawCardBack(ctx) {
    const x = -CW / 2, y = -CH / 2;
    roundRectPath(ctx, x, y, CW, CH, 10);
    ctx.fillStyle = '#171219';
    ctx.fill();
    ctx.save();
    roundRectPath(ctx, x, y, CW, CH, 10);
    ctx.clip();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = halftone(ctx);
    ctx.fillRect(x, y, CW, CH);
    ctx.restore();
    ctx.strokeStyle = C.mustard;
    ctx.lineWidth = 2;
    roundRectPath(ctx, x, y, CW, CH, 10);
    ctx.stroke();
    ctx.strokeStyle = C.edge;
    ctx.lineWidth = 1.5;
    roundRectPath(ctx, x + 9, y + 9, CW - 18, CH - 18, 6);
    ctx.stroke();
    sparkle(ctx, 0, 0, 26, C.mustard, { alpha: 0.9 });
    sparkle(ctx, 0, 0, 11, '#171219');
    sparkle(ctx, x + 22, y + 22, 7, C.mustard, { alpha: 0.5 });
    sparkle(ctx, x + CW - 22, y + CH - 22, 7, C.mustard, { alpha: 0.5 });
  }

  drawHandSprites(ctx) {
    const active = this.state === 'choose';
    const order = this.sprites.map((_, i) => i)
      .sort((a, b) => {
        const pa = (this.drag && this.drag.i === a) ? 2 : (a === this.sel && active) ? 1 : 0;
        const pb = (this.drag && this.drag.i === b) ? 2 : (b === this.sel && active) ? 1 : 0;
        return pa - pb || a - b;
      });
    for (const i of order) {
      const s = this.sprites[i];
      const alpha = active ? (this.hintT > 0 && this.hintIdx !== i ? 0.55 : 1) : 0.4;
      const raised = active && (i === this.sel || (this.drag && this.drag.i === i));
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.scale(s.scale, s.scale);
      this.drawCardFace(ctx, s.card, {
        alpha, raised,
        matched: active && s.card.tag === this.obj().tag,
        key: i + 1,
        hinted: active && this.hintT > 0 && this.hintIdx === i,
      });
      ctx.restore();
    }
    // hint chevron over the suggested card
    if (active && this.hintT > 0 && this.sprites[this.hintIdx]) {
      const s = this.sprites[this.hintIdx];
      const bounce = Math.abs(Math.sin(this.tAll * 6)) * 12;
      const topY = s.y - (CH / 2) * s.scale;
      ctx.fillStyle = C.mustard;
      ctx.beginPath();
      ctx.moveTo(s.x - 15, topY - 30 - bounce);
      ctx.lineTo(s.x + 15, topY - 30 - bounce);
      ctx.lineTo(s.x, topY - 10 - bounce);
      ctx.fill();
    }
  }

  // Card face, drawn centered on the current transform.
  drawCardFace(ctx, c, o = {}) {
    const x = -CW / 2, y = -CH / 2;
    const tag = TAGS[c.tag];
    const rar = RARITY[c.rarity];
    ctx.save();
    ctx.globalAlpha *= (o.alpha == null ? 1 : o.alpha);

    if (o.raised) {
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 16;
    }
    const g = ctx.createLinearGradient(0, y, 0, y + CH);
    g.addColorStop(0, '#221c2a');
    g.addColorStop(0.4, '#191420');
    g.addColorStop(1, '#13101a');
    roundRectPath(ctx, x, y, CW, CH, 10);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.save();
    roundRectPath(ctx, x, y, CW, CH, 10);
    ctx.clip();
    // watermark
    drawTagIcon(ctx, c.tag, x + CW - 42, y + CH - 46, 40, tag.color, 0.09);
    // diagonal tag banner
    ctx.fillStyle = tag.color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + CW, y);
    ctx.lineTo(x + CW, y + 30);
    ctx.lineTo(x, y + 44);
    ctx.fill();
    ctx.save();
    ctx.globalAlpha *= 0.16;
    ctx.fillStyle = halftone(ctx);
    ctx.beginPath();
    ctx.moveTo(x + CW / 2, y);
    ctx.lineTo(x + CW, y);
    ctx.lineTo(x + CW, y + 30);
    ctx.lineTo(x + CW / 2, y + 37);
    ctx.fill();
    ctx.restore();
    drawTagIcon(ctx, c.tag, x + 17, y + 16, 8, C.ink);
    drawText(ctx, c.tag.toUpperCase(), x + 30, y + 8, { font: 'display', size: 15, color: C.ink, spacing: 2 });
    drawText(ctx, String(o.key || ''), x + 140, y + 7, { size: 10, weight: 700, color: C.ink });
    // everything decision-critical lives in the left column — the part of the
    // card that stays visible when the hand fans and overlaps
    wrap(ctx, c.name.toUpperCase(), 118, { font: 'display', size: 20 }).slice(0, 2).forEach((ln, k) =>
      drawText(ctx, ln, x + 13, y + 50 + k * 21, { font: 'display', size: 20, color: C.cream, spacing: 1 }));
    drawText(ctx, `+${c.charm}`, x + 13, y + CH - 46, { font: 'display', size: 34, color: C.mustard });
    const pipX = x + 13 + (String(c.charm).length + 1) * 17 + 8;
    for (let i = 0; i < rar.pips; i++) {
      sparkle(ctx, pipX + i * 14, y + CH - 24, 5.5, rar.color);
    }
    ctx.restore();

    // border: legendary shimmers, selection brightens
    let borderColor = C.edge;
    let borderW = 1.5;
    if (c.rarity === 'legendary') {
      const sh = 0.5 + 0.5 * Math.sin(this.tAll * 3);
      borderColor = sh > 0.5 ? C.mustard : '#f8dfa0';
      borderW = 2.5;
    } else if (o.raised) {
      borderColor = C.cream;
      borderW = 2;
    }
    roundRectPath(ctx, x, y, CW, CH, 10);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderW;
    ctx.stroke();

    if (c.rarity === 'legendary') {
      sparkle(ctx, x + 6, y + 6, 5, C.cream, { alpha: 0.5 + 0.5 * Math.sin(this.tAll * 4) });
      sparkle(ctx, x + CW - 6, y + CH - 70, 4, C.cream, { alpha: 0.5 + 0.5 * Math.sin(this.tAll * 4 + 2) });
    }
    if (o.matched) {
      const pulse = 0.55 + 0.45 * Math.sin(this.tAll * 6);
      ctx.save();
      ctx.globalAlpha *= pulse;
      roundRectPath(ctx, x - 6, y - 6, CW + 12, CH + 12, 13);
      ctx.strokeStyle = tag.color;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
      stamp(ctx, 'COUNTER', x + CW - 38, y - 4, { size: 11, bg: tag.color, rot: -0.12 });
    }
    if (o.hinted) {
      roundRectPath(ctx, x - 8, y - 8, CW + 16, CH + 16, 14);
      ctx.strokeStyle = C.mustard;
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  drawSession(ctx) {
    const e = this.enc;
    const t = this.t;
    rect(ctx, 0, 0, W, H, e.accent);
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = halftone(ctx);
    ctx.fillRect(W / 2, 0, W / 2, H);
    ctx.restore();

    const slide = easeOutExpo(clamp(t / 0.45, 0, 1));
    drawText(ctx, 'SESSION', -216 + slide * 280, 96, { font: 'display', size: 44, color: C.ink, spacing: 14 });
    drawText(ctx, String(e.session), 64, 120 + (1 - slide) * 60, { font: 'display', size: 230, color: C.ink, alpha: slide });

    const bandT = easeOutExpo(clamp((t - 0.45) / 0.4, 0, 1));
    if (bandT > 0) {
      rect(ctx, 0, 380, W, 160, C.ink, bandT);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 380, W, 160);
      ctx.clip();
      drawText(ctx, e.title, 64, 396 + (1 - bandT) * 60, { font: 'display', size: 60, color: C.cream, spacing: 2 });
      drawText(ctx, `${e.guest.toUpperCase()}  ·  ${e.place.toUpperCase()}`, 64, 472 + (1 - bandT) * 60, { size: 12, weight: 700, color: e.accent, spacing: 3 });
      ctx.restore();
    }
    if (t > 0.7) drawText(ctx, 'ENTER → SKIP', 924, 350, { size: 10, weight: 700, color: C.ink, align: 'right', spacing: 2, alpha: 0.65 });
  }

  drawWon(ctx) {
    const e = this.enc;
    const t = this.t;
    rect(ctx, 0, 0, W, H, C.ink, clamp(t / 0.25, 0, 1) * 0.96);
    if (t < 0.15) return;
    frame(ctx, 50, 34, 860, 472, C.cream, 1);
    frame(ctx, 56, 40, 848, 460, C.edge, 1);

    drawText(ctx, `SESSION ${e.session} — COMPLETE`, W / 2, 58, { size: 10, weight: 700, color: e.accent, align: 'center', spacing: 4 });
    const k = easeOutBack(clamp((t - 0.1) / 0.3, 0, 1));
    ctx.save();
    ctx.translate(W / 2, 124);
    ctx.scale(k, k);
    drawText(ctx, e.boss ? 'DEAL CLOSED.' : 'BOOKED.', 0, -46, { font: 'display', size: 92, color: e.boss ? C.mustard : C.cream, align: 'center', shadow: { color: e.accent, dx: 5, dy: 5 } });
    ctx.restore();

    wrap(ctx, e.winLine, 700, { size: 15, weight: 500, italic: true }).slice(0, 2).forEach((ln, i) =>
      drawText(ctx, ln, W / 2, 188 + i * 22, { size: 15, weight: 500, italic: true, color: C.dim, align: 'center' }));

    drawText(ctx, 'HOW YOU WON — STUDY THIS', 120, 244, { size: 10, weight: 700, color: C.faint, spacing: 3 });
    this.history.slice(-6).forEach((h, i) => {
      const y = 264 + i * 21;
      sparkle(ctx, 128, y + 8, 5, h.crit ? TAGS[h.card.tag].color : '#3a3342');
      drawText(ctx, h.card.name, 144, y, { size: 13, weight: h.crit ? 700 : 500, color: h.crit ? C.cream : C.dim });
      if (h.crit) drawText(ctx, `COUNTERED ${h.card.tag.toUpperCase()}`, 420, y + 2, { size: 9, weight: 700, color: TAGS[h.card.tag].color, spacing: 1 });
      drawText(ctx, `+${h.gained}`, 580, y - 4, { font: 'display', size: 21, color: h.crit ? C.mustard : C.dim, align: 'right' });
    });

    rect(ctx, 620, 250, 220, 100, C.panel);
    frame(ctx, 620, 250, 220, 100, C.edge, 1);
    drawText(ctx, 'TIPS EARNED', 632, 262, { size: 9, weight: 700, color: C.faint, spacing: 2 });
    drawText(ctx, `+${this.tipsEarned}`, 632, 274, { font: 'display', size: 42, color: C.mustard });
    drawText(ctx, `${this.turnsLeft} TURNS BANKED`, 632, 324, { size: 10, weight: 700, color: C.teal, spacing: 1 });

    rect(ctx, 120, 396, 720, 52, C.mustard);
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = halftone(ctx);
    ctx.fillRect(640, 396, 200, 52);
    ctx.restore();
    drawText(ctx, 'LESSON', 134, 410, { font: 'display', size: 24, color: C.ink });
    wrap(ctx, this.enc.lesson, 600, { size: 12, weight: 700 }).slice(0, 2).forEach((ln, i) =>
      drawText(ctx, ln, 218, 404 + i * 16, { size: 12, weight: 700, color: C.ink }));

    if (this.blink()) {
      const next = this.encIdx + 1 < ENCOUNTERS.length ? 'ENTER → NEXT GUEST' : 'ENTER → COLLECT YOUR STARS';
      drawText(ctx, next, 840, 472, { size: 12, weight: 700, color: C.mustard, align: 'right', spacing: 2 });
    }
  }

  drawLost(ctx) {
    rect(ctx, 0, 0, W, H, C.ink, clamp(this.t / 0.25, 0, 1) * 0.94);
    if (this.t < 0.15) return;
    frame(ctx, 170, 110, 620, 320, C.red, 2);
    const k = easeOutBack(clamp((this.t - 0.1) / 0.3, 0, 1));
    ctx.save();
    ctx.translate(W / 2, 196);
    ctx.scale(k, k);
    drawText(ctx, 'NO SALE.', 0, -40, { font: 'display', size: 80, color: C.red, align: 'center', shadow: { color: '#4a1812', dx: 5, dy: 5 } });
    ctx.restore();
    drawText(ctx, '"We\'ll think about it..."', W / 2, 252, { size: 16, weight: 500, italic: true, color: C.cream, align: 'center' });
    drawText(ctx, 'IN THIS BUSINESS, THAT MEANS: TRY AGAIN.', W / 2, 282, { size: 10, weight: 700, color: C.dim, align: 'center', spacing: 2 });
    drawText(ctx, `CHARM REACHED  ${this.charm} / ${this.enc.charmTarget}`, W / 2, 316, { font: 'display', size: 22, color: C.dim, align: 'center' });
    drawText(ctx, 'TIP — MATCH THE CARD TAG TO THE OBJECTION TAG FOR DOUBLE CHARM', W / 2, 352, { size: 10, weight: 700, color: C.teal, align: 'center', spacing: 1 });
    if (this.blink()) drawText(ctx, 'ENTER → CLOCK BACK IN', W / 2, 394, { font: 'display', size: 24, color: C.mustard, align: 'center', spacing: 2 });
  }

  drawStars(ctx) {
    rect(ctx, 0, 0, W, H, C.ink);
    drawText(ctx, 'LEVEL 03 — THE PITCH', W / 2, 92, { size: 11, weight: 700, color: C.mustard, align: 'center', spacing: 5 });
    drawText(ctx, 'SHIFT COMPLETE', W / 2, 106, { font: 'display', size: 80, color: C.cream, align: 'center', spacing: 3 });
    drawText(ctx, `BELLMAN ${PLAYER_NAME.toUpperCase()} — THREE FOR THREE ON THE SALES FLOOR`, W / 2, 196, { size: 11, weight: 700, color: C.dim, align: 'center', spacing: 2 });

    for (let i = 0; i < 3; i++) {
      const x = W / 2 - 110 + i * 110;
      if (i < this.starsShown) {
        const st = clamp((this.t - 0.6 - i * 0.55) / 0.3, 0, 1);
        const s = 1 + (1 - easeOutBack(st)) * 1.4;
        sparkle(ctx, x, 250, 38 * s, C.mustard, { rot: 0.2 - st * 0.2 });
      } else {
        sparkle(ctx, x, 250, 30, '#241f2b');
      }
    }

    drawText(ctx, `SCORE  ${this.runScore}`, W / 2, 320, { font: 'display', size: 40, color: C.cream, align: 'center', spacing: 2 });
    drawText(ctx, `BEST ${this.game.save.data.best.pitch}   ·   TURNS BANKED ${this.turnsBanked}   ·   TIPS ${this.game.save.data.tips}`, W / 2, 372, { size: 12, weight: 700, color: C.faint, align: 'center', spacing: 2 });
    drawText(ctx, 'FASTER CLOSES BANK MORE TURNS — 7 BANKED IS A 3-STAR SHIFT', W / 2, 396, { size: 10, weight: 500, color: C.faint, align: 'center', spacing: 1 });

    if (this.starsShown === this.starsEarned && this.starsEarned > 0) {
      const line = 'SEE YOU, SALES COWBOY...';
      const shown = line.slice(0, Math.floor(this.outroTyped));
      drawText(ctx, shown, 900, 480, { size: 14, weight: 500, italic: true, color: C.dim, align: 'right', spacing: 2 });
    }
    if (this.blink() && this.t > 0.6 + this.starsEarned * 0.55 + 0.3) {
      drawText(ctx, this.career.label, W / 2, 440, { size: 12, weight: 700, color: C.mustard, align: 'center', spacing: 2 });
    }
  }

  drawHowTo(ctx) {
    rect(ctx, 0, 0, W, H, C.ink);
    rect(ctx, 0, 60, W, 4, C.mustard);
    drawText(ctx, 'LEVEL 03', W / 2, 84, { size: 11, weight: 700, color: C.mustard, align: 'center', spacing: 5 });
    drawText(ctx, 'HOW TO PLAY — THE PITCH', W / 2, 98, { font: 'display', size: 58, color: C.cream, align: 'center', spacing: 2 });
    const rules = [
      'A guest raises an OBJECTION — read its colored tag.',
      'Play a pitch card with the MATCHING tag to counter it for DOUBLE charm.',
      'Drag cards to rearrange your hand. Drag one up — or click it — to play.',
      'Fill the meter before turns run out. Between pitches, pick the better line.',
      'Helpful wins. Pushy loses. Always.',
    ];
    rules.forEach((ln, i) => drawText(ctx, ln, W / 2, 192 + i * 28, { size: 15, weight: 500, color: i === 4 ? C.mustard : C.cream, align: 'center' }));

    Object.keys(TAGS).forEach((t, i) => {
      const x = W / 2 - 270 + i * 180;
      stamp(ctx, t.toUpperCase(), x, 360, { size: 15, bg: TAGS[t].color, rot: i % 2 ? 0.06 : -0.06 });
      drawTagIcon(ctx, t, x - 0, 392, 11, TAGS[t].color);
    });

    drawText(ctx, '←/→ OR MOUSE PICK   ·   ENTER OR CLICK PLAY   ·   1-4 QUICK-PLAY   ·   H HINT   ·   M MUTE   ·   P PAUSE', W / 2, 420, { size: 10, weight: 700, color: C.faint, align: 'center', spacing: 2 });
    if (this.blink()) drawText(ctx, 'ENTER → MEET YOUR FIRST GUEST', W / 2, 458, { font: 'display', size: 26, color: C.mustard, align: 'center', spacing: 3 });
  }
}
