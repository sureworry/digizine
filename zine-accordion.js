// L2 accordion: one continuous folded sheet built as a real 3D concertina (shared camera on the scroller).
// Stage drives everything: 0 = closed on the cover (other pages stacked behind it), 1 = zigzag, 2 = flat open row.
// Every frame re-chains the pages edge to edge, so folds never detach or overlap.
(function (global) {
  /**
   * Camera distance as a multiple of page height — keeps the fold depth similar on desktop and mobile.
   * Far enough back that the outermost pages (the cover, on the left) aren't foreshortened into slivers.
   */
  var PERSPECTIVE_PER_PAGE_HEIGHT = 8;
  var MIN_FOLD_DEG = 55;
  var MAX_FOLD_DEG = 72;
  /** Folded zine width as a share of the visible strip width. */
  var FIT_RATIO = 0.86;
  /** Closed stack: each page folds back to just short of flat against the previous one. */
  var CLOSED_GAP_DEG = 4;
  /** Duration per stage step (closed→zigzag, zigzag→flat). */
  var STAGE_MS = 950;
  /** Neighbours overlap by this much while folded so antialiased fold edges never show a hairline. */
  var SEAM_OVERLAP_PX = 0.75;

  var STAGE_CLOSED = 0;
  var STAGE_ZIGZAG = 1;
  var STAGE_FLAT = 2;

  function getPages(strip) {
    return strip.querySelectorAll('.zine-strip__page');
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function easeOutSine(t) {
    return Math.sin((t * Math.PI) / 2);
  }

  /** Untransformed layout (computed widths keep sub-pixel precision) plus the zigzag angle and scale. */
  function measure(strip) {
    var scroller = strip.querySelector('.zine-strip__scroller');
    var pages = getPages(strip);
    if (!scroller || !pages.length) return null;

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
    var psi = (Math.acos(Math.min(1, target / total)) * 180) / Math.PI;
    psi = Math.max(MIN_FOLD_DEG, Math.min(MAX_FOLD_DEG, psi));
    var zigScale = Math.min(1, target / (total * Math.cos((psi * Math.PI) / 180)));

    var stripRect = strip.getBoundingClientRect();
    var scrollerRect = scroller.getBoundingClientRect();
    var pageH = pages[0].offsetHeight;
    return {
      strip: strip,
      scroller: scroller,
      pages: pages,
      widths: widths,
      lefts: lefts,
      scrollerLeft: scrollerRect.left,
      stripCenter: stripRect.left + strip.clientLeft + visibleW / 2,
      pageH: pageH,
      perspective: Math.max(600, pageH * PERSPECTIVE_PER_PAGE_HEIGHT),
      psi: psi,
      zigScale: zigScale
    };
  }

  /*
   * Pose per stage, as a real concertina: every fold opens by the same half-angle `a` around a pull axis at
   * heading `R` (headings are in the x–z plane, z toward the viewer). Even pages head R + a, odd pages R − a.
   * Closed: the axis points away from the viewer, so the cover faces front and the rest stack behind it.
   * Opening turns the axis sideways while the folds open, so the sheet stays compact instead of sweeping flat.
   */
  function poseAt(geo, stage) {
    var closedHalf = 90 - CLOSED_GAP_DEG / 2;
    var closed = { R: -closedHalf, a: closedHalf, scale: 1 };
    var zig = { R: 0, a: geo.psi, scale: geo.zigScale };
    var flat = { R: 0, a: 0, scale: 1 };
    if (stage <= STAGE_ZIGZAG) {
      var t = Math.max(0, stage);
      return {
        R: lerp(closed.R, zig.R, t),
        a: lerp(closed.a, zig.a, t),
        scale: lerp(closed.scale, zig.scale, t),
        from: 'closed',
        to: 'zig',
        t: t,
        /* Closed cover lies flat, so fold shading ramps in as the pages swing out */
        fold: t,
        crease: 0
      };
    }
    var u = Math.min(1, stage - STAGE_ZIGZAG);
    return {
      R: lerp(zig.R, flat.R, u),
      a: lerp(zig.a, flat.a, u),
      scale: lerp(zig.scale, flat.scale, u),
      from: 'zig',
      to: 'flat',
      t: u,
      fold: 1 - u,
      crease: u
    };
  }

  /** Chain pages from the origin; returns centres, headings, and x/z extents for anchoring. */
  function chain(geo, pose) {
    var overlap = SEAM_OVERLAP_PX * pose.fold;
    var px = 0;
    var pz = 0;
    var out = [];
    var minX = 0;
    var maxX = 0;
    var minZ = 0;
    var maxZ = 0;
    for (var i = 0; i < geo.widths.length; i++) {
      var deg = i % 2 === 0 ? pose.R + pose.a : pose.R - pose.a;
      var rad = (deg * Math.PI) / 180;
      var w = geo.widths[i] * pose.scale;
      var dx = Math.cos(rad);
      var dz = Math.sin(rad);
      var ex = px + dx * w;
      var ez = pz + dz * w;
      out.push({ cx: px + (dx * w) / 2, cz: pz + (dz * w) / 2, deg: deg, facing: dx });
      minX = Math.min(minX, ex);
      maxX = Math.max(maxX, ex);
      minZ = Math.min(minZ, ez);
      maxZ = Math.max(maxZ, ez);
      px += dx * (w - (i < geo.widths.length - 1 ? overlap : 0));
      pz += dz * (w - (i < geo.widths.length - 1 ? overlap : 0));
    }
    return { pages: out, minX: minX, maxX: maxX, minZ: minZ, maxZ: maxZ };
  }

  /** Where each pose wants the chain: closed centres the cover, zigzag centres the sheet, flat sits in the row. */
  function anchorFor(geo, which, c, offsetX) {
    if (which === 'closed') return { x: geo.stripCenter - c.pages[0].cx, z: -c.pages[0].cz };
    if (which === 'zig') return { x: geo.stripCenter - (c.minX + c.maxX) / 2, z: -(c.minZ + c.maxZ) / 2 };
    return { x: geo.scrollerLeft + geo.lefts[0] + offsetX, z: 0 };
  }

  function render(strip, geo, stage, offsetX) {
    var pose = poseAt(geo, stage);
    var c = chain(geo, pose);
    var a = anchorFor(geo, pose.from, c, offsetX);
    var b = anchorFor(geo, pose.to, c, offsetX);
    var shiftX = lerp(a.x, b.x, pose.t);
    var shiftZ = lerp(a.z, b.z, pose.t);

    geo.scroller.style.perspective = geo.perspective + 'px';
    geo.scroller.style.perspectiveOrigin = geo.stripCenter - geo.scrollerLeft + 'px ' + geo.pageH / 2 + 'px';

    for (var i = 0; i < geo.pages.length; i++) {
      var p = c.pages[i];
      var flatCenter = geo.scrollerLeft + geo.lefts[i] + geo.widths[i] / 2;
      var el = geo.pages[i];
      el.style.transition = 'none';
      el.style.transform =
        'translate3d(' +
        (p.cx + shiftX - flatCenter) +
        'px, 0, ' +
        (p.cz + shiftZ) +
        'px) rotateY(' +
        -p.deg +
        'deg) scale(' +
        pose.scale +
        ')';
      el.classList.toggle('zine-strip__page--back', p.facing < 0);
    }
    strip.style.setProperty('--zine-fold-amount', String(pose.fold));
    strip.style.setProperty('--zine-crease-amount', String(pose.crease));
    strip._zineStage = stage;
  }

  function clearFlat(strip) {
    var pages = getPages(strip);
    for (var i = 0; i < pages.length; i++) {
      pages[i].style.transition = '';
      pages[i].style.transform = '';
      pages[i].classList.remove('zine-strip__page--back');
    }
    strip.style.setProperty('--zine-fold-amount', '0');
    strip.style.setProperty('--zine-crease-amount', '1');
    strip._zineStage = STAGE_FLAT;
  }

  function stopAnimation(strip) {
    if (strip._zineAccordionRaf) {
      cancelAnimationFrame(strip._zineAccordionRaf);
      strip._zineAccordionRaf = null;
    }
  }

  function getStage(strip) {
    return typeof strip._zineStage === 'number' ? strip._zineStage : STAGE_ZIGZAG;
  }

  /**
   * Animate to a stage. offsetX: where the flat row sits relative to scrollLeft 0 (−scrollLeft before closing),
   * so folding starts from the spread on screen instead of jumping back to the first page.
   * easing: 'out' starts moving at once (e.g. carrying on from the homepage zoom) instead of easing in.
   */
  function animateTo(strip, toStage, opts) {
    opts = opts || {};
    stopAnimation(strip);
    var geo = measure(strip);
    if (!geo) return;
    var offsetX = opts.offsetX || 0;
    var from = typeof opts.from === 'number' ? opts.from : getStage(strip);

    function settle() {
      if (toStage === STAGE_FLAT) clearFlat(strip);
      else render(strip, geo, toStage, offsetX);
      if (opts.onDone) opts.onDone();
    }

    var duration = STAGE_MS * Math.abs(toStage - from);
    if (opts.animate === false || duration < 16) {
      settle();
      return;
    }

    var ease = opts.easing === 'out' ? easeOutSine : easeInOutCubic;
    var start = null;
    function frame(now) {
      if (start === null) start = now;
      var t = Math.min(1, (now - start) / duration);
      render(strip, geo, lerp(from, toStage, ease(t)), offsetX);
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

  function setStage(strip, stage) {
    animateTo(strip, stage, { animate: false, from: stage });
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
    STAGE_CLOSED: STAGE_CLOSED,
    STAGE_ZIGZAG: STAGE_ZIGZAG,
    STAGE_FLAT: STAGE_FLAT,
    animateTo: animateTo,
    setStage: setStage,
    getStage: getStage,
    whenImagesReady: whenImagesReady
  };
})(typeof window !== 'undefined' ? window : this);
