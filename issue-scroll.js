// Scroll demo page — same reader as issue.js.
(function () {
  var params = new URLSearchParams(window.location.search);
  var slug = params.get('slug') || '';
  var issue = typeof getIssueBySlug !== 'undefined' ? getIssueBySlug(slug) : null;

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
      setupZineStripInteraction(strip.element, { issue: issue });
    }
  } else {
    document.title = (slug || 'issue') + ' — shar\'s zine shelf';
  }
})();
