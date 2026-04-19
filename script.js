/** Short “pop” on draggable grab — Web Audio only (Mixkit CDN returns AccessDenied in browsers). */
var draggablePopAudioCtx = null;

function playDraggablePopSound() {
  try {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!draggablePopAudioCtx) draggablePopAudioCtx = new Ctx();
    var ctx = draggablePopAudioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    var t0 = ctx.currentTime;
    var dur = 0.09;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t0);
    osc.frequency.exponentialRampToValueAtTime(220, t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.35, t0 + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch (err) {}
}

var lampSound = new Audio(
  'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'
);
lampSound.volume = 0.4;

var meowSound = new Audio('assets/sounds/cat-meow.wav');
meowSound.volume = 0.4;

// Homepage: zine slugs (data-zine id → issue folder slug)
var HOMEPAGE_ASSETS = [
  { id: 'self-perception', type: 'zine', slug: 'self-perception' },
  { id: 'observations as a introvert', type: 'zine', slug: 'observations-as-an-introvert' },
  { id: 'collection of stillherestilllife', type: 'zine', slug: 'stillherestilllife' },
  { id: 'the idea marinade', type: 'zine', slug: 'idea-marinade' },
  { id: 'romanticise the mundane', type: 'zine', slug: 'romaticise-the-mundane' },
  {
    id: 'confessions of an anxious creator',
    type: 'zine',
    slug: 'confessions-of-an-anxious-creator'
  }
];

/** Draggable: delta from HOMEPAGE_LAYOUT_SPEC. */
var dragOffsets = {
  plant: { dx: 0, dy: 0 },
  'snake-plant': { dx: 0, dy: 0 },
  books: { dx: 0, dy: 0 },
  coffee: { dx: 0, dy: 0 },
  cat: { dx: 0, dy: 0 },
  lamp: { dx: 0, dy: 0 },
  'idea-marinade': { dx: 0, dy: 0 },
  romanticise: { dx: 0, dy: 0 },
  about: { dx: 0, dy: 0 }
};
/** Per-element Y/top captured on initial load for drop-time gravity restore. */
var draggableOriginalYByElement = new Map();

/** After dragging a zine cover, skip the synthetic click that would open the issue. */
var homepageSuppressZineClick = false;
/** After dragging lamp, skip the synthetic click so theme does not toggle on release. */
var homepageSuppressLampToggleClick = false;

/**
 * When false (default), reload always uses HOMEPAGE_LAYOUT_SPEC — defaults stay locked in source.
 * Set true temporarily if you want drag positions to survive refresh (still keyed by spec fingerprint).
 */
var HOMEPAGE_PERSIST_DRAG_OFFSETS = false;

var DRAGGABLE_LAYOUT_STORAGE_KEY = 'digizine-homepage-draggable-v2';

function draggableSpecFingerprint() {
  var spec = typeof HOMEPAGE_LAYOUT_SPEC !== 'undefined' ? HOMEPAGE_LAYOUT_SPEC : null;
  if (!spec) return '';
  var parts = [];
  HOMEPAGE_DRAGGABLE_IDS.forEach(function (id) {
    var b = spec[id];
    if (b) {
      parts.push(id + ':' + b.x + ',' + b.y + ',' + b.width + ',' + b.height);
    }
  });
  return parts.join('|');
}

function loadPersistedDraggableLayout() {
  try {
    var params = new URLSearchParams(window.location.search);
    if (params.get('resetLayout') === '1') {
      localStorage.removeItem(DRAGGABLE_LAYOUT_STORAGE_KEY);
      if (window.history && window.history.replaceState) {
        var u = new URL(window.location.href);
        u.searchParams.delete('resetLayout');
        window.history.replaceState({}, '', u.pathname + u.search + u.hash);
      }
    }
    if (!HOMEPAGE_PERSIST_DRAG_OFFSETS) return;
    var raw = localStorage.getItem(DRAGGABLE_LAYOUT_STORAGE_KEY);
    if (!raw) return;
    var data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !data.positions || data.fp !== draggableSpecFingerprint()) {
      return;
    }
    var spec = typeof HOMEPAGE_LAYOUT_SPEC !== 'undefined' ? HOMEPAGE_LAYOUT_SPEC : null;
    if (!spec) return;
    HOMEPAGE_DRAGGABLE_IDS.forEach(function (id) {
      var p = data.positions[id];
      var box = spec[id];
      if (!p || !box || typeof p.x !== 'number' || typeof p.y !== 'number') return;
      dragOffsets[id] = { dx: p.x - box.x, dy: p.y - box.y };
    });
  } catch (e) {}
}

function savePersistedDraggableLayout() {
  try {
    if (!HOMEPAGE_PERSIST_DRAG_OFFSETS) return;
    var spec = typeof HOMEPAGE_LAYOUT_SPEC !== 'undefined' ? HOMEPAGE_LAYOUT_SPEC : null;
    if (!spec) return;
    var positions = {};
    HOMEPAGE_DRAGGABLE_IDS.forEach(function (id) {
      var box = spec[id];
      if (!box) return;
      var o = dragOffsets[id] || { dx: 0, dy: 0 };
      positions[id] = { x: box.x + o.dx, y: box.y + o.dy };
    });
    localStorage.setItem(
      DRAGGABLE_LAYOUT_STORAGE_KEY,
      JSON.stringify({ fp: draggableSpecFingerprint(), positions: positions })
    );
  } catch (e) {}
}

function updateDateTime() {
  const dateEl = document.getElementById('datetime-date');
  const timeEl = document.getElementById('datetime-time');
  if (!dateEl || !timeEl) return;
  const now = new Date();
  dateEl.textContent = now.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short'
  });
  timeEl.textContent = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

updateDateTime();
setInterval(updateDateTime, 1000);

function getZineId(el) {
  return el.getAttribute('data-zine') || '';
}

function getHomepageAssetById(id) {
  for (var i = 0; i < HOMEPAGE_ASSETS.length; i++) {
    if (HOMEPAGE_ASSETS[i] && HOMEPAGE_ASSETS[i].id === id) return HOMEPAGE_ASSETS[i];
  }
  return null;
}

function applyAssetData() {
  var map = {};
  HOMEPAGE_ASSETS.forEach(function (a) {
    map[a.id] = a;
  });
  var frame = document.getElementById('content-frame');
  if (!frame) return;
  frame.querySelectorAll('[data-zine]').forEach(function (el) {
    var id = getZineId(el);
    var asset = map[id];
    if (!asset) return;
    el.setAttribute('data-type', asset.type);
    if (asset.slug) el.setAttribute('data-slug', asset.slug);
  });
}

function px(n) {
  return typeof n === 'number' && !isNaN(n) ? n + 'px' : '0px';
}

function isMobileHomepageLayout() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 768px)').matches;
}

function getHomepageSpec() {
  if (isMobileHomepageLayout() && typeof MOBILE_HOMEPAGE_LAYOUT_SPEC !== 'undefined') {
    return MOBILE_HOMEPAGE_LAYOUT_SPEC;
  }
  return typeof HOMEPAGE_LAYOUT_SPEC !== 'undefined' ? HOMEPAGE_LAYOUT_SPEC : null;
}

function captureOriginalDraggableYPositions() {
  var frame = document.getElementById('content-frame');
  if (!frame) return;
  frame.querySelectorAll('[data-draggable="true"]').forEach(function (el) {
    draggableOriginalYByElement.set(el, el.offsetTop);
  });
}

/**
 * Desktop homepage: scroll horizontally so the first shelf (left plank + romanticise + cat zone)
 * is centered in the viewport. Matches .content-frame { left: 160px } and shelf width 1120 in spec.
 */
function centerHomepageFirstShelfClusterInView() {
  if (isMobileHomepageLayout()) return;
  var shelf = document.querySelector('main.shelf-container');
  if (!shelf || !document.getElementById('content-frame')) return;
  var spec = typeof HOMEPAGE_LAYOUT_SPEC !== 'undefined' ? HOMEPAGE_LAYOUT_SPEC : null;
  var shelfBox = spec && spec.shelf;
  var frameLeft = 160;
  var leftShelfCenterX = shelfBox && shelfBox.width != null ? shelfBox.width / 2 : 560;
  var clusterCenter = frameLeft + leftShelfCenterX;
  var w = shelf.clientWidth;
  var maxScroll = Math.max(0, shelf.scrollWidth - w);
  var target = clusterCenter - w / 2;
  shelf.scrollLeft = Math.max(0, Math.min(target, maxScroll));
}

function applyBox(el, x, y, w, h) {
  el.style.removeProperty('inset');
  el.style.left = px(x);
  el.style.top = px(y);
  el.style.width = px(w);
  el.style.height = px(h);
  el.style.right = 'auto';
  el.style.bottom = 'auto';
  el.style.transform = 'none';
}

/** Web desktop: lamp anchored above #content-frame bottom; dy shifts like former top-based layout. */
var LAMP_WEB_BOTTOM_OFFSET_PX = 100;

function applyLampBox(el, x, w, h, dy) {
  var d = typeof dy === 'number' && !isNaN(dy) ? dy : 0;
  el.style.removeProperty('inset');
  el.style.left = px(x);
  el.style.top = 'auto';
  el.style.bottom = px(LAMP_WEB_BOTTOM_OFFSET_PX - d);
  el.style.width = px(w);
  el.style.height = px(h);
  el.style.right = 'auto';
  /* Keep transform managed by dark-mode lamp swap so sizing stays stable across reflows. */
}

/** Mobile: all zine covers are tap-to-open only (no drag). */
var MOBILE_ZINE_COVER_DRAG_DISABLED = {
  romanticise: true,
  'self-perception': true,
  observations: true,
  collection: true,
  'idea-marinade': true,
  confessions: true
};

function isDraggableId(layoutId) {
  if (isMobileHomepageLayout()) {
    var m = typeof MOBILE_HOMEPAGE_LAYOUT_SPEC !== 'undefined' ? MOBILE_HOMEPAGE_LAYOUT_SPEC : null;
    if (!m || !layoutId || layoutId === 'content-frame') return false;
    if (MOBILE_ZINE_COVER_DRAG_DISABLED[layoutId]) return false;
    return Object.prototype.hasOwnProperty.call(m, layoutId);
  }
  return HOMEPAGE_DRAGGABLE_IDS.indexOf(layoutId) !== -1;
}

/**
 * Apply layout from HOMEPAGE_LAYOUT_SPEC.
 * Zines: spec only. Draggable: spec + dragOffsets.
 */
function applyLayoutFromSpec() {
  var spec = getHomepageSpec();
  var frame = document.getElementById('content-frame');
  if (!spec || !frame) return;

  var cf = spec['content-frame'];
  if (cf && cf.width != null && cf.height != null) {
    frame.style.width = px(cf.width);
    frame.style.height = px(cf.height);
    /* Full artboard width — do not cap with 100% or the right column (shelf-2, about, etc.) clips off-screen. */
    frame.style.maxWidth = 'none';
  }

  frame.querySelectorAll('[data-layout-id]').forEach(function (el) {
    var id = el.getAttribute('data-layout-id');
    if (id === 'content-frame') return;
    var box = spec[id];
    if (!box) {
      el.style.removeProperty('left');
      el.style.removeProperty('top');
      el.style.removeProperty('width');
      el.style.removeProperty('height');
      el.style.removeProperty('right');
      el.style.removeProperty('bottom');
      el.style.removeProperty('transform');
      return;
    }

    /*
     * Mobile first shelf: flex + margins in CSS (unchanged look). Drag = translate(dx,dy) on top — no spec x/y.
     */
    if (isMobileHomepageLayout() && (id === 'shelf' || id === 'romanticise' || id === 'cat')) {
      el.style.removeProperty('left');
      el.style.removeProperty('top');
      el.style.removeProperty('width');
      el.style.removeProperty('height');
      el.style.removeProperty('right');
      el.style.removeProperty('bottom');
      var oFirst = dragOffsets[id] || { dx: 0, dy: 0 };
      if (oFirst.dx || oFirst.dy) {
        el.style.setProperty(
          'transform',
          'translate(' + oFirst.dx + 'px, ' + oFirst.dy + 'px)'
        );
      } else {
        el.style.removeProperty('transform');
      }
      return;
    }

    var x = box.x;
    var y = box.y;
    if (id === 'lamp' && !isMobileHomepageLayout() && box.width != null && box.height != null) {
      var oLamp = isDraggableId(id) ? dragOffsets[id] || { dx: 0, dy: 0 } : { dx: 0, dy: 0 };
      applyLampBox(el, box.x + oLamp.dx, box.width, box.height, oLamp.dy);
      return;
    }
    if (isDraggableId(id)) {
      var o = dragOffsets[id] || { dx: 0, dy: 0 };
      x += o.dx;
      y += o.dy;
    }

    applyBox(el, x, y, box.width, box.height);
  });
}

function parsePx(styleVal) {
  if (!styleVal || styleVal === 'auto') return 0;
  var n = parseFloat(styleVal);
  return isNaN(n) ? 0 : n;
}

/**
 * Debug: spec x/y, drag offset, final rendered x/y per item.
 */
function logHomepageLayoutState(reason) {
  var spec = getHomepageSpec() || {};
  var frame = document.getElementById('content-frame');
  if (!frame) return;

  console.log('[homepage layout]' + (reason ? ' ' + reason : ''));

  frame.querySelectorAll('[data-layout-id]').forEach(function (el) {
    var id = el.getAttribute('data-layout-id');
    if (id === 'content-frame') return;
    var box = spec[id];
    if (!box) return;

    var specX = box.x;
    var specY = box.y;
    var off = isDraggableId(id) ? dragOffsets[id] || { dx: 0, dy: 0 } : { dx: 0, dy: 0 };
    var finalX = parsePx(el.style.left);
    var finalPos =
      id === 'lamp' && !isMobileHomepageLayout()
        ? { x: finalX, bottom: parsePx(el.style.bottom) }
        : { x: finalX, y: parsePx(el.style.top) };

    console.log('  ' + id + ':', {
      spec: { x: specX, y: specY },
      dragOffset: { dx: off.dx, dy: off.dy },
      final: finalPos
    });
  });
}

applyAssetData();
loadPersistedDraggableLayout();
applyLayoutFromSpec();
captureOriginalDraggableYPositions();
logHomepageLayoutState('initial load');

window.addEventListener('load', function () {
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      centerHomepageFirstShelfClusterInView();
    });
  });
});

function scheduleLayoutReflow() {
  applyLayoutFromSpec();
  requestAnimationFrame(function () {
    applyLayoutFromSpec();
  });
}

if (document.readyState === 'complete') {
  scheduleLayoutReflow();
} else {
  window.addEventListener('load', scheduleLayoutReflow);
}

window.addEventListener('resize', scheduleLayoutReflow);
if (typeof window.visualViewport !== 'undefined' && window.visualViewport) {
  window.visualViewport.addEventListener('resize', scheduleLayoutReflow);
}

/**
 * Homepage scroll frame: drag to pan horizontally; wheel/trackpad deltaY -> scrollLeft
 * (scroll up -> left, scroll down -> right). Skips pan start on zines / draggables.
 */
(function initShelfScrollFramePan() {
  var shelf = document.querySelector('main.shelf-container');
  var frame = document.getElementById('content-frame');
  if (!shelf || !frame) return;

  var panning = false;
  var startX = 0;
  var startScrollLeft = 0;

  function isPanTarget(e) {
    var t = e.target;
    if (!t || !shelf.contains(t)) return false;
    if (t.closest('.zine-cover[data-zine]')) return false;
    var dragEl = t.closest('[data-draggable="true"]');
    if (dragEl) {
      var pid = dragEl.getAttribute('data-layout-id');
      if (pid && typeof isDraggableId === 'function' && isDraggableId(pid)) return false;
    }
    return true;
  }

  function onPointerDown(e) {
    if (isMobileHomepageLayout()) return;
    if (!isPanTarget(e)) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    panning = true;
    startX = e.clientX;
    startScrollLeft = shelf.scrollLeft;
    shelf.classList.add('shelf-container--panning');
    try {
      if (e.pointerId != null && shelf.setPointerCapture) {
        shelf.setPointerCapture(e.pointerId);
      }
    } catch (err) {}
    e.preventDefault();
  }

  function applyHorizontalScrollFromClientX(clientX) {
    shelf.scrollLeft = startScrollLeft - (clientX - startX);
  }

  function onPointerMove(e) {
    if (!panning || isMobileHomepageLayout()) return;
    applyHorizontalScrollFromClientX(e.clientX);
    e.preventDefault();
  }

  function onPointerUp(e) {
    if (!panning) return;
    if (isMobileHomepageLayout()) {
      panning = false;
      shelf.classList.remove('shelf-container--panning');
      return;
    }
    /* Commit final scroll on release (move events can be skipped/coalesced before up). */
    if (e && typeof e.clientX === 'number') {
      applyHorizontalScrollFromClientX(e.clientX);
    }
    try {
      if (
        e &&
        e.pointerId != null &&
        shelf.releasePointerCapture &&
        shelf.hasPointerCapture &&
        shelf.hasPointerCapture(e.pointerId)
      ) {
        shelf.releasePointerCapture(e.pointerId);
      }
    } catch (err) {}
    panning = false;
    shelf.classList.remove('shelf-container--panning');
  }

  shelf.addEventListener('pointerdown', onPointerDown, { passive: false });
  document.addEventListener('pointermove', onPointerMove, { passive: false });
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);
  document.addEventListener('mouseup', onPointerUp, true);

  function onWheel(e) {
    if (isMobileHomepageLayout()) return;
    var dy = e.deltaY;
    if (dy === 0) return;
    shelf.scrollLeft += dy;
    e.preventDefault();
  }

  shelf.addEventListener('wheel', onWheel, { passive: false });
})();

/**
 * Read live positions from the DOM (content-frame coordinates) for pasting into homepage-spec.js.
 * Run after moving items in devtools, then update plant/books/cat x,y in homepage-spec.js.
 */
window.digizineExportLayout = function () {
  var frame = document.getElementById('content-frame');
  if (!frame || typeof HOMEPAGE_LAYOUT_SPEC === 'undefined') {
    console.warn('[digizine] export: missing frame or spec');
    return;
  }
  var spec = HOMEPAGE_LAYOUT_SPEC;
  var lines = [];
  frame.querySelectorAll('[data-layout-id]').forEach(function (el) {
    var id = el.getAttribute('data-layout-id');
    if (id === 'content-frame') return;
    var box = spec[id];
    if (!box) return;
    var x = el.offsetLeft;
    var y = el.offsetTop;
    lines.push(
      '  ' +
        JSON.stringify(id) +
        ': { x: ' +
        x +
        ', y: ' +
        y +
        ', width: ' +
        box.width +
        ', height: ' +
        box.height +
        ' }'
    );
  });
  console.log('[digizine] Paste into HOMEPAGE_LAYOUT_SPEC (merge with existing keys):\n' + lines.join(',\n'));
};

/* ——— Draggable homepage items + z-index to front on grab ——— */
(function initHomepageDrag() {
  var frame = document.getElementById('content-frame');
  if (!frame) return;

  var active = null;
  /** Mobile: long-press before drag starts (allows tap-through without movement). */
  var pendingHold = null;
  var MOBILE_DRAG_HOLD_MS = 500;
  var MOBILE_HOLD_CANCEL_SLOP_PX = 12;
  var DRAG_MOVE_PX = 8;

  /** Issues stay below shelves (CSS z-index 50); drag stacking among issues only, max 49. */
  var Z_ISSUE_DRAG_MAX = 49;
  var zIssueDrag = 15;

  /** plant, cat, snake-plant, lamp, books — above shelf; drag uses 500+. */
  var FOREGROUND_DECORATION_IDS = {
    plant: true,
    cat: true,
    'snake-plant': true,
    lamp: true,
    books: true,
    coffee: true
  };
  var zForegroundDrag = 499;
  /** Matches .wrapper:has(.shelf-container) .header / .issue-page--scroll .header { z-index } in styles.css */
  var HOMEPAGE_HEADER_Z_INDEX = 2000;
  var HOMEPAGE_DRAG_Z_INDEX_CAP = HOMEPAGE_HEADER_Z_INDEX - 1;

  function bringToFront(el, id) {
    if (el.classList.contains('zine-cover') || id === 'about') {
      zIssueDrag = Math.min(zIssueDrag + 1, Z_ISSUE_DRAG_MAX);
      el.style.zIndex = String(Math.min(zIssueDrag, HOMEPAGE_DRAG_Z_INDEX_CAP));
      return;
    }
    if (id && FOREGROUND_DECORATION_IDS[id]) {
      zForegroundDrag++;
      el.style.zIndex = String(Math.min(zForegroundDrag, HOMEPAGE_DRAG_Z_INDEX_CAP));
      return;
    }
    zForegroundDrag++;
    el.style.zIndex = String(Math.min(zForegroundDrag, HOMEPAGE_DRAG_Z_INDEX_CAP));
  }

  function clientPoint(e) {
    if (e.touches && e.touches.length) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  function clearPendingHold() {
    if (pendingHold && pendingHold.timer) {
      clearTimeout(pendingHold.timer);
    }
    pendingHold = null;
  }

  function armMobileDrag() {
    if (!pendingHold) return;
    var ph = pendingHold;
    pendingHold = null;
    var t = ph.el;
    if (!t || !frame.contains(t)) return;
    var id = ph.id;
    var pt = { x: ph.lastX, y: ph.lastY };
    bringToFront(t, id);
    active = {
      id: id,
      el: t,
      downX: pt.x,
      downY: pt.y,
      startClientX: pt.x,
      startClientY: pt.y,
      startDx: ph.startDx,
      startDy: ph.startDy,
      didDrag: false,
      isZine: ph.isZine
    };
  }

  function onPointerDown(e) {
    var t = e.target.closest('[data-draggable="true"]');
    if (!t || !frame.contains(t)) return;
    var id = t.getAttribute('data-layout-id');
    if (!isDraggableId(id)) return;
    var layoutSpec = getHomepageSpec();
    var box = layoutSpec && layoutSpec[id];
    if (!box) return;

    if (t.dataset.layoutId !== 'lamp') {
      playDraggablePopSound();
    }

    var pt = clientPoint(e);
    var o = dragOffsets[id] || { dx: 0, dy: 0 };

    if (isMobileHomepageLayout()) {
      clearPendingHold();
      var holdToken = { id: id };
      pendingHold = {
        el: t,
        id: id,
        lastX: pt.x,
        lastY: pt.y,
        startX: pt.x,
        startY: pt.y,
        startDx: o.dx,
        startDy: o.dy,
        isZine: !!t.getAttribute('data-zine'),
        token: holdToken,
        timer: setTimeout(function () {
          if (!pendingHold || pendingHold.token !== holdToken) return;
          armMobileDrag();
        }, MOBILE_DRAG_HOLD_MS)
      };
      return;
    }

    e.preventDefault();
    bringToFront(t, id);
    active = {
      id: id,
      el: t,
      downX: pt.x,
      downY: pt.y,
      startClientX: pt.x,
      startClientY: pt.y,
      startDx: o.dx,
      startDy: o.dy,
      didDrag: false,
      isZine: !!t.getAttribute('data-zine')
    };
  }

  function onPointerMove(e) {
    if (pendingHold) {
      var pt = clientPoint(e);
      pendingHold.lastX = pt.x;
      pendingHold.lastY = pt.y;
      var sx = pt.x - pendingHold.startX;
      var sy = pt.y - pendingHold.startY;
      if (sx * sx + sy * sy > MOBILE_HOLD_CANCEL_SLOP_PX * MOBILE_HOLD_CANCEL_SLOP_PX) {
        clearPendingHold();
      }
      return;
    }
    if (!active) return;
    e.preventDefault();
    var pt = clientPoint(e);
    var mx = pt.x - active.downX;
    var my = pt.y - active.downY;
    if (mx * mx + my * my > DRAG_MOVE_PX * DRAG_MOVE_PX) {
      active.didDrag = true;
    }
    var dx = pt.x - active.startClientX + active.startDx;
    var dy = pt.y - active.startClientY + active.startDy;
    dragOffsets[active.id] = { dx: dx, dy: dy };
    applyLayoutFromSpec();
  }

  function onPointerUp() {
    clearPendingHold();
    if (!active) return;
    if (active.didDrag && active.id && dragOffsets[active.id]) {
      var storedTop = active.el ? draggableOriginalYByElement.get(active.el) : null;
      var currentTop = active.el ? active.el.offsetTop : null;
      var currentDy = dragOffsets[active.id].dy || 0;
      var resetDy =
        typeof storedTop === 'number' && typeof currentTop === 'number'
          ? currentDy + (storedTop - currentTop)
          : 0;
      dragOffsets[active.id] = {
        dx: dragOffsets[active.id].dx || 0,
        dy: resetDy
      };
      applyLayoutFromSpec();
    }
    if (active.didDrag && active.isZine) {
      homepageSuppressZineClick = true;
    }
    if (active.didDrag && active.id === 'lamp') {
      homepageSuppressLampToggleClick = true;
    }
    active = null;
    savePersistedDraggableLayout();
    logHomepageLayoutState('after drag');
  }

  frame.addEventListener('mousedown', onPointerDown);
  document.addEventListener('mousemove', onPointerMove);
  document.addEventListener('mouseup', onPointerUp);

  /*
   * passive: true on touchstart — we do not call preventDefault here (mobile hold-drag defers that to
   * touchmove). passive: false on touchstart alone breaks iOS synthetic click on zine covers.
   */
  frame.addEventListener('touchstart', onPointerDown, { passive: true });
  document.addEventListener('touchmove', onPointerMove, { passive: false });
  document.addEventListener('touchend', onPointerUp);
  document.addEventListener('touchcancel', onPointerUp);
})();

/* Zine navigation: click on cover (skipped right after a drag on draggable covers) */
var contentFrame = document.getElementById('content-frame');
if (contentFrame) {
  contentFrame.querySelectorAll('.zine-cover[data-zine]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (homepageSuppressZineClick) {
        e.preventDefault();
        homepageSuppressZineClick = false;
        return;
      }
      e.preventDefault();
      var slug = el.getAttribute('data-slug');
      if (!slug) {
        var asset = getHomepageAssetById(getZineId(el));
        slug = asset && asset.slug ? asset.slug : '';
      }
      if (slug) {
        if (typeof setPendingIssueSlug === 'function') {
          setPendingIssueSlug(slug);
        }
        var u = new URL('issue.html', window.location.href);
        u.searchParams.set('slug', slug);
        window.location.assign(u.href);
      }
    });
  });
}

/** Tab session only — new tab/window defaults to light; same-tab navigation keeps the choice. */
var DIGIZINE_THEME_STORAGE_KEY = 'digizineTheme';

function persistHomepageTheme(isDark) {
  try {
    sessionStorage.setItem(DIGIZINE_THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
  } catch (e) {}
}

function readPersistedHomepageThemeIsDark() {
  try {
    return sessionStorage.getItem(DIGIZINE_THEME_STORAGE_KEY) === 'dark';
  } catch (e) {
    return false;
  }
}

function setHomepageThemeClass(isDark) {
  document.body.classList.toggle('homepage-lamp-active', !!isDark);
}

function digizineApplyHomepageThemeFromStorage() {
  setHomepageThemeClass(readPersistedHomepageThemeIsDark());
  if (typeof window.__digizineApplyHomepageLampThemeAssets === 'function') {
    window.__digizineApplyHomepageLampThemeAssets();
  }
}

window.addEventListener('pageshow', function (e) {
  if (e && e.persisted) {
    digizineApplyHomepageThemeFromStorage();
  }
});

document.addEventListener('visibilitychange', function () {
  if (!document.hidden) {
    digizineApplyHomepageThemeFromStorage();
  }
});

/* Web homepage: tapping lamp toggles dark shelf backdrop + white title text. */
(function initHomepageLampThemeToggle() {
  if (!contentFrame) return;
  var lamp = contentFrame.querySelector('[data-layout-id="lamp"]');
  if (!lamp) return;
  var body = document.body;
  var LAMP_DARK_VISUAL_SCALE = 1.09;

  var DARK_ASSET_SOURCES = {
    romanticise: 'assets/dark mode/cover/romanticise the mundane.png',
    'self-perception': 'assets/dark mode/cover/self-preception.png',
    observations: 'assets/dark mode/cover/observations as an introvert.png',
    collection: 'assets/dark mode/cover/collectionofstillherestilllife.png',
    'idea-marinade': 'assets/dark mode/cover/the idea marinade.png',
    about: 'assets/dark mode/cover/about.png',
    confessions: 'assets/dark mode/cover/confessions of an anxious creator.png',
    lamp: 'assets/dark mode/decorations/lamp.png'
  };

  var swapTargets = {};
  var originalSources = {};

  Object.keys(DARK_ASSET_SOURCES).forEach(function (id) {
    var el = contentFrame.querySelector('[data-layout-id="' + id + '"]');
    if (!el || el.tagName !== 'IMG') return;
    swapTargets[id] = el;
    originalSources[id] = el.getAttribute('src');
    var darkSrc = DARK_ASSET_SOURCES[id];
    if (darkSrc) {
      var img = new Image();
      img.src = darkSrc;
    }
  });

  function applyLampThemeAssets() {
    var active = body.classList.contains('homepage-lamp-active') && !isMobileHomepageLayout();
    Object.keys(swapTargets).forEach(function (id) {
      var el = swapTargets[id];
      if (!el) return;
      var src = active ? DARK_ASSET_SOURCES[id] : originalSources[id];
      if (!src) return;
      if (el.getAttribute('src') !== src) {
        el.setAttribute('src', src);
      }
      if (id === 'lamp') {
        /* Keep natural fit; dark-only proportional scale compensates artwork size difference. */
        el.style.objectFit = 'contain';
        el.style.objectPosition = 'bottom center';
        el.style.transformOrigin = 'bottom center';
        el.style.transform = active ? 'scale(' + LAMP_DARK_VISUAL_SCALE + ')' : 'none';
      }
    });
  }

  window.__digizineApplyHomepageLampThemeAssets = applyLampThemeAssets;

  lamp.addEventListener('click', function () {
    if (isMobileHomepageLayout()) return;
    if (homepageSuppressLampToggleClick) {
      homepageSuppressLampToggleClick = false;
      return;
    }
    lampSound.currentTime = 0;
    lampSound.play();
    var nextDark = !document.body.classList.contains('homepage-lamp-active');
    setHomepageThemeClass(nextDark);
    persistHomepageTheme(nextDark);
    applyLampThemeAssets();
  });

  var themeResizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(themeResizeTimer);
    themeResizeTimer = setTimeout(function () {
      digizineApplyHomepageThemeFromStorage();
    }, 80);
  });
  applyLampThemeAssets();
})();

(function initHomepageCatMeowHover() {
  if (!contentFrame) return;
  var cat = contentFrame.querySelector('[data-layout-id="cat"]');
  if (!cat) return;
  var lastMeowAt = 0;
  cat.addEventListener('mouseenter', function () {
    var now = Date.now();
    if (now - lastMeowAt < 2000) return;
    lastMeowAt = now;
    meowSound.currentTime = 0;
    meowSound.play();
  });
})();

/* Apply persisted theme on every page (homepage + L2) after lamp asset hooks exist. */
digizineApplyHomepageThemeFromStorage();
