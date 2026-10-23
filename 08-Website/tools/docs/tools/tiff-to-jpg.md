# TIFF to JPG

Convert TIFF scans and photos to JPG.

- Opens at: `/tiff-to-jpg`
- Code: `public/assets/js/tools/image/convert.js` with preset `{ from: 'TIFF', options: { to: 'jpg' } }` (see [Image converter](image-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: UTIF.js 3.1.0 (MIT), loaded by `core/image.js` to read TIFF

## How to use
1. Add one or more TIFF files.
2. Set the quality if you like (default 90%).
3. Select **Convert** and download.

## Options
Same as Image converter, starting on JPG.

## How it works
UTIF.js decodes the first page of the TIFF into pixels, which are drawn on a white canvas and saved as JPG.

## Limits
- Multi-page TIFFs: only the first page.
- Very large scans can run out of memory on phones.
- 16-bit colour is reduced to 8-bit.

## How to test
Make a TIFF with the converter itself (`{ to: 'tiff' }`), then `mod.default.process([new File([tiff], 'scan.tiff', { type: 'image/tiff' })], { to: 'jpg', quality: 90 })` gives a JPG of the same size.
