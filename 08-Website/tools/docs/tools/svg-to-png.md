# SVG to PNG

Turn SVG graphics into PNG images at the width you choose.

- Opens at: `/svg-to-png`
- Code: `public/assets/js/tools/image/convert.js` with preset `{ from: 'SVG', options: { to: 'png' } }` (see [Image converter](image-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: none

## How to use
1. Add one or more SVG files.
2. Set **SVG width** (default 1024 px). The height follows the SVG's shape.
3. Select **Convert** and download.

## Options
Same as Image converter, starting on PNG. SVG width shows once an SVG is added.

## How it works
The browser draws the SVG at the chosen width on a canvas, keeping transparency, and saves a PNG. Clearing the width uses the SVG's own size (150 px tall when it only has a viewBox).

## Limits
- SVGs that load outside files (web fonts, linked images) may draw without them, because the browser blocks outside loads for safety.
- Animations aren't kept.

## How to test
`mod.default.process([svgWithViewBoxOnly], { to: 'png', svgWidth: 1024 })` gives 1024 × 1024 for a square viewBox. With `svgWidth: ''` it gives 150 × 150.
