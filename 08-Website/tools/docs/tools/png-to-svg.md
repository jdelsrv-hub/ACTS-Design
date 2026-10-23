# PNG to SVG

Trace a PNG into a vector SVG that stays sharp at any size.

- Opens at: `/png-to-svg`
- Code: `public/assets/js/tools/image/trace.js` with preset `{ from: 'PNG' }` (see [Image to SVG](image-to-svg.md))
- Runs on: your device (nothing uploaded)
- Libraries: imagetracerjs 1.2.6 (public domain, Unlicense)

## How to use
1. Add one or more PNGs, such as a logo or icon.
2. Pick the colours and detail.
3. Select **Convert to SVG** and download.

## Options
Same as Image to SVG: Colours (2 to 32, default 16) and Detail (Low, Medium, High).

## How it works
Same as Image to SVG. See-through areas in the PNG stay see-through in the SVG. The preset only changes the drop box title.

## Limits
- Works best on flat colours. Soft shadows and gradients turn into bands.
- Fine detail smaller than a few pixels is dropped (more at Low detail).

## How to test
`mod.default.process([logoPng], { colours: 16, detail: 'medium' }, { preset: { from: 'PNG' } })` gives a `.svg` whose corner pixel, once drawn, is transparent.
