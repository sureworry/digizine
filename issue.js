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

  /* Once the reader has folded back onto its cover: hand the cover's rect to the homepage, which zooms it home. */
  function returnToShelf(slug, issue, rect) {
    try {
      sessionStorage.setItem(
        'digizineCoverReturn',
        JSON.stringify({
          slug: slug,
          at: Date.now(),
          rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
          src: issue.cover
        })
      );
    } catch (e) {}
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
        onClosedToCover: function (rect) {
          returnToShelf(slug, issue, rect);
        }
      });
    }
  } else {
    document.title = (slug || 'issue') + ' — shar\'s zine shelf';
  }
})();
