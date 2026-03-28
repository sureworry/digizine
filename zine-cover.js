// ZineCover: closed state, single 520×520 cover centered. Emits open on interaction (handled by PageFlipController).
(function (global) {
  function createZineCover(options) {
  var coverSrc = options.coverSrc;
  var onOpen = options.onOpen || function () {};

  var wrap = document.createElement('div');
  wrap.className = 'zine-cover-wrap';

  var cover = document.createElement('div');
  cover.className = 'zine-cover';
  cover.setAttribute('aria-label', 'Zine cover – tap or click to open');

  var img = document.createElement('img');
  img.className = 'zine-cover__img';
  img.src = coverSrc;
  img.alt = '';
  img.draggable = false;

  cover.appendChild(img);
  wrap.appendChild(cover);

  return {
    element: wrap,
    coverElement: cover,
    startOpenAnimation: function (callback) {
      cover.classList.add('zine-cover--opening');
      var done = function () {
        cover.classList.remove('zine-cover--opening');
        cover.removeEventListener('animationend', done);
        if (callback) callback();
      };
      cover.addEventListener('animationend', done);
      // fallback if animationend doesn't fire
      setTimeout(done, 650);
    },
    onOpen: onOpen
  };
  }
  global.createZineCover = createZineCover;
})(typeof window !== 'undefined' ? window : this);
