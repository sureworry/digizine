/**
 * Homepage layout — canonical default positions (locked baseline for this build).
 * Single source of truth: content-frame coordinates; x/y are top-left of each item in #content-frame.
 * Synced from Figma: scroll frame 0:4 — file Ewrh7rVmEkyWoZ2hMRlI3P (get_metadata, node 0:4).
 * Inner nodes: self 0:11, observations Frame 2 0:72, collection Group 17 0:82, idea 0:8,
 * romanticise 0:21, books 0:47, shelf 0:60, about 0:5, shelf-2 0:89, confessions 0:95, cat 0:103, plant 0:121.
 * Not on 0:4 (unchanged in Figma): lamp position hand-tuned. Draggable: lamp + snake-plant / chinese-cat / books.
 * Draggable ids in HOMEPAGE_DRAGGABLE_IDS; z-index on drag brings item to front.
 */
var HOMEPAGE_LAYOUT_SPEC = {
  'content-frame': { width: 2319, height: 789 },
  shelf: { x: 0, y: 682.64111328125, width: 1120, height: 93.72390747070312 },
  'shelf-2': { x: 1199, y: 682.64111328125, width: 1120, height: 93.72390747070312 },
  about: {
    x: 1484,
    y: 135,
    width: 340,
    height: 559.236
  },
  confessions: {
    x: 1159,
    y: 49,
    width: 297.1122741699219,
    height: 353.8937072753906
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
    x: 369,
    y: 333,
    width: 324.4564208984375,
    height: 356.99725341796875
  },
  romanticise: {
    x: 712,
    y: 401,
    width: 329.6084289550781,
    height: 288.4058532714844
  },
  plant: { x: 1166, y: 383, width: 327.74761962890625, height: 410.6839904785156 },
  'snake-plant': {
    x: 206,
    y: 230,
    width: 260,
    height: 460
  },
  'chinese-cat': {
    x: 123,
    y: 412,
    width: 90,
    height: 110
  },
  lamp: {
    x: 1917,
    y: 301,
    width: 400,
    height: 600
  },
  books: {
    x: 92,
    y: 510,
    width: 151.69436645507812,
    height: 179.47854614257812
  },
  cat: {
    x: 580,
    y: 533,
    width: 206.00469970703125,
    height: 180
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
  'lamp',
  'about'
];
