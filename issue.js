// Active issue reader: stacked default → horizontal scroll (issue-strip-interaction.js).
(function () {
  /** One-shot: where the homepage cover zoom ended, so the L2 cover can pick up from the same spot. */
  function takeCoverZoomRect(slug) {
    try {
      var raw = sessionStorage.getItem('digizineCoverZoom');
      sessionStorage.removeItem('digizineCoverZoom');
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || data.slug !== slug || Date.now() - data.at > 5000) return null;
      return data.rect;
    } catch (e) {
      return null;
    }
  }

  function takeShelfSpot(slug) {
    try {
      var d = JSON.parse(sessionStorage.getItem('digizineShelfSpot') || 'null');
      return d && d.slug === slug && d.rect ? d.rect : null;
    } catch (e) {
      return null;
    }
  }

  /* The folded strip glides toward the cover's shelf spot (the homepage carries on from the same timeline). */
  function flyCoverHome(strip, from, to, at, ms) {
    var outer = strip.closest('.zine-strip-outer') || strip;
    var o = outer.getBoundingClientRect();
    outer.style.transition = 'none';
    outer.style.transformOrigin =
      from.left + from.width / 2 - o.left + 'px ' + (from.top + from.height / 2 - o.top) + 'px';
    (function frame() {
      var p = Math.min(1, (Date.now() - at) / ms);
      var e = coverReturnEase(p);
      var h = from.height + (to.height - from.height) * e;
      var cx = from.left + from.width / 2 + (to.left + to.width / 2 - (from.left + from.width / 2)) * e;
      var cy = from.top + from.height / 2 + (to.top + to.height / 2 - (from.top + from.height / 2)) * e;
      outer.style.transform =
        'translate(' +
        (cx - (from.left + from.width / 2)) +
        'px,' +
        (cy - (from.top + from.height / 2)) +
        'px) scale(' +
        h / from.height +
        ')';
      if (p < 1) requestAnimationFrame(frame);
    })();
  }

  /*
   * Once the reader has folded back onto its cover: without stopping, zoom it toward its shelf spot and load
   * the homepage, which picks the zoom up mid-flight.
   */
  function returnToShelf(slug, issue, rect, strip) {
    var from = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    var to = takeShelfSpot(slug);
    var at = Date.now();
    try {
      sessionStorage.setItem(
        'digizineCoverReturn',
        JSON.stringify({ slug: slug, at: at, from: from, to: to, ms: COVER_RETURN_MS, src: issue.cover })
      );
    } catch (e) {}
    if (to && strip) flyCoverHome(strip, from, to, at, COVER_RETURN_MS);
    var ref = null;
    try {
      ref = document.referrer ? new URL(document.referrer) : null;
    } catch (e) {}
    var fromShelf = ref && ref.origin === location.origin && /^\/(index(\.html)?)?$/.test(ref.pathname);
    if (fromShelf && history.length > 1) history.back();
    else location.assign('index.html');
  }

  var DEFAULT_ISSUE_SLUG = 'confessions-of-an-anxious-creator';
  var slug =
    typeof takeIssueSlugForIssuePage === 'function'
      ? takeIssueSlugForIssuePage()
      : new URLSearchParams(location.search).get('slug') || '';
  if (!slug) {
    slug = DEFAULT_ISSUE_SLUG;
  }
  var issue = typeof getIssueBySlug !== 'undefined' ? getIssueBySlug(slug) : null;
  if (!issue && typeof getIssueBySlug !== 'undefined') {
    slug = DEFAULT_ISSUE_SLUG;
    issue = getIssueBySlug(slug);
  }

  if (issue) {
    var title = issue.title || slug;
    document.title = title + ' — shar\'s zine shelf';
    document.body.setAttribute('data-issue-slug', slug);

    var container = document.getElementById('zine-strip-root');
    if (
      container &&
      typeof createZineStrip !== 'undefined' &&
      typeof setupZineStripInteraction !== 'undefined'
    ) {
      var strip = createZineStrip({ issue: issue });
      container.appendChild(strip.element);
      var nPages = strip.element.querySelectorAll('.zine-strip__page').length;
      container.style.setProperty('--stack-total-n', String(Math.max(1, nPages)));
      setupZineStripInteraction(strip.element, {
        issue: issue,
        foldStyle: 'accordion',
        landOnCover: true,
        introRect: takeCoverZoomRect(slug),
        onClosedToCover: function (rect, stripEl) {
          returnToShelf(slug, issue, rect, stripEl);
        }
      });
    }
  } else {
    document.title = (slug || 'issue') + ' — shar\'s zine shelf';
  }
})();
