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
/** After dragging any object, skip the synthetic click so it is not also counted as a tap. */
var homepageSuppressObjectClick = false;

function trackShelfEvent(eventName, params) {
  if (typeof window.gtag !== 'function') return;
  try {
    window.gtag('event', eventName, params || {});
  } catch (err) {}
}

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
  if (isMobileHomepageLayout() || homepageShelfScrollRestored) return;
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
    if (active.didDrag && active.id) {
      homepageSuppressObjectClick = true;
      trackShelfEvent('move_object', { object_id: active.id });
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

/*
 * Homepage → L2: on tap the taped shelf cover swaps in place for the reader's issue cover, then only the
 * issue cover zooms toward where the reader shows its closed cover. The reader page starts loading just
 * before the zoom lands; the cover's rect at that moment goes to issue.html, which finishes the last bit of
 * the zoom so there's no pause while the page loads.
 */
var COVER_ZOOM_MS = 600;
/** Quick start and a short settle (a long ease-out tail reads as a pause before the reader takes over). */
var COVER_ZOOM_EASE = 'cubic-bezier(0.3, 0.5, 0.45, 1)';
/** Start loading the reader this long before the zoom lands; issue.html plays the rest. */
var COVER_ZOOM_NAV_LEAD_MS = 150;
/** In-place crossfade from the shelf cover to the issue cover; the zoom starts as it finishes. */
var COVER_ZOOM_SWAP_MS = 120;
var COVER_ZOOM_SWAP_LEAD_MS = 80;
/** Don't hold the shelf forever on a slow connection — navigate even if the issue cover hasn't arrived. */
var COVER_ZOOM_MAX_WAIT_MS = 2500;

/*
 * Where the issue artwork sits inside each taped shelf image (fractions of the shelf image), so the swap
 * happens in place. idea-marinade and observations use a different layout on the shelf, so theirs is the
 * paper area inside the tape and shadow. paper: observations' shelf sheet is a different shape from its
 * issue cover, so on the way home the cover widens into a sheet of the shared paper colour first.
 */
var SHELF_COVER_ART_BOX = {
  confessions: { left: 0.0542, top: 0.0316, width: 0.8917, height: 0.9386 },
  'idea-marinade': { left: 0.1294, top: 0, width: 0.8706, height: 0.993 },
  observations: { left: 0.0466, top: 0.0368, width: 0.917, height: 0.8937, paper: '#e6e7e9' },
  romanticise: { left: 0.1333, top: 0, width: 0.8625, height: 0.9857 },
  'self-perception': { left: 0.1, top: 0.0782, width: 0.825, height: 0.8148 },
  collection: { left: 0.05, top: 0.0341, width: 0.8958, height: 0.9234 }
};

/** Rendered image box for object-fit: contain + object-position: center bottom (.content-frame .zine-cover). */
function shelfCoverImageBox(el) {
  var r = el.getBoundingClientRect();
  var nw = el.naturalWidth;
  var nh = el.naturalHeight;
  if (!nw || !nh) return { left: r.left, top: r.top, width: r.width, height: r.height };
  var s = Math.min(r.width / nw, r.height / nh);
  var w = nw * s;
  var h = nh * s;
  return { left: r.left + (r.width - w) / 2, top: r.top + (r.height - h), width: w, height: h };
}
var homepageCoverZoomActive = false;
var homepageIssueCoverImages = {};

/* Fetch every issue cover in the background so the zoom can crossfade into it without waiting. */
function preloadIssueCovers() {
  if (typeof getIssueBySlug !== 'function') return;
  HOMEPAGE_ASSETS.forEach(function (a) {
    var issue = a.slug ? getIssueBySlug(a.slug) : null;
    if (!issue || !issue.cover || homepageIssueCoverImages[issue.cover]) return;
    var img = new Image();
    img.decoding = 'async';
    img.src = issue.cover;
    homepageIssueCoverImages[issue.cover] = img;
  });
}

if (document.getElementById('content-frame')) {
  if (document.readyState === 'complete') preloadIssueCovers();
  else window.addEventListener('load', preloadIssueCovers);
}

/* On tap: warm the reader page and every zine page image, so it can fold out the moment it lands. */
function prefetchIssue(issue, href) {
  try {
    var link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  } catch (e) {}
  (issue.pages || []).forEach(function (page) {
    if (!page || !page.src || homepageIssueCoverImages[page.src]) return;
    var img = new Image();
    img.decoding = 'async';
    img.src = page.src;
    homepageIssueCoverImages[page.src] = img;
  });
}

function whenCoverArtReady(img) {
  if (img.complete && img.naturalWidth) {
    return typeof img.decode === 'function' ? img.decode().catch(function () {}) : Promise.resolve();
  }
  return new Promise(function (resolve) {
    img.addEventListener('load', function () {
      (typeof img.decode === 'function' ? img.decode().catch(function () {}) : Promise.resolve()).then(resolve);
    });
    img.addEventListener('error', resolve);
  });
}

/** Mirrors --zine-page-height on .issue-page--scroll (desktop / mobile) in styles.css. */
function estimateIssueCoverHeight() {
  var h = window.innerHeight;
  if (isMobileHomepageLayout()) return Math.min(218, Math.max(160, h - 300));
  return Math.min(520, Math.max(220, h - 520));
}

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function shelfCoverArtBox(el) {
  return SHELF_COVER_ART_BOX[el.getAttribute('data-layout-id')] || { left: 0, top: 0, width: 1, height: 1 };
}

function issueCoverImage(src) {
  var art = homepageIssueCoverImages[src];
  if (!art) {
    art = new Image();
    art.src = src;
    homepageIssueCoverImages[src] = art;
  }
  return art;
}

/*
 * Uniform transform (origin top-left) for a layer at the shelf image's on-screen box, so the issue art —
 * contained in its box inside the shelf image — lands exactly on `rect`.
 */
function coverZoomTransform(box, artBox, aspect, rect) {
  var regionW = box.width * artBox.width;
  var regionH = box.height * artBox.height;
  var s = rect.height / Math.min(regionH, regionW / aspect);
  var regionCx = (artBox.left + artBox.width / 2) * box.width;
  var regionCy = (artBox.top + artBox.height / 2) * box.height;
  return {
    s: s,
    css:
      'translate(' +
      (rect.left + rect.width / 2 - (box.left + s * regionCx)) +
      'px, ' +
      (rect.top + rect.height / 2 - (box.top + s * regionCy)) +
      'px) scale(' +
      s +
      ')'
  };
}

/* The zoom layer: the shelf image, with the issue art over the matching art inside it. */
function buildCoverZoomLayer(el, box, artBox, coverSrc, s) {
  var layer = document.createElement('div');
  layer.className = 'cover-zoom';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.left = box.left + 'px';
  layer.style.top = box.top + 'px';
  layer.style.width = box.width + 'px';
  layer.style.height = box.height + 'px';
  var shelfImg = document.createElement('img');
  shelfImg.className = 'cover-zoom__shelf';
  shelfImg.src = el.currentSrc || el.src;
  shelfImg.alt = '';
  var artImg = document.createElement('img');
  artImg.className = 'cover-zoom__art';
  artImg.src = coverSrc;
  artImg.alt = '';
  artImg.style.left = artBox.left * 100 + '%';
  artImg.style.top = artBox.top * 100 + '%';
  artImg.style.width = artBox.width * 100 + '%';
  artImg.style.height = artBox.height * 100 + '%';
  /* Shadow in pre-scale units so it matches the reader cover's shadow at full zoom. */
  var shadow = 'drop-shadow(0px ' + 4 / s + 'px ' + 12 / s + 'px rgba(0, 0, 0, 0.06))';
  artImg.style.filter = shadow;
  layer.appendChild(shelfImg);
  var paper = null;
  if (artBox.paper) {
    paper = document.createElement('div');
    paper.className = 'cover-zoom__paper';
    paper.style.background = artBox.paper;
    paper.style.filter = shadow;
    paper.style.left = artBox.left * 100 + '%';
    paper.style.top = artBox.top * 100 + '%';
    paper.style.width = artBox.width * 100 + '%';
    paper.style.height = artBox.height * 100 + '%';
    layer.appendChild(paper);
  }
  layer.appendChild(artImg);
  return { layer: layer, shelfImg: shelfImg, artImg: artImg, paper: paper };
}

function zoomCoverIntoIssue(el, slug, href) {
  if (homepageCoverZoomActive) return;
  var issue = typeof getIssueBySlug === 'function' ? getIssueBySlug(slug) : null;
  var coverSrc = issue && issue.cover;
  if (prefersReducedMotion() || !coverSrc) {
    window.location.assign(href);
    return;
  }
  var state = { layer: null, el: el };
  homepageCoverZoomActive = state;

  var box = shelfCoverImageBox(el);
  var artBox = shelfCoverArtBox(el);
  var art = issueCoverImage(coverSrc);
  prefetchIssue(issue, href);
  rememberShelfScroll();
  var navigated = false;
  function go(target, from, remainingMs) {
    if (navigated) return;
    navigated = true;
    try {
      if (target) {
        sessionStorage.setItem(
          'digizineCoverZoom',
          JSON.stringify({ slug: slug, at: Date.now(), rect: target, from: from, remaining: remainingMs, src: coverSrc })
        );
      }
    } catch (e) {}
    window.location.assign(href);
  }

  /* Swap only once the issue cover is decoded, so the shelf never fades into a half-loaded image. */
  var giveUp = setTimeout(function () {
    go(null);
  }, COVER_ZOOM_MAX_WAIT_MS);
  whenCoverArtReady(art).then(function () {
    if (navigated) return;
    clearTimeout(giveUp);
    var aspect =
      art.naturalWidth && art.naturalHeight
        ? art.naturalWidth / art.naturalHeight
        : (box.width * artBox.width) / (box.height * artBox.height);
    var th = estimateIssueCoverHeight();
    var tw = th * aspect;
    var target = {
      left: window.innerWidth / 2 - tw / 2,
      top: window.innerHeight * (isMobileHomepageLayout() ? 0.45 : 0.505) - th / 2,
      width: tw,
      height: th
    };
    var zoom = coverZoomTransform(box, artBox, aspect, target);
    rememberShelfSpot(slug, shelfArtRect(box, artBox, aspect));
    var z = buildCoverZoomLayer(el, box, artBox, coverSrc, zoom.s);
    document.body.appendChild(z.layer);
    state.layer = z.layer;
    el.style.visibility = 'hidden';
    document.body.classList.add('homepage-cover-zooming');

    void z.layer.offsetWidth;
    requestAnimationFrame(function () {
      var swap = 'opacity ' + COVER_ZOOM_SWAP_MS + 'ms ease';
      z.artImg.style.transition = swap;
      z.shelfImg.style.transition = swap;
      z.artImg.style.opacity = '1';
      z.shelfImg.style.opacity = '0';
      z.layer.style.transition =
        'transform ' + COVER_ZOOM_MS + 'ms ' + COVER_ZOOM_EASE + ' ' + COVER_ZOOM_SWAP_LEAD_MS + 'ms';
      z.layer.style.transform = zoom.css;
      setTimeout(function () {
        /* Where the cover is on screen right now: the art contained in its (mid-zoom) box */
        var r = z.artImg.getBoundingClientRect();
        var h = Math.min(r.height, r.width / aspect);
        var w = h * aspect;
        var from = { left: r.left + (r.width - w) / 2, top: r.top + (r.height - h) / 2, width: w, height: h };
        go(target, from, COVER_ZOOM_NAV_LEAD_MS);
      }, COVER_ZOOM_SWAP_LEAD_MS + COVER_ZOOM_MS - COVER_ZOOM_NAV_LEAD_MS);
    });
  });
}

/*
 * L2 → homepage: the reader folds back onto its cover and, without stopping, starts zooming it toward its
 * shelf spot (remembered at tap time) while it loads the homepage (digizineCoverReturn: from, to, at, ms).
 * index.html carries the zoom on from the first paint and this takes over mid-flight, so the motion never
 * pauses; the shelf fades in and the cover turns back into the taped shelf image as it lands.
 */
var COVER_RETURN_MS = 620;
/** Near the end the shelf image fades in under the issue art, then the art fades off it. */
var COVER_RETURN_SHELF_FADE_MS = 160;
var COVER_RETURN_ART_FADE_MS = 120;
/** The shelf image is fully in this long before the art finishes fading off it. */
var COVER_RETURN_SWAP_OVERLAP_MS = 60;
/** Covers with a differently shaped shelf sheet: widen into it over this part of the zoom, then a softer swap. */
var COVER_RETURN_PAPER_WIDEN = [0.1, 0.55];
var COVER_RETURN_PAPER_SWAP_MS = 220;
var homepageShelfScrollRestored = false;

/** Leaves the cover at speed (the fold arrives still moving) and settles into the shelf spot. */
function coverReturnEase(p) {
  return 1 - Math.pow(1 - p, 3);
}

function lerpRect(a, b, t) {
  return {
    left: a.left + (b.left - a.left) * t,
    top: a.top + (b.top - a.top) * t,
    width: a.width + (b.width - a.width) * t,
    height: a.height + (b.height - a.height) * t
  };
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

/** Where the issue art sits on screen when the zoom layer is at rest on the shelf. */
function shelfArtRect(box, artBox, aspect) {
  var regionW = box.width * artBox.width;
  var regionH = box.height * artBox.height;
  var h = Math.min(regionH, regionW / aspect);
  var w = h * aspect;
  return {
    left: box.left + (artBox.left + artBox.width / 2) * box.width - w / 2,
    top: box.top + (artBox.top + artBox.height / 2) * box.height - h / 2,
    width: w,
    height: h
  };
}

function shelfScrollContainer() {
  return document.querySelector('main.shelf-container');
}

function rememberShelfScroll() {
  var shelf = shelfScrollContainer();
  try {
    sessionStorage.setItem(
      'digizineShelfScroll',
      JSON.stringify({
        left: shelf ? shelf.scrollLeft : 0,
        top: shelf ? shelf.scrollTop : 0,
        x: window.scrollX,
        y: window.scrollY,
        mobile: isMobileHomepageLayout()
      })
    );
  } catch (e) {}
}

/* Where the tapped cover's art sits on the shelf, so the reader can start the zoom home toward it. */
function rememberShelfSpot(slug, rect) {
  try {
    sessionStorage.setItem('digizineShelfSpot', JSON.stringify({ slug: slug, rect: rect }));
  } catch (e) {}
}

/* Put the shelf back where it was scrolled when the cover was tapped, so it returns to the same spot. */
function restoreShelfScroll() {
  try {
    var d = JSON.parse(sessionStorage.getItem('digizineShelfScroll') || 'null');
    if (!d || d.mobile !== isMobileHomepageLayout()) return;
    var shelf = shelfScrollContainer();
    if (shelf) {
      shelf.scrollLeft = d.left;
      shelf.scrollTop = d.top;
    }
    window.scrollTo(d.x, d.y);
    homepageShelfScrollRestored = true;
  } catch (e) {}
}

function takeCoverReturn() {
  try {
    var raw = sessionStorage.getItem('digizineCoverReturn');
    sessionStorage.removeItem('digizineCoverReturn');
    var d = raw ? JSON.parse(raw) : null;
    if (!d || !d.slug || !d.from || !d.src || Date.now() - d.at > 5000) return null;
    return d;
  } catch (e) {
    return null;
  }
}

function findShelfCoverForSlug(slug) {
  var frame = document.getElementById('content-frame');
  var els = frame ? frame.querySelectorAll('.zine-cover[data-zine]') : [];
  for (var i = 0; i < els.length; i++) {
    var s = els[i].getAttribute('data-slug');
    if (!s) {
      var asset = getHomepageAssetById(getZineId(els[i]));
      s = asset && asset.slug;
    }
    if (s === slug) return els[i];
  }
  return null;
}

function playCoverReturn(d) {
  var root = document.documentElement;
  var shelf = shelfScrollContainer();
  function dropHold() {
    window.__coverReturnTakenOver = true;
    var hold = document.querySelector('.cover-zoom-hold');
    if (hold && hold.parentNode) hold.parentNode.removeChild(hold);
  }
  function revealShelf(ms) {
    if (shelf) shelf.style.transition = ms ? 'opacity ' + Math.round(ms) + 'ms ease' : '';
    root.classList.remove('cover-returning');
  }
  var el = findShelfCoverForSlug(d.slug);
  if (!el || prefersReducedMotion()) {
    dropHold();
    revealShelf(0);
    return;
  }
  root.classList.add('cover-returning');
  el.style.visibility = 'hidden';
  restoreShelfScroll();
  var art = issueCoverImage(d.src);
  Promise.all([whenCoverArtReady(el), whenCoverArtReady(art)]).then(function () {
    var box = shelfCoverImageBox(el);
    var artBox = shelfCoverArtBox(el);
    var aspect = art.naturalWidth && art.naturalHeight ? art.naturalWidth / art.naturalHeight : d.from.width / d.from.height;
    var to = shelfArtRect(box, artBox, aspect);
    var ms = d.ms || COVER_RETURN_MS;
    /* Already under way if the reader started it (d.to); otherwise it starts now from the cover's rect. */
    var start = d.to ? d.at : Date.now();
    var z = buildCoverZoomLayer(el, box, artBox, d.src, coverZoomTransform(box, artBox, aspect, d.from).s);
    var shelfFade = z.paper ? COVER_RETURN_PAPER_SWAP_MS : COVER_RETURN_SHELF_FADE_MS;
    var artFade = z.paper ? COVER_RETURN_PAPER_SWAP_MS : COVER_RETURN_ART_FADE_MS;
    var shadow = z.artImg.style.filter;

    function render() {
      var t = Math.min(ms, Date.now() - start);
      var rect = lerpRect(d.from, to, coverReturnEase(t / ms));
      z.layer.style.transform = coverZoomTransform(box, artBox, aspect, rect).css;
      z.shelfImg.style.opacity = String(clamp01((t - (ms - shelfFade - COVER_RETURN_SWAP_OVERLAP_MS)) / shelfFade));
      z.artImg.style.opacity = String(1 - clamp01((t - (ms - artFade)) / artFade));
      if (z.paper) {
        /* Widen into the shelf sheet's shape on the way, the art's own shadow giving way to the sheet's */
        var widen = clamp01((t / ms - COVER_RETURN_PAPER_WIDEN[0]) / (COVER_RETURN_PAPER_WIDEN[1] - COVER_RETURN_PAPER_WIDEN[0]));
        z.paper.style.opacity = String(Math.min(widen, 1 - clamp01((t - (ms - COVER_RETURN_PAPER_SWAP_MS)) / COVER_RETURN_PAPER_SWAP_MS)));
        z.artImg.style.filter = widen < 1 ? shadow.replace('0.06)', (0.06 * (1 - widen)).toFixed(4) + ')') : 'none';
      }
      return t >= ms;
    }

    render();
    document.body.appendChild(z.layer);
    dropHold();
    revealShelf(Math.max(0, ms - (Date.now() - start)));
    (function frame() {
      if (!render()) {
        requestAnimationFrame(frame);
        return;
      }
      el.style.visibility = '';
      if (z.layer.parentNode) z.layer.parentNode.removeChild(z.layer);
      if (shelf) shelf.style.transition = '';
    })();
  });
}

if (document.getElementById('content-frame')) {
  var homepageCoverReturn = takeCoverReturn();
  if (homepageCoverReturn) playCoverReturn(homepageCoverReturn);
}

/* Back button / return from L2 via history (bfcache): put the shelf back, zooming the cover home if handed one. */
window.addEventListener('pageshow', function (e) {
  if (!e || !e.persisted || !document.getElementById('content-frame')) return;
  var state = homepageCoverZoomActive;
  if (state) {
    if (state.layer && state.layer.parentNode) state.layer.parentNode.removeChild(state.layer);
    if (state.el) state.el.style.visibility = '';
    homepageCoverZoomActive = false;
  }
  var d = takeCoverReturn();
  if (d) playCoverReturn(d);
  document.body.classList.remove('homepage-cover-zooming');
});

/* Zine navigation: click on cover (skipped right after a drag on draggable covers) */
var contentFrame = document.getElementById('content-frame');
if (contentFrame) {
  contentFrame.addEventListener('click', function (e) {
    if (homepageSuppressObjectClick) {
      homepageSuppressObjectClick = false;
      return;
    }
    var el = e.target.closest('[data-layout-id]');
    if (!el || !contentFrame.contains(el)) return;
    var id = el.getAttribute('data-layout-id');
    if (!id || id.indexOf('shelf') === 0) return;
    if (el.matches('.zine-cover[data-zine]') || id === 'lamp') return;
    trackShelfEvent('select_object', { object_id: id });
  });

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
        trackShelfEvent('open_zine', {
          zine_name: el.getAttribute('data-zine') || slug,
          zine_slug: slug
        });
        if (typeof setPendingIssueSlug === 'function') {
          setPendingIssueSlug(slug);
        }
        var u = new URL('issue.html', window.location.href);
        u.searchParams.set('slug', slug);
        zoomCoverIntoIssue(el, slug, u.href);
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
    if (isMobileHomepageLayout()) {
      trackShelfEvent('select_object', { object_id: 'lamp' });
      return;
    }
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
    trackShelfEvent('toggle_lamp', { theme: nextDark ? 'dark' : 'light' });
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
    trackShelfEvent('pet_cat', { object_id: 'cat' });
  });
})();

/* Apply persisted theme on every page (homepage + L2) after lamp asset hooks exist. */
digizineApplyHomepageThemeFromStorage();
