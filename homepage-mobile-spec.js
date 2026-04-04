/**
 * Mobile homepage layout — Figma node 58:103 (mobile-view).
 * File: Ewrh7rVmEkyWoZ2hMRlI3P. Coordinates: top-left in #content-frame; artboard 390×2455.
 *
 * Y values are top-left in #content-frame (390×2455 artboard). Wrapper padding in CSS clears the fixed
 * header; do not subtract viewport padding here. Shelf baselines: item bottom = shelf top y for “on the shelf” placement.
 */
var MOBILE_HOMEPAGE_LAYOUT_SPEC = {
  'content-frame': { width: 390, height: 2455 },
  /* Figma shelf 1: y=366 → 318 → 293; centered 350px (−50px left vs prior) */
  shelf: { x: -30, y: 253, width: 350, height: 31 },
  /* Lower rows shifted −80px vs earlier export so planks read as one continuous stack (tighter vertical rhythm). */
  'shelf-2': { x: -5, y: 1238, width: 350, height: 31 },
  /* Figma shelf 3 (offset) +80px gap below confessions block */
  'shelf-3': { x: -245, y: 526, width: 350, height: 31 },
  'shelf-4': { x: -10, y: 1851, width: 350, height: 31 },
  'shelf-5': { x: -7, y: 2326, width: 350, height: 31 },
  /* Scaled from 256×224 */
  /* +10% vs 220×193; y so bottom at 303 (shelf top) */
  romanticise: { x: -34, y: 51, width: 242, height: 212 },
  cat: { x: 248, y: 163, width: 97, height: 100 },
  /* With shelf-3 @526; bottom on plank */
  'snake-plant': { x: 5, y: 316, width: 86, height: 214 },
  confessions: { x: 59, y: 308, width: 331, height: 278 },
  collection: { x: 46, y: 631, width: 246, height: 301 },
  'idea-marinade': { x: 7, y: 969, width: 248, height: 272 },
  observations: { x: 2, y: 1308, width: 336, height: 239 },
  'self-perception': { x: 30, y: 1585, width: 220, height: 227 },
  about: { x: 32, y: 1940, width: 238, height: 390 },
  books: { x: 228, y: 1146, width: 81, height: 95 },
  plant: { x: 201, y: 1717, width: 147, height: 183 },
  /* Mobile: coffee replaces chinese-cat (hidden via CSS). Height from desktop 152×112 aspect at 100px wide. */
  coffee: { x: 257, y: 2261, width: 100, height: 74 }
};
