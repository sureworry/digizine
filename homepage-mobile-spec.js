/**
 * Mobile homepage layout — Figma node 58:103 (mobile-view).
 * File: Ewrh7rVmEkyWoZ2hMRlI3P. Coordinates: top-left in #content-frame; artboard 390×2495.
 *
 * Y values are top-left in #content-frame (390×2495 artboard). Wrapper padding in CSS clears the fixed
 * header; do not subtract viewport padding here. Shelf baselines: item bottom = shelf top y for “on the shelf” placement.
 */
var MOBILE_HOMEPAGE_LAYOUT_SPEC = {
  'content-frame': { width: 390, height: 2495 },
  /* Figma shelf 1: y=366 → 318 → 293; centered 350px */
  shelf: { x: 20, y: 293, width: 350, height: 31 },
  /* Lower rows shifted −80px vs earlier export so planks read as one continuous stack (tighter vertical rhythm). */
  'shelf-2': { x: -90, y: 1278, width: 350, height: 31 },
  /* Figma shelf 3 (offset) +80px gap below confessions block */
  'shelf-3': { x: -245, y: 566, width: 350, height: 31 },
  'shelf-4': { x: 20, y: 1891, width: 350, height: 31 },
  'shelf-5': { x: 20, y: 2366, width: 350, height: 31 },
  /* Scaled from 256×224 */
  /* +10% vs 220×193; y so bottom at 303 (shelf top) */
  romanticise: { x: 26, y: 91, width: 242, height: 212 },
  cat: { x: 228, y: 203, width: 97, height: 100 },
  /* With shelf-3 @566; bottom on plank */
  'snake-plant': { x: 5, y: 356, width: 86, height: 214 },
  confessions: { x: 59, y: 348, width: 331, height: 278 },
  collection: { x: 46, y: 671, width: 246, height: 301 },
  'idea-marinade': { x: 32, y: 1009, width: 248, height: 272 },
  observations: { x: 27, y: 1348, width: 336, height: 239 },
  'self-perception': { x: 40, y: 1625, width: 220, height: 227 },
  about: { x: 47, y: 1980, width: 238, height: 390 },
  books: { x: 258, y: 1186, width: 81, height: 95 },
  plant: { x: 216, y: 1757, width: 147, height: 183 },
  'chinese-cat': { x: 272, y: 2268, width: 72, height: 107 }
};
