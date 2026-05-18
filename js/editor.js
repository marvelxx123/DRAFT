/* ============================================================
   WEARIT Design Studio — editor.js
   Vanilla JS + Fabric.js 5.3.0
   ============================================================ */

'use strict';

// ──────────────────────────────────────────────────────────────
// SECTION 1: PRODUCT CONFIG
// ──────────────────────────────────────────────────────────────

const PRODUCTS = {
  tshirt:       { name: 'T-Shirt',       emoji: '👕', price: 24.99, surfaces: { front: 'Front', back: 'Back' },      canvas: { w: 500, h: 580 }, defaultColor: '#ffffff', shape: 'tshirt' },
  hoodie:       { name: 'Hoodie',        emoji: '🧥', price: 44.99, surfaces: { front: 'Front', back: 'Back' },      canvas: { w: 500, h: 580 }, defaultColor: '#cccccc', shape: 'hoodie' },
  mug:          { name: 'Mug',           emoji: '☕', price: 14.99, surfaces: { wrap: 'Wrap' },                      canvas: { w: 600, h: 260 }, defaultColor: '#ffffff', shape: 'mug' },
  pen:          { name: 'Pen',           emoji: '🖊️', price: 4.99,  surfaces: { barrel: 'Barrel' },                 canvas: { w: 480, h: 100 }, defaultColor: '#1a1a1a', shape: 'pen' },
  business_card:{ name: 'Business Card', emoji: '💼', price: 19.99, surfaces: { front: 'Front', back: 'Back' },      canvas: { w: 500, h: 280 }, defaultColor: '#ffffff', shape: 'card' },
  cap:          { name: 'Cap',           emoji: '🧢', price: 22.99, surfaces: { front: 'Front', back: 'Back' },      canvas: { w: 500, h: 340 }, defaultColor: '#1a1a1a', shape: 'cap' },
  tote:         { name: 'Tote Bag',      emoji: '👜', price: 18.99, surfaces: { front: 'Front', back: 'Back' },      canvas: { w: 480, h: 560 }, defaultColor: '#f5f5dc', shape: 'tote' },
  phone_case:   { name: 'Phone Case',    emoji: '📱', price: 16.99, surfaces: { back: 'Back' },                     canvas: { w: 360, h: 620 }, defaultColor: '#000000', shape: 'phone' },
  notebook:     { name: 'Notebook',      emoji: '📓', price: 12.99, surfaces: { front: 'Front', back: 'Back' },      canvas: { w: 440, h: 600 }, defaultColor: '#ffffff', shape: 'card' },
  poster:       { name: 'Poster',        emoji: '🖼️', price: 9.99,  surfaces: { front: 'Front' },                   canvas: { w: 480, h: 680 }, defaultColor: '#ffffff', shape: 'rect' },
  glasses:      { name: 'Sunglasses',    emoji: '🕶️', price: 34.99, surfaces: { frame: 'Frame' },                   canvas: { w: 600, h: 220 }, defaultColor: '#1a1a1a', shape: 'glasses' },
  glass_panel:  { name: 'Glass Panel',   emoji: '🪟', price: 39.99, surfaces: { front: 'Front' },                   canvas: { w: 500, h: 380 }, defaultColor: '#c8e8ff', shape: 'glass' },
  sticker:      { name: 'Sticker',       emoji: '⭐', price: 3.99,  surfaces: { front: 'Design' },                  canvas: { w: 400, h: 400 }, defaultColor: '#ffffff', shape: 'sticker' },
  pillow:       { name: 'Throw Pillow',  emoji: '🛋️', price: 27.99, surfaces: { front: 'Front', back: 'Back' },     canvas: { w: 500, h: 500 }, defaultColor: '#f0f0f0', shape: 'pillow' },
  canvas_print: { name: 'Canvas Print',  emoji: '🎨', price: 49.99, surfaces: { front: 'Front' },                   canvas: { w: 560, h: 420 }, defaultColor: '#ffffff', shape: 'canvas' },
  coaster:      { name: 'Coaster',       emoji: '🫗', price: 8.99,  surfaces: { top: 'Top' },                       canvas: { w: 400, h: 400 }, defaultColor: '#f5f0e8', shape: 'coaster' },
  keychain:     { name: 'Keychain',      emoji: '🔑', price: 6.99,  surfaces: { front: 'Front', back: 'Back' },     canvas: { w: 280, h: 380 }, defaultColor: '#c8a84b', shape: 'keychain' },
  water_bottle: { name: 'Water Bottle',  emoji: '💧', price: 24.99, surfaces: { wrap: 'Wrap' },                     canvas: { w: 480, h: 320 }, defaultColor: '#d0d8e0', shape: 'bottle' },
  socks:        { name: 'Custom Socks',  emoji: '🧦', price: 12.99, surfaces: { left: 'Left', right: 'Right' },     canvas: { w: 320, h: 480 }, defaultColor: '#ffffff', shape: 'sock' },
  face_mask:    { name: 'Face Mask',     emoji: '😷', price: 9.99,  surfaces: { front: 'Front' },                   canvas: { w: 440, h: 280 }, defaultColor: '#ffffff', shape: 'mask' },
};

// ──────────────────────────────────────────────────────────────
// SECTION 2: APP STATE
// ──────────────────────────────────────────────────────────────

const state = {
  productId:    'tshirt',
  surfaceKey:   'front',
  productColor: '#ffffff',
  zoom:         1,
  activeTool:   'select',
  activePanelId: null,
  defaultFill:  '#6366f1',
  defaultStroke:'#000000',
  defaultStrokeW: 0,
  // Per-surface canvas JSON storage: key = "productId-surfaceKey"
  surfaceDesigns: {},
  // Undo/redo stacks
  undoStack:    [],
  redoStack:    [],
  historyPaused:false,
  // Drawing state
  drawing: { active: false, startX: 0, startY: 0, obj: null },
};

// ──────────────────────────────────────────────────────────────
// SECTION 3: FABRIC CANVAS INIT
// ──────────────────────────────────────────────────────────────

let canvas;         // fabric.Canvas instance
let safeAreaRect;   // dashed safe-area guide (not exported)
let baseW, baseH;   // base canvas dimensions (unscaled)

function initCanvas() {
  const product = PRODUCTS[state.productId];
  baseW = product.canvas.w;
  baseH = product.canvas.h;

  canvas = new fabric.Canvas('designCanvas', {
    width:              baseW,
    height:             baseH,
    backgroundColor:    null,
    preserveObjectStacking: true,
    selection:          true,
    selectionColor:     'rgba(99,102,241,0.1)',
    selectionBorderColor: '#6366f1',
    selectionLineWidth: 1,
  });

  // Customize control handles to indigo
  fabric.Object.prototype.set({
    borderColor:        '#6366f1',
    cornerColor:        '#6366f1',
    cornerStrokeColor:  '#fff',
    cornerSize:         10,
    transparentCorners: false,
    borderScaleFactor:  1.5,
    padding:            4,
  });

  addSafeAreaGuide();
  fitZoom();
  bindCanvasEvents();
}

function addSafeAreaGuide() {
  const product = PRODUCTS[state.productId];
  const pad = product.shape === 'pen' ? 6 : 24;
  safeAreaRect = new fabric.Rect({
    left:            pad,
    top:             pad,
    width:           baseW - pad * 2,
    height:          baseH - pad * 2,
    fill:            'transparent',
    stroke:          '#6366f1',
    strokeWidth:     1.5,
    strokeDashArray: [8, 6],
    opacity:         0.4,
    selectable:      false,
    evented:         false,
    excludeFromExport: true,
    name:            '__safeArea__',
  });
  canvas.add(safeAreaRect);
}

// ──────────────────────────────────────────────────────────────
// SECTION 4: PRODUCT SWITCHING
// ──────────────────────────────────────────────────────────────

function switchProduct(productId) {
  // Save current canvas
  saveSurface();

  state.productId  = productId;
  state.surfaceKey = Object.keys(PRODUCTS[productId].surfaces)[0];
  state.productColor = PRODUCTS[productId].defaultColor;

  updateProductUI();
  updateSurfaceTabs();
  resizeCanvasForProduct();
  renderMockup();
  restoreSurface();
  fitZoom();
  updateCartPrice();
  closePanel();
}

function switchSurface(key) {
  saveSurface();
  state.surfaceKey = key;
  updateSurfaceTabsActive();
  restoreSurface();
}

function saveSurface() {
  const key = surfaceKey();
  const json = canvas.toJSON(['name', 'excludeFromExport']);
  state.surfaceDesigns[key] = JSON.stringify(json);
}

function restoreSurface() {
  const key = surfaceKey();
  state.historyPaused = true;
  canvas.clear();
  if (state.surfaceDesigns[key]) {
    canvas.loadFromJSON(state.surfaceDesigns[key], () => {
      const existing = canvas.getObjects().find(o => o.name === '__safeArea__');
      if (existing) {
        safeAreaRect = existing;
        safeAreaRect.selectable = false;
        safeAreaRect.evented = false;
      } else {
        addSafeAreaGuide();
      }
      canvas.renderAll();
      state.historyPaused = false;
      saveHistory();
    });
  } else {
    addSafeAreaGuide();
    canvas.renderAll();
    state.historyPaused = false;
    saveHistory();
  }
}

function surfaceKey() {
  return state.productId + '-' + state.surfaceKey;
}

function resizeCanvasForProduct() {
  const product = PRODUCTS[state.productId];
  baseW = product.canvas.w;
  baseH = product.canvas.h;
  canvas.setWidth(baseW * state.zoom);
  canvas.setHeight(baseH * state.zoom);
  canvas.setZoom(state.zoom);
}

// ──────────────────────────────────────────────────────────────
// SECTION 5: MOCKUP RENDERING
// ──────────────────────────────────────────────────────────────

function renderMockup() {
  const product = PRODUCTS[state.productId];
  const shape = product.shape;
  const color = state.productColor;
  const mockup = document.getElementById('mockupShape');
  mockup.innerHTML = '';
  mockup.className = '';

  const lighter = lightenColor(color, 20);
  const darker  = darkenColor(color, 20);

  switch (shape) {
    case 'tshirt':
    case 'hoodie': {
      mockup.innerHTML = `
        <div class="shirt-sleeve shirt-sleeve-l" style="background:${color};filter:brightness(0.88)"></div>
        <div class="shirt-sleeve shirt-sleeve-r" style="background:${color};filter:brightness(0.88)"></div>
        <div class="shirt-body" style="background:${color}"></div>
        <div class="shirt-collar" style="background:${darkenColor(color,12)}"></div>
        ${shape === 'hoodie' ? `<div class="hoodie-pocket" style="border-color:${darkenColor(color,18)}"></div>` : ''}
      `;
      mockup.className = shape === 'hoodie' ? 'mockup-hoodie' : 'mockup-tshirt';
      break;
    }
    case 'mug': {
      mockup.innerHTML = `
        <div class="mug-body" style="background:${color}"></div>
        <div class="mug-handle" style="border-color:${darker}"></div>
        <div class="mug-base"></div>
      `;
      mockup.className = 'mockup-mug';
      break;
    }
    case 'pen': {
      mockup.innerHTML = `
        <div class="pen-body" style="background:linear-gradient(180deg,${lighter} 0%,${color} 40%,${darker} 100%)"></div>
        <div class="pen-cap" style="background:${darkenColor(color,30)}"></div>
        <div class="pen-tip"></div>
      `;
      mockup.className = 'mockup-pen';
      break;
    }
    case 'card': {
      mockup.style.cssText = `background:${color};border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.07)`;
      mockup.className = 'mockup-card';
      break;
    }
    case 'cap': {
      mockup.innerHTML = `
        <div class="cap-crown" style="background:${color}"></div>
        <div class="cap-brim"></div>
      `;
      mockup.className = 'mockup-cap';
      break;
    }
    case 'tote': {
      mockup.innerHTML = `
        <div class="tote-handle-l" style="border-color:${darker}"></div>
        <div class="tote-handle-r" style="border-color:${darker}"></div>
        <div class="tote-body" style="background:${color}"></div>
      `;
      mockup.className = 'mockup-tote';
      break;
    }
    case 'phone': {
      mockup.style.cssText = `background:${color};border-radius:32px;box-shadow:0 4px 24px rgba(0,0,0,.25),0 0 0 2px ${darker}`;
      mockup.innerHTML = `<div class="phone-notch"></div><div class="phone-btn-r"></div>`;
      mockup.className = 'mockup-phone';
      break;
    }
    case 'glasses': {
      mockup.innerHTML = `
        <div class="glasses-lens glasses-lens-l" style="background:${color};border-color:${darker}"></div>
        <div class="glasses-bridge" style="background:${darker}"></div>
        <div class="glasses-lens glasses-lens-r" style="background:${color};border-color:${darker}"></div>
        <div class="glasses-arm glasses-arm-l" style="background:${darker}"></div>
        <div class="glasses-arm glasses-arm-r" style="background:${darker}"></div>
      `;
      mockup.className = 'mockup-glasses';
      break;
    }
    case 'glass': {
      mockup.style.cssText = `background:linear-gradient(135deg,${color} 0%,rgba(255,255,255,.6) 50%,${color} 100%);border-radius:4px;box-shadow:0 6px 32px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.7)`;
      mockup.className = 'mockup-rect';
      break;
    }
    case 'sticker': {
      mockup.style.cssText = `background:${color};border-radius:50%;box-shadow:0 4px 16px rgba(0,0,0,.2),0 0 0 4px ${darker},0 0 0 8px ${color}`;
      mockup.className = 'mockup-sticker';
      break;
    }
    case 'pillow': {
      mockup.innerHTML = `<div class="pillow-body" style="background:${color};border-color:${darker}"></div>`;
      mockup.className = 'mockup-pillow';
      break;
    }
    case 'canvas': {
      mockup.innerHTML = `
        <div class="canvas-frame" style="background:${color}"></div>
        <div class="canvas-edge-t" style="background:${darkenColor(color,15)}"></div>
        <div class="canvas-edge-r" style="background:${darkenColor(color,25)}"></div>
      `;
      mockup.className = 'mockup-canvas';
      break;
    }
    case 'coaster': {
      mockup.style.cssText = `background:${color};border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.25),0 0 0 3px ${darker}`;
      mockup.className = 'mockup-coaster';
      break;
    }
    case 'keychain': {
      mockup.innerHTML = `
        <div class="keychain-ring" style="border-color:${darkenColor(color,20)}"></div>
        <div class="keychain-body" style="background:linear-gradient(160deg,${lighter},${color},${darker})"></div>
      `;
      mockup.className = 'mockup-keychain';
      break;
    }
    case 'bottle': {
      mockup.innerHTML = `
        <div class="bottle-cap" style="background:${darkenColor(color,30)}"></div>
        <div class="bottle-neck" style="background:${darker}"></div>
        <div class="bottle-body" style="background:linear-gradient(180deg,${lighter} 0%,${color} 40%,${darker} 100%)"></div>
      `;
      mockup.className = 'mockup-bottle';
      break;
    }
    case 'sock': {
      mockup.innerHTML = `
        <div class="sock-leg" style="background:${color}"></div>
        <div class="sock-heel" style="background:${darker}"></div>
        <div class="sock-foot" style="background:${color}"></div>
        <div class="sock-toe" style="background:${darker}"></div>
      `;
      mockup.className = 'mockup-sock';
      break;
    }
    case 'mask': {
      mockup.innerHTML = `
        <div class="mask-body" style="background:${color}"></div>
        <div class="mask-pleat-1" style="background:${darkenColor(color,8)}"></div>
        <div class="mask-pleat-2" style="background:${darkenColor(color,14)}"></div>
        <div class="mask-loop-l" style="border-color:${darker}"></div>
        <div class="mask-loop-r" style="border-color:${darker}"></div>
      `;
      mockup.className = 'mockup-mask';
      break;
    }
    case 'rect':
    default: {
      mockup.style.cssText = `background:${color};border-radius:4px;box-shadow:0 6px 24px rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.06)`;
      mockup.className = 'mockup-rect';
      break;
    }
  }
}

function setProductColor(color) {
  state.productColor = color;
  document.getElementById('productColorCustom').value = color;
  document.getElementById('productColorHex').value = color;
  // Update active swatch
  document.querySelectorAll('.swatch-btn').forEach(s => {
    s.classList.toggle('active', s.dataset.color === color);
    s.style.outline = s.dataset.color === color ? '2px solid #6366f1' : 'none';
    s.style.outlineOffset = '2px';
  });
  renderMockup();
}

// ──────────────────────────────────────────────────────────────
// SECTION 6: ZOOM
// ──────────────────────────────────────────────────────────────

function setZoom(z) {
  state.zoom = Math.max(0.25, Math.min(3, z));
  canvas.setWidth(baseW * state.zoom);
  canvas.setHeight(baseH * state.zoom);
  canvas.setZoom(state.zoom);
  document.getElementById('zoomLabel').textContent = Math.round(state.zoom * 100) + '%';
  canvas.renderAll();
}

function zoomIn()  { setZoom(parseFloat((state.zoom + 0.1).toFixed(2))); }
function zoomOut() { setZoom(parseFloat((state.zoom - 0.1).toFixed(2))); }

function fitZoom() {
  const stage  = document.getElementById('stage');
  const sw     = stage.clientWidth  - 80;
  const sh     = stage.clientHeight - 80;
  const product = PRODUCTS[state.productId];
  const z = Math.min(sw / product.canvas.w, sh / product.canvas.h, 1.2);
  setZoom(Math.max(0.25, parseFloat(z.toFixed(2))));
}

// ──────────────────────────────────────────────────────────────
// SECTION 7: TOOLS
// ──────────────────────────────────────────────────────────────

const DRAW_TOOLS = ['rect', 'circle', 'triangle', 'star', 'line'];

function setTool(toolName) {
  // Close any open panels if switching away from panel tools
  if (!['templates', 'clipart'].includes(toolName)) {
    closePanel();
  }

  state.activeTool = toolName;

  // Update toolbar active state
  document.querySelectorAll('.tool-btn[data-tool]').forEach(b => {
    b.classList.toggle('active', b.dataset.tool === toolName);
  });

  // Update body cursor class
  document.body.className = 'tool-' + toolName;

  // Handle draw mode
  if (toolName === 'draw') {
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush.color = state.defaultFill;
    canvas.freeDrawingBrush.width = 4;
    canvas.selection = false;
  } else {
    canvas.isDrawingMode = false;
    canvas.selection = toolName === 'select';
  }

  if (toolName === 'select') {
    canvas.defaultCursor = 'default';
  }
}

function triggerImageUpload() {
  document.getElementById('imageUploadInput').click();
}

function onImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    fabric.Image.fromURL(ev.target.result, function(img) {
      // Scale image to fit within canvas
      const maxW = baseW * 0.7;
      const maxH = baseH * 0.7;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      img.set({
        left:   (baseW - img.width  * scale) / 2,
        top:    (baseH - img.height * scale) / 2,
        scaleX: scale,
        scaleY: scale,
      });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      setTool('select');
    });
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

// Star polygon helper
function starPoints(cx, cy, outerR, innerR, numPoints = 5) {
  const pts = [];
  for (let i = 0; i < numPoints * 2; i++) {
    const angle = (i * Math.PI / numPoints) - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return pts;
}

// ──────────────────────────────────────────────────────────────
// SECTION 8: CANVAS MOUSE EVENTS (draw tools)
// ──────────────────────────────────────────────────────────────

function bindCanvasEvents() {
  canvas.on('mouse:down', onMouseDown);
  canvas.on('mouse:move', onMouseMove);
  canvas.on('mouse:up',   onMouseUp);

  canvas.on('object:added',    onCanvasChanged);
  canvas.on('object:modified', onCanvasChanged);
  canvas.on('object:removed',  onCanvasChanged);

  canvas.on('selection:created',  onSelectionChange);
  canvas.on('selection:updated',  onSelectionChange);
  canvas.on('selection:cleared',  onSelectionCleared);

  canvas.on('object:modified',    syncPropPanel);
  canvas.on('object:scaling',     syncPropPanel);
  canvas.on('object:moving',      syncPropPanel);
  canvas.on('object:rotating',    syncPropPanel);
  canvas.on('text:changed',       syncPropPanel);
}

function onMouseDown(opt) {
  const tool = state.activeTool;
  if (!DRAW_TOOLS.includes(tool)) return;
  if (opt.target) return; // clicked existing object

  const ptr = canvas.getPointer(opt.e);
  state.drawing.active = true;
  state.drawing.startX = ptr.x;
  state.drawing.startY = ptr.y;

  const commonOpts = {
    left:        ptr.x,
    top:         ptr.y,
    fill:        state.defaultFill,
    stroke:      state.defaultStroke,
    strokeWidth: state.defaultStrokeW,
    selectable:  true,
    originX:     'left',
    originY:     'top',
  };

  let obj = null;
  switch (tool) {
    case 'rect':
      obj = new fabric.Rect({ ...commonOpts, width: 1, height: 1 });
      break;
    case 'circle':
      obj = new fabric.Ellipse({ ...commonOpts, rx: 1, ry: 1 });
      break;
    case 'triangle':
      obj = new fabric.Triangle({ ...commonOpts, width: 1, height: 1 });
      break;
    case 'star': {
      const pts = starPoints(0, 0, 1, 0.4);
      obj = new fabric.Polygon(pts, {
        ...commonOpts,
        originX: 'center',
        originY: 'center',
        left: ptr.x,
        top:  ptr.y,
      });
      break;
    }
    case 'line':
      obj = new fabric.Line([ptr.x, ptr.y, ptr.x, ptr.y], {
        stroke:      state.defaultFill,
        strokeWidth: 3,
        selectable:  true,
      });
      break;
  }

  if (obj) {
    canvas.add(obj);
    state.drawing.obj = obj;
    canvas.renderAll();
  }
}

function onMouseMove(opt) {
  if (!state.drawing.active || !state.drawing.obj) return;
  const ptr  = canvas.getPointer(opt.e);
  const obj  = state.drawing.obj;
  const tool = state.activeTool;
  const sx   = state.drawing.startX;
  const sy   = state.drawing.startY;

  const w = Math.abs(ptr.x - sx);
  const h = Math.abs(ptr.y - sy);
  const x = Math.min(ptr.x, sx);
  const y = Math.min(ptr.y, sy);

  switch (tool) {
    case 'rect':
    case 'triangle':
      obj.set({ left: x, top: y, width: w, height: h });
      break;
    case 'circle':
      obj.set({ left: x, top: y, rx: w / 2, ry: h / 2 });
      break;
    case 'star': {
      const r = Math.max(w, h) / 2;
      const pts = starPoints(0, 0, r, r * 0.4);
      obj.set({ points: pts, left: sx, top: sy });
      obj._calcDimensions();
      break;
    }
    case 'line':
      obj.set({ x2: ptr.x, y2: ptr.y });
      break;
  }

  obj.setCoords();
  canvas.renderAll();
}

function onMouseUp() {
  if (!state.drawing.active) return;
  state.drawing.active = false;

  if (state.drawing.obj) {
    canvas.setActiveObject(state.drawing.obj);
    state.drawing.obj = null;
  }
  setTool('select');
}

// Register an additional mouse:down handler for the text tool.
// Called after initCanvas() so `canvas` is defined.
function setupTextTool() {
  canvas.on('mouse:down', function(opt) {
    if (state.activeTool !== 'text') return;
    if (opt.target) return; // clicked existing object — let Fabric handle it

    const ptr = canvas.getPointer(opt.e);
    const txt = new fabric.IText('Your Text', {
      left:       ptr.x,
      top:        ptr.y,
      fontFamily: 'Inter',
      fontSize:   32,
      fill:       '#000000',
      originX:    'left',
      originY:    'top',
    });
    canvas.add(txt);
    canvas.setActiveObject(txt);
    txt.enterEditing();
    txt.selectAll();
    canvas.renderAll();
    setTool('select');
  });
}

// ──────────────────────────────────────────────────────────────
// SECTION 9: HISTORY (UNDO / REDO)
// ──────────────────────────────────────────────────────────────

let historyDebounce = null;

function onCanvasChanged() {
  if (state.historyPaused) return;
  clearTimeout(historyDebounce);
  historyDebounce = setTimeout(saveHistory, 100);
}

function saveHistory() {
  if (state.historyPaused) return;
  const json = JSON.stringify(canvas.toJSON(['name', 'excludeFromExport']));
  // Don't save if identical to last
  if (state.undoStack.length && state.undoStack[state.undoStack.length - 1] === json) return;
  state.undoStack.push(json);
  if (state.undoStack.length > 20) state.undoStack.shift();
  state.redoStack = [];
  updateHistoryButtons();
}

function undo() {
  if (state.undoStack.length <= 1) return;
  const current = state.undoStack.pop();
  state.redoStack.push(current);
  const prev = state.undoStack[state.undoStack.length - 1];
  loadJSON(prev);
  updateHistoryButtons();
}

function redo() {
  if (!state.redoStack.length) return;
  const next = state.redoStack.pop();
  state.undoStack.push(next);
  loadJSON(next);
  updateHistoryButtons();
}

function loadJSON(json) {
  state.historyPaused = true;
  canvas.loadFromJSON(json, function() {
    // Find or re-add safe area and update reference
    const existing = canvas.getObjects().find(o => o.name === '__safeArea__');
    if (existing) {
      safeAreaRect = existing;
      safeAreaRect.selectable = false;
      safeAreaRect.evented = false;
    } else {
      addSafeAreaGuide();
    }
    canvas.renderAll();
    state.historyPaused = false;
  });
}

function updateHistoryButtons() {
  document.getElementById('undoBtn').disabled = state.undoStack.length <= 1;
  document.getElementById('redoBtn').disabled = state.redoStack.length === 0;
}

// ──────────────────────────────────────────────────────────────
// SECTION 10: PROPERTIES PANEL
// ──────────────────────────────────────────────────────────────

function onSelectionChange() {
  document.getElementById('ppNoSelection').style.display = 'none';
  document.getElementById('ppSelection').style.display   = '';
  syncPropPanel();
}

function onSelectionCleared() {
  document.getElementById('ppNoSelection').style.display = '';
  document.getElementById('ppSelection').style.display   = 'none';
}

function syncPropPanel() {
  const obj = canvas.getActiveObject();
  if (!obj) return;

  const bR = obj.getBoundingRect(true);
  setEl('ppX', Math.round(obj.left));
  setEl('ppY', Math.round(obj.top));
  setEl('ppW', Math.round(bR.width));
  setEl('ppH', Math.round(bR.height));
  setEl('ppRot', Math.round(obj.angle || 0));

  // Fill
  const fill = (obj.fill && obj.fill !== 'transparent') ? obj.fill : '#6366f1';
  if (obj.fill && obj.fill !== 'transparent') {
    try {
      const hex = colorToHex(obj.fill);
      document.getElementById('ppFill').value    = hex;
      document.getElementById('ppFillHex').value = hex;
    } catch(e) {}
  }

  // Stroke
  try {
    const sHex = colorToHex(obj.stroke || '#000000');
    document.getElementById('ppStroke').value    = sHex;
    document.getElementById('ppStrokeHex').value = sHex;
  } catch(e) {}
  const sw = document.getElementById('ppStrokeW');
  sw.value = obj.strokeWidth || 0;
  document.getElementById('ppStrokeWVal').textContent = (obj.strokeWidth || 0) + 'px';

  // Opacity
  const op = document.getElementById('ppOpacity');
  op.value = Math.round((obj.opacity || 1) * 100);
  document.getElementById('ppOpacityVal').textContent = op.value + '%';

  // Text section
  const isText = obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox';
  document.getElementById('ppTextSection').style.display = isText ? '' : 'none';

  if (isText) {
    const ffSel = document.getElementById('ppFontFamily');
    ffSel.value = obj.fontFamily || 'Inter';

    setEl('ppFontSize', obj.fontSize || 32);

    try {
      document.getElementById('ppTextColor').value = colorToHex(obj.fill || '#000000');
    } catch(e) {}

    // Bold / Italic / Underline
    toggleActive('ppBold',      obj.fontWeight === 'bold');
    toggleActive('ppItalic',    obj.fontStyle  === 'italic');
    toggleActive('ppUnderline', !!obj.underline);

    // Align
    toggleActive('ppAlignLeft',   obj.textAlign === 'left' || !obj.textAlign);
    toggleActive('ppAlignCenter', obj.textAlign === 'center');
    toggleActive('ppAlignRight',  obj.textAlign === 'right');

    // Line height slider
    const lhSlider = document.getElementById('ppLineH');
    const lhVal    = Math.round((obj.lineHeight || 1.2) * 100);
    lhSlider.value = lhVal;
    document.getElementById('ppLineHVal').textContent = (lhVal / 100).toFixed(1);

    // Letter spacing
    const lsSlider = document.getElementById('ppLetterS');
    const lsVal    = Math.round((obj.charSpacing || 0) / 10);
    lsSlider.value = lsVal;
    document.getElementById('ppLetterSVal').textContent = (lsVal / 10).toFixed(1);
  }
}

// Apply position/size/rotation
function applyTransform() {
  const obj = canvas.getActiveObject();
  if (!obj) return;

  const x = parseFloat(document.getElementById('ppX').value);
  const y = parseFloat(document.getElementById('ppY').value);
  const w = parseFloat(document.getElementById('ppW').value);
  const h = parseFloat(document.getElementById('ppH').value);
  const r = parseFloat(document.getElementById('ppRot').value);

  if (!isNaN(x)) obj.set('left', x);
  if (!isNaN(y)) obj.set('top', y);
  if (!isNaN(r)) obj.set('angle', r);

  if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
    const bR = obj.getBoundingRect(true);
    if (bR.width > 0)  obj.set('scaleX', (obj.scaleX || 1) * w / bR.width);
    if (bR.height > 0) obj.set('scaleY', (obj.scaleY || 1) * h / bR.height);
  }

  obj.setCoords();
  canvas.renderAll();
}

function applyFill() {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  obj.set('fill', document.getElementById('ppFill').value);
  canvas.renderAll();
}

function applyNoFill() {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  obj.set('fill', 'transparent');
  canvas.renderAll();
}

function applyStroke() {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  obj.set('stroke',      document.getElementById('ppStroke').value);
  obj.set('strokeWidth', parseInt(document.getElementById('ppStrokeW').value));
  canvas.renderAll();
}

function applyOpacity() {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  obj.set('opacity', parseInt(document.getElementById('ppOpacity').value) / 100);
  canvas.renderAll();
}

function applyTextProps() {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  const ff = document.getElementById('ppFontFamily').value;
  const fs = parseFloat(document.getElementById('ppFontSize').value);
  const lh = parseFloat(document.getElementById('ppLineH').value) / 100;
  const ls = parseFloat(document.getElementById('ppLetterS').value) * 10;

  if (ff) obj.set('fontFamily', ff);
  if (!isNaN(fs) && fs > 0) obj.set('fontSize', fs);
  if (!isNaN(lh)) obj.set('lineHeight', lh);
  if (!isNaN(ls)) obj.set('charSpacing', ls);
  canvas.renderAll();
}

function applyTextColor() {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  obj.set('fill', document.getElementById('ppTextColor').value);
  canvas.renderAll();
}

function toggleTextStyle(style) {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  switch (style) {
    case 'bold':
      obj.set('fontWeight', obj.fontWeight === 'bold' ? 'normal' : 'bold');
      break;
    case 'italic':
      obj.set('fontStyle', obj.fontStyle === 'italic' ? 'normal' : 'italic');
      break;
    case 'underline':
      obj.set('underline', !obj.underline);
      break;
  }
  canvas.renderAll();
  syncPropPanel();
}

function applyTextAlign(align) {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  obj.set('textAlign', align);
  canvas.renderAll();
  syncPropPanel();
}

function layerOp(op) {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  switch (op) {
    case 'front': canvas.bringToFront(obj); break;
    case 'up':    canvas.bringForward(obj); break;
    case 'down':  canvas.sendBackwards(obj); break;
    case 'back':  canvas.sendToBack(obj); break;
  }
  // Keep safe area at actual back (index 0)
  if (safeAreaRect) canvas.sendToBack(safeAreaRect);
  canvas.renderAll();
}

function alignObj(direction) {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  const bR = obj.getBoundingRect(true);
  switch (direction) {
    case 'left':    obj.set('left', 0); break;
    case 'hcenter': obj.set('left', (baseW - bR.width)  / 2); break;
    case 'right':   obj.set('left', baseW - bR.width); break;
    case 'top':     obj.set('top', 0); break;
    case 'vcenter': obj.set('top', (baseH - bR.height) / 2); break;
    case 'bottom':  obj.set('top', baseH - bR.height); break;
  }
  obj.setCoords();
  canvas.renderAll();
}

function deleteSelected() {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  if (obj.type === 'activeSelection') {
    obj.getObjects().forEach(o => canvas.remove(o));
    canvas.discardActiveObject();
  } else {
    canvas.remove(obj);
  }
  canvas.renderAll();
}

function duplicateSelected() {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  obj.clone(function(clone) {
    clone.set({ left: obj.left + 20, top: obj.top + 20 });
    canvas.add(clone);
    canvas.setActiveObject(clone);
    canvas.renderAll();
  });
}

function setCanvasBg(color) {
  if (color === 'transparent') {
    canvas.setBackgroundColor(null, canvas.renderAll.bind(canvas));
  } else {
    canvas.setBackgroundColor(color, canvas.renderAll.bind(canvas));
  }
}

function syncColorFromHex(colorInputId, hexInputId) {
  const hex = document.getElementById(hexInputId).value;
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    document.getElementById(colorInputId).value = hex;
  }
}

function toggleSection(head) {
  head.closest('.pp-section').classList.toggle('collapsed');
  head.querySelector('.pp-chevron').textContent = head.closest('.pp-section').classList.contains('collapsed') ? '▸' : '▾';
}

// ──────────────────────────────────────────────────────────────
// SECTION 11: TEMPLATES
// ──────────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    name: 'Bold Headline',
    thumb: { bg: '#1a1a1a', emoji: '✍️', text: 'YOUR TEXT' },
    build: (w, h) => {
      const objs = [];
      objs.push(new fabric.Line([w * 0.1, h * 0.38, w * 0.9, h * 0.38], { stroke: '#ffffff', strokeWidth: 3 }));
      objs.push(new fabric.IText('YOUR TEXT', {
        left: w / 2, top: h / 2, originX: 'center', originY: 'center',
        fontFamily: 'Anton', fontSize: Math.round(w * 0.13), fill: '#ffffff', textAlign: 'center',
      }));
      objs.push(new fabric.Line([w * 0.1, h * 0.62, w * 0.9, h * 0.62], { stroke: '#ffffff', strokeWidth: 3 }));
      return objs;
    },
  },
  {
    name: 'Circle Badge',
    thumb: { bg: '#2563eb', emoji: '🏷️', text: 'BRAND' },
    build: (w, h) => {
      const r = Math.min(w, h) * 0.3;
      const cx = w / 2, cy = h / 2;
      const objs = [];
      objs.push(new fabric.Circle({ left: cx - r, top: cy - r, radius: r, fill: 'transparent', stroke: '#ffffff', strokeWidth: 4 }));
      objs.push(new fabric.IText('BRAND NAME', {
        left: cx, top: cy - 14, originX: 'center', originY: 'center',
        fontFamily: 'Bebas Neue', fontSize: Math.round(r * 0.38), fill: '#ffffff', textAlign: 'center',
      }));
      objs.push(new fabric.IText('est. 2024', {
        left: cx, top: cy + 20, originX: 'center', originY: 'center',
        fontFamily: 'Inter', fontSize: Math.round(r * 0.18), fill: 'rgba(255,255,255,0.7)', textAlign: 'center',
      }));
      const pts = starPoints(cx, cy - r * 0.55, r * 0.09, r * 0.04);
      objs.push(new fabric.Polygon(pts, { fill: '#facc15', originX: 'center', originY: 'center', left: cx, top: cy - r * 0.55 }));
      return objs;
    },
  },
  {
    name: 'Minimal Logo',
    thumb: { bg: '#f8fafc', emoji: '▪️', text: 'Company' },
    build: (w, h) => {
      const objs = [];
      const boxSz = Math.min(w, h) * 0.18;
      objs.push(new fabric.Rect({
        left: w / 2 - boxSz / 2, top: h * 0.3,
        width: boxSz, height: boxSz,
        fill: '#6366f1', rx: 6, ry: 6,
      }));
      objs.push(new fabric.IText('COMPANY', {
        left: w / 2, top: h * 0.3 + boxSz + 16, originX: 'center',
        fontFamily: 'Montserrat', fontSize: Math.round(w * 0.065), fill: '#0f172a',
        fontWeight: '700', textAlign: 'center', charSpacing: 300,
      }));
      objs.push(new fabric.IText('tagline goes here', {
        left: w / 2, top: h * 0.3 + boxSz + 52, originX: 'center',
        fontFamily: 'Inter', fontSize: Math.round(w * 0.03), fill: '#64748b', textAlign: 'center',
      }));
      return objs;
    },
  },
  {
    name: 'Vintage',
    thumb: { bg: '#78350f', emoji: '🌿', text: 'VINTAGE' },
    build: (w, h) => {
      const objs = [];
      objs.push(new fabric.IText('VINTAGE', {
        left: w / 2, top: h * 0.28, originX: 'center',
        fontFamily: 'Oswald', fontSize: Math.round(w * 0.11), fill: '#fbbf24',
        fontWeight: '700', charSpacing: 200, textAlign: 'center',
      }));
      objs.push(new fabric.Line([w * 0.15, h * 0.42, w * 0.85, h * 0.42], { stroke: '#fbbf24', strokeWidth: 2 }));
      objs.push(new fabric.IText('Est. 1924', {
        left: w / 2, top: h * 0.46, originX: 'center',
        fontFamily: 'Playfair Display', fontSize: Math.round(w * 0.055), fill: '#fff8e7',
        fontStyle: 'italic', textAlign: 'center',
      }));
      objs.push(new fabric.IText('QUALITY GOODS', {
        left: w / 2, top: h * 0.6, originX: 'center',
        fontFamily: 'Oswald', fontSize: Math.round(w * 0.045), fill: '#fbbf24',
        charSpacing: 400, textAlign: 'center',
      }));
      [0.2, 0.5, 0.8].forEach(px => {
        const pts = starPoints(w * px, h * 0.72, 8, 4);
        objs.push(new fabric.Polygon(pts, { fill: '#fbbf24', left: w * px, top: h * 0.72, originX: 'center', originY: 'center' }));
      });
      return objs;
    },
  },
  {
    name: 'Sports Bold',
    thumb: { bg: '#dc2626', emoji: '🏆', text: '99' },
    build: (w, h) => {
      const objs = [];
      // Diagonal accent
      objs.push(new fabric.Rect({
        left: -20, top: h * 0.35, width: w + 40, height: h * 0.32,
        fill: '#1e40af', angle: -5, selectable: true,
      }));
      objs.push(new fabric.IText('99', {
        left: w / 2, top: h * 0.22, originX: 'center',
        fontFamily: 'Bebas Neue', fontSize: Math.round(w * 0.3), fill: '#ffffff', textAlign: 'center',
      }));
      objs.push(new fabric.IText('TEAM NAME', {
        left: w / 2, top: h * 0.55, originX: 'center',
        fontFamily: 'Bebas Neue', fontSize: Math.round(w * 0.1), fill: '#facc15',
        charSpacing: 300, textAlign: 'center',
      }));
      objs.push(new fabric.IText('SINCE 1998', {
        left: w / 2, top: h * 0.72, originX: 'center',
        fontFamily: 'Inter', fontSize: Math.round(w * 0.035), fill: '#ffffff',
        fontWeight: '700', charSpacing: 200, textAlign: 'center',
      }));
      return objs;
    },
  },
  {
    name: 'Script Elegant',
    thumb: { bg: '#f0fdf4', emoji: '✨', text: 'Elegant' },
    build: (w, h) => {
      const objs = [];
      objs.push(new fabric.IText('Elegant', {
        left: w / 2, top: h * 0.3, originX: 'center',
        fontFamily: 'Pacifico', fontSize: Math.round(w * 0.12), fill: '#065f46', textAlign: 'center',
      }));
      objs.push(new fabric.Line([w * 0.2, h * 0.5, w * 0.8, h * 0.5], { stroke: '#059669', strokeWidth: 1 }));
      objs.push(new fabric.IText('your subtle subtitle here', {
        left: w / 2, top: h * 0.55, originX: 'center',
        fontFamily: 'Inter', fontSize: Math.round(w * 0.035), fill: '#64748b',
        fontStyle: 'italic', textAlign: 'center', charSpacing: 100,
      }));
      return objs;
    },
  },
];

function loadTemplate(tpl) {
  // Clear canvas objects except safe area
  canvas.getObjects().filter(o => o.name !== '__safeArea__').forEach(o => canvas.remove(o));
  const objs = tpl.build(baseW, baseH);
  objs.forEach(o => canvas.add(o));
  if (safeAreaRect) canvas.bringToFront(safeAreaRect);
  canvas.renderAll();
  closePanel();
  showToast('Template loaded!');
}

function renderTemplatesPanel(body) {
  body.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'template-grid';

  TEMPLATES.forEach((tpl, i) => {
    const card = document.createElement('div');
    card.className = 'template-card';
    const t = tpl.thumb;
    card.innerHTML = `
      <div class="template-thumb" style="background:${t.bg}; color:${t.bg === '#f8fafc' || t.bg === '#f0fdf4' ? '#0f172a' : '#fff'}">
        <div style="font-size:28px">${t.emoji}</div>
        <div style="font-weight:800;letter-spacing:1px">${t.text}</div>
      </div>
      <div class="template-name">${tpl.name}</div>
    `;
    card.addEventListener('click', () => loadTemplate(tpl));
    grid.appendChild(card);
  });
  body.appendChild(grid);
}

// ──────────────────────────────────────────────────────────────
// SECTION 12: CLIPART
// ──────────────────────────────────────────────────────────────

const CLIPART = {
  'Stars & Symbols': ['⭐','🌟','💫','✨','❤️','💙','💜','💚','🔥','⚡','💎','👑','🏆','🎯','🎨','🌈','✅','💡'],
  'Nature':          ['🌿','🌸','🌺','🍀','🌙','☀️','🌊','🦋','🌻','🍁','🌴','🌵','🦁','🦅'],
  'Food':            ['🍕','🍔','🌮','🍣','🍦','☕','🍺','🍷','🍎','🍓','🍭','🍩'],
  'Sports':          ['⚽','🏀','🎾','🏈','⚾','🏊','🚴','🏋️','🥊','🎿','🏄'],
  'Music':           ['🎵','🎸','🎹','🎺','🥁','🎤','🎧','🎼','🎻','🎷'],
  'Business':        ['💼','📊','💡','🌐','📱','✉️','📌','🔗','📝','💰','🚀'],
};

function addClipart(emoji) {
  const txt = new fabric.Text(emoji, {
    left:       baseW / 2,
    top:        baseH / 2,
    originX:    'center',
    originY:    'center',
    fontSize:   80,
    selectable: true,
  });
  canvas.add(txt);
  canvas.setActiveObject(txt);
  canvas.renderAll();
  closePanel();
  showToast('Clipart added!');
}

function renderClipartPanel(body) {
  body.innerHTML = '';
  Object.entries(CLIPART).forEach(([cat, items]) => {
    const sec = document.createElement('div');
    sec.className = 'clipart-category';
    sec.innerHTML = `<div class="clipart-cat-title">${cat}</div>`;
    const grid = document.createElement('div');
    grid.className = 'clipart-grid';
    items.forEach(emoji => {
      const btn = document.createElement('div');
      btn.className = 'clipart-item';
      btn.textContent = emoji;
      btn.title = emoji;
      btn.addEventListener('click', () => addClipart(emoji));
      grid.appendChild(btn);
    });
    sec.appendChild(grid);
    body.appendChild(sec);
  });
}

// ──────────────────────────────────────────────────────────────
// SECTION 13: SLIDE PANEL
// ──────────────────────────────────────────────────────────────

function openPanel(panelId) {
  const panel = document.getElementById('slidePanel');
  const title = document.getElementById('slidePanelTitle');
  const body  = document.getElementById('slidePanelBody');

  if (state.activePanelId === panelId && panel.classList.contains('open')) {
    closePanel();
    return;
  }

  state.activePanelId = panelId;
  title.textContent = panelId === 'templates' ? 'Templates' : 'Clipart';

  if (panelId === 'templates') {
    renderTemplatesPanel(body);
  } else {
    renderClipartPanel(body);
  }

  panel.classList.add('open');

  // Highlight toolbar button
  document.querySelectorAll('.tool-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tool === panelId);
  });
}

function closePanel() {
  document.getElementById('slidePanel').classList.remove('open');
  state.activePanelId = null;
  // Restore active tool highlight
  document.querySelectorAll('.tool-btn[data-tool]').forEach(b => {
    b.classList.toggle('active', b.dataset.tool === state.activeTool);
  });
}

// ──────────────────────────────────────────────────────────────
// SECTION 14: TOP BAR UI
// ──────────────────────────────────────────────────────────────

function buildProductDropdown() {
  const dd = document.getElementById('productDropdown');
  dd.innerHTML = '';
  Object.entries(PRODUCTS).forEach(([id, p]) => {
    const item = document.createElement('div');
    item.className = 'pd-item';
    if (id === state.productId) item.classList.add('active');
    item.dataset.productId = id;
    item.innerHTML = `<span class="pd-emoji">${p.emoji}</span><span>${p.name}</span>`;
    item.addEventListener('click', () => {
      switchProduct(id);
      toggleProductDropdown();
      buildProductDropdown();
    });
    dd.appendChild(item);
  });
}

function toggleProductDropdown() {
  document.getElementById('productDropdown').classList.toggle('open');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const picker = document.querySelector('.tb-product-picker');
  if (picker && !picker.contains(e.target)) {
    document.getElementById('productDropdown').classList.remove('open');
  }
});

function updateProductUI() {
  const p = PRODUCTS[state.productId];
  document.getElementById('productPickerEmoji').textContent = p.emoji;
  document.getElementById('productPickerName').textContent  = p.name;
  document.getElementById('cartPrice').textContent = '$' + p.price.toFixed(2);
}

function updateSurfaceTabs() {
  const tabs = document.getElementById('surfaceTabs');
  const p = PRODUCTS[state.productId];
  tabs.innerHTML = '';
  Object.entries(p.surfaces).forEach(([key, label]) => {
    const btn = document.createElement('button');
    btn.className = 'surface-tab' + (key === state.surfaceKey ? ' active' : '');
    btn.textContent = label;
    btn.addEventListener('click', () => switchSurface(key));
    tabs.appendChild(btn);
  });
}

function updateSurfaceTabsActive() {
  document.querySelectorAll('.surface-tab').forEach((btn, i) => {
    const surfKeys = Object.keys(PRODUCTS[state.productId].surfaces);
    btn.classList.toggle('active', surfKeys[i] === state.surfaceKey);
  });
}

function updateCartPrice() {
  document.getElementById('cartPrice').textContent = '$' + PRODUCTS[state.productId].price.toFixed(2);
}

// ──────────────────────────────────────────────────────────────
// SECTION 15: PRODUCT COLOR SWATCHES (Properties Panel)
// ──────────────────────────────────────────────────────────────

const PRODUCT_COLORS = [
  { color: '#ffffff',  name: 'White' },
  { color: '#1a1a1a',  name: 'Black' },
  { color: '#d1d5db',  name: 'Light Gray' },
  { color: '#1e3a5f',  name: 'Navy' },
  { color: '#dc2626',  name: 'Red' },
  { color: '#16a34a',  name: 'Green' },
  { color: '#9333ea',  name: 'Purple' },
  { color: '#f97316',  name: 'Orange' },
  { color: '#facc15',  name: 'Yellow' },
  { color: '#0d9488',  name: 'Teal' },
  { color: '#ec4899',  name: 'Pink' },
  { color: '#4338ca',  name: 'Indigo' },
  { color: '#d2b48c',  name: 'Tan' },
  { color: '#374151',  name: 'Dark Gray' },
];

function buildProductSwatches() {
  const grid = document.getElementById('productSwatches');
  grid.innerHTML = '';
  PRODUCT_COLORS.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'swatch-btn' + (s.color === state.productColor ? ' active' : '');
    btn.style.background = s.color;
    btn.style.border = s.color === '#ffffff' || s.color === '#d1d5db' ? '2px solid #e2e8f0' : '2px solid transparent';
    if (s.color === state.productColor) {
      btn.style.outline = '2px solid #6366f1';
      btn.style.outlineOffset = '2px';
    }
    btn.dataset.color = s.color;
    btn.title = s.name;
    btn.addEventListener('click', () => setProductColor(s.color));
    grid.appendChild(btn);
  });
}

// ──────────────────────────────────────────────────────────────
// SECTION 16: DOWNLOAD
// ──────────────────────────────────────────────────────────────

function downloadPNG() {
  // Hide safe area
  if (safeAreaRect) safeAreaRect.set('visible', false);
  canvas.renderAll();

  const dataURL = canvas.toDataURL({ format: 'png', multiplier: 1 });

  // Restore safe area
  if (safeAreaRect) safeAreaRect.set('visible', true);
  canvas.renderAll();

  const a = document.createElement('a');
  a.href = dataURL;
  a.download = `wearit-${state.productId}-${state.surfaceKey}.png`;
  a.click();
  showToast('Design downloaded!');
}

// ──────────────────────────────────────────────────────────────
// SECTION 17: ADD TO CART
// ──────────────────────────────────────────────────────────────

function addToCart() {
  const product = PRODUCTS[state.productId];
  fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product:  state.productId,
      surface:  state.surfaceKey,
      price:    product.price,
      design:   canvas.toJSON(),
    }),
  }).then(res => {
    if (res.ok) {
      showToast(`${product.name} added to cart — $${product.price.toFixed(2)}`);
    } else {
      throw new Error('Server error');
    }
  }).catch(() => {
    showToast(`${product.name} added to cart — $${product.price.toFixed(2)}`);
  });
}

// ──────────────────────────────────────────────────────────────
// SECTION 18: KEYBOARD SHORTCUTS
// ──────────────────────────────────────────────────────────────

document.addEventListener('keydown', function(e) {
  const target = e.target;
  const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;

  // Allow Ctrl shortcuts even in inputs
  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case 'z':
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      case 'y':
        e.preventDefault();
        redo();
        return;
      case 'd':
        e.preventDefault();
        duplicateSelected();
        return;
      case 'a':
        if (!isInput) {
          e.preventDefault();
          canvas.discardActiveObject();
          const objs = canvas.getObjects().filter(o => o !== safeAreaRect);
          if (objs.length) {
            const sel = new fabric.ActiveSelection(objs, { canvas });
            canvas.setActiveObject(sel);
            canvas.renderAll();
          }
        }
        return;
    }
  }

  if (isInput) return;

  switch (e.key) {
    case 'v': case 'V': setTool('select');   break;
    case 't': case 'T': setTool('text');     break;
    case 'r': case 'R': setTool('rect');     break;
    case 'c': case 'C': setTool('circle');   break;
    case 'd': case 'D': setTool('draw');     break;
    case 'Escape':
      canvas.discardActiveObject();
      canvas.renderAll();
      setTool('select');
      closePanel();
      break;
    case 'Delete':
    case 'Backspace':
      e.preventDefault();
      deleteSelected();
      break;
    case 'ArrowLeft':
    case 'ArrowRight':
    case 'ArrowUp':
    case 'ArrowDown': {
      const obj = canvas.getActiveObject();
      if (!obj) break;
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowLeft')  obj.set('left', obj.left - step);
      if (e.key === 'ArrowRight') obj.set('left', obj.left + step);
      if (e.key === 'ArrowUp')    obj.set('top',  obj.top  - step);
      if (e.key === 'ArrowDown')  obj.set('top',  obj.top  + step);
      obj.setCoords();
      canvas.renderAll();
      syncPropPanel();
      break;
    }
  }
});

// ──────────────────────────────────────────────────────────────
// SECTION 19: TOAST
// ──────────────────────────────────────────────────────────────

let toastTimeout = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => t.classList.remove('show'), 2800);
}

// ──────────────────────────────────────────────────────────────
// SECTION 20: UTILITY HELPERS
// ──────────────────────────────────────────────────────────────

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function toggleActive(id, isActive) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('active', isActive);
}

function colorToHex(color) {
  if (!color) return '#000000';
  if (color.startsWith('#') && (color.length === 7 || color.length === 4)) return color;
  // Handle rgb(r,g,b)
  const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
  if (m) {
    return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
  }
  return '#000000';
}

function lightenColor(hex, pct) {
  return adjustColor(hex, pct);
}
function darkenColor(hex, pct) {
  return adjustColor(hex, -pct);
}
function adjustColor(hex, pct) {
  let r, g, b;
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c+c).join('');
  if (hex.length !== 6) return '#' + hex;
  r = parseInt(hex.substring(0,2), 16);
  g = parseInt(hex.substring(2,4), 16);
  b = parseInt(hex.substring(4,6), 16);
  r = Math.max(0, Math.min(255, r + pct * 255 / 100));
  g = Math.max(0, Math.min(255, g + pct * 255 / 100));
  b = Math.max(0, Math.min(255, b + pct * 255 / 100));
  return '#' + [r, g, b].map(n => Math.round(n).toString(16).padStart(2,'0')).join('');
}

// ──────────────────────────────────────────────────────────────
// SECTION 21: INIT
// ──────────────────────────────────────────────────────────────

function init() {
  // Build UI
  buildProductDropdown();
  updateProductUI();
  updateSurfaceTabs();
  buildProductSwatches();

  // Set initial product color
  state.productColor = PRODUCTS[state.productId].defaultColor;
  document.getElementById('productColorCustom').value = state.productColor;
  document.getElementById('productColorHex').value    = state.productColor;

  // Init Fabric canvas
  initCanvas();

  // Wire up text tool on canvas (must come after initCanvas)
  setupTextTool();

  // Render product mockup
  renderMockup();

  // Initial history snapshot
  setTimeout(() => {
    saveHistory();
  }, 200);

  // Handle window resize → refit zoom
  window.addEventListener('resize', () => {
    clearTimeout(window._resizeTimer);
    window._resizeTimer = setTimeout(fitZoom, 150);
  });

  // Close dropdown on stage click
  document.getElementById('stage').addEventListener('click', () => {
    document.getElementById('productDropdown').classList.remove('open');
  });
}

// Wait for Fabric to fully load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
