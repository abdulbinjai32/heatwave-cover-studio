// lettering.js — every word and badge on the cover, drawn with Canvas 2D.
// The giant caption: Anton, sheared italic, white->cream->orange gradient fill,
// thick black outline, and a magenta->purple 3D extrusion built by stacking
// offset copies BEFORE the outline+fill. The script subtitle: Pacifico with a
// hot-pink neon glow on a dark pill. Plus the packaging furniture: press-quote
// banner, starburst seal, HEAT wanted meter, VOL. 06 ticket, palm tagline band,
// and a catalog footer whose barcode is seeded from the caption (never
// Math.random).

import { hashSeed, mulberry32 } from './grade.js';

const DISPLAY = 'Anton';
const SCRIPT = 'Pacifico';
const CAPS = '"Barlow Condensed"';

function font(px, face = DISPLAY, weight = 400) {
  return `${weight} ${px}px ${face}`;
}

/** Draw text with manual letter-spacing (wide-tracked caps), centered or left. */
function drawTracked(ctx, text, x, y, tracking, align = 'center', outline = false) {
  const chars = [...text];
  let total = 0;
  const widths = chars.map((c) => {
    const cw = ctx.measureText(c).width;
    total += cw;
    return cw;
  });
  total += tracking * Math.max(0, chars.length - 1);
  let cursor = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    if (outline) ctx.strokeText(c, cursor, y);
    ctx.fillText(c, cursor, y);
    cursor += widths[i] + tracking;
  });
  ctx.textAlign = prevAlign;
  return total;
}

function starPath(ctx, cx, cy, r, inner = 0.46) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function drawStars(ctx, cx, cy, r, count, color, gap = 2.35) {
  ctx.save();
  ctx.fillStyle = color;
  const start = cx - ((count - 1) * r * gap) / 2;
  for (let i = 0; i < count; i++) {
    starPath(ctx, start + i * r * gap, cy, r);
    ctx.fill();
  }
  ctx.restore();
}

function lerpColor(a, b, t) {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  const mix = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${mix[0]},${mix[1]},${mix[2]})`;
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * The giant main title. Returns {size, baselineY} so the subtitle can sit
 * right under it. Auto-fits the caption to the cover width; state.titleScale,
 * titleTilt and titleY let the maker adjust size, tilt and position.
 */
export function drawTitle(ctx, state, w, h) {
  const text = (state.caption || 'HEATWAVE').trim().toUpperCase() || 'HEATWAVE';
  ctx.save();
  ctx.font = font(100);
  const per100 = Math.max(1, ctx.measureText(text).width);
  const fitWidth = (w * 0.88 * 100) / per100;
  // Tower's masthead must stay below the hero/tile rule, outline included.
  const cap = state.layout === 'tower' ? h * 0.155 : h * 0.24;
  let size = Math.max(h * 0.05, Math.min(fitWidth, cap) * (state.titleScale ?? 1));
  // The italic shear leans glyph tops right; keep that lean inside the margin.
  const leaned = (size * per100) / 100 + size * 0.18;
  if (leaned > w * 0.94) size *= (w * 0.94) / leaned;
  const baselineY = h * (state.titleY ?? 0.8);
  const tilt = ((state.titleTilt ?? -2.5) * Math.PI) / 180;
  ctx.translate(w / 2, baselineY);
  ctx.rotate(tilt);
  ctx.transform(1, 0, -Math.tan((9.5 * Math.PI) / 180), 1, 0, 0); // italic shear
  ctx.font = font(size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  // 3D extrusion: stacked offset copies, deep purple far edge -> magenta near edge.
  const depth = 8;
  const ox = size * 0.012;
  const oy = size * 0.017;
  for (let i = depth; i >= 1; i--) {
    ctx.fillStyle = lerpColor('#c9187f', '#3c1170', i / depth);
    ctx.fillText(text, i * ox, i * oy);
  }
  // Thick black outline, then the sunset gradient fill.
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeStyle = '#140423';
  ctx.lineWidth = size * 0.115;
  ctx.strokeText(text, 0, 0);
  const grad = ctx.createLinearGradient(0, -size * 0.92, 0, size * 0.12);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.42, '#fff4d8');
  grad.addColorStop(0.75, '#ffc25e');
  grad.addColorStop(1, '#ff8a3d');
  ctx.fillStyle = grad;
  ctx.fillText(text, 0, 0);
  ctx.restore();
  return { size, baselineY };
}

/** Script subtitle lockup: dark backing plate + thin pink keyline + strong
 *  neon glow, placed below-right of the title's extrusion shadow and seated
 *  fully inside ONE panel (never straddling a gutter), so it reads instantly
 *  even at thumbnail size. */
export function drawSubtitle(ctx, state, w, h, title, panels = []) {
  const text = (state.subtitle || '').trim();
  if (!text) return;
  const bandTop = h * 0.862;
  let s = Math.max(h * 0.03, Math.min(title.size * 0.28, h * 0.062));
  const plateTop = title.baselineY + title.size * 0.22; // clear of the extrusion
  const room = bandTop - h * 0.014 - plateTop;
  if (s * 1.62 > room) s = Math.max(h * 0.024, room / 1.62);
  ctx.save();
  ctx.font = font(s, SCRIPT);
  let textW = ctx.measureText(text).width;
  let plateW = textW + s * 1.1;
  let plateH = s * 1.62;
  let cx = w / 2 + title.size * 0.1; // below-RIGHT of the title center
  // Gutter-aware seating: keep the whole plate inside one host panel.
  const plateBottom = plateTop + plateH;
  const hosts = panels.filter((p) => p.y < plateBottom && p.y + p.h > plateTop);
  if (hosts.length) {
    const host =
      hosts.find((p) => cx >= p.x && cx <= p.x + p.w) ??
      hosts.reduce((a, b) => (b.w > a.w ? b : a));
    const pad = Math.max(8, w * 0.012);
    if (plateW > host.w - pad * 2) {
      s *= (host.w - pad * 2) / plateW;
      ctx.font = font(s, SCRIPT);
      textW = ctx.measureText(text).width;
      plateW = textW + s * 1.1;
      plateH = s * 1.62;
    }
    cx = Math.max(host.x + pad + plateW / 2, Math.min(host.x + host.w - pad - plateW / 2, cx));
  }
  cx = Math.max(plateW / 2 + w * 0.02, Math.min(w - plateW / 2 - w * 0.02, cx));
  const px = cx - plateW / 2;
  // Dark backing plate with a thin pink keyline.
  ctx.beginPath();
  roundRectPath(ctx, px, plateTop, plateW, plateH, s * 0.32);
  ctx.fillStyle = 'rgba(16,5,32,0.88)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,90,220,0.55)';
  ctx.lineWidth = Math.max(1.5, s * 0.05);
  ctx.stroke();
  // Script: thick black keyline, neon glow fill, bright core.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const ty = plateTop + plateH * 0.72;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#12041f';
  ctx.lineWidth = s * 0.18;
  ctx.strokeText(text, cx, ty);
  ctx.shadowColor = '#ff2fc4';
  ctx.shadowBlur = s * 0.55;
  ctx.fillStyle = '#ff7ae8';
  ctx.fillText(text, cx, ty);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,205,250,0.65)';
  ctx.fillText(text, cx, ty - s * 0.02);
  ctx.restore();
}

/** Press-quote banner: black strip, five gold stars, small white caps quote. */
export function drawQuoteBanner(ctx, state, w, h) {
  const text = (state.quote || '').trim().toUpperCase();
  if (!text) return;
  const bh = Math.max(18, h * 0.054);
  const fs = bh * 0.42;
  ctx.save();
  ctx.font = font(fs, CAPS, 700);
  const tracking = fs * 0.14;
  const chars = [...text];
  let textW = chars.reduce((acc, c) => acc + ctx.measureText(c).width, 0) + tracking * (chars.length - 1);
  const starR = bh * 0.17;
  const starsW = starR * 2.35 * 4 + starR * 2;
  const pad = bh * 0.42;
  const x = w * 0.03;
  const bw = w - x * 2; // full-width strip: balanced packaging, no dead stop
  const y = h * 0.03;
  ctx.translate(x, y);
  ctx.rotate(-0.008);
  ctx.fillStyle = '#0d0514';
  ctx.fillRect(0, 0, bw, bh);
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = Math.max(1, h * 0.0014);
  ctx.strokeRect(0, 0, bw, bh);
  drawStars(ctx, pad + starsW / 2, bh * 0.5, starR, 5, '#ffc63f');
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  // Reserve the right-aligned tag's width so quote and tag never share pixels.
  ctx.font = font(fs * 0.8, CAPS, 700);
  const tag = 'COLLECTOR COPY';
  const tagW = [...tag].reduce((acc, c) => acc + ctx.measureText(c).width, 0) + fs * 0.2 * (tag.length - 1);
  ctx.font = font(fs, CAPS, 700);
  const maxTextW = bw - starsW - pad * 3.6 - tagW;
  let track = tracking;
  if (textW > maxTextW) {
    const k = maxTextW / textW;
    ctx.font = font(fs * k, CAPS, 700);
    track *= k; // letter-spacing must shrink with the glyphs
  }
  drawTracked(ctx, text, pad * 1.7 + starsW, bh * 0.54, track, 'left');
  // Right-aligned counterweight so the strip reads balanced, not left-heavy.
  ctx.fillStyle = '#ffc63f';
  ctx.font = font(fs * 0.8, CAPS, 700);
  drawTracked(ctx, tag, bw - pad, bh * 0.54, fs * 0.2, 'right');
  ctx.restore();
}

/** Starburst seal: 22-point zigzag, pink fill, white ring, stacked rotated caps.
 *  Position is layout-aware so it overlaps a panel edge, never a face. */
export function drawSeal(ctx, state, w, h) {
  const r = Math.min(w, h) * 0.088;
  const spots = {
    tower: [0.87, 0.47],
    duel: [0.5, 0.16],
  };
  // Default: the hero panel's calm upper sky, clear of the face panel.
  const [fx, fy] = spots[state.layout] ?? [0.44, 0.19];
  const cx = w * fx;
  const cy = h * fy;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.09);
  ctx.beginPath();
  const points = 22;
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.84;
    const a = (i * Math.PI) / points - Math.PI / 2;
    const px = Math.cos(a) * rad;
    const py = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  grad.addColorStop(0, '#ff5fbe');
  grad.addColorStop(1, '#d61f8a');
  ctx.fillStyle = grad;
  ctx.shadowColor = 'rgba(20,4,35,0.5)';
  ctx.shadowBlur = r * 0.22;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = r * 0.05;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.64, 0, Math.PI * 2);
  ctx.stroke();
  ctx.rotate(-0.12);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  const fs = r * 0.27;
  ctx.font = font(fs, CAPS, 700);
  drawTracked(ctx, 'ORIGINAL', 0, -r * 0.16, fs * 0.18);
  drawTracked(ctx, 'EDITION', 0, r * 0.2, fs * 0.18);
  starPath(ctx, 0, -r * 0.42, r * 0.09);
  ctx.fill();
  ctx.restore();
}

/** HEAT wanted-level chip: one compact black corner badge (toggleable), so
 *  the five-star press quote stays the only big rating on the cover. */
export function drawHeatMeter(ctx, state, w, h) {
  const mh = Math.max(24, h * 0.042);
  const fs = mh * 0.44;
  ctx.save();
  ctx.font = font(fs, CAPS, 700);
  const label = 'HEAT';
  const track = fs * 0.3;
  const labelW = [...label].reduce((a, c) => a + ctx.measureText(c).width, 0) + track * (label.length - 1);
  const starR = mh * 0.2;
  const starsW = starR * 2.2 * 4 + starR * 2;
  const mw = labelW + starsW + mh * 0.9;
  const x = w - mw - w * 0.03;
  const y = h * 0.1; // below the full-width press-quote strip
  ctx.translate(x, y);
  ctx.beginPath();
  roundRectPath(ctx, 0, 0, mw, mh, mh * 0.24);
  ctx.fillStyle = '#0d0514';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = Math.max(1, h * 0.0014);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  drawTracked(ctx, label, mh * 0.42, mh * 0.54, track, 'left');
  drawStars(ctx, mh * 0.66 + labelW + starsW / 2, mh * 0.52, starR, 5, '#ff2fa0', 2.2);
  ctx.restore();
}

/** Tilted yellow VOL. 06 ticket tucked over a panel edge (layout-aware). */
export function drawTicket(ctx, state, w, h) {
  const tw = Math.max(84, w * 0.115);
  const th = Math.max(34, h * 0.062);
  // Classic keeps the ticket over the hero's car; other layouts tuck it into
  // the top-left sky so the wide title never buries it.
  const ty = state.layout === 'classic' ? 0.6 : 0.13;
  ctx.save();
  ctx.translate(w * 0.035 + tw / 2, h * ty + th / 2);
  ctx.rotate((-8 * Math.PI) / 180);
  ctx.shadowColor = 'rgba(20,4,35,0.45)';
  ctx.shadowBlur = th * 0.3;
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(-tw / 2, -th / 2, tw, th);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#140423';
  ctx.lineWidth = Math.max(1.5, th * 0.05);
  ctx.strokeRect(-tw / 2, -th / 2, tw, th);
  ctx.setLineDash([th * 0.12, th * 0.1]);
  ctx.beginPath();
  ctx.moveTo(-tw / 2 + th * 0.32, -th / 2 + th * 0.08);
  ctx.lineTo(-tw / 2 + th * 0.32, th / 2 - th * 0.08);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#140423';
  ctx.textBaseline = 'middle';
  let tfs = th * 0.46;
  ctx.font = font(tfs, CAPS, 700);
  const label = 'VOL. 06';
  const track = tfs * 0.11;
  const roomW = tw - th * 0.62; // keep clear of the perforated stub and edges
  const labelW = [...label].reduce((acc, c) => acc + ctx.measureText(c).width, 0) + track * (label.length - 1);
  if (labelW > roomW) {
    tfs *= roomW / labelW;
    ctx.font = font(tfs, CAPS, 700);
  }
  drawTracked(ctx, label, th * 0.16, 0, tfs * 0.11);
  ctx.restore();
}

/** Black palm silhouette: curved trunk + six sweeping fronds. */
function drawPalm(ctx, x, baseY, height, lean = 1) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.scale(lean, 1);
  ctx.fillStyle = '#12041f';
  ctx.strokeStyle = '#12041f';
  const topX = height * 0.14;
  const topY = -height;
  ctx.lineWidth = height * 0.065;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(height * 0.02, -height * 0.55, topX, topY);
  ctx.stroke();
  const fronds = [
    [-0.95, -0.42], [-0.62, -0.78], [-0.18, -0.95],
    [0.3, -0.9], [0.72, -0.64], [0.98, -0.28],
  ];
  for (const [fx, fy] of fronds) {
    const len = height * 0.52;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + fx * len * 0.55, topY + fy * len * 0.7, topX + fx * len, topY + fy * len * 0.34 + len * 0.18);
    ctx.quadraticCurveTo(topX + fx * len * 0.5, topY + fy * len * 0.44, topX, topY + height * 0.03);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Tagline band: pink->orange gradient, palms, slit half-sun, wide-tracked caps. */
export function drawTaglineBand(ctx, state, w, h) {
  const by = h * 0.862;
  const bh = h * 0.078;
  ctx.save();
  const grad = ctx.createLinearGradient(0, by, w, by);
  grad.addColorStop(0, '#ff2f9e');
  grad.addColorStop(0.5, '#ff5c63');
  grad.addColorStop(1, '#ff8a3d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, by, w, bh);
  // Half-sun with horizontal slits at the FAR LEFT of the band, so the
  // tracked caps never sit on it.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, by, w, bh);
  ctx.clip();
  const sunR = bh * 0.72;
  const sunX = w * 0.075;
  const sunY = by + bh * 1.05;
  ctx.fillStyle = '#12041f';
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ff4f7e';
  const slits = 3;
  for (let i = 0; i < slits; i++) {
    const sy = sunY - sunR * 0.5 + i * sunR * 0.2;
    const sh = sunR * (0.04 + i * 0.025);
    ctx.fillRect(sunX - sunR, sy, sunR * 2, sh);
  }
  ctx.restore();
  // One palm guarding the right end, clipped so it stays fully inside the band.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, by, w, bh);
  ctx.clip();
  drawPalm(ctx, w * 0.965, by + bh * 0.98, bh * 0.75, -1);
  ctx.restore();
  // The tagline: auto-fit into the clear zone right of the sun, outlined.
  const text = (state.tagline || '').trim().toUpperCase();
  if (text) {
    let fs = bh * 0.34;
    let tracking = fs * 0.34;
    ctx.font = font(fs, CAPS, 700);
    const measure = () =>
      [...text].reduce((acc, c) => acc + ctx.measureText(c).width, 0) + tracking * (text.length - 1);
    const roomW = w * 0.72;
    const tw = measure();
    if (tw > roomW) {
      const k = roomW / tw;
      fs *= k;
      tracking *= k;
      ctx.font = font(fs, CAPS, 700);
    }
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(18,4,31,0.9)';
    ctx.lineWidth = fs * 0.18;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(18,4,31,0.8)';
    ctx.shadowBlur = fs * 0.3;
    drawTracked(ctx, text, w * 0.55, by + bh * 0.54, tracking, 'center', true);
  }
  ctx.restore();
}

/** Catalog footer: pink logo chip, micro-caps credits, caption-seeded barcode. */
export function drawFooter(ctx, state, w, h) {
  const fy = h * 0.94;
  const fh = h * 0.06;
  ctx.save();
  ctx.fillStyle = '#120620';
  ctx.fillRect(0, fy, w, fh);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(0, fy, w, Math.max(1, h * 0.0015));
  // Logo chip.
  const chipW = fh * 1.3;
  const chipH = fh * 0.62;
  const chipX = w * 0.03;
  const chipY = fy + (fh - chipH) / 2;
  const chipGrad = ctx.createLinearGradient(chipX, chipY, chipX + chipW, chipY + chipH);
  chipGrad.addColorStop(0, '#ff2fa0');
  chipGrad.addColorStop(1, '#ff8a3d');
  ctx.fillStyle = chipGrad;
  ctx.fillRect(chipX, chipY, chipW, chipH);
  ctx.fillStyle = '#ffffff';
  ctx.font = font(chipH * 0.62);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HW', chipX + chipW / 2, chipY + chipH * 0.54);
  // Micro-caps credits line, auto-fit between the logo chip and the barcode.
  const credits = 'HEATWAVE COVER STUDIO · ORIGINAL ARTWORK · ALL PHOTOS SHOT ON LOCATION';
  const bcW = w * 0.125;
  const bcX = w - bcW - w * 0.03;
  const creditsX = chipX + chipW + fh * 0.5;
  const room = bcX - fh * 0.45 - creditsX;
  let fs = fh * 0.26;
  let tracking = fs * 0.16;
  ctx.font = font(fs, CAPS, 600);
  const measure = () =>
    [...credits].reduce((acc, c) => acc + ctx.measureText(c).width, 0) + tracking * (credits.length - 1);
  let textW = measure();
  if (textW > room) {
    const k = room / textW;
    fs *= k;
    tracking *= k;
    ctx.font = font(fs, CAPS, 600);
  }
  ctx.fillStyle = '#c9b3e8';
  drawTracked(ctx, credits, creditsX, fy + fh * 0.54, tracking, 'left');
  // Barcode: deterministic bar widths seeded from the caption text.
  const rand = mulberry32(hashSeed(state.caption || 'HEATWAVE'));
  const bcY = fy + fh * 0.16;
  const bcH = fh * 0.5;
  ctx.fillStyle = '#f4ecff';
  let cursor = bcX;
  const unit = bcW / 64;
  while (cursor < bcX + bcW - unit) {
    const barW = unit * (1 + Math.floor(rand() * 3));
    const gap = unit * (1 + Math.floor(rand() * 2));
    ctx.fillRect(cursor, bcY, Math.min(barW, bcX + bcW - cursor), bcH);
    cursor += barW + gap;
  }
  ctx.font = font(fh * 0.2, CAPS, 600);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#c9b3e8';
  let digits = '';
  for (let i = 0; i < 12; i++) digits += Math.floor(rand() * 10);
  ctx.fillText(digits, bcX + bcW / 2, fy + fh * 0.86);
  ctx.restore();
}

/** All packaging furniture, each piece toggleable from the editor. */
export function drawFurniture(ctx, state, w, h) {
  const f = state.furniture ?? {};
  if (f.band !== false) drawTaglineBand(ctx, state, w, h);
  if (f.footer !== false) drawFooter(ctx, state, w, h);
  if (f.quote !== false) drawQuoteBanner(ctx, state, w, h);
  if (f.heat !== false) drawHeatMeter(ctx, state, w, h);
  if (f.ticket !== false) drawTicket(ctx, state, w, h);
  if (f.seal !== false) drawSeal(ctx, state, w, h);
}
