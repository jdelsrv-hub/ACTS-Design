# Image to SVG

Trace an image into a vector SVG that stays sharp at any size.

- Opens at: `/image-to-svg`
- Code: `public/assets/js/tools/image/trace.js` (also powers png-to-svg and jpg-to-svg; library in `image/_vendor.js`)
- Runs on: your device (nothing uploaded)
- Libraries: imagetracerjs 1.2.6 (public domain, Unlicense)

## How to use
1. Add one or more images. Logos, icons and drawings work best.
2. Pick how many colours and how much detail.
3. Select **Convert to SVG** and download.

## Options
- Colours: 2 to 32 (default 16). Fewer colours make a simpler, smaller SVG.
- Detail: Low, Medium (default) or High.

## How it works
The image is shrunk to at most 600, 1000 or 1600 px across (Low, Medium, High), its colours are reduced, then each colour is traced into outlines with imagetracerjs. We run the tracer one colour at a time so the progress bar moves and Cancel works. Fully see-through colours are skipped. The SVG gets a viewBox so it scales cleanly.

## Limits
- Photos come out looking like a poster (the tool says so).
- Very few colours can merge small details, like thin text, into the shape around them. Try 8 or more.
- Big, detailed images make big SVG files.

## How to test
Trace a 600 × 400 PNG with a purple circle, a green square and dark text: `mod.default.process([logo], { colours: 16, detail: 'medium' })` gives an SVG starting `<svg viewBox="0 0 600 400"`. Drawn back onto a canvas, the circle centre is purple, the square is green, the background stays transparent and the text pixels are dark.
