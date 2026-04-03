/**
 * Homepage layout — coordinates from Figma scroll frame (file Ewrh7rVmEkyWoZ2hMRlI3P).
 * Source: frame `24:34` → child `24:172` “scroll frame” (node URL …?node-id=24-34).
 * x/y are top-left inside #content-frame. Scene width 2319 (1199 + 1120), height 900.
 */
var HOMEPAGE_LAYOUT_SPEC = {
  'content-frame': { width: 2319, height: 900 },
  shelf: { x: 0, y: 682.64111328125, width: 1120, height: 93.72390747070312 },
  'shelf-2': { x: 1199, y: 682.64111328125, width: 1120, height: 93.72390747070312 },
  about: { x: 1584, y: 131, width: 340, height: 559.23583984375 },
  confessions: { x: 1159, y: 49, width: 297.1122741699219, height: 353.8937072753906 },
  'self-perception': { x: 3.9365234375, y: 27.171630859375, width: 333.0073547363281, height: 342.7169494628906 },
  observations: { x: 394, y: 55.26318359375, width: 331.58709716796875, height: 235.50074768066406 },
  collection: { x: 758, y: 0, width: 302.6035461425781, height: 369.662109375 },
  'idea-marinade': { x: 371, y: 330, width: 324.4564208984375, height: 356.99725341796875 },
  romanticise: { x: 725, y: 400, width: 329.6084289550781, height: 288.4058532714844 },
  'snake-plant': { x: 226, y: 261, width: 167.28521728515625, height: 425 },
  plant: { x: 1219, y: 383, width: 327.74786376953125, height: 410.6839904785156 },
  lamp: { x: 1999, y: 244, width: 300, height: 635 },
  books: { x: 116, y: 509, width: 151.69436645507812, height: 179.47854614257812 },
  cat: { x: 634, y: 523, width: 206.00469970703125, height: 180 },
  'chinese-cat': { x: 130, y: 409, width: 90, height: 110 }
};

/** Draggable: delta from HOMEPAGE_LAYOUT_SPEC (includes draggable zine covers). */
var HOMEPAGE_DRAGGABLE_IDS = [
  'plant',
  'books',
  'idea-marinade',
  'cat',
  'romanticise',
  'about',
  'snake-plant',
  'chinese-cat',
  'lamp'
];
