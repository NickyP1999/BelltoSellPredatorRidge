# BELL TO SELL — A Predator Ridge Career Game

A 5–10 minute jazz-noir arcade game that makes the case, shift by shift, for promoting
one bellman — **Nico** — to **Sales Assistant, Real Estate** at Predator Ridge Resort
(Vernon, BC). Three shifts, left to right, each one a skill the Sales Centre needs:

| Shift | Game | Skill on display |
|---|---|---|
| 01 — Luggage Rush | Balance bags through the lobby, then drive them to the cottages on the Porsche NXT cart | Grace under pressure |
| 02 — Shuttle Precision | Back the resort's Yukon XL into ever-tighter shuttle bays — Lodge, Falcon Point, the Sparkling Hill run | Precision with guests aboard |
| 03 — The Pitch | Win three persuasion duels with real Predator Ridge talking points | Listen first, sell honestly |

Finish all three and Management delivers the promotion letter.

Built for a busy shift: every level is short, retries are instant, and a full
career run fits inside a coffee break. Designed for a 1080p screen — press **F**
for fullscreen.

## Play locally

Requires Node.js 18+.

```sh
npm install
npm run dev
```

Open http://localhost:5173.

## Controls

- **Mouse or keyboard everywhere** — arrows/WASD move, Enter confirms, Esc/P pauses, M mutes, F fullscreen
- The Pitch: 1–4 quick-plays cards, **H = hint** if you're stuck
- Valet: ↑ drive, ↓ reverse, ←/→ steer, Space parks
- Progress saves to `localStorage`

## Deploy

**Vercel:** import this repo at vercel.com — it auto-detects Vite
(build `vite build`, output `dist/`). No config needed; `vite.config.js`
already uses a relative base so the build works anywhere.

**Any static host:** `npm run build`, then upload the `dist/` folder.

## Credits

All art, type layouts, and sound are original and generated in code — flat-color
jazz-noir style with synthesized WebAudio SFX (the brass bell is the star).
Fonts: Bebas Neue & Space Grotesk via Fontsource (OFL). Place names reference the
real Predator Ridge resort as a tribute; sales facts in The Pitch were verified
June 2026. Not affiliated with Predator Ridge Resort.
