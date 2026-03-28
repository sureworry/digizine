// PageFlipController: click/tap and drag/swipe. Calls onOpen (when closed) or onNext/onPrev (when opened). Bounded drag, guarded during animation.
(function (global) {
  var DRAG_THRESHOLD_PX = 40;
  var COOLDOWN_MS = 320;

  function PageFlipController(options) {
    this.target = options.target;
    this.isClosed = options.isClosed;
    this.onOpen = options.onOpen || function () {};
    this.onNext = options.onNext || function () {};
    this.onPrev = options.onPrev || function () {};
    this.canGoNext = options.canGoNext || function () { return true; };
    this.canGoPrev = options.canGoPrev || function () { return true; };
    this.busy = options.busy || function () { return false; };

    this._cooldownUntil = 0;
    this._pointerDown = false;
    this._startX = 0;
    this._startY = 0;
    this._lastMoveX = null;
    this._didDrag = false;

    this._boundPointerDown = this._onPointerDown.bind(this);
    this._boundPointerMove = this._onPointerMove.bind(this);
    this._boundPointerUp = this._onPointerUp.bind(this);
    this._boundClick = this._onClick.bind(this);
  }

  PageFlipController.prototype.attach = function () {
    var t = this.target;
    if (!t) return;
    t.addEventListener('pointerdown', this._boundPointerDown, { passive: true });
    t.addEventListener('click', this._boundClick);
  };

  PageFlipController.prototype.detach = function () {
    var t = this.target;
    if (!t) return;
    t.removeEventListener('pointerdown', this._boundPointerDown);
    t.removeEventListener('pointermove', this._boundPointerMove);
    t.removeEventListener('pointerup', this._boundPointerUp);
    t.removeEventListener('pointercancel', this._boundPointerUp);
    t.removeEventListener('click', this._boundClick);
  };

  PageFlipController.prototype._onPointerDown = function (e) {
    if (e.button !== 0 && e.button !== undefined) return;
    this._pointerDown = true;
    this._startX = e.clientX;
    this._startY = e.clientY;
    this._didDrag = false;
    document.addEventListener('pointermove', this._boundPointerMove, { passive: true });
    document.addEventListener('pointerup', this._boundPointerUp);
    document.addEventListener('pointercancel', this._boundPointerUp);
  };

  PageFlipController.prototype._onPointerMove = function (e) {
    if (!this._pointerDown) return;
    var dx = e.clientX - this._startX;
    if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(e.clientY - this._startY) > DRAG_THRESHOLD_PX) {
      this._didDrag = true;
      this._lastMoveX = dx;
    }
  };

  PageFlipController.prototype._onPointerUp = function () {
    var lastMove = this._lastMoveX;
    this._pointerDown = false;
    document.removeEventListener('pointermove', this._boundPointerMove);
    document.removeEventListener('pointerup', this._boundPointerUp);
    document.removeEventListener('pointercancel', this._boundPointerUp);
    if (this._didDrag && lastMove != null && !this.busy()) {
      if (this.isClosed()) {
        this.onOpen();
      } else {
        if (lastMove < -DRAG_THRESHOLD_PX && this.canGoNext()) this.onNext();
        else if (lastMove > DRAG_THRESHOLD_PX && this.canGoPrev()) this.onPrev();
      }
      this._cooldownUntil = Date.now() + COOLDOWN_MS;
    }
    this._lastMoveX = null;
  };

  PageFlipController.prototype._onClick = function (e) {
    if (this.busy()) {
      e.preventDefault();
      return;
    }
    if (this._didDrag) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (Date.now() < this._cooldownUntil) {
      e.preventDefault();
      return;
    }
    if (this.isClosed()) {
      this.onOpen();
      this._cooldownUntil = Date.now() + COOLDOWN_MS;
      return;
    }
    if (this.canGoNext()) {
      this.onNext();
      this._cooldownUntil = Date.now() + COOLDOWN_MS;
    }
  };

  global.PageFlipController = PageFlipController;
})(typeof window !== 'undefined' ? window : this);
