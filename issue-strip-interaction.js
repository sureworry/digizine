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

  function setupZineStripInteraction(stripEl, options) {
    var issue = options.issue;
    var scrollerEl = stripEl.querySelector('.zine-strip__scroller');
    if (!scrollerEl) return;

    var reduceMotion =
      typeof window.matchMedia !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var pointerActive = false;
    var pointerDragged = false;
    var scrollNudged = false;
    var startX = 0;
    var startY = 0;
    var startScrollLeft = 0;

    function getPages(strip) {
      return strip.querySelectorAll('.zine-strip__page');
    }

    function runFlipTransition(strip, opening) {
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
        if (pointerDragged || scrollNudged) return;
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

    if (typeof scheduleZineStackLayout === 'function') {
      scheduleZineStackLayout(stripEl);
    }

    // #region agent log
    agentDbgLayout('H1-H5', 'baseline after strip setup', 'baseline', null);
    // #endregion

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (typeof layoutZineStackPositions === 'function') {
          layoutZineStackPositions(stripEl);
        }
      }, 120);
    });
  }

  global.setupZineStripInteraction = setupZineStripInteraction;
})(typeof window !== 'undefined' ? window : this);
