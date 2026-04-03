// Backup issue reader: PageFlipZineReader (page-flip / spread interaction).
// Used only by issue-flip.html. To reactivate as main reader, point issue.html at this flow.
(function () {
  var params = new URLSearchParams(window.location.search);
  var slug = params.get('slug') || '';
  var issue = typeof getIssueBySlug !== 'undefined' ? getIssueBySlug(slug) : null;

  var arrowPrev = document.getElementById('issue-arrow-prev');
  var arrowNext = document.getElementById('issue-arrow-next');

  function updateArrowVisibility(spreadIndex, maxSpreadIndex) {
    if (arrowPrev) arrowPrev.style.display = spreadIndex > 0 ? '' : 'none';
    if (arrowNext) arrowNext.style.display = spreadIndex < maxSpreadIndex ? '' : 'none';
  }

  if (issue) {
    var title = issue.title || slug;
    document.title = title + ' — sharvari\'s digi-zines';
    document.body.setAttribute('data-issue-slug', slug);

    var container = document.getElementById('zine-viewer');
    if (container && typeof ZineViewer !== 'undefined') {
      var viewer = new ZineViewer(container, {
        issue: issue,
        onSpreadChange: updateArrowVisibility
      });
      viewer.init();

      if (arrowPrev) arrowPrev.addEventListener('click', function () { viewer.prevSpread(); });
      if (arrowNext) arrowNext.addEventListener('click', function () { viewer.nextSpread(); });
    }
  } else {
    document.title = (slug || 'issue') + ' — sharvari\'s digi-zines';
  }
})();
