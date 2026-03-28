// PageFlipZineReader (ZineViewer): backup issue reader. Composes ZineCover, ZineSpread, PageFlipController.
(function (global) {
  function ZineViewer(containerEl, options) {
    this.container = containerEl;
    this.issue = options.issue;
    this.onTitleChange = options.onTitleChange || function () {};
    this.onSpreadChange = options.onSpreadChange || function () {};

    this.state = 'closed';
    this.spreadIndex = 0;
    this.cover = null;
    this.spread = null;
    this.flipController = null;
  }

  ZineViewer.prototype.init = function () {
    var issue = this.issue;
    if (!issue || !issue.pages || issue.pages.length < 2) return;

    this.container.innerHTML = '';
    this.container.className = 'zine-viewer';

    var stage = document.createElement('div');
    stage.className = 'zine-viewer__stage';

    var self = this;

    this.cover = createZineCover({
      coverSrc: issue.cover,
      onOpen: function () { self.requestOpen(); }
    });

    this.spread = createZineSpread({
      pages: issue.pages,
      spreadIndex: 0,
      onNext: function () { self.nextSpread(); },
      onPrev: function () { self.prevSpread(); }
    });

    stage.appendChild(this.cover.element);
    stage.appendChild(this.spread.element);
    this.container.appendChild(stage);

    this.flipController = new global.PageFlipController({
      target: stage,
      isClosed: function () { return self.state === 'closed'; },
      busy: function () { return self.state === 'opening'; },
      canGoNext: function () { return self.spreadIndex < self.spread.maxSpreadIndex(); },
      canGoPrev: function () { return self.spreadIndex > 0; },
      onOpen: function () { self.requestOpen(); },
      onNext: function () { self.nextSpread(); },
      onPrev: function () { self.prevSpread(); }
    });
    this.flipController.attach();
  };

  ZineViewer.prototype.requestOpen = function () {
    if (this.state !== 'closed') return;
    this.state = 'opening';
    var self = this;
    this.cover.startOpenAnimation(function () {
      self.state = 'opened';
      self.container.classList.add('zine-viewer--opened');
      self.spread.setSpreadIndex(0, false);
      var max = self.spread ? self.spread.maxSpreadIndex() : 0;
      self.onSpreadChange(0, max);
    });
  };

  ZineViewer.prototype.nextSpread = function () {
    if (this.state !== 'opened' || !this.spread) return;
    var max = this.spread.maxSpreadIndex();
    if (this.spreadIndex >= max) return;
    this.spreadIndex += 1;
    this.spread.setSpreadIndex(this.spreadIndex, true);
    this.onSpreadChange(this.spreadIndex, max);
  };

  ZineViewer.prototype.prevSpread = function () {
    if (this.state !== 'opened' || !this.spread) return;
    if (this.spreadIndex <= 0) return;
    this.spreadIndex -= 1;
    this.spread.setSpreadIndex(this.spreadIndex, true);
    this.onSpreadChange(this.spreadIndex, this.spread.maxSpreadIndex());
  };

  global.ZineViewer = ZineViewer;
})(typeof window !== 'undefined' ? window : this);
