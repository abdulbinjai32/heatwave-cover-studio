// grade.js — ONE unified colour grade per cover, so mixed photos read as a
// single painted world. The grade composites over the WHOLE collage (inside
// the union of the panel clips, so gutters stay clean): a 'color' blend pass
// re-hues every panel toward one palette, then shared multiply / screen /
// overlay gradients steer shadows, highlights and saturation. On top: one
// shared subtle bloom and one deep-purple vignette (never pure black).
// No grain. No Math.random — renders are reproducible.

export const GRADES = [
  {
    id: 'sunset',
    name: 'Vice Sunset',
    chip: ['#ffd28a', '#ff4fa0', '#7a3cf0'],
    targetLuma: 0.44,
    // gold highlights -> hot magenta midtones -> warm deep purple shadows
    hue: [
      [0, '#ffb347'],
      [0.42, '#ff2f9e'],
      [1, '#c22a8a'],
    ],
    hueAlpha: 0.76,
    multiply: [
      [0, 'rgba(255,158,84,1)'],
      [0.5, 'rgba(255,88,168,1)'],
      [1, 'rgba(180,60,160,1)'],
    ],
    multiplyAlpha: 0.5,
    screen: [
      [0, 'rgba(255,170,80,1)'],
      [0.55, 'rgba(255,80,160,1)'],
      [1, 'rgba(150,40,140,1)'],
    ],
    screenAlpha: 0.26,
    overlay: [
      [0, 'rgba(255,140,50,1)'],
      [1, 'rgba(255,40,150,1)'],
    ],
    overlayAlpha: 0.38,
    vignette: 'rgba(26,8,46,0.5)',
    bloomTint: 'rgba(255,190,150,1)',
  },
  {
    id: 'neon',
    name: 'Neon Night',
    chip: ['#37e6e0', '#b04cf0', '#ff2f9e'],
    targetLuma: 0.18,
    // one teal-magenta night look across every panel
    hue: [
      [0, '#2ee6e0'],
      [0.5, '#b04cf0'],
      [1, '#ff2f9e'],
    ],
    hueAlpha: 0.8,
    multiply: [
      [0, 'rgba(30,110,140,1)'],
      [0.5, 'rgba(80,30,150,1)'],
      [1, 'rgba(50,25,130,1)'],
    ],
    multiplyAlpha: 0.7,
    screen: [
      [0, 'rgba(20,140,150,1)'],
      [0.5, 'rgba(110,50,190,1)'],
      [1, 'rgba(220,40,150,1)'],
    ],
    screenAlpha: 0.16,
    overlay: [
      [0, 'rgba(0,180,200,1)'],
      [1, 'rgba(200,30,160,1)'],
    ],
    overlayAlpha: 0.3,
    vignette: 'rgba(12,6,38,0.55)',
    bloomTint: 'rgba(170,220,255,1)',
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    chip: ['#ffe9b0', '#ffb35c', '#e0705a'],
    targetLuma: 0.46,
    hue: [
      [0, '#ffd28a'],
      [0.55, '#ff9e5c'],
      [1, '#e0705a'],
    ],
    hueAlpha: 0.58,
    multiply: [
      [0, 'rgba(255,214,148,1)'],
      [0.55, 'rgba(255,158,96,1)'],
      [1, 'rgba(158,84,124,1)'],
    ],
    multiplyAlpha: 0.5,
    screen: [
      [0, 'rgba(255,206,128,1)'],
      [1, 'rgba(255,128,74,1)'],
    ],
    screenAlpha: 0.32,
    overlay: [
      [0, 'rgba(255,176,64,1)'],
      [1, 'rgba(232,94,64,1)'],
    ],
    overlayAlpha: 0.28,
    vignette: 'rgba(36,12,40,0.45)',
    bloomTint: 'rgba(255,214,160,1)',
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

function verticalGradient(ctx, h, stops) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  for (const [pos, color] of stops) grad.addColorStop(pos, color);
  return grad;
}

/**
 * The unified grade. Call INSIDE a clip covering the union of all panels:
 * every photo is pulled toward the same palette in one shared pass, while
 * the gutters outside the clip stay untouched.
 */
export function gradeCollage(ctx, grade, intensity, w, h) {
  const k = Math.max(0, Math.min(1, intensity));
  if (k <= 0.01) return;
  ctx.save();
  // Re-hue every panel toward the grade's palette (keeps luminance).
  ctx.globalCompositeOperation = 'color';
  ctx.globalAlpha = grade.hueAlpha * k;
  ctx.fillStyle = verticalGradient(ctx, h, grade.hue);
  ctx.fillRect(0, 0, w, h);
  // Shared shadow steer: gold top, magenta mid, deep purple bottom.
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = grade.multiplyAlpha * k;
  ctx.fillStyle = verticalGradient(ctx, h, grade.multiply);
  ctx.fillRect(0, 0, w, h);
  // Shared highlight lift — shadows land on purple, never pure black.
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = grade.screenAlpha * k;
  ctx.fillStyle = verticalGradient(ctx, h, grade.screen);
  ctx.fillRect(0, 0, w, h);
  // Shared saturation/contrast pop.
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = grade.overlayAlpha * k;
  ctx.fillStyle = verticalGradient(ctx, h, grade.overlay);
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Deterministic hash + PRNG so barcodes repeat exactly per caption. */
export function hashSeed(text) {
  let hash = 2166136261 >>> 0;
  const s = String(text ?? '');
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One shared atmosphere over the graded collage (call inside the same union
 * clip): subtle bright-pass bloom, a warm/cool kiss of light, and a single
 * deep-purple vignette. Kept light — heavy effects read as artefacts.
 */
export function applyAtmosphere(ctx, w, h, grade, intensity) {
  const k = Math.max(0, Math.min(1, intensity));
  // Bloom: downscale, crush mids so only bright areas survive, blur, screen back.
  const bw = Math.max(2, Math.round(w / 4));
  const bh = Math.max(2, Math.round(h / 4));
  const bloom = document.createElement('canvas');
  bloom.width = bw;
  bloom.height = bh;
  const bctx = bloom.getContext('2d');
  bctx.drawImage(ctx.canvas, 0, 0, bw, bh);
  bctx.globalCompositeOperation = 'multiply';
  bctx.fillStyle = 'rgb(128,120,128)';
  bctx.fillRect(0, 0, bw, bh);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.18 * k;
  ctx.filter = `blur(${Math.max(3, Math.round(w * 0.006))}px)`;
  ctx.drawImage(bloom, 0, 0, w, h);
  ctx.restore();
  // Shared glow where the sun would be.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const glow = ctx.createRadialGradient(w * 0.5, h * 0.16, 0, w * 0.5, h * 0.16, Math.max(w, h) * 0.62);
  glow.addColorStop(0, grade.bloomTint.replace('1)', `${0.14 * k})`));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  // One shared vignette: deep purple, never pure black.
  ctx.save();
  const vig = ctx.createRadialGradient(w * 0.5, h * 0.44, Math.min(w, h) * 0.34, w * 0.5, h * 0.46, Math.max(w, h) * 0.82);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, grade.vignette);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
