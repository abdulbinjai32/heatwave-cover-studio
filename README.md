# HEATWAVE Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/abdulbinjai32/heatwave-cover-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/abdulbinjai32/heatwave-cover-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn a photo and a caption into GTA-6-style multi-panel cover art and export it
as a PNG. HEATWAVE runs fully offline in desktop Chrome from static files — no
build step, no network requests, no accounts. Photos are read locally with
FileReader / createImageBitmap and never leave the page.

## What it makes

A box-art collage drawn entirely with Canvas 2D:

- **Multi-panel layouts** — 5 templates: Classic 6 (hero left + five-panel grid),
  Quintet 5, Strip 3, Duel 2, and Tower 4. One even gutter width between and
  around every panel, slightly tilted cells for cut-and-paste energy. Every
  panel clips one photo, cover-fit, with its own pan/zoom crop.
- **Unified colour grades** — Vice Sunset (magenta-orange-teal), Neon Night
  (teal-magenta), Golden Hour (warm amber), with an intensity slider. Per-photo
  exposure/saturation normalization lands every panel at the same value before
  one shared split-toned pass (color / multiply / screen / overlay) composites
  over the whole collage, then one bright-pass bloom and one deep-purple
  vignette (never pure black) — mixed photos feel like one painted world.
- **Giant lettering** — your caption in Anton, sheared italic, white → cream →
  orange gradient fill, thick black outline, and a magenta → purple 3D
  extrusion. Auto-fit to length, with size / tilt / height sliders. Editable
  Pacifico script subtitle on a dark pill with a hot-pink neon glow, seated
  inside one panel so it never straddles a gutter.
- **Packaging furniture** (each toggleable): press-quote banner with five gold
  stars, 22-point starburst seal ("ORIGINAL / EDITION") placed off the face,
  HEAT wanted-level chip, tilted VOL. 06 ticket, palm-tree tagline band with a
  slit half-sun at the far left, and a catalog footer with an HW chip, credits
  and a barcode whose bar widths are seeded from the caption — renders are
  deterministic, no `Math.random` anywhere.
- **Everything is original** — no Rockstar logo, wordmark, official artwork or
  game font. Shipped fonts (Anton, Pacifico, Barlow Condensed) are SIL OFL 1.1
  (`app/fonts/OFL.txt`). The eight sample photos in `app/samples/` were made
  with an image model for this entry and are free to use.

## Run it

```sh
node serve.ts            # serves app/ on http://localhost:8080
node serve.ts --port 9090
```

Open http://localhost:8080 in desktop Chrome. A finished cover appears
immediately: the hero sample in the Classic 6 layout, caption "HEATWAVE",
subtitle "Neon Tide".

## Make a cover

1. **Load photos** — click *+ Add* or drag-and-drop images anywhere on the
   page (or use the 8 built-in samples).
2. **Type a caption** (and subtitle / tagline / press quote if you like).
3. **Frame the panels** — click a panel to select it, drag inside it to pan,
   scroll or use the zoom slider to crop. Click a photo in the strip to fill the
   selected panel, or every panel when none is selected. *Fill all panels*
   spreads one photo across the collage.
4. **Export** — one click from the pinned export bar: **1080 × 1080**,
   **1080 × 1350**, or **1920 × 1080**. The cover renders offscreen at that
   exact size and downloads as a PNG.

Pick layouts, grades, gutter style (white or black + keyline), and toggle any
packaging piece from the sidebar; the center preview repaints live on every
edit. The export bar stays pinned at 1280 × 720 — the flow never falls below
the fold.

## Screenshot scenes

`app/src/shots.js` handles `?shot=` params for reproducible captures:

- `?shot=cover&photos=hero,face,neon,boats,deco,skyline&caption=HEATWAVE&subtitle=Neon%20Tide&layout=classic&grade=sunset&w=1280&h=720`
  — chrome-free cover at exactly w × h.
- `?shot=editor&photos=...&caption=...` — the full editor with the cover live.

Fonts are awaited (`document.fonts.load` + `document.fonts.ready`) before any
final text is drawn; `window.__shotReady` flips true after two rAFs once
painted. The four scenes in `shots.json` produced `screenshots/`.

## Package the entry

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts   # copies app/ + screenshots/, writes dossier.json
```

`main.ts` (Node 22+, stdlib only) packages the entry with the vendored
`vendor/makefun-app.ts` under the scorer's caps.

## Layout of the code

| File | Role |
| --- | --- |
| `app/index.html` | editor markup |
| `app/style.css` | dark neon theme + shot modes |
| `app/src/main.js` | state, photo registry, live preview loop |
| `app/src/panels.js` | layout templates, tilted panel geometry, cover-fit crops |
| `app/src/grade.js` | unified split-tone grades, bloom, vignette, seeded PRNG |
| `app/src/lettering.js` | extruded title, neon script, all packaging furniture |
| `app/src/cover.js` | `composeCover` layer order + `exportPNG` |
| `app/src/editor.js` | uploads, photo strip, panel select/pan/zoom, controls |
| `app/src/shots.js` | `?shot=` screenshot scenes |

---

Entered on make.fun — bounty `gta6-cover-art-01`.
