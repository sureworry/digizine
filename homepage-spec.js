/**
 * Homepage layout — single source of truth (content-frame coordinates).
 * Origin: design content area; all x/y are relative to the content frame top-left.
 * Artboard (160, 145) was subtracted where applicable to match prior scene coords.
 */
var HOMEPAGE_LAYOUT_SPEC = {
  'content-frame': { width: 1120, height: 789 },
  shelf: { x: 0, y: 680.64, width: 1120, height: 93.724 },
  'self-perception': { x: 3.94, y: 25.17, width: 332.3, height: 342.72 },
  observations: { x: 394, y: 53.26, width: 331.59, height: 235.5 },
  collection: { x: 758, y: -2, width: 302.6, height: 369.66 },
  'idea-marinade': { x: 373, y: 327.003, width: 285.597, height: 356.997 },
  romanticise: { x: 763, y: 391.3, width: 329.608, height: 288.406 },
  plant: { x: 351.925, y: 378.32, width: 327.748, height: 410.684 },
  books: { x: 230, y: 504.521, width: 151.694, height: 179.479 },
  cat: { x: 14, y: 426, width: 206, height: 258 }
};

/** Items that may accumulate a temporary drag offset (reset on refresh). */
var HOMEPAGE_DRAGGABLE_IDS = ['plant', 'books', 'cat'];
