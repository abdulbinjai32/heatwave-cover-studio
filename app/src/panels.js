// panels.js — layout templates and panel geometry for the HEATWAVE collage.
// Each layout is a list of normalized cells (0..1 across the cover). Cells
// are inset by half a gutter so the background reads as one even gutter
// width everywhere, and small tilts give the collage cut-and-paste energy.
// One photo per panel, cover-fit, with per-panel pan/zoom framing.

export const LAYOUTS = [
  {
    id: 'classic',
    name: 'Classic 6',
    hint: 'Hero left, five-panel grid right',
    // Panel order matches the shot param photos=hero,face,neon,boats,deco,skyline:
    // sunset subjects up top (gold light), night scenes below (purple shade).
    cells: [
      { x: 0.0, y: 0.0, w: 0.55, h: 1.0, tilt: 0 },
      { x: 0.55, y: 0.0, w: 0.225, h: 0.36, tilt: -0.9 },
      { x: 0.55, y: 0.66, w: 0.225, h: 0.34, tilt: 0.9 },
      { x: 0.55, y: 0.36, w: 0.45, h: 0.3, tilt: 0 },
      { x: 0.775, y: 0.0, w: 0.225, h: 0.36, tilt: 0.8 },
      { x: 0.775, y: 0.66, w: 0.225, h: 0.34, tilt: -0.8 },
    ],
  },
  {
    id: 'quintet',
    name: 'Quintet 5',
    hint: 'Hero left, 2x2 grid right',
    // The bottom row runs tall so real image content survives above AND below
    // the title lockup — no panel ends up a buried sliver.
    cells: [
      { x: 0.0, y: 0.0, w: 0.55, h: 1.0, tilt: 0 },
      { x: 0.55, y: 0.0, w: 0.225, h: 0.42, tilt: -0.8 },
      { x: 0.775, y: 0.0, w: 0.225, h: 0.42, tilt: 0.8 },
      { x: 0.55, y: 0.42, w: 0.225, h: 0.58, tilt: 0.7 },
      { x: 0.775, y: 0.42, w: 0.225, h: 0.58, tilt: -0.7 },
    ],
  },
  {
    id: 'strip',
    name: 'Strip 3',
    hint: 'Big hero, two stacked stills',
    cells: [
      { x: 0.0, y: 0.0, w: 0.62, h: 1.0, tilt: 0 },
      { x: 0.62, y: 0.0, w: 0.38, h: 0.5, tilt: 0.9 },
      { x: 0.62, y: 0.5, w: 0.38, h: 0.5, tilt: -0.9 },
    ],
  },
  {
    id: 'duel',
    name: 'Duel 2',
    hint: 'Two leaning halves, face off',
    cells: [
      { x: 0.0, y: 0.0, w: 0.5, h: 1.0, tilt: -1.1 },
      { x: 0.5, y: 0.0, w: 0.5, h: 1.0, tilt: 1.1 },
    ],
  },
  {
    id: 'tower',
    name: 'Tower 4',
    hint: 'Hero on top, strip of three below',
    cells: [
      { x: 0.0, y: 0.0, w: 1.0, h: 0.56, tilt: 0 },
      { x: 0.0, y: 0.56, w: 0.3333, h: 0.44, tilt: -0.4 },
      { x: 0.3333, y: 0.56, w: 0.3334, h: 0.44, tilt: 0 },
      { x: 0.6667, y: 0.56, w: 0.3333, h: 0.44, tilt: 0.4 },
    ],
  },
];

/**
 * Per-photo default framing so the subject that matters survives the
 * cover-fit crop (e.g. the deco photo is portrait: pan down to the car).
 * Applied at boot, in shot scenes, and whenever a photo is assigned.
 */
export const DEFAULT_FRAMING = {
  hero: { zoom: 1.0, panX: 0, panY: -0.02 },
  face: { zoom: 1.0, panX: 0, panY: 0 },
  neon: { zoom: 1.0, panX: -0.1, panY: 0.1 },
  boats: { zoom: 1.0, panX: 0, panY: 0 },
  deco: { zoom: 1.05, panX: 0, panY: -0.85 },
  skyline: { zoom: 1.0, panX: -0.2, panY: -0.12 },
  pier: { zoom: 1.0, panX: 0, panY: 0 },
  boulevard: { zoom: 1.0, panX: 0, panY: 0 },
};

export function defaultFx(photoId) {
  const f = DEFAULT_FRAMING[photoId];
  return { zoom: f?.zoom ?? 1, panX: f?.panX ?? 0, panY: f?.panY ?? 0 };
}

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

/** One shared gutter width everywhere: between panels AND at the outer edge. */
export function gutterPx(w, h) {
  return Math.max(8, Math.round(Math.min(w, h) * 0.02));
}

/**
 * Pixel-space geometry for every cell. Normalized coords map into
 * [g/2, size-g/2] and each cell is inset g/2, so every gutter — inner and
 * outer — is exactly one gutter wide. Tilts rotate the cell polygon around
 * its own center without breaking the grid.
 */
export function panelGeometry(layout, w, h) {
  const g = gutterPx(w, h);
  return layout.cells.map((cell) => {
    const x = cell.x * (w - g) + g;
    const y = cell.y * (h - g) + g;
    const cw = cell.w * (w - g) - g;
    const ch = cell.h * (h - g) - g;
    const cx = x + cw / 2;
    const cy = y + ch / 2;
    const a = (cell.tilt * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const corners = [
      [-cw / 2, -ch / 2],
      [cw / 2, -ch / 2],
      [cw / 2, ch / 2],
      [-cw / 2, ch / 2],
    ].map(([px, py]) => [cx + px * cos - py * sin, cy + px * sin + py * cos]);
    return { poly: corners, x, y, w: cw, h: ch, cx, cy, tilt: cell.tilt };
  });
}

export function tracePoly(ctx, poly) {
  ctx.beginPath();
  ctx.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
  ctx.closePath();
}

/**
 * Draw one photo into a panel: clip to the polygon and cover-fit the bitmap
 * with a per-photo filter (normalization happens in cover.js) so every panel
 * enters the unified grade at a comparable value.
 * fx = {zoom, panX, panY}; pan is [-1, 1] across the cover-fit overflow.
 */
export function drawPanelPhoto(ctx, panel, bitmap, fx, filterStr) {
  const { x, y, w: cw, h: ch, poly } = panel;
  ctx.save();
  tracePoly(ctx, poly);
  ctx.clip();
  const iw = bitmap ? (bitmap.width ?? bitmap.naturalWidth) : 0;
  const ih = bitmap ? (bitmap.height ?? bitmap.naturalHeight) : 0;
  if (bitmap && iw > 0 && ih > 0) {
    // A broken/zero-size bitmap falls through to the placeholder instead of
    // throwing inside drawImage and killing the whole repaint.
    const zoom = Math.max(1, fx?.zoom ?? 1);
    const scale = Math.max(cw / iw, ch / ih) * zoom;
    const dw = iw * scale;
    const dh = ih * scale;
    const overX = dw - cw;
    const overY = dh - ch;
    const panX = Math.max(-1, Math.min(1, fx?.panX ?? 0));
    const panY = Math.max(-1, Math.min(1, fx?.panY ?? 0));
    const dx = x - overX / 2 + (panX * overX) / 2;
    const dy = y - overY / 2 + (panY * overY) / 2;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.filter = filterStr || 'saturate(1.2) contrast(1.06)';
    ctx.drawImage(bitmap, dx, dy, dw, dh);
    ctx.filter = 'none';
  } else {
    // Empty panel: a quiet placeholder so the layout still reads.
    ctx.fillStyle = '#241035';
    ctx.fillRect(x - 4, y - 4, cw + 8, ch + 8);
  }
  ctx.restore();
}

/** One path containing every panel polygon — the clip for the shared grade. */
export function traceUnion(ctx, panels) {
  ctx.beginPath();
  for (const { poly } of panels) {
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
    ctx.closePath();
  }
}

/** Which panel contains the point (topmost wins), or -1. */
export function hitPanel(panels, px, py) {
  for (let i = panels.length - 1; i >= 0; i--) {
    const { poly } = panels[i];
    let inside = false;
    for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
      const [xa, ya] = poly[a];
      const [xb, yb] = poly[b];
      if (ya > py !== yb > py && px < ((xb - xa) * (py - ya)) / (yb - ya) + xa) inside = !inside;
    }
    if (inside) return i;
  }
  return -1;
}

/** Tiny layout preview for the template picker buttons. */
export function drawLayoutThumb(canvas, layout, active) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = active ? '#ffe9f7' : '#cfc3e6';
  ctx.fillRect(0, 0, w, h);
  const g = 2;
  layout.cells.forEach((cell, i) => {
    ctx.save();
    const x = cell.x * w + g / 2;
    const y = cell.y * h + g / 2;
    const cw = cell.w * w - g;
    const ch = cell.h * h - g;
    ctx.translate(x + cw / 2, y + ch / 2);
    ctx.rotate((cell.tilt * Math.PI) / 180);
    ctx.fillStyle = i === 0 ? '#ff2fa0' : '#3b1f5e';
    ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
    ctx.restore();
  });
}
