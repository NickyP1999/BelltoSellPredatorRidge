# BELL TO SELL — Game Design Document
### v1.0 · June 12, 2026 · Living document — the polish loop works from the backlog at the bottom

---

## 1. Vision

**A 10-minute jazz-noir career game that proves, without saying it out loud, that Nico is
already doing sales work — so the person playing it finishes thinking "why isn't this
guy at the Real Estate Sales Office yet?"**

## 2. The real-world objective (this shapes every decision)

| Question | Answer | Design consequence |
|---|---|---|
| Who is it for, first? | **Nico's direct supervisor** | The game must be *forwardable ammunition*: a clean URL, instantly impressive, easy for the supervisor to show their own boss with pride. Professional polish > inside jokes. |
| What doubt does it beat? | **"Too junior / not yet"** | The existence and quality of the game IS the argument: initiative, follow-through, readiness. The career arc dramatizes growth → ready *now*. |
| How direct is the ask? | **Stays in fiction, always** | No real names, no meta "hire me" screens. The fictional promotion letter is the ending. Nico makes the real ask in person, after. |
| Who holds the keyboard? | **The manager plays it themselves** | THE critical constraint: forgiving difficulty, world-class onboarding, and **no dead ends** — a playtester who fumbles must still reach the promotion letter inside 10 minutes, feeling clever, never embarrassed. |

## 3. Design pillars

1. **The game is the résumé.** Every screen is evidence of care. One typo or broken state
   undermines the entire argument.
2. **Never strand the player.** Failure costs score, never progress. A first-timer who
   plays badly still completes the career and reads the letter. (See §7.)
3. **Teach once, then trust.** One How-to per level, one-time hand tutorial line, hint
   button always available — then get out of the way.
4. **Helpful beats pushy** — the sales philosophy is the moral of the game and the tone
   of every line of dialogue. Losing lines are always the pushy ones.
5. **Left to right, always forward.** Career order, level motion, and UI reading
   direction all move the same way the story does: toward the Sales Office.

## 4. The 10-minute arc

| Minute | Beat | Feeling |
|---|---|---|
| 0:00 | Title slab + ENTER → CLOCK IN | "Oh, this is real." |
| 0:30 | Hub: three posters, one pulsing CTA | Oriented in seconds |
| 1:00–2:30 | **Shift 1 — Luggage Rush** (lobby balance + NXT cart cottage run) | Slapstick pressure, first stars |
| 2:30–5:00 | **Shift 2 — Shuttle Precision** (Yukon XL, 3 stops) | Skill expressed, dog laughed at |
| 5:00–8:30 | **Shift 3 — The Pitch** (3 card duels) | "This is actual sales technique" |
| 8:30–9:30 | Finale: NXT cart sunset drive → the letter → PROMOTED stamp | The case lands |
| 9:30+ | Hub: golden replay state, Guest Book, 9-star chase | Wants another run |

Skips everywhere; an experienced run is ~6 minutes; a fumbling first run must still fit ~10.

## 5. What each level proves (the competency map)

| Level | Skill on display | The supervisor should think |
|---|---|---|
| Luggage Rush | Grace under pressure | "He keeps his head when it's chaos." |
| Shuttle Precision | Precision with guests aboard | "He can put the Yukon XL anywhere." |
| The Pitch | Listen → match → close, honestly | "He already sells the way we want selling done." |
| The whole game | Initiative, follow-through, polish | "He built this on his own. He's ready." |

## 6. Content guardrails (hard rules)

> **✅ §A ANSWERED (June 12, 2026):** No valet exists — Level 2 rebuilt as **SHUTTLE
> PRECISION** (backing the resort's **GMC Yukon XL** into tight bays; stops: Lodge →
> Falcon Point → Sparkling Hill run). Real shuttle destinations: Lodge, Sparkling Hill,
> Field Glass, Affinity, Falcon Point, Vista, Peregrine Cottages. Never say "Denali",
> "valet", or "portico". Canon detail: bellmen stock every room with two Ellison
> Landing–branded water bottles (now in the finale letter). §B–F of
> `ACCURACY-QUESTIONS.md` still await answers.

- **Facts are sacred.** Pitch cards use only facts Nico has personally confirmed
  (full audit June 12, 2026 — see `ACCURACY-QUESTIONS.md`): RANGE (globally inspired,
  locally sourced, Okanagan wines, 130+ seat patio with valley + Predator-course views),
  two very different championship courses + academy + practice facility, Pallino's
  (best pizza in the Okanagan — Nico's words), Commonage Market (quick bites +
  groceries), Ellison Landing (NEW development, custom homes from $1.4M, Woodside
  borders Ellison Provincial Park, Vale = final Ridge-7th fairway homes, 75+ km trails,
  Speculation & Vacancy Tax exempt, **20 min** Vernon / ~30 min YLW, wineries nearby,
  tennis/pickleball). **Banned (Nico couldn't verify): SIM Lounge/Foresight,
  Ritz-Carlton, 1,000+ events/yr, skating rink, "pay double in the city" wine pricing.
  Never invent claims, prices, or discounts.**
- **Carts are always included with golf rounds.** (Corrected once; never regress.)
- **No invented place names.** "Portico Loop" was a mistake; real names or generic
  descriptors only ("Lodge Valet").
- **Humor:** light bellman-life insider jokes (doors, wet floors, the marmot's right of
  way). Never about real coworkers. Never at a guest's expense.
- **Audience lock (Nico, June 12):** the game is for management only — the title screen
  and README carry "CONFIDENTIAL — FOR PREDATOR RIDGE MANAGEMENT ONLY · NOT TO BE SHARED
  OUTSIDE MANAGEMENT." Never remove it; never add public-sharing features (social links,
  public leaderboards).
- **Voice:** the player character is warm, competent, never sarcastic to guests.
  No fourth-wall winks — "SALES COWBOY" was cut by Nico (June 12); the pitch outro is
  now the in-fiction "WORD TRAVELS FAST AT THE SALES OFFICE..."

## 7. Graceful failure — REQUIRED for manager-play (✅ implemented June 12, 2026)

Target behavior — failure reduces score, never repeats content:

| Today | Target |
|---|---|
| Luggage timer expires → full restart | Leg ends where you are; deliver what you carry; reduced score; career continues |
| Valet 3 bumps → round resets | Round ends, scored low ("the guest noticed"); next round starts |
| Pitch turns run out → retry encounter | One automatic "second wind" (+2 turns, once per duel); if lost again, guest leaves warmly, 0 charm banked, career continues |
| Stars gate nothing (already true) | Keep: stars are the replay chase, never a wall |

Retry stays available for players who *want* to chase stars — but it becomes a choice,
not a sentence.

## 8. Difficulty spec for first-time manager hands (backlog P0)

- Luggage: lean limit +20%, lean feedback earlier (meter pulses at 60%), drop forgiveness
  (first drop in a run costs no points, "happens to everyone" toast).
- Cottage Run: safe speed raised 190 → 215; first overspeed bump warns instead of costs.
- Valet: par times +5s across rounds; bump 1 is free ("close one"); auto-brake unchanged.
- Pitch: unchanged (hint + guaranteed counters already carry novices) — but second-wind
  rule from §7.
- All How-to screens: max 6 lines, lead with controls, end with the goal.

## 9. Systems reference (as built)

- **Charm duels:** 4-card sprung hand (drag to rearrange, drag-up/click/keys to play),
  tag-counter crits ×2, guaranteed counterable objections, hint (H), beats every 2 plays,
  turns banked → stars (≥7/3★, ≥4/2★), targets 100/100/110.
- **Economy:** tips accrue from all levels (display + Guest Book pride; Pro Shop is
  post-promotion backlog). Stars: per-level best, 9 total chase. Guest Book: best line
  per charmed guest, unread badge, doubles as a real objection-handling cheat sheet.
- **Saves:** localStorage v1 (stars, bests, tips, guestBook, bookSeen, seenHowTo, muted).

## 10. Art & audio direction (locked)

Jazz-noir anime: ink/cream/mustard/red/teal/violet; Bebas Neue display + Space Grotesk
body; pre-rendered bokeh depth, premium panels, foil legendary, cel-shaded busts with
mood acting; halftone, grain, vignette, motes. Audio identity: the brass bell carries
scoring (pitch rises with streaks), jazz stabs carry drama, brushed noise carries UI;
all synthesized, no assets. Session title cards per level; diagonal wipes between scenes.

## 11. UX standards

- Exactly **one pulsing CTA** visible at any decision point.
- Every cutscene/intro shows its skip affordance after 0.7s.
- All rewards **count up**; all records stamp **NEW BEST!**; all perfection gets confetti.
- Teach-once: tutorial text appears for the first instance only.
- Cursor communicates: pointer over clickables, grab/grabbing over cards.
- F fullscreen everywhere; pause = real menu (resume/restart/map/sound/fullscreen).

## 12. The ending (locked)

Sunset NXT-cart drive → cream letter, typed reveal: three shifts, three skills, one
verdict — *"That is not bell work. That is sales work."* → **SALES ASSISTANT — REAL
ESTATE, Real Estate Sales Office — selling Ellison Landing** → PROMOTED stamp → New Game+ hub. The fiction
never breaks. The real conversation happens off-screen, after the manager finishes.

## 13. Success metrics

1. A first-time player finishes the career, unassisted, in ≤10 minutes — zero stuck states.
2. The supervisor replays The Pitch or opens the Guest Book unprompted (the "lean-in" signal).
3. The link gets forwarded upward without Nico asking.

## 14. Prioritized backlog (the polish loop works top-down)

**P0 — Manager-proofing: ✅ ALL SHIPPED June 12, 2026**
1. ~~Graceful failure: luggage timer → carry-what-you-have ending (no restart).~~ ✅
2. ~~Graceful failure: valet 3-bump → score-and-advance (retry optional via pause).~~ ✅
3. ~~Pitch second-wind (+2 turns once per duel, "They're still listening...").~~ ✅
4. ~~Difficulty soften per §8 numbers.~~ ✅ (lean 0.5→0.6, safeV 190→215, pars 40/40/45)
5. ~~First-drop/first-bump forgiveness toasts.~~ ✅ (luggage drop, cottage overspeed, valet bump 1 free)

**P1 — Supervisor shareability: ✅ ALL SHIPPED June 12, 2026**
6. ~~Finale end-card: career stat line composed for a screenshot (stars, tips, time, zero
   real names) — the thing that gets forwarded.~~ ✅ CAREER REPORT screen after the letter
   (stars/tips/career-time panels, per-shift proof lines, PROMOTED stamp, confidential
   footer). playTime now tracked in the save.
7. ~~Hub golden state after promotion (career-complete glow, REPLAY framing).~~ ✅ golden
   bokeh, gold proscenium frame, "SALES ASSISTANT NICO", career-complete subtitle.
8. ~~"How to demo" line in README for Nico (60-second setup checklist before handing
   over).~~ ✅

**P2 — Texture (loop fodder):**
9. ~~Title-screen ambient: bell-cart silhouette rolling the lower third.~~ ✅ June 12
10. ~~Hub poster hover sounds; Guest Book page-turn sound.~~ ✅ June 12
11. ~~Objection-typing blips duck while hovering cards.~~ ✅ June 12
12. Shuttle Precision: RANGE takeout guest crossing as stop-3 moving obstacle (from original spec).

**Post-promotion wishlist (not for the demo):** Pro Shop (spend tips), Daily Shift +
streaks, card collection/unlocks, VIP events, ghosts, touch controls, NG+ difficulty.
