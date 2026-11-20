// editor.js — everything the maker touches: the photo strip (samples +
// uploads), layout and grade pickers, caption fields, title sliders, furniture
// toggles, export buttons, and direct manipulation of the preview — click a
// panel to select it, drag to pan, wheel or slider to zoom. All local, no
// network: uploads go FileReader -> ImageBitmap and never leave the page.

import { LAYOUTS, layoutById, panelGeometry, hitPanel, drawLayoutThumb, defaultFx } from './panels.js';
import { GRADES } from './grade.js';

const SHAPES = {
  landscape: { w: 1280, h: 720, label: '16:9' },
  square: { w: 1080, h: 1080, label: '1:1' },
  portrait: { w: 1080, h: 1350, label: '4:5' },
};

export function shapeSize(shape) {
  return SHAPES[shape] ?? SHAPES.landscape;
}

/**
 * Wire the whole sidebar + canvas to the shared state. `api` provides:
 *   state, canvas, photos (Map id -> {bitmap, name, thumb, stats}),
 *   onChange() (schedules a live re-render), addFiles(FileList),
 *   exportCover(w, h), setStatus(text)
 */
export function initEditor(api) {
  const { state, canvas, photos, onChange, addFiles, exportCover, setStatus } = api;
  const $ = (id) => document.getElementById(id);

  // ---------- photo strip ----------
  const strip = $('photo-strip');
  function renderStrip() {
    strip.innerHTML = '';
    const selectedPhoto =
      state.selected >= 0 ? state.assignments[state.selected % state.assignments.length] : null;
    for (const [id, entry] of photos) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'thumb' + (id === selectedPhoto ? ' used' : '');
      btn.title = `${entry.name} — click to ${state.selected >= 0 ? 'fill panel ' + (state.selected + 1) : 'fill every panel'}`;
      const img = document.createElement('img');
      img.src = entry.thumb;
      img.alt = entry.name;
      img.draggable = false;
      const tag = document.createElement('span');
      tag.textContent = entry.name;
      btn.append(img, tag);
      btn.addEventListener('click', () => {
        if (state.selected >= 0) {
          const idx = state.selected % state.assignments.length;
          state.assignments[idx] = id;
          state.panelFx[idx % state.panelFx.length] = defaultFx(id);
          setStatus(`Panel ${state.selected + 1} ← ${entry.name}`);
        } else {
          state.assignments = state.assignments.map(() => id);
          state.panelFx = state.panelFx.map(() => defaultFx(id));
          setStatus(`Every panel ← ${entry.name}`);
        }
        updatePanelBox();
        renderStrip();
        onChange();
      });
      strip.appendChild(btn);
    }
  }

  $('add-photos').addEventListener('click', () => $('file-input').click());
  $('file-input').addEventListener('change', (e) => {
    addFiles(e.target.files);
    e.target.value = '';
  });

  // Drag-and-drop anywhere on the page.
  const overlay = $('drop-overlay');
  let dragDepth = 0;
  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragDepth++;
    overlay.classList.add('show');
  });
  window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) overlay.classList.remove('show');
  });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    overlay.classList.remove('show');
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  });

  // ---------- layout picker ----------
  const layoutPicker = $('layout-picker');
  const layoutButtons = [];
  LAYOUTS.forEach((layout) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'layout-btn';
    btn.dataset.layout = layout.id;
    const thumb = document.createElement('canvas');
    thumb.width = 64;
    thumb.height = 44;
    const label = document.createElement('span');
    label.textContent = layout.name;
    btn.append(thumb, label);
    btn.title = layout.hint;
    btn.addEventListener('click', () => {
      state.layout = layout.id;
      state.selected = -1;
      syncLayoutPicker();
      renderStrip();
      updatePanelBox();
      onChange();
    });
    layoutPicker.appendChild(btn);
    layoutButtons.push({ btn, thumb, layout });
  });
  function syncLayoutPicker() {
    layoutButtons.forEach(({ btn, thumb, layout }) => {
      const active = layout.id === state.layout;
      btn.classList.toggle('active', active);
      drawLayoutThumb(thumb, layout, active);
    });
  }

  // ---------- grade picker + intensity ----------
  const gradePicker = $('grade-picker');
  const gradeButtons = [];
  GRADES.forEach((grade) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'grade-btn';
    const chip = document.createElement('i');
    chip.style.background = `linear-gradient(135deg, ${grade.chip[0]}, ${grade.chip[1]}, ${grade.chip[2]})`;
    const label = document.createElement('span');
    label.textContent = grade.name;
    btn.append(chip, label);
    btn.addEventListener('click', () => {
      state.grade = grade.id;
      syncGradePicker();
      onChange();
    });
    gradePicker.appendChild(btn);
    gradeButtons.push({ btn, grade });
  });
  function syncGradePicker() {
    gradeButtons.forEach(({ btn, grade }) => btn.classList.toggle('active', grade.id === state.grade));
  }
  bindRange('intensity', (v) => {
    state.intensity = v / 100;
  });

  // ---------- text fields ----------
  bindText('caption', (v) => (state.caption = v));
  bindText('subtitle', (v) => (state.subtitle = v));
  bindText('tagline', (v) => (state.tagline = v));
  bindText('quote', (v) => (state.quote = v));

  // ---------- title sliders ----------
  bindRange('title-scale', (v) => (state.titleScale = v / 100), (v) => `${v}%`);
  bindRange('title-tilt', (v) => (state.titleTilt = v / 10), (v) => `${(v / 10).toFixed(1)}°`);
  bindRange('title-y', (v) => (state.titleY = v / 100), (v) => `${v}%`);

  // ---------- furniture toggles + gutter ----------
  ['quote', 'seal', 'heat', 'ticket', 'band', 'footer'].forEach((key) => {
    const box = $(`f-${key}`);
    box.checked = state.furniture[key] !== false;
    box.addEventListener('change', () => {
      state.furniture[key] = box.checked;
      onChange();
    });
  });
  $('gutter').value = state.gutter;
  $('gutter').addEventListener('change', (e) => {
    state.gutter = e.target.value;
    onChange();
  });

  // ---------- selected panel box ----------
  const panelLabel = $('panel-label');
  const zoomSlider = $('panel-zoom');
  function updatePanelBox() {
    const box = $('panel-box');
    if (state.selected < 0) {
      box.classList.add('idle');
      panelLabel.textContent = 'Click a panel in the preview to select it';
      zoomSlider.disabled = true;
      $('panel-reset').disabled = true;
      $('fill-all').disabled = true;
      return;
    }
    box.classList.remove('idle');
    const layout = layoutById(state.layout);
    const fx = state.panelFx[state.selected % state.panelFx.length];
    panelLabel.textContent = `Panel ${state.selected + 1} of ${layout.cells.length}`;
    zoomSlider.disabled = false;
    zoomSlider.value = Math.round(fx.zoom * 100);
    $('panel-zoom-val').textContent = `${fx.zoom.toFixed(2)}x`;
    $('panel-reset').disabled = false;
    $('fill-all').disabled = false;
  }
  zoomSlider.addEventListener('input', () => {
    if (state.selected < 0) return;
    const fx = state.panelFx[state.selected % state.panelFx.length];
    fx.zoom = Number(zoomSlider.value) / 100;
    $('panel-zoom-val').textContent = `${fx.zoom.toFixed(2)}x`;
    onChange();
  });
  $('panel-reset').addEventListener('click', () => {
    if (state.selected < 0) return;
    const fx = state.panelFx[state.selected % state.panelFx.length];
    fx.zoom = 1;
    fx.panX = 0;
    fx.panY = 0;
    updatePanelBox();
    onChange();
  });
  $('fill-all').addEventListener('click', () => {
    if (state.selected < 0) return;
    const id = state.assignments[state.selected % state.assignments.length];
    state.assignments = state.assignments.map(() => id);
    renderStrip();
    setStatus('Every panel now uses the selected photo');
    onChange();
  });
  $('panel-deselect').addEventListener('click', () => {
    state.selected = -1;
    updatePanelBox();
    renderStrip();
    onChange();
  });

  // ---------- canvas: select / pan / zoom ----------
  function canvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }
  function currentPanels() {
    return panelGeometry(layoutById(state.layout), canvas.width, canvas.height);
  }
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    const pt = canvasPoint(e);
    const idx = hitPanel(currentPanels(), pt.x, pt.y);
    state.selected = idx;
    updatePanelBox();
    renderStrip();
    if (idx >= 0) {
      const fx = state.panelFx[idx % state.panelFx.length];
      drag = { idx, startX: e.clientX, startY: e.clientY, panX: fx.panX, panY: fx.panY };
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* synthetic or unsupported pointer ids — dragging still works */
      }
    }
    onChange();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const panel = currentPanels()[drag.idx];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const fx = state.panelFx[drag.idx % state.panelFx.length];
    // Content follows the finger: dragging right/down moves the photo with it.
    const overX = Math.max(1, panel.w * (fx.zoom - 1));
    const overY = Math.max(1, panel.h * (fx.zoom - 1));
    fx.panX = clamp(drag.panX + ((e.clientX - drag.startX) * scaleX * 2) / overX, -1, 1);
    fx.panY = clamp(drag.panY + ((e.clientY - drag.startY) * scaleY * 2) / overY, -1, 1);
    onChange();
  });
  const endDrag = () => (drag = null);
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener(
    'wheel',
    (e) => {
      const pt = canvasPoint(e);
      const idx = hitPanel(currentPanels(), pt.x, pt.y);
      if (idx < 0) return;
      e.preventDefault();
      state.selected = idx;
      const fx = state.panelFx[idx % state.panelFx.length];
      fx.zoom = clamp(fx.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08), 1, 3);
      updatePanelBox();
      renderStrip();
      onChange();
    },
    { passive: false },
  );

  // ---------- preview shape tabs ----------
  document.querySelectorAll('.shape-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.shape = btn.dataset.shape;
      syncShapeTabs();
      resizePreview();
      onChange();
    });
  });
  function syncShapeTabs() {
    document.querySelectorAll('.shape-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.shape === state.shape);
    });
  }
  function resizePreview() {
    const size = shapeSize(state.shape);
    canvas.width = size.w;
    canvas.height = size.h;
  }

  // ---------- export ----------
  const exports = [
    ['export-square', 1080, 1080, 'square'],
    ['export-portrait', 1080, 1350, 'portrait'],
    ['export-landscape', 1920, 1080, 'landscape'],
  ];
  exports.forEach(([id, w, h, shape]) => {
    $(id).addEventListener('click', async () => {
      state.shape = shape;
      syncShapeTabs();
      resizePreview();
      onChange();
      setStatus(`Rendering ${w} x ${h} PNG…`);
      try {
        const name = await exportCover(w, h);
        setStatus(`Saved ${name}`);
      } catch (err) {
        setStatus(`Export failed: ${err.message}`);
      }
    });
  });

  // ---------- helpers ----------
  function bindRange(id, apply, fmt) {
    const input = $(id);
    const out = $(`${id}-val`);
    const show = () => {
      if (out) out.textContent = fmt ? fmt(Number(input.value)) : input.value;
    };
    input.addEventListener('input', () => {
      apply(Number(input.value));
      show();
      onChange();
    });
    show();
  }
  function bindText(id, apply) {
    const input = $(id);
    input.value = state[textKey(id)];
    input.addEventListener('input', () => {
      apply(input.value);
      onChange();
    });
  }
  function textKey(id) {
    return id; // caption / subtitle / tagline / quote match state keys
  }

  // First sync of everything.
  resizePreview();
  syncLayoutPicker();
  syncGradePicker();
  syncShapeTabs();
  renderStrip();
  updatePanelBox();
  api.refreshStrip = renderStrip;
  api.updatePanelBox = updatePanelBox;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
