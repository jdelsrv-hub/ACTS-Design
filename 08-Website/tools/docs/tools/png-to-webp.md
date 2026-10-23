# PNG to WebP

Convert PNG images to WebP for lighter, faster websites.

- Opens at: `/png-to-webp`
- Code: `public/assets/js/tools/image/convert.js` with preset `{ from: 'PNG', options: { to: 'webp' } }` (see [Image converter](image-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: none

## How to use
1. Add one or more PNG images.
2. Set the quality if you like (default 90%).
3. Select **Convert** and download.

## Options
Same as Image converter, starting on WebP.

## How it works
Each PNG is drawn on a canvas and saved with the browser's WebP encoder. Transparency is kept.

## Limits
- Needs a browser that can save WebP (Chrome, Edge, Firefox). Safari shows a message instead.

## How to test
`mod.default.process([pngWithTransparency], { to: 'webp', quality: 90 })` gives an `image/webp` whose clear pixels keep alpha 0.
