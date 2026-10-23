# Image converter

Convert images to JPG, PNG, WebP, GIF, BMP, ICO or TIFF.

- Opens at: `/image-converter`
- Code: `public/assets/js/tools/image/convert.js` (also powers the "X to Y" pages listed below)
- Runs on: your device (nothing uploaded)
- Libraries: gifenc 1.0.3 (MIT) for GIF, UTIF.js 3.1.0 (MIT) for TIFF, heic2any 0.0.4 (MIT, bundles libheif LGPL) for reading HEIC. All loaded through `core/vendor.js`.

## How to use
1. Add one or more images: JPG, PNG, WebP, HEIC, SVG, TIFF, GIF, BMP, ICO or AVIF.
2. Pick the format to convert to. For JPG, WebP and AVIF, set the quality.
3. Select **Convert** and download.

## Options
- Convert to: JPG, PNG, WebP, GIF, BMP, ICO, TIFF, plus AVIF when the browser can save it (checked when the tool loads).
- Quality: 10 to 100% (default 90), for JPG, WebP and AVIF.
- SVG width: shown when an SVG is added (default 1024 px), because SVGs have no fixed size.

## How it works
Each file is opened with `decodeImage()` and drawn on a canvas. JPG, PNG, WebP and AVIF use the browser's encoder. GIF is reduced to 256 colours with gifenc (1-bit transparency kept). BMP is written as 24-bit. ICO holds 16, 32, 48 and 256 px PNG images. TIFF is uncompressed RGBA from UTIF.js.

Preset pages: heic-to-jpg, heic-to-png, webp-to-jpg, webp-to-png, png-to-jpg, jpg-to-png, png-to-webp, jpg-to-webp, svg-to-png, gif-to-jpg, tiff-to-jpg. Each one only changes the drop box title and the starting format.

## Limits
- JPG and BMP can't be see-through, so clear areas turn white.
- Animated GIFs: only the first frame is converted (the tool says so when a GIF is added).
- GIF keeps up to 256 colours, so photos look grainy.
- Browsers can't show TIFF, so there's no preview for TIFF results.
- AVIF output only appears in browsers that can save it (not Chrome or Edge today).

## How to test
`mod.default.process([pngWithTransparency], { to })` for each format: `jpg` and `bmp` have a white corner pixel, `png`, `webp`, `gif` and `ico` keep alpha 0. The ICO header lists 4 images (16, 32, 48, 256). A TIFF result converts back to JPG at the same size. An SVG with only a viewBox comes out 1024 px wide.
