// Homepage: zine slugs (data-zine id → issue folder slug)
var HOMEPAGE_ASSETS = [
  { id: 'self-perception', type: 'zine', slug: 'self-perception' },
  { id: 'observations as a introvert', type: 'zine', slug: 'observations-as-an-introvert' },
  { id: 'collection of stillherestilllife', type: 'zine', slug: 'stillherestilllife' },
  { id: 'the idea marinade', type: 'zine', slug: 'idea-marinade' },
  { id: 'romanticise the mundane', type: 'zine', slug: 'romaticise-the-mundane' }
];

/** Draggable: delta from HOMEPAGE_LAYOUT_SPEC. */
var dragOffsets = {
  plant: { dx: 0, dy: 0 },
  'snake-plant': { dx: 0, dy: 0 },
  'chinese-cat': { dx: 0, dy: 0 },
  books: { dx: 0, dy: 0 },
  cat: { dx: 0, dy: 0 },
  'idea-marinade': { dx: 0, dy: 0 },
  romanticise: { dx: 0, dy: 0 },
  about: { dx: 0, dy: 0 }
};

/** After dragging a zine cover, skip the synthetic click that would open the issue. */
var homepageSuppressZineClick = false;

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

function isDraggableId(layoutId) {
  return HOMEPAGE_DRAGGABLE_IDS.indexOf(layoutId) !== -1;
}

/**
 * Apply layout from HOMEPAGE_LAYOUT_SPEC.
 * Zines: spec only. Draggable: spec + dragOffsets.
 */
function applyLayoutFromSpec() {
  var spec = typeof HOMEPAGE_LAYOUT_SPEC !== 'undefined' ? HOMEPAGE_LAYOUT_SPEC : null;
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
    if (!box) return;

    var x = box.x;
    var y = box.y;
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
  var spec = typeof HOMEPAGE_LAYOUT_SPEC !== 'undefined' ? HOMEPAGE_LAYOUT_SPEC : {};
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
    var finalY = parsePx(el.style.top);

    console.log('  ' + id + ':', {
      spec: { x: specX, y: specY },
      dragOffset: { dx: off.dx, dy: off.dy },
      final: { x: finalX, y: finalY }
    });
  });
}

applyAssetData();
loadPersistedDraggableLayout();
applyLayoutFromSpec();
logHomepageLayoutState('initial load');

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
    if (t.closest('[data-draggable="true"]')) return false;
    return true;
  }

  function onPointerDown(e) {
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
    if (!panning) return;
    applyHorizontalScrollFromClientX(e.clientX);
    e.preventDefault();
  }

  function onPointerUp(e) {
    if (!panning) return;
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
  var DRAG_MOVE_PX = 8;

  /** Draggable zine covers stay below foreground props (CSS z-index ≥ 200); cap inline z-index at 199. */
  var Z_COVER_DRAG_MAX = 199;
  var zCoverDrag = 99;

  /** plant, cat, chinese-cat, snake-plant, lamp, books — always above zine covers; drag uses 500+. */
  var FOREGROUND_DECORATION_IDS = {
    plant: true,
    cat: true,
    'chinese-cat': true,
    'snake-plant': true,
    lamp: true,
    books: true
  };
  var zForegroundDrag = 499;

  var zAboutDrag = 299;

  function bringToFront(el, id) {
    if (el.classList.contains('zine-cover')) {
      zCoverDrag = Math.min(zCoverDrag + 1, Z_COVER_DRAG_MAX);
      el.style.zIndex = String(zCoverDrag);
      return;
    }
    if (id && FOREGROUND_DECORATION_IDS[id]) {
      zForegroundDrag++;
      el.style.zIndex = String(zForegroundDrag);
      return;
    }
    if (id === 'about') {
      zAboutDrag++;
      el.style.zIndex = String(zAboutDrag);
      return;
    }
    zForegroundDrag++;
    el.style.zIndex = String(zForegroundDrag);
  }

  function clientPoint(e) {
    if (e.touches && e.touches.length) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  function onPointerDown(e) {
    var t = e.target.closest('[data-draggable="true"]');
    if (!t || !frame.contains(t)) return;
    var id = t.getAttribute('data-layout-id');
    if (!isDraggableId(id)) return;
    e.preventDefault();
    var pt = clientPoint(e);
    var spec = HOMEPAGE_LAYOUT_SPEC[id];
    if (!spec) return;
    var o = dragOffsets[id] || { dx: 0, dy: 0 };
    bringToFront(t, id);
    active = {
      id: id,
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
    if (!active) return;
    if (active.didDrag && active.isZine) {
      homepageSuppressZineClick = true;
    }
    active = null;
    savePersistedDraggableLayout();
    logHomepageLayoutState('after drag');
  }

  frame.addEventListener('mousedown', onPointerDown);
  document.addEventListener('mousemove', onPointerMove);
  document.addEventListener('mouseup', onPointerUp);

  frame.addEventListener('touchstart', onPointerDown, { passive: false });
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
      if (slug) {
        window.location = 'issue.html?slug=' + encodeURIComponent(slug);
      }
    });
  });
}
