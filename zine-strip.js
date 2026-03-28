// Horizontal zine reader: strip DOM + stack positions from open-equivalent widths (−400px advance).
(function (global) {
  var FIGMA_STACK_GAP = -400;
  var MIN_STACK_ADVANCE = 14;

  /**
   * Measure each page width as rendered in the OPEN strip (same flex, height 520, natural aspect).
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
   * Set --stack-left per page from measured widths: advance = max(MIN, w + FIGMA_STACK_GAP).
   * When closed, sets scroller width. When open, only updates CSS vars for next close.
   */
  function layoutZineStackPositions(wrap) {
    var scroller = wrap.querySelector('.zine-strip__scroller');
    if (!scroller) return;
    var pages = scroller.querySelectorAll('.zine-strip__page');
    if (!pages.length) return;

    var widths;
    if (wrap.classList.contains('zine-strip--open')) {
      widths = [];
      for (var i = 0; i < pages.length; i++) {
        widths.push(Math.max(1, pages[i].getBoundingClientRect().width));
      }
    } else {
      widths = measurePageWidthsOpenEquivalent(wrap, scroller);
    }

    var x = 0;
    for (var k = 0; k < pages.length; k++) {
      pages[k].style.setProperty('--stack-left', x + 'px');
      var pw = widths[k] || 320;
      if (k < pages.length - 1) {
        x += Math.max(MIN_STACK_ADVANCE, pw + FIGMA_STACK_GAP);
      }
    }

    var lastW = widths[widths.length - 1] || 320;
    var totalW = x + lastW + 40;
    if (wrap.classList.contains('zine-strip--closed')) {
      scroller.style.width = totalW + 'px';
      delete scroller.dataset.zinePendingStackWidth;
    } else {
      /* Used when FLIP closes: width must apply only after .zine-strip--closed (open row uses max-content) */
      scroller.dataset.zinePendingStackWidth = String(totalW);
    }
  }

  function applyPendingClosedScrollerWidth(wrap) {
    var sc = wrap.querySelector('.zine-strip__scroller');
    if (!sc) return;
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

    return {
      element: wrap
    };
  }

  global.createZineStrip = createZineStrip;
  global.layoutZineStackPositions = layoutZineStackPositions;
  global.scheduleZineStackLayout = scheduleZineStackLayout;
  global.clearZineStackScrollerWidth = clearStackScrollerWidth;
  global.applyPendingClosedScrollerWidth = applyPendingClosedScrollerWidth;
})(typeof window !== 'undefined' ? window : this);
