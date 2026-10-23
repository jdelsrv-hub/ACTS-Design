# WebP to JPG

Convert WebP images to JPG for apps that don't open WebP.

- Opens at: `/webp-to-jpg`
- Code: `public/assets/js/tools/image/convert.js` with preset `{ from: 'WebP', options: { to: 'jpg' } }` (see [Image converter](image-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: none

## How to use
1. Add one or more WebP images.
2. Set the quality if you like (default 90%).
3. Select **Convert** and download.

## Options
Same as Image converter, starting on JPG.

## How it works
The browser opens the WebP, draws it on a white canvas and saves it as JPG.

## Limits
- See-through areas turn white.
- Animated WebP: only the first frame.

## How to test
`mod.default.process([webp], { to: 'jpg', quality: 90 })` gives an `image/jpeg` of the same size.
