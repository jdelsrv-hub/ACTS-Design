# Image splitter

Cut an image into a grid of tiles, ready for an Instagram grid.

- Opens at: `/image-splitter`
- Code: `public/assets/js/tools/image/split.js` (live preview from `image/_shared.js`)
- Runs on: your device (nothing uploaded)
- Libraries: fflate (through `core/files.js`) for the zip

## How to use
1. Add an image.
2. Set the rows and columns. The preview shows the cut lines and tile numbers.
3. Select **Split image**, then **Download all (.zip)** or single tiles.

## Options
- Rows: 1 to 10 (default 3).
- Columns: 1 to 10 (default 3).

## How it works
Cuts are placed as evenly as whole pixels allow, so no pixel is lost or repeated. Tiles are numbered in reading order (left to right, top to bottom) as `photo-1.jpg`, `photo-2.jpg` and so on, in the input's format.

## Limits
- For an Instagram grid, post the highest number first so tile 1 ends up top left (the tool says so).
- Instagram crops grid thumbnails, so a square image split 3 × 3 lines up best.

## How to test
`mod.default.process([img1080], { rows: 3, cols: 3 })` returns 9 tiles of 360 × 360. A 1001 × 700 image split 2 × 3 gives widths 334, 333, 334 (adding up to 1001) and heights of 350.
