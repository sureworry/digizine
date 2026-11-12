// L2 accordion fold: pages keep the open-row layout and are turned in 3D (alternating) so the strip reads as a
// folded zine; unfolding animates every page back to flat in place.
(function (global) {
  /** Perspective depth as a multiple of page height — keeps the fold depth similar on desktop and mobile. */
  var PERSPECTIVE_PER_PAGE_HEIGHT = 4;
  var MIN_FOLD_DEG = 55;
  var MAX_FOLD_DEG = 72;
  /** Folded zine width as a share of the visible strip width. */
  var FIT_RATIO = 0.86;
  var FOLD_MS = 900;
  var FOLD_EASE = 'cubic-bezier(0.22, 1, 0.32, 1)';

  function getPages(strip) {
    return strip.querySelectorAll('.zine-strip__page');
  }

  /* translateX sits outside perspective() so every page is seen head-on, then slid into place. */
  function toTransform(x, perspective, deg, scale) {
    return (
      'translateX(' + x + 'px) perspective(' + perspective + 'px) rotateY(' + deg + 'deg) scale(' + scale + ')'
    );
  }

  function getPerspective(strip) {
    var page = strip.querySelector('.zine-strip__page');
    var h = page ? page.offsetHeight : 0;
    return Math.max(600, h * PERSPECTIVE_PER_PAGE_HEIGHT);
  }

  function flatTransform(strip, x) {
    return toTransform(x || 0, getPerspective(strip), 0, 1);
  }

  /**
   * Folded transform per page from untransformed layout (offsetLeft/offsetWidth ignore transforms).
   * Even pages recede on the right, odd pages on the left, so neighbours meet at alternating fold edges.
   * Pages are laid edge to edge using their projected extents (near half wider than far half).
   */
  function computeFoldTransforms(strip) {
    var scroller = strip.querySelector('.zine-strip__scroller');
    var pages = getPages(strip);
    if (!scroller || !pages.length) return [];

    var widths = [];
    var lefts = [];
    var total = 0;
    for (var i = 0; i < pages.length; i++) {
      var p = pages[i];
      var w = Math.max(1, p.offsetWidth);
      widths.push(w);
      lefts.push(p.offsetParent === scroller ? p.offsetLeft : p.offsetLeft - scroller.offsetLeft);
      total += w;
    }

    var visibleW = strip.clientWidth || window.innerWidth;
    var target = visibleW * FIT_RATIO;
    var deg = (Math.acos(Math.min(1, target / total)) * 180) / Math.PI;
    deg = Math.max(MIN_FOLD_DEG, Math.min(MAX_FOLD_DEG, deg));
    var rad = (deg * Math.PI) / 180;
    var cos = Math.cos(rad);
    var sin = Math.sin(rad);
    var scale = Math.min(1, target / (total * cos));
    var perspective = getPerspective(strip);

    var extents = [];
    var foldedW = 0;
    for (var e = 0; e < pages.length; e++) {
      var half = (widths[e] * scale) / 2;
      var depth = half * sin;
      var near = (half * cos * perspective) / (perspective - depth);
      var far = (half * cos * perspective) / (perspective + depth);
      /* Even pages: left edge near. Odd pages: right edge near. */
      var ext = e % 2 === 0 ? { left: near, right: far } : { left: far, right: near };
      extents.push(ext);
      foldedW += ext.left + ext.right;
    }

    var stripRect = strip.getBoundingClientRect();
    var scrollerRect = scroller.getBoundingClientRect();
    var cursor = stripRect.left + strip.clientLeft + (visibleW - foldedW) / 2;

    var out = [];
    for (var k = 0; k < pages.length; k++) {
      var foldedCenter = cursor + extents[k].left;
      var flatCenter = scrollerRect.left + lefts[k] + widths[k] / 2;
      out.push(toTransform(foldedCenter - flatCenter, perspective, k % 2 === 0 ? deg : -deg, scale));
      cursor += extents[k].left + extents[k].right;
    }
    return out;
  }

  function clearPendingCleanup(strip) {
    if (strip._zineAccordionTimer) {
      clearTimeout(strip._zineAccordionTimer);
      strip._zineAccordionTimer = null;
    }
  }

  function setTransforms(pages, transforms, animate) {
    for (var i = 0; i < pages.length; i++) {
      pages[i].style.transition = animate ? 'transform ' + FOLD_MS + 'ms ' + FOLD_EASE : 'none';
      pages[i].style.transform = transforms[i];
    }
  }

  function clearTransitions(pages) {
    for (var i = 0; i < pages.length; i++) {
      pages[i].style.transition = '';
    }
  }

  /** Pin pages flat at a horizontal offset (no transition) — keeps the open spread in place before folding. */
  function holdFlat(strip, offsetX) {
    clearPendingCleanup(strip);
    var pages = getPages(strip);
    var t = [];
    for (var i = 0; i < pages.length; i++) t.push(flatTransform(strip, offsetX));
    setTransforms(pages, t, false);
  }

  function fold(strip, animate) {
    clearPendingCleanup(strip);
    var pages = getPages(strip);
    if (!pages.length) return;
    void strip.offsetWidth;
    var folded = computeFoldTransforms(strip);
    if (!animate) {
      setTransforms(pages, folded, false);
      return;
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        setTransforms(pages, folded, true);
        strip._zineAccordionTimer = setTimeout(function () {
          clearTransitions(pages);
          strip._zineAccordionTimer = null;
        }, FOLD_MS + 50);
      });
    });
  }

  function unfold(strip, animate) {
    clearPendingCleanup(strip);
    var pages = getPages(strip);
    if (!pages.length) return;
    function finish() {
      for (var i = 0; i < pages.length; i++) {
        pages[i].style.transition = '';
        pages[i].style.transform = '';
      }
      strip._zineAccordionTimer = null;
    }
    if (!animate) {
      finish();
      return;
    }
    var flat = [];
    for (var i = 0; i < pages.length; i++) flat.push(flatTransform(strip, 0));
    setTransforms(pages, flat, true);
    strip._zineAccordionTimer = setTimeout(finish, FOLD_MS + 50);
  }

  /** Run cb once every page image has loaded (or failed) so widths are real. */
  function whenImagesReady(strip, cb) {
    var imgs = strip.querySelectorAll('.zine-strip__page img');
    var pending = 0;
    for (var i = 0; i < imgs.length; i++) {
      if (!imgs[i].complete) pending++;
    }
    if (pending === 0) {
      requestAnimationFrame(cb);
      return;
    }
    function onDone() {
      pending--;
      if (pending <= 0) requestAnimationFrame(cb);
    }
    for (var j = 0; j < imgs.length; j++) {
      if (imgs[j].complete) continue;
      imgs[j].addEventListener('load', onDone);
      imgs[j].addEventListener('error', onDone);
    }
  }

  global.ZineAccordion = {
    fold: fold,
    unfold: unfold,
    holdFlat: holdFlat,
    whenImagesReady: whenImagesReady
  };
})(typeof window !== 'undefined' ? window : this);
