# WebP to PNG

Convert WebP images to PNG, keeping see-through areas.

- Opens at: `/webp-to-png`
- Code: `public/assets/js/tools/image/convert.js` with preset `{ from: 'WebP', options: { to: 'png' } }` (see [Image converter](image-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: none

## How to use
1. Add one or more WebP images.
2. Select **Convert** and download.

## Options
Same as Image converter, starting on PNG.

## How it works
The browser opens the WebP, draws it on a canvas and saves a lossless PNG, transparency included.

## Limits
- PNGs are usually bigger than the WebP.
- Animated WebP: only the first frame.

## How to test
`mod.default.process([webpWithTransparency], { to: 'png' })` gives a PNG whose clear pixels still have alpha 0.
