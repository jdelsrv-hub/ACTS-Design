# JPG to WebP

Convert JPG photos to WebP for lighter, faster websites.

- Opens at: `/jpg-to-webp`
- Code: `public/assets/js/tools/image/convert.js` with preset `{ from: 'JPG', options: { to: 'webp' } }` (see [Image converter](image-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: none

## How to use
1. Add one or more JPG photos.
2. Set the quality if you like (default 90%).
3. Select **Convert** and download.

## Options
Same as Image converter, starting on WebP.

## How it works
Each JPG is drawn on a canvas, turned the right way up, and saved with the browser's WebP encoder.

## Limits
- Needs a browser that can save WebP (Chrome, Edge, Firefox).
- Camera details and location aren't copied.

## How to test
`mod.default.process([jpg], { to: 'webp', quality: 90 })` gives an `image/webp` with the same dimensions.
