# HEIC to PNG

Turn iPhone HEIC photos into PNG files.

- Opens at: `/heic-to-png`
- Code: `public/assets/js/tools/image/convert.js` with preset `{ from: 'HEIC', options: { to: 'png' } }` (see [Image converter](image-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: heic2any 0.0.4 (MIT, bundles libheif LGPL), loaded by `core/image.js` only when needed

## How to use
1. Add one or more HEIC photos.
2. Select **Convert** and download.

## Options
Same as Image converter, starting on PNG.

## How it works
The HEIC is decoded (natively in Safari, with heic2any elsewhere), drawn on a canvas and saved as a lossless PNG.

## Limits
- PNG photos are much bigger than JPGs. Use HEIC to JPG for sharing.
- Camera details and location aren't copied.

## How to test
Needs a real HEIC file. `mod.default.process([heic], { to: 'png' })` gives a `.png` of the same pixel size.
