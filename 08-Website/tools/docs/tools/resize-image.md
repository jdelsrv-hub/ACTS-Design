# Resize image

Change the size of one image or many, by pixels or by percent.

- Opens at: `/resize-image`
- Code: `public/assets/js/tools/image/resize.js`
- Runs on: your device (nothing uploaded)
- Libraries: none (HEIC and TIFF reading comes from `core/image.js`)

## How to use
1. Add one or more images. Each row shows its current size.
2. Pick **Pixels** and enter a width, a height or both, or pick **Percent**.
3. Select **Resize** and download (one file, or all as a zip).

## Options
- Resize by: Pixels or Percent.
- Width and Height (px): fill in one and the other follows. Fill in both and the image fits inside that box. The shape is always kept.
- New size: 5 to 200% (default 50).

## How it works
Decodes each image (phone photos are turned the right way up first), draws it at the new size with step-by-step downscaling for clean results, and saves it in the same format. HEIC photos are saved as JPG, and formats browsers can't save (GIF, BMP, TIFF, SVG) as PNG. Files are named `photo-1080x810.jpg`.

## Limits
- Never stretches: to get an exact size with a different shape, crop first.
- Up to 16,384 pixels a side.
- Making a small image bigger adds no detail, so it looks soft.

## How to test
`mod.default.process([jpg1600x1200], { mode: 'pixels', width: 1080, height: '' })` gives 1080 × 810. `{ mode: 'pixels', width: 500, height: 500 }` gives 500 × 375. `{ mode: 'percent', percent: 25 }` gives 400 × 300.
