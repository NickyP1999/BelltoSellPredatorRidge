# BELL TO SELL — A Predator Ridge Career Game
### Design Spec v3 — June 11, 2026

> **v3.1 ACCURACY CORRECTIONS (June 12, 2026 — from Nico, override everything below):**
> There is **no valet service** at Predator Ridge; bellmen strictly shuttle. Level 2 is
> **SHUTTLE PRECISION** — backing the resort's **GMC Yukon XL** (not "Denali") into tight
> bays at real stops. Real shuttle destinations: the Lodge, Sparkling Hill (Yukon run),
> Field Glass, Affinity, Falcon Point, Vista, Peregrine Cottages. "Portico" is not a
> term used at the resort. Job title: Bellman. Target: Sales Assistant Real Estate; the
> building is the **Real Estate Sales Office** (it sells **Ellison Landing** homes — a
> NEW development), genuinely close to the Lodge. Nico started at Predator Ridge in
> **May 2026**. Authentic detail (canon): bellmen stock
> every room with **two Ellison Landing–branded water bottles** — referenced in the
> finale letter. Any "Denali" or "valet" wording below is historical.

Supersedes the draft in `Downloads\predator-ridge-game-spec.md`. Everything in that draft
still applies unless changed here. Player name: **Nico**.

## v3 — the whole game (June 11, 2026)

**Purpose, stated plainly:** every screen argues that Nico has earned a promotion to
**Sales Assistant — Real Estate** at the Ellison Landing Sales Centre. Each level is a
competency: L1 = grace under pressure, L2 = precision & care, L3 = consultative selling.
The finale is the promotion letter from Management making that case in writing.

**Career flow (5–10 minute full run, playable mid-shift):** levels run left to right —
Luggage Rush → Valet Precision → The Pitch — each unlocking the next, each ~1–3 minutes,
with instant retries and skippable intro cards. Star ceremonies chain straight into the
next shift. Finishing all three unlocks the promotion meeting (stars are the replay
chase, not a gate). All minigames also *move* left→right: the cart rolls right, the
Denali starts left and parks right, the bellman walks left→right into the finale.

- **L1 Luggage Rush (built, two legs):** Leg 1 — side-scrolling balance run through the
  lobby: bags drop from the bell rail at marked spots; off-centre catches and speed
  changes tip the stack (inverted-pendulum lean physics); auto-doors cycle, guests
  cross, wet floor punishes speed; reach the service exit before the clock. Leg 2 —
  **the Cottage Run**: the player drives the Porsche NXT cart (bags visible in the
  cargo box) out to Peregrine Cottages; bumps launch the box and pop bags overboard
  above the safe speed, sprinklers soak speeders, and the marmot has right of way.
  Score = bags delivered + banked time across both legs.
- **L2 Valet Precision (built):** top-down bicycle-model driving with true reverse
  articulation. Three rounds, tighter stalls; reverse in rear-first; angle + centering +
  par time scored per round; 3 bumps resets a round; the wandering dog triggers an
  auto-brake (+2s) — the dog can never be hit.
- **L3 The Pitch (built, v3 fixes):** objections are now guaranteed counterable from the
  current hand (`ensureMatchableObjection`); **HINT button (H or click)** dims the hand
  and points at the best card; golf dialogue corrected — carts are included with every
  round at Predator Ridge; HUD respaced (turns/guest/charm cluster).
- **Finale (built):** sunset walk Lodge → Sales Centre, then the letter: the three
  competencies, the promotion to Sales Assistant — Real Estate, a slammed PROMOTED
  stamp, and New Game+ pointing back at the 9-star chase.

**Deploy:** Vite build with relative base; Vercel auto-detects (output `dist/`); GitHub
Pages workflow in `.github/workflows/pages.yml`. Repo: `BelltoSellPredatorRidge`.

## What changed in v2 (decisions with Nico, June 10 2026)

| Decision | Answer |
|---|---|
| Primary audience | **Management demo** — a 5-minute wow piece supporting the Bell→Sell promotion case |
| Demo device | **Laptop / big screen** — keyboard + mouse polish first; touch stays supported |
| Timeline | **2–3 weeks** to a showable build (≈ end of June 2026) |
| Real vehicles | **Both**: featured in levels AND upgradeable. Valet SUV = **GMC Yukon Denali XL**; the **Porsche NXT cart with cargo box** gets its own outdoor delivery phase |
| Meta-progression | All four systems, phased: tips + upgrades, pitch-card collection, Daily Shift + streak, Guest Book |
| Sales angle | **Full training tool** — recap screens after each duel show the best lines and why they worked |
| Tone | Light insider humor (bellman-life jokes, real place names; nothing about real coworkers) |

## Engagement design — why this should feel like a top mobile game

These are the systems that make the best mobile games sticky, mapped onto this game.
Build Phase 1 items for the demo; Phase 2 items right after.

1. **The bell is the dopamine engine** *(Phase 1, built)* — one signature synthesized
   brass-bell SFX for every scoring event. Combo streaks raise its pitch. The promotion
   gets a triple ding. Players should hear progress.
2. **Short loops, instant retry** *(Phase 1, built)* — every encounter/level under ~90s,
   fail screens restart in one keypress ("clock back in"), zero menu friction.
3. **Near-miss engineering** *(Phase 1)* — tune thresholds so most failures are *almost*
   wins: charm at 92/100, elevator doors at 95% closed, stall alignment off by a hair.
   Near-misses drive "one more run" harder than wins do. Add slow-mo on the luggage
   stack's tipping point in L1.
4. **Star ceremony** *(Phase 1, built)* — staged star reveal with bell pitch-ups; always
   show the gap to the next star ("7 banked turns is a 3-star shift") — unfinished
   business pulls replays.
5. **Tips economy** *(Phase 1 counter built; Pro Shop Phase 1.5)* — performance → tips →
   Pro Shop upgrades that make older levels easier to 3-star: grippy cart wheels, bungee
   straps (one free drop), Denali XL parking sensors, espresso (+time), plus cosmetics
   (Denali paint, NXT cart skins, uniform colors).
6. **Pitch card collection** *(Phase 2)* — start with a basic deck, unlock rares by
   winning; SPECULATION TAX EXEMPT is the legendary with a crit animation. Rarity frames
   are cheap to draw and feel huge.
7. **Guest Book** *(Phase 1, built)* — every charmed guest gets a page with the line that
   won them. Collection hook AND Nico's real-life objection-handling study guide.
8. **VIP variable rewards** *(Phase 2)* — rare random spawns: golden suitcase (2× tips),
   a celebrity's Denali needing white-glove parking, a "hot lead" worth double charm.
9. **Daily Shift + perfect attendance streak** *(Phase 2)* — one modifier challenge per
   day (rain day → SIM Lounge cards crit; conference day → double luggage) with a
   punch-card streak calendar and one "sick day" token to protect a streak.
10. **Endowed progress** *(Phase 1, built)* — promotion track starts with ORIENTATION ✓
    pre-checked; people finish bars that are already started.
11. **Ghost replays + share card** *(Phase 2)* — race your own ghost in Valet; shareable
    promotion-letter PNG ("Nico — promoted, 9/9 stars") for the staff group chat.
12. **Juice checklist** *(Phase 1, ongoing)* — screenshake on crits (built), hit-stop on
    perfect parks, confetti on bookings, typewriter dialogue (built), blinking prompts.

## Vehicles

- **Level 2 (Valet Precision):** the SUV is a black **GMC Yukon Denali XL** — extended
  wheelbase makes tight stalls comedy and challenge at once.
- **Level 1 (Luggage Rush) Phase C — "Cottage Run":** after the lobby run, load the
  **Porsche NXT cart (cargo box on the back)** and drive luggage out the cart paths to
  Peregrine Cottages / Falcon Point: bumps bounce the box (physics carryover), sprinkler
  arcs, a wandering marmot. Box stability upgrades come from the Pro Shop.
- Both vehicles get cosmetic skins (tips) in Phase 1.5+.

## Level 3 — The Pitch (BUILT, v0.1)

As specified in v1 (charm meter, 4-card hand, tag counters Price/Time/Skepticism/
Indecision, 2-choice dialogue beats, real verified facts) plus:

- **Training recaps:** win screen lists every line played, which ones countered, and a
  LESSON line per encounter (listen → match → pitch → small next step).
- **Combo streaks:** consecutive counters raise bell pitch and show STREAK ×n.
- **Card line preview:** selecting a card shows the exact sentence Nico would say — the
  game literally rehearses real lines.
- Encounters: Marisol & Dev (RANGE dinner), Gord (second round, Predator→Ridge),
  The Albrights (Ellison Landing boss, charm target 110, legendary tax-exempt card).
- Stars: by total banked turns across all three wins (≥7 = 3★, ≥4 = 2★, win = 1★).

**Verified facts (June 2026) — keep wording, never invent claims:** RANGE globally
inspired menu, locally sourced, Okanagan wines, 130+ seat patio; two 18-hole championship
courses (Predator + Ridge), practice facility, golf academy, SIM Lounge with Foresight
simulators; Ellison Landing custom homes from $1.4M, Woodside (borders Ellison Provincial
Park), Vale (final golf-front homes on Ridge 7th fairway), 75+ km trails, exempt from
BC Speculation and Vacancy Tax, 1,000+ community events/yr, Ritz-Carlton Residences
coming (first in Western Canada), 10 min Vernon / ~30 min Kelowna Intl, wineries nearby;
flavor: Pallino's Italian Bistro, Commonage Market, fitness centre, tennis/pickleball,
winter rink.

## Build phases

**Phase 1 — demo build (target: end of June 2026)**
1. ~~Scaffold: Vite, scene manager, input, integer-scaled canvas, save, audio~~ ✓
2. ~~The Pitch v0.1: 3 encounters, beats, recaps, stars, Guest Book, tips~~ ✓
3. Level 2 Valet Precision (Denali XL kinematics, 3 rounds, dog auto-brake)
4. Level 1 Luggage Rush (Matter.js stack + lobby run + NXT cart Cottage Run)
5. Hub polish (resort map art), finale promotion cutscene + letter
6. Near-miss tuning pass + juice pass + Pro Shop v1 (3–4 upgrades)
7. Touch controls verification (mobile works, laptop is priority)

**Phase 2 — retention build (post-demo)**
Daily Shift + streaks, card unlock progression, VIP events, ghosts, share card,
New Game+ ("Employee of the Month" prestige loop).

## Art direction (v2.1 — replaced pixel art, June 10 2026)

**Jazz-noir anime.** Flat color blocking, halftone dot fields, film grain + vignette,
hard offset shadows, big condensed type, rotated stamp chips, episode-style "SESSION n"
title cards per encounter, sparkle-star motif everywhere (stars, rarity pips, particles).
Inspired by 90s anime title cards and Saul Bass posters — **all artwork original,
nothing copied** (no characters, logos, or assets from any show).

- **Palette:** ink `#0e0c10`, panel `#16131a`, cream `#f2e9d8`, mustard `#f2b63a`,
  red `#d94f30`, teal `#3fb8a8`, violet `#9b6fd1`. Tag colors: Price=mustard,
  Time=teal, Skepticism=red, Indecision=violet. Encounter accents: red/teal/mustard.
- **Type:** Bebas Neue (display, tracked caps) + Space Grotesk (UI/body, 400/500/700),
  bundled via @fontsource so the demo works offline. Synthetic italic for quotes.
- **Resolution:** 960×540 logical canvas, DPR-aware scaling → renders native-sharp on
  a 1080p monitor (the demo target). **F = fullscreen** for the presentation.
- **Juice systems (built):** card hover lift/tilt/shadow, card-fly on play, hit-stop on
  crits, COUNTERED slam stamps with screen flash + speedlines + sparkle particle bursts,
  charm-bar floaters, pulsing match ring + COUNTER stamp on counter-cards, slam-in
  feedback stamps on dialogue beats, staged star ceremony, typewriter outro card
  ("SEE YOU, SALES COWBOY..."), film grain + vignette over every frame.
- **Audio identity:** brass bell = scoring (pitch rises with streaks), jazz brass stabs
  (dom7 sawtooth + noise breath) = drama, brushed ride/snare noise = UI, bass thump =
  errors. All synthesized in WebAudio.

## Tech

Vanilla JS ES modules + Vite, Canvas 2D (no framework), Matter.js for L1 only,
localStorage saves, WebAudio synth SFX, 60fps target (measured ~0.2ms/frame CPU at
1080p for The Pitch), pause + mute, How-to-Play overlay per level.

## File structure (current)

```
/src
  main.js            // boot, loop, input, DPR scaling, fullscreen, pause/mute, film pass
  config.js          // PLAYER_NAME = 'Nico'
  save.js            // localStorage wrapper
  audio.js           // synthesized bell/stab/ride/snare/thump SFX
  util.js            // text engine (fonts, tracking, wrap), rect/frame helpers
  theme.js           // palette, easings, grain/vignette/halftone, sparkle, stamps, speedlines
  scenes/hub.js      // poster wall, promotion track, Guest Book
  scenes/pitch.js    // Level 3 (built): sessions, duels, beats, recaps, stars
  data/cards.js      // encounters, objections, pitch cards (verified facts)
index.html
SPEC.md              // this file
```
