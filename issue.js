// Active issue reader: stacked default → horizontal scroll (issue-strip-interaction.js).
(function () {
  var params = new URLSearchParams(window.location.search);
  var slug = params.get('slug') || '';
  var issue = typeof getIssueBySlug !== 'undefined' ? getIssueBySlug(slug) : null;

  var titleEl = document.getElementById('issue-title');

  if (issue) {
    var title = issue.title || slug;
    document.title = title + ' — sharvari\'s digi-zines';
    if (titleEl) titleEl.textContent = title;
    document.body.setAttribute('data-issue-slug', slug);

    var container = document.getElementById('zine-strip-root');
    if (
      container &&
      typeof createZineStrip !== 'undefined' &&
      typeof setupZineStripInteraction !== 'undefined'
    ) {
      var strip = createZineStrip({ issue: issue });
      container.appendChild(strip.element);
      setupZineStripInteraction(strip.element, { issue: issue });
    }
  } else {
    if (titleEl) titleEl.textContent = slug || 'issue';
    document.title = (slug || 'issue') + ' — sharvari\'s digi-zines';
  }
})();
