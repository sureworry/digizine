// L2 accordion fold: pages keep the open-row layout and are turned in 3D (alternating) so the strip reads as one
// long folded sheet. Every animation frame re-chains the pages edge to edge, so folds never detach or overlap.
(function (global) {
  /** Perspective depth as a multiple of page height — keeps the fold depth similar on desktop and mobile. */
  var PERSPECTIVE_PER_PAGE_HEIGHT = 4;
  var MIN_FOLD_DEG = 55;
  var MAX_FOLD_DEG = 72;
  /** Folded zine width as a share of the visible strip width. */
  var FIT_RATIO = 0.86;
  var FOLD_MS = 900;
  /** Neighbours overlap by this much so antialiased fold edges never show a hairline of background. */
  var SEAM_OVERLAP_PX = 0.75;

  function getPages(strip) {
    return strip.querySelectorAll('.zine-strip__page');
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /* translateX sits outside perspective() so every page is seen head-on, then slid into place. */
  function toTransform(x, perspective, deg, scale) {
    return (
      'translateX(' + x + 'px) perspective(' + perspective + 'px) rotateY(' + deg + 'deg) scale(' + scale + ')'
    );
  }

  /** Untransformed layout (offsetLeft/offsetWidth ignore transforms) plus the fully folded angle and scale. */
  function measure(strip) {
    var scroller = strip.querySelector('.zine-strip__scroller');
    var pages = getPages(strip);
    if (!scroller || !pages.length) return null;

    /*
     * Used widths from computed style keep sub-pixel precision (offsetWidth rounds, which shows up as uneven
     * seams on mobile). Pages sit contiguously in the row, so lefts accumulate from the scroller's inner edge.
     */
    var scStyle = getComputedStyle(scroller);
    var widths = [];
    var lefts = [];
    var total = 0;
    var x = (parseFloat(scStyle.borderLeftWidth) || 0) + (parseFloat(scStyle.paddingLeft) || 0);
    for (var i = 0; i < pages.length; i++) {
      var w = Math.max(1, parseFloat(getComputedStyle(pages[i]).width) || pages[i].offsetWidth);
      widths.push(w);
      lefts.push(x);
      x += w;
      total += w;
    }

    var visibleW = strip.clientWidth || window.innerWidth;
    var target = visibleW * FIT_RATIO;
    var deg = (Math.acos(Math.min(1, target / total)) * 180) / Math.PI;
    deg = Math.max(MIN_FOLD_DEG, Math.min(MAX_FOLD_DEG, deg));
    var foldScale = Math.min(1, target / (total * Math.cos((deg * Math.PI) / 180)));

    var geo = {
      pages: pages,
      widths: widths,
      lefts: lefts,
      scrollerLeft: scroller.getBoundingClientRect().left,
      perspective: Math.max(600, pages[0].offsetHeight * PERSPECTIVE_PER_PAGE_HEIGHT),
      foldDeg: deg,
      foldScale: foldScale
    };
    var stripLeft = strip.getBoundingClientRect().left + strip.clientLeft;
    geo.foldedAnchor = stripLeft + (visibleW - chainWidth(geo, deg, foldScale)) / 2;
    return geo;
  }

  /** Projected left/right half-widths: the half turned toward the viewer is wider than the receding half. */
  function extentsAt(geo, index, deg, scale) {
    var rad = (deg * Math.PI) / 180;
    var half = (geo.widths[index] * scale) / 2;
    var depth = half * Math.sin(rad);
    var base = half * Math.cos(rad) * geo.perspective;
    var near = base / (geo.perspective - depth);
    var far = base / (geo.perspective + depth);
    /* Even pages turn +deg (right edge recedes), odd pages −deg (left edge recedes). */
    return index % 2 === 0 ? { left: near, right: far } : { left: far, right: near };
  }

  /** Seam overlap shrinks to 0 as the sheet flattens so the last frame matches the open row exactly. */
  function seamOverlap(geo, deg) {
    return geo.foldDeg > 0 ? SEAM_OVERLAP_PX * (deg / geo.foldDeg) : 0;
  }

  function chainWidth(geo, deg, scale) {
    var overlap = seamOverlap(geo, deg);
    var w = 0;
    for (var i = 0; i < geo.widths.length; i++) {
      var e = extentsAt(geo, i, deg, scale);
      w += e.left + e.right - (i > 0 ? overlap : 0);
    }
    return w;
  }

  /** Lay the pages edge to edge from anchorLeft (viewport x) at a given fold angle and scale. */
  function chainTransforms(geo, deg, scale, anchorLeft) {
    var overlap = seamOverlap(geo, deg);
    var out = [];
    var cursor = anchorLeft;
    for (var i = 0; i < geo.widths.length; i++) {
      var e = extentsAt(geo, i, deg, scale);
      if (i > 0) cursor -= overlap;
      var center = cursor + e.left;
      var flatCenter = geo.scrollerLeft + geo.lefts[i] + geo.widths[i] / 2;
      out.push(toTransform(center - flatCenter, geo.perspective, i % 2 === 0 ? deg : -deg, scale));
      cursor += e.left + e.right;
    }
    return out;
  }

  /** flatness: 0 = fully folded and centred, 1 = flat in the open row (shifted by offsetX). */
  function render(strip, geo, flatness, offsetX) {
    var fold = 1 - flatness;
    var deg = geo.foldDeg * fold;
    var scale = geo.foldScale + (1 - geo.foldScale) * flatness;
    var flatAnchor = geo.scrollerLeft + geo.lefts[0] + offsetX;
    var anchor = geo.foldedAnchor + (flatAnchor - geo.foldedAnchor) * flatness;
    var transforms = chainTransforms(geo, deg, scale, anchor);
    for (var i = 0; i < geo.pages.length; i++) {
      geo.pages[i].style.transition = 'none';
      geo.pages[i].style.transform = transforms[i];
    }
    strip.style.setProperty('--zine-fold-amount', String(fold));
    strip._zineFlatness = flatness;
  }

  function clearFlat(strip) {
    var pages = getPages(strip);
    for (var i = 0; i < pages.length; i++) {
      pages[i].style.transition = '';
      pages[i].style.transform = '';
    }
    strip.style.setProperty('--zine-fold-amount', '0');
    strip._zineFlatness = 1;
  }

  function stopAnimation(strip) {
    if (strip._zineAccordionRaf) {
      cancelAnimationFrame(strip._zineAccordionRaf);
      strip._zineAccordionRaf = null;
    }
  }

  function animateTo(strip, toFlatness, animate, offsetX) {
    stopAnimation(strip);
    var geo = measure(strip);
    if (!geo) return;
    offsetX = offsetX || 0;
    var from = typeof strip._zineFlatness === 'number' ? strip._zineFlatness : 1 - toFlatness;

    function settle() {
      if (toFlatness === 1) clearFlat(strip);
      else render(strip, geo, 0, offsetX);
    }

    var duration = FOLD_MS * Math.abs(toFlatness - from);
    if (!animate || duration < 16) {
      settle();
      return;
    }

    var start = null;
    function frame(now) {
      if (start === null) start = now;
      var t = Math.min(1, (now - start) / duration);
      render(strip, geo, from + (toFlatness - from) * easeInOutCubic(t), offsetX);
      if (t < 1) {
        strip._zineAccordionRaf = requestAnimationFrame(frame);
      } else {
        strip._zineAccordionRaf = null;
        settle();
      }
    }
    render(strip, geo, from, offsetX);
    strip._zineAccordionRaf = requestAnimationFrame(frame);
  }

  /**
   * offsetX: where the flat row currently sits relative to scrollLeft 0 (−scrollLeft before closing), so the
   * fold starts from the spread on screen instead of jumping back to the first page.
   */
  function fold(strip, animate, offsetX) {
    animateTo(strip, 0, animate, offsetX);
  }

  function unfold(strip, animate) {
    animateTo(strip, 1, animate, 0);
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
    whenImagesReady: whenImagesReady
  };
})(typeof window !== 'undefined' ? window : this);
