# Build script: issue data from folder contents

**`build-issue-data.js`** scans `assets/issues` and generates `issue-data.js`. Every subfolder is one issue; page count and order come from the actual image files in that folder.

## When to run

- After adding or renaming issue folders under `assets/issues`
- After adding, removing, or renaming page images in an issue folder

From the project root:

```bash
node scripts/build-issue-data.js
```

## How it works

- **Discovery:** All direct subfolders of `assets/issues` are treated as zines.
- **Slug:** Derived from the folder name (spaces → hyphens, lowercased), e.g. `idea marinade` → `idea-marinade`.
- **Pages:** All image files (png, jpg, jpeg, webp) in the folder are listed. Order: any filename containing “cover” first, then by page number from names like `page 1`, `page-2`, `page_3`.
- **Cover:** If the folder has a cover-like image, it’s used as the issue cover; otherwise the issue has no separate cover.
- No config file is required; everything is read from the folder structure and filenames.

## Adding a new zine

1. Create a folder under `assets/issues`, e.g. `assets/issues/my-new-zine`.
2. Add images (e.g. `cover.png`, `page-1.jpeg`, `page-2.jpeg`). Order: “cover” first, then by “page” + number.
3. Run `node scripts/build-issue-data.js`.
4. Add a row to `HOMEPAGE_ASSETS` in `script.js` so the homepage links to it: `{ id: '…', type: 'zine', slug: 'my-new-zine' }`, and add a cover image in `index.html` with `data-zine="…"` matching that `id`.
