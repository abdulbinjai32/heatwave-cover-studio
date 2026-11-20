// shots.js — fixed screenshot scenes driven by ?shot= URL params.
//   ?shot=cover&photos=hero,face,...&caption=...&subtitle=...&layout=...&grade=...&w=...&h=...
//       hides ALL editor chrome and paints ONLY the cover canvas at exactly
//       w x h pixels filling the viewport (default 1280x720). `photo=<name>`
//       fills every panel with one sample; `photos=a,b,c` assigns samples to
//       panels in order.
//   ?shot=editor&photos=...&caption=...
//       the full editor at 1280x720 with the samples loaded and the live
//       preview showing the finished cover.
// Fonts are awaited (document.fonts.load + document.fonts.ready) BEFORE any
// final text is drawn; window.__shotReady flips true after two rAFs once
// painted (set by main.js).

import { defaultFx } from './panels.js';

export async function runShot(query, api) {
  const { state, canvas, loadSample, renderNow } = api;
  const shot = query.get('shot');

  // Photo assignment: a list in panel order, or one photo for every panel.
  const listParam = query.get('photos');
  const single = query.get('photo');
  const names = listParam
    ? listParam.split(',').map((s) => s.trim()).filter(Boolean)
    : single
      ? [single.trim()]
      : ['hero', 'face', 'neon', 'boats', 'deco', 'skyline'];
  await Promise.all(names.map(loadSample));
  state.assignments = Array.from({ length: 8 }, (_, i) => names[i % names.length]);
  state.panelFx = state.assignments.map(defaultFx);
  state.selected = -1;

  // Scene parameters.
  if (query.get('caption')) state.caption = query.get('caption');
  if (query.get('subtitle')) state.subtitle = query.get('subtitle');
  if (query.get('tagline')) state.tagline = query.get('tagline');
  if (query.get('quote')) state.quote = query.get('quote');
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('gutter')) state.gutter = query.get('gutter');
  // Layout-aware title height: keep the masthead off the horizontal gutter
  // in tower, and leave a real image band above it in quintet.
  if (query.get('titley')) {
    state.titleY = Number(query.get('titley')) / 100;
  } else if (state.layout === 'tower') {
    state.titleY = 0.77;
  } else if (state.layout === 'quintet') {
    state.titleY = 0.74;
  }
  // Quintet: tighten the hero crop so the subject stays the focal point.
  if (state.layout === 'quintet') {
    state.panelFx[0] = { zoom: 1.15, panX: 0, panY: -0.1 };
  }

  // Paint once immediately (fallback fonts if needed), then again once the
  // display faces are guaranteed loaded — no blank frame is ever captured.
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const w = clampInt(query.get('w'), 320, 4096, 1280);
    const h = clampInt(query.get('h'), 320, 4096, 720);
    canvas.width = w;
    canvas.height = h;
  }
  renderNow();

  // Never draw the final text before the display faces are actually loaded.
  await Promise.all([
    document.fonts.load('400 100px Anton'),
    document.fonts.load('400 100px Pacifico'),
    document.fonts.load('700 100px "Barlow Condensed"'),
    document.fonts.load('600 100px "Barlow Condensed"'),
  ]);
  await document.fonts.ready;
  renderNow();
}

function clampInt(raw, lo, hi, fallback) {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
}
