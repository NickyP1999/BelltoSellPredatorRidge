import { drawText, wrap, rect, frame, clamp, lerp, pointIn, shuffle } from '../util.js';
import { C, easeOutCubic, easeOutExpo, easeOutBack, halftone, sparkle, speedlines, stamp } from '../theme.js';
import { ENCOUNTERS, TAGS, RARITY } from '../data/cards.js';
import { PLAYER_NAME } from '../config.js';

const W = 960, H = 540;
const HAND = { x: 36, y: 366, cw: 210, ch: 156, gap: 16 };
const PORT = { x: 36, y: 104, w: 170, h: 148 };
const SPEECH = { x: 230, y: 104, w: 694, h: 148 };
const PREV = { x: 36, y: 268, w: 888, h: 88 };
const STAMP_AT = { x: 577, y: 180 };

function handRect(i, lifted) {
  return { x: HAND.x + i * (HAND.cw + HAND.gap), y: HAND.y - (lifted ? 14 : 0), w: HAND.cw, h: HAND.ch };
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
    // shoulders
    ctx.fillStyle = look.shirt;
    ctx.beginPath();
    ctx.moveTo(cx - 44 * s, base);
    ctx.quadraticCurveTo(cx, base - 34 * s, cx + 44 * s, base);
    ctx.fill();
    // neck + head
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
    // hair
    ctx.fillStyle = look.hair;
    ctx.beginPath();
    ctx.moveTo(cx - 22 * s, hy + 26 * s);
    ctx.quadraticCurveTo(cx - 24 * s, hy - 6 * s, cx, hy - 5 * s);
    ctx.quadraticCurveTo(cx + 24 * s, hy - 6 * s, cx + 22 * s, hy + 26 * s);
    ctx.lineTo(cx + 14 * s, hy + 12 * s);
    ctx.quadraticCurveTo(cx, hy + 4 * s, cx - 14 * s, hy + 12 * s);
    ctx.fill();
    // face
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
    this.particles = [];
    this.floaters = [];
    this.startEncounter(0);
    if (!this.game.save.data.seenHowTo.pitch) this.state = 'howto';
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
    this.feedback = null;
    this.state = 'session';
    this.t = 0;
    this.tMeet = 0;
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
    for (let i = 0; i < 4; i++) {
      const c = this.hand[i];
      if (!c) continue;
      if (c.tag === this.obj().tag && (best < 0 || c.charm > this.hand[best].charm)) best = i;
    }
    if (best < 0) {
      for (let i = 0; i < 4; i++) {
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

  playCard(idx) {
    const c = this.hand[idx];
    if (!c) return;
    const o = this.obj();
    const r = handRect(idx, this.sel === idx);
    this.pending = {
      card: c, crit: c.tag === o.tag,
      gained: c.tag === o.tag ? c.charm * 2 : c.charm,
      slot: idx, from: { x: r.x + r.w / 2, y: r.y + r.h / 2 },
      hit: false,
    };
    this.discard.push(c);
    this.hand[idx] = this.drawFromDeck();
    this.playsMade++;
    this.turnsLeft--;
    this.hintT = 0;
    this.game.audio.ride();
    this.state = 'resolve';
    this.t = 0;
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

  update(dt) {
    this.tAll += dt;
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    this.t += dt;
    this.tMeet += dt;
    this.shake = Math.max(0, this.shake - dt * 1.8);
    this.flash = Math.max(0, this.flash - dt * 4);
    this.hintT = Math.max(0, this.hintT - dt);
    this.charmShown += (this.charm - this.charmShown) * Math.min(1, dt * 7);
    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 540 * dt; p.rot += p.vr * dt;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
    for (const f of this.floaters) { f.t += dt; f.y -= 34 * dt; }
    this.floaters = this.floaters.filter((f) => f.t < 1);

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
        if (this.t > 1.7 || (confirm && this.t > 0.3)) { this.state = 'meet'; this.t = 0; this.tMeet = 0; }
        break;

      case 'meet':
        if (confirm && this.t > 0.3) { this.typed = 0; this.state = 'objection'; this.t = 0; }
        break;

      case 'objection': {
        const len = this.obj().text.length;
        if (this.typed < len) {
          this.typed += dt * 55;
          if ((anyKey || p.clicked) && this.t > 0.15) this.typed = len;
        } else if (this.t > 0.3) {
          this.state = 'choose';
        }
        break;
      }

      case 'choose': {
        const hb = this.hintBtn();
        if (inp.pressed.has('KeyH') || (p.clicked && pointIn(p, hb.x, hb.y, hb.w, hb.h))) {
          this.hintIdx = this.hintTarget();
          this.hintT = 2.4;
          this.game.audio.ride();
          if (p.clicked) break;
        }
        if (inp.pressed.has('ArrowLeft')) { this.sel = (this.sel + 3) % 4; this.game.audio.ride(); }
        if (inp.pressed.has('ArrowRight')) { this.sel = (this.sel + 1) % 4; this.game.audio.ride(); }
        for (let i = 0; i < 4; i++) {
          const r = handRect(i, this.sel === i);
          if (pointIn(p, r.x, r.y, r.w, r.h)) {
            if (this.sel !== i) { this.sel = i; this.game.audio.ride(); }
            if (p.clicked) { this.playCard(i); return; }
          }
          if (inp.pressed.has('Digit' + (i + 1))) { this.playCard(i); return; }
        }
        if (inp.pressed.has('Enter') || inp.pressed.has('Space')) this.playCard(this.sel);
        break;
      }

      case 'resolve':
        if (!this.pending.hit && this.t >= 0.16) this.applyImpact();
        if (this.t > 1.2) this.finishResolve();
        break;

      case 'beat': {
        const len = this.beat.prompt.length;
        if (this.typed < len) {
          this.typed += dt * 60;
          if ((anyKey || p.clicked) && this.t > 0.15) this.typed = len;
          break;
        }
        for (let i = 0; i < 2; i++) {
          const b = this.beatBox(i);
          if (p.clicked && pointIn(p, b.x, b.y, b.w, b.h)) { this.pickBeat(i); return; }
        }
        if (inp.pressed.has('KeyA') || inp.pressed.has('Digit1')) this.pickBeat(0);
        else if (inp.pressed.has('KeyB') || inp.pressed.has('Digit2')) this.pickBeat(1);
        break;
      }

      case 'beatResolve':
        if (this.t > 1.4) { this.feedback = null; this.nextObjection(); }
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

    // ── Header: title block left, turn counter right, guest dots under the title
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
      if (this.blink()) drawText(ctx, 'ENTER → START THE PITCH', SPEECH.x + SPEECH.w - 18, SPEECH.y + SPEECH.h - 24, { size: 11, weight: 700, color: C.mustard, align: 'right', spacing: 2 });
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
        drawText(ctx, tag.hint, SPEECH.x + SPEECH.w - 18, SPEECH.y + 46, { size: 10, color: tag.color, align: 'right', italic: true });
      }
    }

    // ── Mid zone: card preview / beat choices / feedback
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
        const s = lerp(1, 0.5, flyT);
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(-0.1 * flyT);
        ctx.scale(s, s);
        rect(ctx, -HAND.cw / 2, -HAND.ch / 2, HAND.cw, HAND.ch, C.panel);
        frame(ctx, -HAND.cw / 2, -HAND.ch / 2, HAND.cw, HAND.ch, RARITY[pd.card.rarity].color, 2);
        drawText(ctx, pd.card.name.toUpperCase(), 0, -10, { font: 'display', size: 22, color: C.cream, align: 'center' });
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

    // ── Hand
    const active = this.state === 'choose';
    for (let i = 0; i < 4; i++) {
      const c = this.hand[i];
      if (!c) continue;
      const isSel = active && this.sel === i;
      const r = handRect(i, isSel);
      let alpha = active ? 1 : 0.3;
      if (this.state === 'resolve' && this.pending && this.pending.slot === i) {
        if (this.t < 0.5) continue; // slot stays empty while the played card flies
        alpha = clamp((this.t - 0.5) / 0.4, 0, 1) * 0.3;
      }
      const hinted = active && this.hintT > 0 && this.hintIdx === i;
      if (active && this.hintT > 0 && !hinted) alpha *= 0.55;
      this.drawCard(ctx, c, r, { sel: isSel, alpha, matched: active && c.tag === this.obj().tag, key: i + 1 });
      if (hinted) {
        const bounce = Math.abs(Math.sin(this.tAll * 6)) * 10;
        const cx = r.x + r.w / 2;
        ctx.fillStyle = C.mustard;
        ctx.beginPath();
        ctx.moveTo(cx - 14, r.y - 26 - bounce);
        ctx.lineTo(cx + 14, r.y - 26 - bounce);
        ctx.lineTo(cx, r.y - 8 - bounce);
        ctx.fill();
        frame(ctx, r.x - 7, r.y - 7, r.w + 14, r.h + 14, C.mustard, 3);
      }
    }

    if (active) {
      drawText(ctx, '←/→ PICK   ·   ENTER PLAY   ·   1-4 QUICK   ·   OR CLICK', W / 2, 530, { size: 10, weight: 500, color: C.faint, align: 'center', spacing: 2 });
    }
  }

  drawCard(ctx, c, r, { sel, alpha, matched, key }) {
    const rar = RARITY[c.rarity];
    const tag = TAGS[c.tag];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    if (sel) {
      ctx.rotate(-0.015);
      ctx.scale(1.04, 1.04);
      ctx.shadowColor = 'rgba(0,0,0,0.65)';
      ctx.shadowBlur = 26;
      ctx.shadowOffsetY = 12;
    }
    const x = -r.w / 2, y = -r.h / 2;

    rect(ctx, x, y, r.w, r.h, sel ? '#1c1721' : '#17131c');
    ctx.shadowColor = 'transparent';
    frame(ctx, x, y, r.w, r.h, c.rarity === 'legendary' ? C.mustard : sel ? C.cream : C.edge, c.rarity === 'legendary' ? 2 : 1);

    // diagonal tag banner
    ctx.fillStyle = tag.color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + r.w, y);
    ctx.lineTo(x + r.w, y + 30);
    ctx.lineTo(x, y + 44);
    ctx.fill();
    ctx.save();
    ctx.globalAlpha = 0.16 * alpha;
    ctx.fillStyle = halftone(ctx);
    ctx.beginPath();
    ctx.moveTo(x + r.w / 2, y);
    ctx.lineTo(x + r.w, y);
    ctx.lineTo(x + r.w, y + 30);
    ctx.lineTo(x + r.w / 2, y + 37);
    ctx.fill();
    ctx.restore();
    drawText(ctx, c.tag.toUpperCase(), x + 10, y + 7, { font: 'display', size: 15, color: C.ink, spacing: 2 });
    drawText(ctx, String(key), x + r.w - 10, y + 6, { size: 10, weight: 700, color: C.ink, align: 'right' });

    // name
    wrap(ctx, c.name.toUpperCase(), r.w - 24, { font: 'display', size: 23 }).slice(0, 2).forEach((ln, k) =>
      drawText(ctx, ln, x + 12, y + 54 + k * 24, { font: 'display', size: 23, color: C.cream, spacing: 1 }));

    // charm value
    drawText(ctx, `+${c.charm}`, x + r.w - 10, y + r.h - 50, { font: 'display', size: 42, color: C.mustard, align: 'right' });

    // rarity pips
    for (let i = 0; i < rar.pips; i++) {
      sparkle(ctx, x + 16 + i * 16, y + r.h - 18, 6, rar.color);
    }

    if (matched) {
      const pulse = 0.55 + 0.45 * Math.sin(this.tAll * 6);
      ctx.globalAlpha = alpha * pulse;
      frame(ctx, x - 5, y - 5, r.w + 10, r.h + 10, tag.color, 2);
      ctx.globalAlpha = alpha;
      stamp(ctx, 'COUNTER', x + r.w - 38, y - 4, { size: 11, bg: tag.color, rot: -0.12 });
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
      'Any card still lands its base charm. Fill the meter before turns run out.',
      'Between pitches, pick the better line in conversation.',
      'Helpful wins. Pushy loses. Always.',
    ];
    rules.forEach((ln, i) => drawText(ctx, ln, W / 2, 192 + i * 28, { size: 15, weight: 500, color: i === 4 ? C.mustard : C.cream, align: 'center' }));

    Object.keys(TAGS).forEach((t, i) => {
      stamp(ctx, t.toUpperCase(), W / 2 - 270 + i * 180, 360, { size: 15, bg: TAGS[t].color, rot: i % 2 ? 0.06 : -0.06 });
    });

    drawText(ctx, '←/→ OR MOUSE PICK   ·   ENTER OR CLICK PLAY   ·   1-4 QUICK-PLAY   ·   H HINT   ·   M MUTE   ·   P PAUSE', W / 2, 408, { size: 10, weight: 700, color: C.faint, align: 'center', spacing: 2 });
    if (this.blink()) drawText(ctx, 'ENTER → MEET YOUR FIRST GUEST', W / 2, 452, { font: 'display', size: 26, color: C.mustard, align: 'center', spacing: 3 });
  }
}
