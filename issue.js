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
        introRect: takeCoverZoomRect(slug)
      });
    }
  } else {
    document.title = (slug || 'issue') + ' — shar\'s zine shelf';
  }
})();
