# PNG to JPG

Convert PNG images to JPG files, usually much smaller.

- Opens at: `/png-to-jpg`
- Code: `public/assets/js/tools/image/convert.js` with preset `{ from: 'PNG', options: { to: 'jpg' } }` (see [Image converter](image-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: none

## How to use
1. Add one or more PNG images.
2. Set the quality if you like (default 90%).
3. Select **Convert** and download.

## Options
Same as Image converter, starting on JPG.

## How it works
Each PNG is drawn on a white canvas and saved as JPG at the chosen quality.

## Limits
- JPG has no transparency, so clear areas turn white.
- Sharp text and flat graphics can get soft edges in JPG. PNG to WebP keeps them crisper.

## How to test
`mod.default.process([pngWithTransparency], { to: 'jpg', quality: 90 })`: the result is `image/jpeg` and a clear corner pixel reads 255, 255, 255.
