/* ── STATE ───────────────────────────────────────────────── */
const state = {
  product: 'tshirt',
  color: '#FFFFFF',
  colorName: 'White',
  size: 'S',
  designSrc: null,
  text: '',
  textColor: '#000000',
  font: 'Inter',
  scale: 60,
  rotate: 0,
  opacity: 100,
  qty: 1,
  view: 'front',
  cart: []
};

const PRODUCTS = {
  tshirt:  { name: 'Custom T-Shirt',   emoji: '👕', price: 24.99, hasSizes: true },
  glasses: { name: 'Custom Glasses',   emoji: '🕶️', price: 34.99, hasSizes: false },
  mug:     { name: 'Custom Mug',       emoji: '☕', price: 14.99, hasSizes: false },
  hoodie:  { name: 'Custom Hoodie',    emoji: '🧥', price: 44.99, hasSizes: true },
  cap:     { name: 'Custom Cap',       emoji: '🧢', price: 22.99, hasSizes: false },
  tote:    { name: 'Custom Tote Bag',  emoji: '👜', price: 18.99, hasSizes: false },
};

const COLOR_NAMES = {
  '#FFFFFF': 'White', '#1a1a1a': 'Black', '#2563eb': 'Blue',
  '#dc2626': 'Red', '#16a34a': 'Green', '#9333ea': 'Purple',
  '#f97316': 'Orange', '#f1f5f9': 'Light Gray'
};

/* ── INIT ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  buildProductGrid();
  renderPreview();
  updatePriceInfo();
  showFace('front');
});

/* ── NAV SCROLL EFFECT ───────────────────────────────────── */
window.addEventListener('scroll', () => {
  const nav = document.getElementById('nav');
  nav.style.background = window.scrollY > 20
    ? 'rgba(255,255,255,.95)'
    : 'rgba(255,255,255,.85)';
});

/* ── PRODUCT GRID ────────────────────────────────────────── */
function buildProductGrid() {
  const grid = document.getElementById('productGrid');
  const BG_COLORS = {
    tshirt:  'linear-gradient(135deg,#ede9fe,#ddd6fe)',
    glasses: 'linear-gradient(135deg,#e0f2fe,#bae6fd)',
    mug:     'linear-gradient(135deg,#fff7ed,#fed7aa)',
    hoodie:  'linear-gradient(135deg,#f0fdf4,#bbf7d0)',
    cap:     'linear-gradient(135deg,#fdf4ff,#f5d0fe)',
    tote:    'linear-gradient(135deg,#fff1f2,#fecdd3)',
  };
  grid.innerHTML = Object.entries(PRODUCTS).map(([key, p]) => `
    <div class="product-card" onclick="jumpToCustomizer('${key}')">
      <div class="product-card-img" style="background:${BG_COLORS[key]}">
        <span style="font-size:5rem">${p.emoji}</span>
      </div>
      <div class="product-card-body">
        <h3>${p.name}</h3>
        <p>Fully customizable • Print on demand</p>
        <div class="product-card-cta">
          <span class="price">from $${p.price.toFixed(2)}</span>
          <button class="btn-sm">Customize →</button>
        </div>
      </div>
    </div>
  `).join('');
}

function jumpToCustomizer(productKey) {
  document.getElementById('customizer').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => {
    const tab = document.querySelector(`[data-product="${productKey}"]`);
    if (tab) selectProduct(productKey, tab);
  }, 400);
}

/* ── PRODUCT SELECTION ───────────────────────────────────── */
function selectProduct(product, btn) {
  state.product = product;
  document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  // show/hide size
  const sizeGroup = document.getElementById('sizeGroup');
  sizeGroup.style.display = PRODUCTS[product].hasSizes ? 'block' : 'none';

  // show correct model
  document.querySelectorAll('.model-wrapper').forEach(m => m.classList.add('hidden'));
  const model = document.getElementById(`model-${product}`);
  if (model) model.classList.remove('hidden');

  updatePriceInfo();
  applyDesignToCurrentProduct();
  applyColorToProduct();
}

/* ── COLOR SELECTION ─────────────────────────────────────── */
function selectColor(color, btn) {
  state.color = color;
  state.colorName = COLOR_NAMES[color] || color;
  document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('piColor').textContent = state.colorName;
  applyColorToProduct();
}

function applyColorToProduct() {
  const targets = {
    tshirt:  ['tsBody', 'tsBodyBack', 'tsSideBody', ...document.querySelectorAll('.ts-sleeve')],
    hoodie:  [document.getElementById('hdBody'), ...document.querySelectorAll('.hd-sleeve')],
    mug:     [document.getElementById('mugMain')],
    cap:     [document.getElementById('capCrown')],
    tote:    [document.getElementById('toteBody')],
  };

  /* glasses frame color */
  const glsArms = document.querySelectorAll('.gls-arm');
  const glsLenses = document.querySelectorAll('.gls-lens-left, .gls-lens-right');
  const glsBridge = document.querySelector('.gls-bridge');
  glsArms.forEach(el => el.style.background = state.color === '#FFFFFF' ? '#1a1a1a' : state.color);
  if (glsBridge) glsBridge.style.background = state.color === '#FFFFFF' ? '#1a1a1a' : state.color;
  glsLenses.forEach(el => el.style.borderColor = state.color === '#FFFFFF' ? '#1a1a1a' : state.color);

  /* body color */
  const bodyMap = {
    tshirt: ['tsBody', 'tsBodyBack'],
    hoodie: ['hdBody'],
    mug:    ['mugMain'],
    cap:    ['capCrown'],
    tote:   ['toteBody'],
  };
  const ids = bodyMap[state.product] || [];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.background = state.color;
  });

  /* sleeves match body */
  if (state.product === 'tshirt') {
    document.querySelectorAll('.ts-sleeve').forEach(el => el.style.background = state.color);
  }
  if (state.product === 'hoodie') {
    document.querySelectorAll('.hd-sleeve').forEach(el => el.style.background = state.color);
  }
  if (state.product === 'tote') {
    document.querySelectorAll('.tote-handle').forEach(el => {
      el.style.borderColor = state.color === '#FFFFFF' ? '#94a3b8' : state.color;
    });
  }

  /* collar text contrast */
  const collar = document.querySelector('.ts-collar');
  if (collar) collar.style.background = state.color;
}

/* ── SIZE SELECTION ──────────────────────────────────────── */
function selectSize(size, btn) {
  state.size = size;
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('piSize').textContent = size;
}

/* ── FILE UPLOAD ─────────────────────────────────────────── */
function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('uploadZone').classList.add('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('uploadZone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) processFile(file);
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) processFile(file);
}

function processFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    state.designSrc = e.target.result;
    document.getElementById('uploadedImg').src = state.designSrc;
    document.getElementById('uploadedPreview').style.display = 'block';
    document.getElementById('uploadZone').style.display = 'none';
    document.getElementById('designControls').style.display = 'block';
    applyDesignToCurrentProduct();
    showToast('✓ Design uploaded successfully!');
  };
  reader.readAsDataURL(file);
}

function removeImage() {
  state.designSrc = null;
  document.getElementById('uploadedPreview').style.display = 'none';
  document.getElementById('uploadZone').style.display = 'block';
  document.getElementById('designControls').style.display = 'none';
  document.getElementById('fileInput').value = '';
  clearAllDesigns();
}

function clearAllDesigns() {
  const imgIds = ['tsDesignImg','hdDesignImg','mugDesignImg','capDesignImg','toteDesignImg','glsDesignImgL','glsDesignImgR'];
  imgIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.src = ''; el.style.display = 'none'; }
  });
  const areaIds = ['glsDesignL','glsDesignR'];
  areaIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function applyDesignToCurrentProduct() {
  if (!state.designSrc) return;
  const s = `scale(${state.scale/100}) rotate(${state.rotate}deg)`;
  const o = state.opacity / 100;

  const imgTargets = {
    tshirt:  'tsDesignImg',
    hoodie:  'hdDesignImg',
    mug:     'mugDesignImg',
    cap:     'capDesignImg',
    tote:    'toteDesignImg',
  };

  if (state.product === 'glasses') {
    ['glsDesignL','glsDesignR'].forEach(id => {
      const wrap = document.getElementById(id);
      if (wrap) wrap.style.display = 'flex';
    });
    ['glsDesignImgL','glsDesignImgR'].forEach(id => {
      const img = document.getElementById(id);
      if (img) { img.src = state.designSrc; img.style.display = 'block'; img.style.opacity = o; img.style.transform = s; }
    });
    return;
  }

  const imgId = imgTargets[state.product];
  if (imgId) {
    const img = document.getElementById(imgId);
    if (img) {
      img.src = state.designSrc;
      img.style.display = 'block';
      img.style.transform = s;
      img.style.opacity = o;
    }
  }
}

/* ── DESIGN TRANSFORM ────────────────────────────────────── */
function updateDesignTransform() {
  state.scale = parseInt(document.getElementById('scaleSlider').value);
  state.rotate = parseInt(document.getElementById('rotateSlider').value);
  state.opacity = parseInt(document.getElementById('opacitySlider').value);
  document.getElementById('scaleVal').textContent = state.scale + '%';
  document.getElementById('rotateVal').textContent = state.rotate + '°';
  document.getElementById('opacityVal').textContent = state.opacity + '%';
  applyDesignToCurrentProduct();
}

/* ── TEXT ────────────────────────────────────────────────── */
function updateText() {
  state.text = document.getElementById('customText').value;
  state.font = document.getElementById('fontSelect').value;
  state.textColor = document.getElementById('textColor').value;

  const textTargets = {
    tshirt: 'tsText', hoodie: 'hdText', mug: 'mugText',
    cap: 'capText', tote: 'toteText', glasses: 'glsText'
  };
  const id = textTargets[state.product];
  if (id) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = state.text;
      el.style.fontFamily = state.font;
      el.style.color = state.textColor;
    }
  }
}

/* ── VIEW ────────────────────────────────────────────────── */
function setView(view, btn) {
  state.view = view;
  document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  showFace(view);
  rotate3DModel(view);
}

function showFace(view) {
  document.querySelectorAll('.face').forEach(f => f.classList.remove('visible'));
  const faces = document.querySelectorAll(`.face.${view}`);
  faces.forEach(f => f.classList.add('visible'));
  if (!faces.length) {
    document.querySelectorAll('.face.front').forEach(f => f.classList.add('visible'));
  }
}

function rotate3DModel(view) {
  const models = document.querySelectorAll('.model-3d');
  const transforms = { front: 'rotateY(0deg)', back: 'rotateY(180deg)', side: 'rotateY(-60deg)' };
  models.forEach(m => m.style.transform = transforms[view] || 'rotateY(0deg)');
}

/* ── PREVIEW ─────────────────────────────────────────────── */
function renderPreview() {
  showFace('front');
  applyColorToProduct();
}

/* ── PRICE / INFO ────────────────────────────────────────── */
function updatePriceInfo() {
  const p = PRODUCTS[state.product];
  const total = (p.price * state.qty).toFixed(2);
  document.getElementById('priceVal').textContent = `$${total}`;
  document.getElementById('piProduct').textContent = p.name;
}

/* ── QUANTITY ────────────────────────────────────────────── */
function changeQty(delta) {
  state.qty = Math.max(1, Math.min(99, state.qty + delta));
  document.getElementById('qtyVal').textContent = state.qty;
  updatePriceInfo();
}

/* ── CART ────────────────────────────────────────────────── */
function addToCart() {
  const p = PRODUCTS[state.product];
  const item = {
    id: Date.now(),
    product: state.product,
    name: p.name,
    emoji: p.emoji,
    color: state.color,
    colorName: state.colorName,
    size: p.hasSizes ? state.size : null,
    qty: state.qty,
    price: p.price,
    designSrc: state.designSrc,
    text: state.text,
  };
  state.cart.push(item);
  renderCart();
  showToast(`✓ ${p.name} added to cart!`);
  animateCartBtn();
}

function removeFromCart(id) {
  state.cart = state.cart.filter(i => i.id !== id);
  renderCart();
}

function renderCart() {
  const count = state.cart.reduce((s, i) => s + i.qty, 0);
  const total = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  document.getElementById('cartCount').textContent = count;
  const empty = document.getElementById('cartEmpty');
  const footer = document.getElementById('cartFooter');
  const itemsContainer = document.getElementById('cartItems');

  if (state.cart.length === 0) {
    empty.style.display = 'block';
    footer.style.display = 'none';
    itemsContainer.innerHTML = '';
    itemsContainer.appendChild(empty);
    return;
  }

  empty.style.display = 'none';
  footer.style.display = 'block';
  document.getElementById('cartTotal').textContent = `$${total.toFixed(2)}`;

  const existing = itemsContainer.querySelectorAll('.cart-item');
  existing.forEach(el => el.remove());

  state.cart.forEach(item => {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <div class="ci-thumb">
        ${item.designSrc
          ? `<img src="${item.designSrc}" alt="design" />`
          : `<span>${item.emoji}</span>`}
      </div>
      <div class="ci-info">
        <div class="ci-name">${item.name}</div>
        <div class="ci-details">
          ${item.colorName}${item.size ? ` · ${item.size}` : ''} · Qty ${item.qty}
          ${item.text ? `· "${item.text}"` : ''}
        </div>
        <div class="ci-price">$${(item.price * item.qty).toFixed(2)}</div>
        <div class="ci-remove" onclick="removeFromCart(${item.id})">Remove</div>
      </div>
    `;
    itemsContainer.appendChild(div);
  });
}

function toggleCart() {
  const overlay = document.getElementById('cartOverlay');
  const sidebar = document.getElementById('cartSidebar');
  const isOpen = sidebar.classList.contains('open');
  overlay.classList.toggle('open', !isOpen);
  sidebar.classList.toggle('open', !isOpen);
  document.body.style.overflow = !isOpen ? 'hidden' : '';
}

async function checkout() {
  if (state.cart.length === 0) return;

  const btn = document.querySelector('.btn-checkout');
  if (btn) { btn.disabled = true; btn.textContent = 'Processing...'; }
  showToast('Connecting to checkout...');

  try {
    const payload = state.cart.map(item => ({
      product:    item.product,
      qty:        item.qty,
      color:      item.color,
      colorName:  item.colorName,
      size:       item.size || null,
      text:       item.text || null,
      designUrl:  null, // data URLs are too large for metadata; extend with upload endpoint
    }));

    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: payload }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Checkout failed');
    }

    const { url } = await res.json();
    window.location.href = url;
  } catch (err) {
    console.error('[checkout]', err);
    showToast('Could not start checkout — ' + err.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Checkout →'; }
  }
}

function animateCartBtn() {
  const btn = document.getElementById('cartBtn');
  btn.style.transform = 'scale(1.3)';
  setTimeout(() => btn.style.transform = 'scale(1)', 300);
}

/* ── TOAST ───────────────────────────────────────────────── */
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

/* ── DRAG DESIGN ON PRODUCT ──────────────────────────────── */
(function setupDrag() {
  let dragging = false, startX, startY, offsetX = 0, offsetY = 0, el = null;

  function onDown(e) {
    const t = e.target;
    if (!t.classList.contains('design-overlay') && !t.classList.contains('design-text')) return;
    dragging = true; el = t;
    const pt = e.touches ? e.touches[0] : e;
    startX = pt.clientX - offsetX;
    startY = pt.clientY - offsetY;
    el.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function onMove(e) {
    if (!dragging || !el) return;
    const pt = e.touches ? e.touches[0] : e;
    offsetX = pt.clientX - startX;
    offsetY = pt.clientY - startY;
    el.style.position = 'relative';
    el.style.left = offsetX + 'px';
    el.style.top = offsetY + 'px';
    e.preventDefault();
  }
  function onUp() { if (!el) return; dragging = false; el.style.cursor = 'grab'; el = null; }

  const stage = document.getElementById('stage3d');
  if (stage) {
    stage.addEventListener('mousedown', onDown);
    stage.addEventListener('mousemove', onMove);
    stage.addEventListener('mouseup', onUp);
    stage.addEventListener('touchstart', onDown, { passive: false });
    stage.addEventListener('touchmove', onMove, { passive: false });
    stage.addEventListener('touchend', onUp);
  }
})();
