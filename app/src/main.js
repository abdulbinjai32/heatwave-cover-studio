// main.js — bootstraps HEATWAVE Cover Studio: shared state, the local photo
// registry (8 built-in samples + uploads), font loading, and the live preview
// loop (every edit marks dirty, one rAF repaints). In ?shot= mode the shot
// scene takes over instead of the editor. Everything runs offline from static
// files; photos are read locally and never uploaded.

import { composeCover, exportPNG } from './cover.js';
import { initEditor, shapeSize } from './editor.js';
import { defaultFx } from './panels.js';
import { runShot } from './shots.js';

const SAMPLE_NAMES = ['hero', 'face', 'neon', 'boats', 'deco', 'skyline', 'pier', 'boulevard'];

const state = {
  layout: 'classic',
  grade: 'sunset',
  intensity: 0.88,
  gutter: 'white',
  caption: 'HEATWAVE',
  subtitle: 'Neon Tide',
  tagline: 'SUNSET STRIP · NEON NIGHTS · OPEN ROAD',
  quote: '“A LOVE LETTER TO THE COAST” — COAST WEEKLY',
  titleScale: 1,
  titleTilt: -2.5,
  titleY: 0.72,
  furniture: { quote: true, seal: true, heat: false, ticket: true, band: true, footer: true },
  assignments: [...SAMPLE_NAMES],
  panelFx: SAMPLE_NAMES.map(defaultFx),
  selected: -1,
  shape: 'landscape',
};

const photos = new Map(); // id -> { bitmap, name, thumb, stats }
const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

/** Load a local image URL via onload (reliable even in throttled tabs, where
 *  img.decode() can stall). Samples are drawn straight from the
 *  HTMLImageElement; uploads use FileReader -> createImageBitmap. */
function loadBitmap(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${url}`));
    img.src = url;
    if (img.complete && img.naturalWidth > 0) resolve(img);
  });
}

async function loadSample(name) {
  if (photos.has(name)) return;
  const url = `samples/${name}.jpg`;
  const bitmap = await loadBitmap(url);
  photos.set(name, { bitmap, name, thumb: url, stats: photoStats(bitmap) });
}

/**
 * Measure a photo's mean luma + saturation on a tiny deterministic sample.
 * cover.js turns these into a per-photo exposure/saturation normalization so
 * washed-out high-key photos (the hero, deco) land at the same value as the
 * already-saturated night shots BEFORE the shared hue grade — one painted
 * world, not "same filter, different exposure".
 */
function photoStats(drawable) {
  const c = document.createElement('canvas');
  c.width = 24;
  c.height = 24;
  const cx = c.getContext('2d', { willReadFrequently: true });
  cx.drawImage(drawable, 0, 0, 24, 24);
  const d = cx.getImageData(0, 0, 24, 24).data;
  let luma = 0;
  let sat = 0;
  const n = 24 * 24;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255;
    const g = d[i + 1] / 255;
    const b = d[i + 2] / 255;
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    luma += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sat += mx === 0 ? 0 : (mx - mn) / mx;
  }
  return { luma: luma / n, sat: sat / n };
}

/** FileReader -> Image -> ImageBitmap for uploads; thumbnails drawn locally. */
function readUpload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.onload = async () => {
      try {
        const img = await loadBitmap(reader.result);
        const bitmap = await createImageBitmap(img);
        const stats = photoStats(bitmap);
        const tc = document.createElement('canvas');
        const scale = 96 / Math.max(bitmap.width, bitmap.height);
        tc.width = Math.max(1, Math.round(bitmap.width * scale));
        tc.height = Math.max(1, Math.round(bitmap.height * scale));
        tc.getContext('2d').drawImage(bitmap, 0, 0, tc.width, tc.height);
        resolve({ bitmap, thumb: tc.toDataURL('image/jpeg', 0.75), stats });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsDataURL(file);
  });
}

let uploadCounter = 0;
async function addFiles(fileList) {
  const files = [...fileList].filter((f) => f.type.startsWith('image/'));
  if (!files.length) {
    setStatus('Drop image files (JPEG / PNG / WebP)');
    return;
  }
  let firstId = null;
  for (const file of files) {
    try {
      const { bitmap, thumb, stats } = await readUpload(file);
      const id = `up-${++uploadCounter}`;
      const name = file.name.replace(/\.[^.]+$/, '').slice(0, 18) || `photo ${uploadCounter}`;
      photos.set(id, { bitmap, name, thumb, stats });
      if (!firstId) firstId = id;
    } catch {
      setStatus(`Skipped ${file.name} — not a readable image`);
    }
  }
  if (firstId) {
    if (state.selected >= 0) {
      state.assignments[state.selected % state.assignments.length] = firstId;
    } else {
      state.assignments = state.assignments.map(() => firstId);
    }
    setStatus(`Loaded ${files.length} photo${files.length > 1 ? 's' : ''} — drag inside a panel to frame it`);
  }
  editorApi.refreshStrip?.();
  markDirty();
}

// ---------- live preview loop ----------
let dirty = true;
let rafPending = false;
function markDirty() {
  dirty = true;
  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(paint);
    // Hidden/throttled tabs pause rAF; a short timer keeps the preview live.
    setTimeout(() => {
      if (dirty) paint();
    }, 32);
  }
}
function paint() {
  rafPending = false;
  if (!dirty) return;
  dirty = false;
  composeCover(ctx, state, canvas.width, canvas.height, photos, true);
}
function renderNow() {
  dirty = false;
  composeCover(ctx, state, canvas.width, canvas.height, photos, !document.body.classList.contains('shot-cover'));
}

// ---------- fonts ----------
async function loadFonts() {
  const faces = [
    '400 100px Anton',
    '400 100px Pacifico',
    '700 100px "Barlow Condensed"',
    '600 100px "Barlow Condensed"',
  ];
  await Promise.all(faces.map((f) => document.fonts.load(f)));
  await document.fonts.ready;
}

// ---------- boot ----------
const editorApi = {
  state,
  canvas,
  photos,
  onChange: markDirty,
  addFiles,
  exportCover: (w, h) => exportPNG(state, photos, w, h),
  setStatus,
};

async function boot() {
  const fontsReady = loadFonts().catch(() => {});
  await Promise.all(SAMPLE_NAMES.map(loadSample));
  await fontsReady;
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot === 'cover' || shot === 'editor') {
    await runShot(query, {
      state,
      canvas,
      photos,
      loadSample,
      renderNow,
      setStatus,
    });
    if (shot === 'editor') {
      // The editor screenshot must show fully populated controls.
      initEditor(editorApi);
      markDirty();
    }
    // Hold headless virtual time open until the scene is actually painted.
    const keepAlive = setInterval(() => {
      if (window.__shotReady) clearInterval(keepAlive);
    }, 100);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.__shotReady = true;
      });
    });
    return;
  }
  const size = shapeSize(state.shape);
  canvas.width = size.w;
  canvas.height = size.h;
  initEditor(editorApi);
  markDirty();
  setStatus('Pick a photo, type a caption, export. Drag panels to frame them.');
}

boot().catch((err) => {
  setStatus(`Could not start: ${err.message}`);
  console.error(err);
});
