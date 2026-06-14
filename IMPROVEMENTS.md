# BELL TO SELL — Improvement Plan (post-audit)
### June 14, 2026 · synthesized from a 5-agent full-codebase audit · stays 100% true to GDD.md

> **STATUS: IMPLEMENTED & VERIFIED June 14, 2026.** A 5-agent implementation team executed
> all P0/P1/P2 items and the quick P3 wins, partitioned by file (no overlap). Orchestrator
> QA confirmed: charm meter now tweens 0→target (was frozen); collision rewrite blocks at the
> obstacle boundary with no tunneling and slides along walls; pause is gated off title/finale/
> mid-wipe; letter fits with the stamp reseated; hub CTA sits clear of the posters; finale walk
> enriched; Career Report carries the in-fiction hero line; results eyebrow/NEW-BEST spacing
> fixed; audio/music/mute/reduced-motion all wired without errors; combined build passes.

This is the work list to take the game from "very good" to award-winning. Every item
was found by a critical read of the source and checked against the GDD vision. Items are
tiered by player-visible impact. The orchestrator does the final visual QA pass after
implementation (subagents build-check only — the preview tab is a shared singleton).

## Vision guardrails (consolidated — DO NOT violate any of these)
- Fiction never breaks: no real names, no meta "hire me" screens, no fourth-wall winks.
  The fictional promotion letter + Career Report are the only ending.
- Failure costs score, NEVER blocks progress. No new fail states, no harder difficulty,
  no second "second wind". A panicking manager must always finish.
- Helpful beats pushy: losing dialogue lines stay the pushy ones. Even meta/UI copy.
- One pulsing CTA per decision point. Left-to-right, always forward.
- All art/audio synthesized in code. No asset files. No new dependencies.
- Accuracy is sacred: no new factual claims; banned = SIM Lounge/Foresight, Ritz-Carlton,
  "1,000+ events", skating rink, "pay double in the city". Keep canon labels (FRONT DESK,
  Porsche NXT max 24 km/h, GMC Yukon XL, Peregrine Cottages, Real Estate Sales Office).
- Confidential footers ("FOR PREDATOR RIDGE MANAGEMENT ONLY") stay everywhere they are.
- Internal scene id 'valet' stays (save compatibility) — only player-facing text matters.

---

## P0 — Critical (broken or visibly wrong; a manager will notice)
1. **Charm meter frozen** `pitch.js:340/909/911` — `charmShown` never tweens. Add in
   `update()`: `this.charmShown += (this.charm - this.charmShown) * Math.min(1, dt*9)`;
   snap to `this.charm` on win. The climax screen's core feedback is currently dead. ✅ verified
2. **Pause/restart opens broken states** `main.js:156/158-164` — pause toggles mid-wipe and
   on title/finale; "RESTART THIS SHIFT" re-enters non-shift scenes (re-stamps finaleSeen).
   Gate: only toggle pause when `!transition && scene ∉ {title, finale}`; only honor R on
   luggage/valet/pitch. Force `paused=false` in the transition switch.
3. **Hub CTA ribbon overlaps the poster BEST/stars row** `hub.js:253` (+ all-done double-CTA
   `hub.js:108-256`) — raise the poster block or drop the ribbon so it never crosses a
   poster's lower third; suppress the bottom ribbon whenever the PROMO banner is the live
   CTA (one-CTA rule). Verify by screenshot.
4. **Promotion letter has no overflow guard** `finale.js:113-133` — on a maxed save the
   verdict/signoff can run past the paper frame. Measure composed height; clamp line-height
   or scale the paper so the signoff clears the inner frame by ≥16px. This is the locked
   emotional payoff — it must land every time.

## P1 — High (correctness, robustness, feel)
5. **Save schema incomplete** `save.js:3-12` — add `finaleSeen: false` (and confirm
   `playTime`, `muted`, `bookSeen` defaults) so old saves migrate and golden-hub logic never
   reads `undefined`.
6. **Stuck keys / stuck drag after Alt-Tab** `main.js` — add `window` blur → `input.down.clear()`
   and a `pointerleave` → park pointer (`x=y=-1`, clear `held`). Classic "came back and it's
   walking by itself" bug.
7. **Music desyncs after tab-throttle** `audio.js:~220` — on resync advance/reset `musicBeat`
   together with `musicNext` so the vamp restarts in phase; add `visibilitychange` to
   musicOff/On. Also end ducks with an explicit ramp to `LOUNGE.level` (asymptotic recover
   never reaches target).
8. **`playTime` inflated by howto/idle** `main.js:188` — only accrue while the active scene
   is actually in play (add a `scene.countsTime`/state check). The Career Report time is the
   forwarded stat; don't pad it with reading time.
9. **Dead `fail` state** `luggage.js:98-104/160-167/355/365-370` — delete it entirely
   (unreachable; both legs route to graceful handoff/finish). Removes a restart-the-leg
   landmine that contradicts §7.
10. **Dead `retry` state** `valet.js:183-191/569-574` — delete both blocks (unreachable; the
    3-bump path goes to 'parked' and advances; retry lives in pause). ✅ verified
11. **3-star promise is a lie (luggage)** `luggage.js:109/124` — "every bag, nothing dropped =
    3 stars" but a clean-cautious run can score 960-996 (<1000). Lower 3★ to `>=960` or add a
    `+50` clean-run bonus (`stack.length===8 && drops===0`). Stars are a replay chase, so
    over-delivering is harmless; lying to the audience is not.
12. **3-star promise vs thresholds (shuttle)** `valet.js:124/138` — a genuinely good (not
    perfect) run can miss 390 and feel cheated. Lower 3★ to ~330 OR soften the hint copy to
    "near-perfect". Pick one.
13. **Collision wedge / buzz (shuttle)** `valet.js:248-251` — full pose-revert on any hit makes
    the Yukon stick/buzz against walls and pylons. Resolve axes independently (try X, then Y,
    then rotation) so the hull slides along instead of dead-stopping. Biggest feel win.
14. **Driving curve too "sled-like" (shuttle)** `valet.js:206-210` — flat linear accel/reverse/
    coast; reaches max speed in <1s, identical fwd/back. Give reverse a gentler ramp (~120/dt),
    stronger engine-brake near zero, small dead-zone, so the last few px into the bay are
    feather-able. The heart of the dramatized skill.
15. **Brake punishes the player (luggage)** `luggage.js:201-202/213` — every velocity change
    feeds lean (`-dv*0.0045`), so the "← BRAKE" the HUD instructs tips the stack. Reduce the
    coupling (~0.003) or exempt deliberate braking; raise idle friction so stopping feels
    intentional.
16. **Hazard brake can become a real bump (shuttle)** `valet.js:225/238` — measure auto-brake
    distance from the rear bumper/nearest hull point (not car center), and ALWAYS zero velocity
    on hazard overlap (cooldown gates only the +2s penalty + toast). "Hazards are never a bump"
    is a hard rule.

## P2 — Medium (polish that lifts perceived quality)
17. **Per-frame gradient churn** `luggage.js:377/657 + valet.js:319-326 + theme.js filmLook` —
    cache static gradients (wallG/sky/path) and bake the shuttle lot's static ground dressing
    to one offscreen canvas per round (3 layouts), matching the `bokehBg` pattern. Protects
    frame rate on a manager's laptop. Hoist the per-frame `ART` literal (luggage) to module scope.
18. **Finale "walk" is flat** `finale.js:252-276` — the cinematic lead-in lacks the bokeh/motes/
    gradient depth the rest of the game has. Blend the sky bands, add motes + sun glow + a
    silhouette/lake hint + the rim-lit NXT treatment. §10 art lock.
19. **PROMOTED stamp drifts past paper edge / over body text** `finale.js:147` — reposition into
    the letterhead whitespace; never cover a readable word.
20. **"CAREER REPORT" prompt low-contrast, hard blink** `finale.js:160-162` — move to ~y500, use
    the eased `0.6+0.4*sin` pulse like title/hub, add a faint ink underlay so it reads over the
    vignette. It's the only exit from the most important screen.
21. **Results header swallows the eyebrow label** `results.js:67` — 80px headline overlaps the
    level-name eyebrow (14px gap). Give the eyebrow air (eyebrow ~y72 or headline ~y128).
22. **NEW BEST! stamp hardcoded x** `results.js:83` — anchor to the measured score-text right
    edge + fixed gap instead of `W/2+178`.
23. **Both teaching beats not guaranteed** `pitch.js:561` — beats gate on exact `playsMade`
    parity (2 or 4); an early win or second-wind eating slot 4 can skip the strongest helpful-vs-
    pushy moment. Trigger so the second beat reliably fires before win. Carefully — don't double
    up beats.
24. **Tips formula rewards overkill** `pitch.js:603` — cap charm-overshoot bonus (`min(overshoot,
    20)`) so reward reads as efficiency, not a lucky late crit.
25. **Meta/dialogue copy leans transactional** `pitch.js:1397/1402/1428`, `cards.js:53` — soften
    "FASTER CLOSES BANK MORE TURNS" → "READING THEM RIGHT THE FIRST TIME BANKS MORE TURNS";
    reconsider "try one appetizer and judge me after". Helpful-not-pushy colors even UI copy.
26. **Hub controls footer crams 7 keys** `hub.js:259` — show the 3-4 keys that matter (CHOOSE /
    ENTER / GUEST BOOK); F/M/P already live in the pause menu.
27. **Letter margin stat-stack is noise** `finale.js:138-141` — it duplicates the Career Report
    and is near-illegible in the vignette. Drop it (let the letter breathe) or render as a clean
    small-caps sidebar.
28. **Audio underscore likely inaudible** `audio.js:18` — `LOUNGE.level 0.04` is very low through a
    lowpassed triangle bass. Raise to ~0.06-0.07 and/or lift bass note vols. (Nico ear-tests.)
29. **SERVICE EXIT door reads as sealing shut (luggage)** `luggage.js:570-573` — the goal door
    visually closes as time runs out → false panic the vision wants to avoid. Make it glow/open
    as the cart nears; keep the closing motif on the timer numerals only.
30. **Career Report mid-card gap + no hero line** `finale.js:215-241` — tighten the ~32px empty
    band; add the in-fiction verdict caption "That is not bell work. That is sales work." and a
    subtle masthead foil sweep. It's the forwarded artifact — give it one hero line. (In-fiction
    only — never address the manager directly.)

## P3 — Nice-to-have (do if cheap; never at the cost of the above)
31. Reduced-motion: damp grain/motes/poster-bob under `prefers-reduced-motion` (`main.js`/`theme.js`).
32. Clickable pause-menu rows (`main.js`) so a mouse-only manager can resume/restart.
33. Reward the successful lean-recovery (`luggage.js:248`) with a tick/sparkle — the core skill
    currently has no positive feedback.
34. Floater text shadow for legibility over busy backgrounds (`luggage.js:362`).
35. Non-crit miss feedback bigger/longer (`pitch.js:1069`) so novices learn the matching rule.
36. Damp idle poster bob; reserve motion for the selected poster (`hub.js:178`).
37. `ctx.letterSpacing` explicit reset + `drawText` default to `C.cream` + bokeh `ctx.filter`
    feature-detect fallback (`util.js`/`theme.js`) — older-Safari correctness.
38. Crossing-guest readability at shuttle stop 3 (`valet.js`) — faint crossing-path guide + a
    teach line so the RANGE-takeout gag reads, not "second dog".
39. Shake only the world layer, not HUD/overlays (`valet.js:295`).

## DO NOT do (tempting but vision violations — from the audits)
- No wall-clock fail timer to "fix" the slow-motion dt clamp (the clamp makes slow machines
  MORE forgiving — that's the mandate). Only fix how playTime is *reported*.
- No public-sharing / leaderboard / social hooks anywhere.
- No fourth-wall / "hire me" hero line on the Career Report — pull the verdict from the letter.
- No new factual claims; no stronger-but-unverified versions of existing ones (no tax-savings
  dollar figure, no wine price, no named discount).
- Never let a pushy dialogue line win charm; never add a second second-wind or a hard retry gate.
- Don't remove hazards (dog/marmot/doors/wet-floor) or raise difficulty.

---

## Implementation plan — 5 agents, disjoint file ownership (no two touch the same file)
- **Agent PITCH** — `pitch.js`, `cards.js`: items 1, 23, 24, 25, 35.
- **Agent LUGGAGE** — `luggage.js`: items 9, 11, 15, 17(luggage parts), 29, 33, 34.
- **Agent SHUTTLE** — `valet.js`: items 10, 12, 13, 14, 16, 17(valet part), 38, 39.
- **Agent FOH** — `title.js`, `hub.js`, `finale.js`, `results.js`: items 3, 4, 18, 19, 20, 21,
  22, 26, 27, 30, 36.
- **Agent INFRA** — `main.js`, `save.js`, `audio.js`, `util.js`, `theme.js`(filmLook/bokeh): items
  2, 5, 6, 7, 8, 17(theme grain), 28, 31, 32, 37.

Each agent: edit only its files, run `npm run build` to confirm it compiles, do logic-level
self-check, do NOT run git, do NOT touch other files. Orchestrator runs the final build +
screenshot QA pass and commits.
