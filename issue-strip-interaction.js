// Shared: stacked ↔ horizontal strip + FLIP. Close = tap on strip (no extra UI);
// distinguishes tap vs scroll/drag.
(function (global) {
  var TAP_MOVE_THRESHOLD = 20;
  var TAP_SCROLL_THRESHOLD = 8;

  // #region agent log
  function agentDbgLayout(hypothesisId, message, phase, opening) {
    var de = document.documentElement;
    var body = document.body;
    var se = document.scrollingElement;
    var wrap = document.querySelector('.issue-wrapper');
    var wrapLeft = wrap ? wrap.getBoundingClientRect().left : null;
    var root = document.querySelector('.zine-strip-root');
    var rootLeft = root ? root.getBoundingClientRect().left : null;
    var data = {
      phase: phase,
      opening: opening,
      innerWidth: window.innerWidth,
      deClientWidth: de.clientWidth,
      innerMinusDeClient: window.innerWidth - de.clientWidth,
      deScrollHeight: de.scrollHeight,
      innerHeight: window.innerHeight,
      overflowing: de.scrollHeight > window.innerHeight,
      deOverflowY: de ? getComputedStyle(de).overflowY : '',
      bodyOverflowY: body ? getComputedStyle(body).overflowY : '',
      scrollingEl: se ? se.tagName : '',
      seClientWidth: se ? se.clientWidth : null,
      wrapLeft: wrapLeft,
      rootLeft: rootLeft,
      bodyPaddingRight: body ? getComputedStyle(body).paddingRight : '',
    };
    fetch('http://127.0.0.1:7550/ingest/1c972698-8f1d-4220-b1fb-7fbaaf3c95d9', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': 'd00a6a',
      },
      body: JSON.stringify({
        sessionId: 'd00a6a',
        location: 'issue-strip-interaction.js:agentDbgLayout',
        message: message,
        data: data,
        timestamp: Date.now(),
        hypothesisId: hypothesisId,
      }),
    }).catch(function () {});
    try {
      var key = 'dbgLayoutIssue_d00a6a';
      var prev = JSON.parse(sessionStorage.getItem(key) || '[]');
      if (!Array.isArray(prev)) prev = [];
      data.runId = 'post-vw-calc-body-padding';
      prev.push(data);
      sessionStorage.setItem(key, JSON.stringify(prev.slice(-40)));
    } catch (e) {}
  }
  // #endregion

  function setupZineStripInteraction(stripMount, options) {
    var issue = options.issue;
    var stripEl =
      stripMount &&
      stripMount.classList &&
      stripMount.classList.contains('zine-strip')
        ? stripMount
        : stripMount.querySelector('.zine-strip');
    if (!stripEl) return;
    var scrollerEl = stripEl.querySelector('.zine-strip__scroller');
    if (!scrollerEl) return;

    var reduceMotion =
      typeof window.matchMedia !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var accordion =
      options.foldStyle === 'accordion' && typeof global.ZineAccordion !== 'undefined';
    var landOnCover = accordion && !!options.landOnCover;

    var pointerActive = false;
    var pointerDragged = false;
    var scrollNudged = false;
    var startX = 0;
    var startY = 0;
    var startScrollLeft = 0;

    var touchStripScrollStart = 0;
    var touchStripStartX = 0;
    var touchStripStartY = 0;
    var touchStripLastX = 0;
    var touchStripAxis = null;
    var touchHorizNudged = false;

    function isMobileIssueViewport() {
      return (
        typeof window.matchMedia !== 'undefined' &&
        window.matchMedia('(max-width: 768px)').matches
      );
    }

    function getPages(strip) {
      return strip.querySelectorAll('.zine-strip__page');
    }

    /*
     * Accordion: same row layout folded/flat, so only per-page transforms animate (no FLIP).
     * landOnCover: closing folds all the way back onto the cover; tapping the cover fans it out to the zigzag.
     */
    function runAccordionTransition(strip, opening) {
      var ZA = global.ZineAccordion;
      if (opening) {
        if (landOnCover && ZA.getStage(strip) < ZA.STAGE_ZIGZAG - 0.001) {
          ZA.animateTo(strip, ZA.STAGE_ZIGZAG, { animate: !reduceMotion });
          return;
        }
        strip.classList.remove('zine-strip--closed');
        strip.classList.add('zine-strip--open');
        ZA.animateTo(strip, ZA.STAGE_FLAT, { animate: !reduceMotion });
      } else {
        var spreadOffset = -strip.scrollLeft;
        strip.classList.remove('zine-strip--open');
        strip.classList.add('zine-strip--closed');
        strip.scrollLeft = 0;
        ZA.animateTo(strip, landOnCover ? ZA.STAGE_CLOSED : ZA.STAGE_ZIGZAG, {
          animate: !reduceMotion,
          offsetX: spreadOffset
        });
      }
      syncChrome(strip, opening);
    }

    /*
     * Start the closed cover where the previous page left it (e.g. the homepage zoom), then glide into place.
     */
    var COVER_INTRO_MS = 100;
    function playCoverIntro(strip, rect, done) {
      var outer = strip.closest('.zine-strip-outer') || strip;
      var cover = getPages(strip)[0];
      if (!rect || !cover || reduceMotion) {
        done();
        return;
      }
      var c = cover.getBoundingClientRect();
      var o = outer.getBoundingClientRect();
      if (!c.height) {
        done();
        return;
      }
      var s = rect.height / c.height;
      var dx = rect.left + rect.width / 2 - (c.left + c.width / 2);
      var dy = rect.top + rect.height / 2 - (c.top + c.height / 2);
      outer.style.transformOrigin = c.left + c.width / 2 - o.left + 'px ' + (c.top + c.height / 2 - o.top) + 'px';
      outer.style.transition = 'none';
      outer.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')';
      void outer.offsetWidth;
      requestAnimationFrame(function () {
        outer.style.transition = 'transform ' + COVER_INTRO_MS + 'ms cubic-bezier(0.22, 1, 0.32, 1)';
        outer.style.transform = '';
        setTimeout(function () {
          outer.style.transition = '';
          outer.style.transformOrigin = '';
          done();
        }, COVER_INTRO_MS);
      });
    }

    function runFlipTransition(strip, opening) {
      if (accordion) {
        runAccordionTransition(strip, opening);
        return;
      }
      var pages = getPages(strip);
      if (pages.length === 0) return;

      // #region agent log
      agentDbgLayout('H1-H5', 'flip start', 'start', opening);
      // #endregion

      if (reduceMotion) {
        if (opening) {
          if (typeof clearZineStackScrollerWidth === 'function') {
            clearZineStackScrollerWidth(strip);
          }
          strip.classList.remove('zine-strip--closed');
          strip.classList.add('zine-strip--open');
        } else {
          if (typeof layoutZineStackPositions === 'function') {
            layoutZineStackPositions(strip);
          }
          strip.classList.remove('zine-strip--open');
          strip.classList.add('zine-strip--closed');
          if (typeof applyPendingClosedScrollerWidth === 'function') {
            applyPendingClosedScrollerWidth(strip);
          }
          strip.scrollLeft = 0;
        }
        syncChrome(strip, opening);
        // #region agent log
        requestAnimationFrame(function () {
          agentDbgLayout('H1-H5', 'flip end reducedMotion', 'after-rAF', opening);
        });
        // #endregion
        return;
      }

      /*
       * Close: capture "before" at current scroll (no pre-reset). FLIP then switches to
       * closed, resets scroll, measures anchored "after", and inverts so pages animate
       * from their on-screen spread into the stack.
       */
      if (!opening) {
        if (typeof layoutZineStackPositions === 'function') {
          layoutZineStackPositions(strip);
        }
        void strip.offsetWidth;
      }

      var before = [];
      for (var i = 0; i < pages.length; i++) {
        before.push(pages[i].getBoundingClientRect());
      }

      strip.classList.add('zine-strip--animating');

      if (opening) {
        if (typeof clearZineStackScrollerWidth === 'function') {
          clearZineStackScrollerWidth(strip);
        }
        strip.classList.remove('zine-strip--closed');
        strip.classList.add('zine-strip--open');
      } else {
        strip.classList.remove('zine-strip--open');
        strip.classList.add('zine-strip--closed');
        if (typeof applyPendingClosedScrollerWidth === 'function') {
          applyPendingClosedScrollerWidth(strip);
        }
        /* Anchor stack in viewport; measure "after" from this layout, not scrolled offset */
        strip.scrollLeft = 0;
      }

      void strip.offsetWidth;

      var after = [];
      for (var j = 0; j < pages.length; j++) {
        after.push(pages[j].getBoundingClientRect());
      }

      for (var k = 0; k < pages.length; k++) {
        var dx = before[k].left - after[k].left;
        var dy = before[k].top - after[k].top;
        pages[k].style.transition = 'none';
        pages[k].style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      }

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          for (var m = 0; m < pages.length; m++) {
            pages[m].style.transition =
              'transform 0.55s cubic-bezier(0.22, 1, 0.32, 1)';
            pages[m].style.transform = 'translate(0,0)';
          }
        });
      });

      window.setTimeout(function () {
        strip.classList.remove('zine-strip--animating');
        for (var n = 0; n < pages.length; n++) {
          pages[n].style.transition = '';
          pages[n].style.transform = '';
        }
        // #region agent log
        agentDbgLayout('H1-H5', 'flip end transition cleanup', 't+600ms', opening);
        // #endregion
      }, 600);

      syncChrome(strip, opening);

      // #region agent log
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          agentDbgLayout('H1-H5', 'flip after class toggle rAF2', 'post-toggle-rAF2', opening);
        });
      });
      // #endregion
    }

    function syncChrome(strip, isOpen) {
      var sc = strip.querySelector('.zine-strip__scroller');
      if (!sc) return;
      var t = issue && issue.title ? issue.title : 'Zine';
      sc.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      sc.setAttribute(
        'aria-label',
        isOpen
          ? t + ' — scroll horizontally, or tap to stack'
          : t + ', stacked — tap to open'
      );
    }

    function openStrip(strip) {
      if (strip.classList.contains('zine-strip--open')) return;
      runFlipTransition(strip, true);
    }

    function closeStrip(strip) {
      if (strip.classList.contains('zine-strip--closed')) return;
      runFlipTransition(strip, false);
    }

    syncChrome(stripEl, false);

    /* Pointer/click/keyboard only on content-sized scroller — strip stays full-width for scroll */
    scrollerEl.addEventListener(
      'pointerdown',
      function (e) {
        if (!stripEl.classList.contains('zine-strip--open')) return;
        pointerActive = true;
        pointerDragged = false;
        scrollNudged = false;
        startX = e.clientX;
        startY = e.clientY;
        startScrollLeft = stripEl.scrollLeft;
      },
      true
    );

    scrollerEl.addEventListener(
      'pointermove',
      function (e) {
        if (!pointerActive) return;
        if (
          Math.hypot(e.clientX - startX, e.clientY - startY) > TAP_MOVE_THRESHOLD
        ) {
          pointerDragged = true;
        }
      },
      true
    );

    stripEl.addEventListener(
      'scroll',
      function () {
        if (!stripEl.classList.contains('zine-strip--open')) return;
        if (
          pointerActive &&
          Math.abs(stripEl.scrollLeft - startScrollLeft) > TAP_SCROLL_THRESHOLD
        ) {
          scrollNudged = true;
        }
      },
      true
    );

    scrollerEl.addEventListener(
      'pointerup',
      function () {
        pointerActive = false;
      },
      true
    );

    scrollerEl.addEventListener(
      'pointercancel',
      function () {
        pointerActive = false;
      },
      true
    );

    scrollerEl.addEventListener('click', function (e) {
      if (stripEl.classList.contains('zine-strip--open')) {
        if (pointerDragged || scrollNudged || touchHorizNudged) return;
        e.preventDefault();
        closeStrip(stripEl);
        return;
      }
      e.preventDefault();
      openStrip(stripEl);
    });

    scrollerEl.addEventListener('keydown', function (e) {
      if (stripEl.classList.contains('zine-strip--open')) {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeStrip(stripEl);
          scrollerEl.focus();
        }
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openStrip(stripEl);
      }
    });

    stripEl.addEventListener(
      'wheel',
      function (event) {
        if (!stripEl.classList.contains('zine-strip--open')) return;
        var deltaX = event.deltaX || 0;
        var deltaY = event.deltaY || 0;
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          event.preventDefault();
          stripEl.scrollLeft += deltaY;
        }
      },
      { passive: false }
    );

    /*
     * Mobile: drive horizontal strip scroll from one-finger swipe (scrollLeft). Native overflow-x scrolling
     * is unreliable on some iOS / in-viewport setups; pan-y stays on main for page scroll.
     */
    /* Listen on scroller (strip has pointer-events: none; scroller receives the touch target). */
    scrollerEl.addEventListener(
      'touchstart',
      function (e) {
        if (!stripEl.classList.contains('zine-strip--open') || !isMobileIssueViewport()) return;
        if (e.touches.length !== 1) return;
        var t = e.touches[0];
        touchStripStartX = touchStripLastX = t.clientX;
        touchStripStartY = t.clientY;
        touchStripAxis = null;
        touchHorizNudged = false;
        touchStripScrollStart = stripEl.scrollLeft;
      },
      { passive: true }
    );

    scrollerEl.addEventListener(
      'touchmove',
      function (e) {
        if (!stripEl.classList.contains('zine-strip--open') || !isMobileIssueViewport()) return;
        if (e.touches.length !== 1) return;
        var t = e.touches[0];
        var x = t.clientX;
        var y = t.clientY;
        var dx = Math.abs(x - touchStripStartX);
        var dy = Math.abs(y - touchStripStartY);
        if (!touchStripAxis && (dx > 12 || dy > 12)) {
          touchStripAxis = dx > dy ? 'h' : 'v';
        }
        if (touchStripAxis === 'h') {
          var delta = touchStripLastX - x;
          stripEl.scrollLeft += delta;
          touchStripLastX = x;
          e.preventDefault();
        }
      },
      { passive: false }
    );

    scrollerEl.addEventListener(
      'touchend',
      function () {
        if (!stripEl.classList.contains('zine-strip--open') || !isMobileIssueViewport()) return;
        if (
          Math.abs(stripEl.scrollLeft - touchStripScrollStart) > TAP_SCROLL_THRESHOLD
        ) {
          touchHorizNudged = true;
        }
        touchStripAxis = null;
      },
      { passive: true }
    );

    scrollerEl.addEventListener(
      'touchcancel',
      function () {
        touchStripAxis = null;
      },
      { passive: true }
    );

    if (accordion) {
      stripEl.classList.add('zine-strip--accordion', 'zine-strip--accordion-pending');
      global.ZineAccordion.whenImagesReady(stripEl, function () {
        var ZA = global.ZineAccordion;
        if (!landOnCover) {
          ZA.setStage(stripEl, ZA.STAGE_ZIGZAG);
          stripEl.classList.remove('zine-strip--accordion-pending');
          return;
        }
        var coverImg = stripEl.querySelector('.zine-strip__page img');
        var decoded =
          coverImg && typeof coverImg.decode === 'function'
            ? coverImg.decode().catch(function () {})
            : Promise.resolve();
        decoded.then(function () {
          ZA.setStage(stripEl, ZA.STAGE_CLOSED);
          function foldOut(easing) {
            if (ZA.getStage(stripEl) === ZA.STAGE_CLOSED) {
              ZA.animateTo(stripEl, ZA.STAGE_ZIGZAG, { animate: !reduceMotion, easing: easing });
            }
          }
          if (options.introRect) {
            /* Take over from the stand-in wherever it is now (it may still be finishing the homepage zoom). */
            var holdEl = document.querySelector('.cover-zoom-hold');
            var from = holdEl ? holdEl.getBoundingClientRect() : options.introRect;
            /* No hold after the homepage zoom: fold out while the cover glides into place (measured first, unshifted). */
            foldOut('out');
            playCoverIntro(stripEl, from.width ? from : options.introRect, function () {});
          } else {
            setTimeout(foldOut, 450);
          }
          /* Arriving from the homepage zoom: show the cover at once so the hand-off doesn't blink. */
          if (options.introRect) stripEl.style.transition = 'none';
          stripEl.classList.remove('zine-strip--accordion-pending');
          /* Swap out the stand-in cover (issue.html) in the same frame the reader's cover first paints. */
          var hold = document.querySelector('.cover-zoom-hold');
          if (hold) hold.parentNode.removeChild(hold);
        });
      });
    } else if (typeof scheduleZineStackLayout === 'function') {
      scheduleZineStackLayout(stripEl);
    }

    // #region agent log
    agentDbgLayout('H1-H5', 'baseline after strip setup', 'baseline', null);
    // #endregion

    var resizeTimer;
    function onViewportResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (accordion) {
          if (stripEl.classList.contains('zine-strip--closed')) {
            var ZA = global.ZineAccordion;
            ZA.setStage(stripEl, Math.min(ZA.getStage(stripEl), ZA.STAGE_ZIGZAG));
          }
          return;
        }
        if (typeof layoutZineStackPositions === 'function') {
          layoutZineStackPositions(stripEl);
        }
      }, 120);
    }
    window.addEventListener('resize', onViewportResize);
    if (typeof window.visualViewport !== 'undefined' && window.visualViewport) {
      window.visualViewport.addEventListener('resize', onViewportResize);
    }
  }

  global.setupZineStripInteraction = setupZineStripInteraction;
})(typeof window !== 'undefined' ? window : this);
