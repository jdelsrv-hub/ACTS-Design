# JPG to PNG

Convert JPG photos to PNG files.

- Opens at: `/jpg-to-png`
- Code: `public/assets/js/tools/image/convert.js` with preset `{ from: 'JPG', options: { to: 'png' } }` (see [Image converter](image-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: none

## How to use
1. Add one or more JPG photos.
2. Select **Convert** and download.

## Options
Same as Image converter, starting on PNG.

## How it works
Each JPG is drawn on a canvas, turned the right way up, and saved as a lossless PNG.

## Limits
- PNG won't bring back detail the JPG already lost, and the file gets bigger.
- Camera details and location aren't copied.

## How to test
`mod.default.process([jpg], { to: 'png' })` gives an `image/png` with the same dimensions.
