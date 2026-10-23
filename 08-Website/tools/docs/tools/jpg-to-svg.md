# JPG to SVG

Trace a JPG into a vector SVG that stays sharp at any size.

- Opens at: `/jpg-to-svg`
- Code: `public/assets/js/tools/image/trace.js` with preset `{ from: 'JPG' }` (see [Image to SVG](image-to-svg.md))
- Runs on: your device (nothing uploaded)
- Libraries: imagetracerjs 1.2.6 (public domain, Unlicense)

## How to use
1. Add one or more JPGs.
2. Pick the colours and detail.
3. Select **Convert to SVG** and download.

## Options
Same as Image to SVG: Colours (2 to 32, default 16) and Detail (Low, Medium, High).

## How it works
Same as Image to SVG. The preset only changes the drop box title.

## Limits
- JPG compression adds speckles around edges, which can turn into tiny extra shapes. Low detail drops most of them.
- Photos come out looking like a poster.

## How to test
`mod.default.process([jpg], { colours: 8, detail: 'low' }, { preset: { from: 'JPG' } })` gives an `image/svg+xml` file with a viewBox matching the traced size (at most 600 px across at Low).
