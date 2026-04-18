// Horizontal zine reader: strip DOM + stack positions from open-equivalent widths (−400px desktop; mobile from CSS).
(function (global) {
  var DEFAULT_STACK_GAP = -400;
  var MIN_STACK_ADVANCE = 14;

  /** Match styles.css L2 breakpoint (max-width: 768px). */
  function isIssueReaderMobileViewport() {
    return (
      typeof window.matchMedia !== 'undefined' &&
      window.matchMedia('(max-width: 768px)').matches
    );
  }

  /** --zine-stack-gap on .issue-page--scroll (Figma 66:89: −167.692px); default −400px desktop */
  function getStackGapPx(wrap) {
    var host = wrap.closest && wrap.closest('.issue-page--scroll');
    if (!host) return DEFAULT_STACK_GAP;
    var raw = getComputedStyle(host).getPropertyValue('--zine-stack-gap').trim();
    if (!raw) return DEFAULT_STACK_GAP;
    var n = parseFloat(raw);
    return isFinite(n) ? n : DEFAULT_STACK_GAP;
  }

  /**
   * Measure each page width as rendered in the OPEN strip (same flex, fixed row height, natural aspect).
   * When wrap is closed, briefly applies open layout off-screen.
   */
  function measurePageWidthsOpenEquivalent(wrap, scroller) {
    var pages = scroller.querySelectorAll('.zine-strip__page');
    if (!pages.length) return [];

    if (wrap.classList.contains('zine-strip--open')) {
      var wOpen = [];
      for (var i = 0; i < pages.length; i++) {
        wOpen.push(Math.max(1, pages[i].getBoundingClientRect().width));
      }
      return wOpen;
    }

    wrap.classList.remove('zine-strip--closed');
    wrap.classList.add('zine-strip--open');
    wrap.style.visibility = 'hidden';
    wrap.style.position = 'fixed';
    wrap.style.left = '-32000px';
    wrap.style.top = '0';
    wrap.style.width = 'auto';
    /* Wide enough that flex row doesn’t squeeze pages (same intrinsic widths as real open view) */
    wrap.style.minWidth = Math.max(6000, pages.length * 800 + 400) + 'px';
    void wrap.offsetWidth;

    var out = [];
    for (var j = 0; j < pages.length; j++) {
      out.push(Math.max(1, pages[j].getBoundingClientRect().width));
    }

    wrap.style.visibility = '';
    wrap.style.position = '';
    wrap.style.left = '';
    wrap.style.top = '';
    wrap.style.width = '';
    wrap.style.minWidth = '';
    wrap.classList.remove('zine-strip--open');
    wrap.classList.add('zine-strip--closed');

    return out;
  }

  /**
   * Set --stack-left per page from measured widths: advance = max(MIN, w + stackGap).
   * When closed, sets scroller width. When open, only updates CSS vars for next close.
   */
  function layoutZineStackPositions(wrap) {
    var scroller = wrap.querySelector('.zine-strip__scroller');
    if (!scroller) return;
    var pages = scroller.querySelectorAll('.zine-strip__page');
    if (!pages.length) return;

    var stackGap = getStackGapPx(wrap);

    var widths;
    if (wrap.classList.contains('zine-strip--open')) {
      widths = [];
      for (var i = 0; i < pages.length; i++) {
        widths.push(Math.max(1, pages[i].getBoundingClientRect().width));
      }
    } else {
      widths = measurePageWidthsOpenEquivalent(wrap, scroller);
    }

    /*
     * Lead + trail inset the stack inside the scroller width (justify-content:center on the strip).
     * Desktop: symmetric 20/20. Mobile: 28/12 (+8px optical shift right vs 20/20; same sum → same total width).
     */
    var mobile = isIssueReaderMobileViewport();
    var innerW =
      mobile && typeof window.innerWidth === 'number' && isFinite(window.innerWidth)
        ? window.innerWidth
        : null;
    var leadInset = mobile ? 28 : 20;
    var trailPad = mobile ? 12 : 20;
    var x = leadInset;
    for (var k = 0; k < pages.length; k++) {
      var stackLeftPx = innerW == null ? x : Math.min(x, innerW);
      pages[k].style.setProperty('--stack-left', stackLeftPx + 'px');
      var pw = widths[k] || 320;
      if (k < pages.length - 1) {
        x += Math.max(MIN_STACK_ADVANCE, pw + stackGap);
      }
    }

    var lastW = widths[widths.length - 1] || 320;
    var totalW = x + lastW + trailPad;
    var closedScrollerWidthPx = innerW == null ? totalW : Math.min(totalW, innerW);
    if (wrap.classList.contains('zine-strip--closed')) {
      scroller.style.width = closedScrollerWidthPx + 'px';
      delete scroller.dataset.zinePendingStackWidth;
    } else {
      /* Used when FLIP closes: width must apply only after .zine-strip--closed (open row uses max-content) */
      scroller.dataset.zinePendingStackWidth = String(totalW);
    }
  }

  function applyPendingClosedScrollerWidth(wrap) {
    var sc = wrap.querySelector('.zine-strip__scroller');
    if (!sc) return;
    if (isIssueReaderMobileViewport()) {
      var pending = sc.dataset.zinePendingStackWidth;
      if (pending) {
        var tw = parseFloat(pending, 10);
        var iw = window.innerWidth;
        if (isFinite(tw)) {
          var capped =
            typeof iw === 'number' && isFinite(iw) ? Math.min(tw, iw) : tw;
          sc.style.width = capped + 'px';
        }
        delete sc.dataset.zinePendingStackWidth;
      }
      return;
    }
    var w = sc.dataset.zinePendingStackWidth;
    if (w) sc.style.width = w + 'px';
  }

  function clearStackScrollerWidth(wrap) {
    var sc = wrap.querySelector('.zine-strip__scroller');
    if (sc) {
      sc.style.width = '';
      delete sc.dataset.zinePendingStackWidth;
    }
  }

  function scheduleZineStackLayout(wrap) {
    function go() {
      layoutZineStackPositions(wrap);
    }

    var scroller = wrap.querySelector('.zine-strip__scroller');
    var imgs = scroller ? scroller.querySelectorAll('img') : [];
    if (imgs.length === 0) {
      requestAnimationFrame(go);
      return;
    }

    var pending = 0;
    for (var i = 0; i < imgs.length; i++) {
      if (!imgs[i].complete) pending++;
    }

    if (pending === 0) {
      requestAnimationFrame(go);
      return;
    }

    function onDone() {
      pending--;
      if (pending <= 0) requestAnimationFrame(go);
    }

    for (var j = 0; j < imgs.length; j++) {
      if (imgs[j].complete) continue;
      imgs[j].addEventListener('load', onDone);
      imgs[j].addEventListener('error', onDone);
    }
  }

  function createZineStrip(options) {
    var issue = options.issue;
    if (!issue || !issue.pages || issue.pages.length === 0) {
      return { element: document.createElement('div') };
    }

    var wrap = document.createElement('div');
    wrap.className = 'zine-strip zine-strip--closed';

    var scroller = document.createElement('div');
    scroller.className = 'zine-strip__scroller';
    scroller.setAttribute('tabindex', '0');
    scroller.setAttribute('role', 'region');
    scroller.setAttribute(
      'aria-label',
      (issue.title || 'Zine') + ', stacked — activate to open'
    );
    scroller.setAttribute('aria-expanded', 'false');
    wrap.appendChild(scroller);

    function addImagePage(src, label) {
      var pageEl = document.createElement('div');
      pageEl.className = 'zine-strip__page';

      var img = document.createElement('img');
      img.className = 'zine-strip__image';
      img.src = src;
      img.alt = label || '';
      img.draggable = false;

      pageEl.appendChild(img);
      scroller.appendChild(pageEl);
    }

    function addTextPage(text) {
      var pageEl = document.createElement('div');
      pageEl.className = 'zine-strip__page zine-strip__page--text';
      pageEl.textContent = text || '';
      scroller.appendChild(pageEl);
    }

    if (issue.cover) {
      addImagePage(issue.cover, issue.title || 'cover');
    }

    for (var i = 0; i < issue.pages.length; i++) {
      var page = issue.pages[i];
      if (!page) continue;

      if (i === 0 && page.type === 'cover' && !page.src) {
        continue;
      }

      if (page.src) {
        addImagePage(page.src, page.label || page.type);
      } else {
        addTextPage(page.label || page.type);
      }
    }

    var total = scroller.children.length;
    scroller.style.setProperty('--stack-total-n', String(Math.max(1, total)));
    for (var c = 0; c < total; c++) {
      scroller.children[c].style.setProperty('--page-index', String(c));
      scroller.children[c].style.setProperty('--stack-total', String(total));
    }

    var outer = document.createElement('div');
    outer.className = 'zine-strip-outer';
    outer.appendChild(wrap);

    return {
      element: outer
    };
  }

  global.createZineStrip = createZineStrip;
  global.layoutZineStackPositions = layoutZineStackPositions;
  global.scheduleZineStackLayout = scheduleZineStackLayout;
  global.clearZineStackScrollerWidth = clearStackScrollerWidth;
  global.applyPendingClosedScrollerWidth = applyPendingClosedScrollerWidth;
})(typeof window !== 'undefined' ? window : this);
