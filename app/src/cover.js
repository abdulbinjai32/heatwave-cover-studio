// cover.js — composes the whole cover, layer by layer:
//   bg -> photo panels (per-photo normalization) -> ONE unified grade +
//   atmosphere over the panel union -> keylines -> furniture -> title ->
//   subtitle plate. Also exports the cover as a PNG at an exact pixel size.

import { layoutById, panelGeometry, drawPanelPhoto, tracePoly, traceUnion, gutterPx } from './panels.js';
import { gradeById, gradeCollage, applyAtmosphere } from './grade.js';
import { drawFurniture, drawTitle, drawSubtitle } from './lettering.js';

/**
 * Per-photo exposure + saturation normalization toward the grade's target
 * luma: bright washed photos are pulled DOWN, dark ones lifted slightly, so
 * every panel enters the shared hue grade at the same value. Deterministic.
 */
function panelFilter(entry, grade) {
  const s = entry?.stats;
  if (!s) return 'saturate(1.2) contrast(1.06)';
  const b = Math.max(0.25, Math.min(1.1, grade.targetLuma / Math.max(0.15, s.luma)));
  const wash = Math.max(0, Math.min(1, (s.luma - 0.4) * 1.5 + (0.5 - s.sat) * 1.1));
  const sat = (1.2 + wash * 0.8).toFixed(2);
  const con = (1.05 + wash * 0.15).toFixed(2);
  return `brightness(${b.toFixed(2)}) saturate(${sat}) contrast(${con})`;
}

/**
 * Paint the cover into any 2D context at w x h. `photos` maps photo id ->
 * drawable bitmap entry. `preview` adds the editor's selection highlight
 * (never part of an export).
 */
export function composeCover(ctx, state, w, h, photos, preview = false) {
  const layout = layoutById(state.layout);
  const panels = panelGeometry(layout, w, h);
  const grade = gradeById(state.grade);
  const intensity = state.intensity ?? 0.88;
  const gutter = gutterPx(w, h);

  // 1. Background: one pure gutter value between and around every panel.
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = state.gutter === 'black' ? '#150722' : '#ffffff';
  ctx.fillRect(0, 0, w, h);

  // 2. Panels: clip + cover-fit photo, normalized so washed photos match loud ones.
  panels.forEach((panel, i) => {
    const photoId = state.assignments[i % state.assignments.length];
    const entry = photos.get(photoId);
    const fx = state.panelFx[i % state.panelFx.length] ?? { zoom: 1, panX: 0, panY: 0 };
    drawPanelPhoto(ctx, panel, entry?.bitmap ?? null, fx, panelFilter(entry, grade));
  });

  // 3. ONE unified grade + ONE shared atmosphere over the whole collage,
  //    clipped to the panel union so the gutters keep their pure value.
  ctx.save();
  traceUnion(ctx, panels);
  ctx.clip();
  gradeCollage(ctx, grade, intensity, w, h);
  applyAtmosphere(ctx, w, h, grade, intensity);
  ctx.restore();

  // 4. Keylines only for the black-gutter style; white gutters stay clean.
  if (state.gutter === 'black') {
    ctx.save();
    panels.forEach((panel) => {
      tracePoly(ctx, panel.poly);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(1.25, gutter * 0.09);
      ctx.stroke();
    });
    ctx.restore();
  }
  ctx.restore();

  // 5. Packaging furniture, 6. title, 7. subtitle.
  drawFurniture(ctx, state, w, h);
  const title = drawTitle(ctx, state, w, h);
  drawSubtitle(ctx, state, w, h, title, panels);

  // Editor-only selection highlight.
  if (preview && state.selected >= 0 && panels[state.selected]) {
    ctx.save();
    tracePoly(ctx, panels[state.selected].poly);
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = Math.max(2, gutter * 0.22);
    ctx.setLineDash([gutter * 0.8, gutter * 0.5]);
    ctx.stroke();
    ctx.restore();
  }
  return panels;
}

/**
 * Render offscreen at exactly w x h and download the PNG.
 * Resolves with the filename once the browser has the blob.
 */
export function exportPNG(state, photos, w, h) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    composeCover(ctx, state, w, h, photos, false);
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('PNG encoding failed'));
        return;
      }
      const slug =
        (state.caption || 'heatwave')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'heatwave';
      const name = `heatwave-${slug}-${w}x${h}.png`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      resolve(name);
    }, 'image/png');
  });
}
