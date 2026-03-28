// ZineSpread: two-page spread. pages[0]=cover; spread n = left=pages[2n+1], right=pages[2n+2]. Right can be null (odd count).
(function (global) {
  function createZineSpread(options) {
  var pages = options.pages || [];
  var currentIndex = options.spreadIndex || 0;
  var onNext = options.onNext || function () {};
  var onPrev = options.onPrev || function () {};

  var wrap = document.createElement('div');
  wrap.className = 'zine-spread';
  wrap.setAttribute('aria-label', 'Zine spread – tap or drag to turn page');

  // Left page: single face
  var leftPage = document.createElement('div');
  leftPage.className = 'zine-spread__page';
  var leftContent = document.createElement('div');
  leftContent.className = 'zine-spread__page-content';
  leftPage.appendChild(leftContent);

  // Right page: base (next right) + sheet with two faces (front/back)
  var rightPage = document.createElement('div');
  rightPage.className = 'zine-spread__page';

  var rightStack = document.createElement('div');
  rightStack.className = 'zine-page-stack';

  var rightBase = document.createElement('div');
  rightBase.className = 'zine-page-base';
  var rightBaseContent = document.createElement('div');
  rightBaseContent.className = 'zine-spread__page-content';
  rightBase.appendChild(rightBaseContent);

  var rightSheet = document.createElement('div');
  rightSheet.className = 'zine-page-sheet';

  var rightFrontFace = document.createElement('div');
  rightFrontFace.className = 'zine-page-face zine-page-face--front';
  var rightFrontContent = document.createElement('div');
  rightFrontContent.className = 'zine-spread__page-content';
  rightFrontFace.appendChild(rightFrontContent);

  var rightBackFace = document.createElement('div');
  rightBackFace.className = 'zine-page-face zine-page-face--back';
  var rightBackContent = document.createElement('div');
  rightBackContent.className = 'zine-spread__page-content';
  rightBackFace.appendChild(rightBackContent);

  rightStack.appendChild(rightBase);
  rightSheet.appendChild(rightFrontFace);
  rightSheet.appendChild(rightBackFace);
  rightStack.appendChild(rightSheet);
  rightPage.appendChild(rightStack);

  wrap.appendChild(leftPage);
  wrap.appendChild(rightPage);

  function getSpreadPair(index) {
    var leftIdx = 2 * index + 1;
    var rightIdx = 2 * index + 2;
    return {
      left: pages[leftIdx] || null,
      right: pages[rightIdx] || null
    };
  }

  function renderContent(contentEl, pageData) {
    if (!pageData) {
      // Clear content for empty page without extra flicker.
      contentEl.textContent = '';
      var existingImg = contentEl.querySelector('img');
      if (existingImg) contentEl.removeChild(existingImg);
      contentEl.parentElement.style.background = 'transparent';
      return;
    }

    contentEl.parentElement.style.background = 'rgba(0, 0, 0, 0.04)';

    if (pageData.src) {
      // Image-based page: reuse existing <img> when possible to avoid
      // tearing during re-render.
      var img = contentEl.querySelector('img');
      if (!img) {
        contentEl.innerHTML = '';
        img = document.createElement('img');
        img.className = 'zine-page-image';
        contentEl.appendChild(img);
      }
      img.src = pageData.src;
      img.alt = pageData.label || pageData.type || '';
      img.draggable = false;
    } else {
      // Text-based page: clear to text only.
      contentEl.innerHTML = '';
      contentEl.textContent = pageData.label || pageData.type || '';
    }
  }

  function renderSteady(index) {
    var pair = getSpreadPair(index);
    renderContent(leftContent, pair.left);
    renderContent(rightBaseContent, pair.right);
    // In steady state the sheet is invisible and reset so we only see the base.
    rightSheet.style.visibility = 'hidden';
    rightSheet.style.transform = 'rotateY(0deg)';
    rightSheet.style.animation = 'none';
    rightSheet.style.boxShadow = '';
  }

  function animateForward(toIndex) {
    var fromIndex = currentIndex;
    var fromPair = getSpreadPair(fromIndex);
    var toPair = getSpreadPair(toIndex);

    // If we don't have a valid next spread, just snap to it
    if (!toPair.left && !toPair.right) {
      currentIndex = toIndex;
      renderSteady(currentIndex);
      return;
    }

    // If the target spread only has a left page (no right), just snap to it.
    // Trying to animate a sheet when there's no right page leads to the
    // \"same last page on both sides\" effect.
    if (toPair.left && !toPair.right) {
      currentIndex = toIndex;
      renderSteady(currentIndex);
      return;
    }

    // Show sheet and clear any frozen state so it can animate from 0.
    rightSheet.style.visibility = 'visible';
    rightSheet.style.animation = '';
    rightSheet.style.transform = '';
    rightSheet.style.boxShadow = '';

    // Setup for forward flip content:
    // - Left page stays as current left (fromPair.left).
    // - Base (underneath) already shows the next right page.
    // - Sheet front = current right, sheet back = next left.
    renderContent(leftContent, fromPair.left);
    renderContent(rightBaseContent, toPair.right || toPair.left);
    renderContent(rightFrontContent, fromPair.right);
    renderContent(rightBackContent, toPair.left || toPair.right);

    wrap.classList.add('zine-spread--flipping');
    leftPage.classList.add('zine-spread__page--in');
    rightPage.classList.add('zine-spread__page--in');

    setTimeout(function () {
      // When the CSS animation finishes, immediately go to the new steady spread.
      // renderSteady hides + resets the sheet, so we never see it snap back.
      currentIndex = toIndex;
      renderSteady(currentIndex);

      wrap.classList.remove('zine-spread--flipping');
      leftPage.classList.remove('zine-spread__page--in');
      rightPage.classList.remove('zine-spread__page--in');
    }, 700);
  }

  function setSpreadIndex(index, animate) {
    if (!animate) {
      currentIndex = index;
      renderSteady(currentIndex);
      return;
    }

    // Forward: treat as a real front/back sheet
    if (index === currentIndex + 1) {
      animateForward(index);
    } else {
      // For now, non-sequential jumps (including prev) just snap without complex front/back
      currentIndex = index;
      renderSteady(currentIndex);
    }
  }

  renderSteady(currentIndex);

  return {
    element: wrap,
    setSpreadIndex: setSpreadIndex,
    maxSpreadIndex: function () {
      if (pages.length <= 2) return 0;
      return Math.floor((pages.length - 2) / 2);
    },
    onNext: onNext,
    onPrev: onPrev
  };
  }
  global.createZineSpread = createZineSpread;
})(typeof window !== 'undefined' ? window : this);
