/**
 * Homepage layout — canonical default positions (locked baseline for this build).
 * Single source of truth: content-frame coordinates; x/y are top-left of each item in #content-frame.
 * Figma reference: scroll frame 0:4, 1280×789 — file Ewrh7rVmEkyWoZ2hMRlI3P.
 * Inner nodes: self 0:11, observations 0:72, collection 0:82, idea marinade 0:10,
 * romanticise 0:22, books 0:47, shelf 0:60, about 0:5, shelf-2 0:89, confessions 0:95, cat 0:103, plant 0:121, snake-plant, chinese-cat, lamp.
 * Draggable ids in HOMEPAGE_DRAGGABLE_IDS; z-index on drag brings item to front.
 */
var HOMEPAGE_LAYOUT_SPEC = {
  'content-frame': { width: 2319, height: 789 },
  shelf: { x: 0, y: 682.64111328125, width: 1120, height: 93.72390747070312 },
  'shelf-2': { x: 1199, y: 682.64111328125, width: 1120, height: 93.72390747070312 },
  about: {
    x: 1600,
    y: 132,
    width: 318,
    height: 558
  },
  confessions: {
    x: 1134,
    y: 61,
    width: 267,
    height: 334
  },
  'self-perception': {
    x: 3.9365234375,
    y: 27.171630859375,
    width: 333.0073547363281,
    height: 342.7169494628906
  },
  observations: {
    x: 410.025242607313,
    y: 56.19951754781141,
    width: 314.98565673828125,
    height: 221.27090454101562
  },
  collection: {
    x: 772.9814453125,
    y: 13.109458923339844,
    width: 272.488037109375,
    height: 342.71685791015625
  },
  'idea-marinade': {
    x: 365,
    y: 330,
    width: 324,
    height: 356.99725341796875
  },
  romanticise: {
    x: 732,
    y: 400,
    width: 324,
    height: 288.4058532714844
  },
  plant: { x: -37, y: 382, width: 327.74761962890625, height: 410.6839904785156 },
  'snake-plant': {
    x: 1380,
    y: 229,
    width: 260,
    height: 460
  },
  'chinese-cat': {
    x: 1265,
    y: 496,
    width: 160,
    height: 200
  },
  lamp: {
    x: 1917,
    y: 301,
    width: 400,
    height: 600
  },
  books: {
    x: 184,
    y: 510,
    width: 151.69436645507812,
    height: 179.47854614257812
  },
  cat: {
    x: 611,
    y: 463,
    width: 190,
    height: 240
  }
};

var HOMEPAGE_DRAGGABLE_IDS = [
  'plant',
  'books',
  'idea-marinade',
  'cat',
  'romanticise',
  'chinese-cat',
  'snake-plant',
  'about'
];
