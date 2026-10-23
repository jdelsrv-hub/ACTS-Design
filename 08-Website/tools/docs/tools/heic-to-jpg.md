# HEIC to JPG

Turn iPhone HEIC photos into JPGs that open anywhere.

- Opens at: `/heic-to-jpg`
- Code: `public/assets/js/tools/image/convert.js` with preset `{ from: 'HEIC', options: { to: 'jpg' } }` (see [Image converter](image-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: heic2any 0.0.4 (MIT, bundles libheif LGPL), loaded by `core/image.js` only when the browser can't open HEIC itself

## How to use
1. Add one or more HEIC photos.
2. Set the quality if you like (default 90%).
3. Select **Convert** and download.

## Options
Same as Image converter, starting on JPG.

## How it works
Safari opens HEIC natively. Other browsers decode it with heic2any, then the picture is drawn on a canvas and saved as JPG. The photo is turned the right way up.

## Limits
- Camera details and location aren't copied into the JPG.
- Live Photos and bursts: only the main still image is converted.
- heic2any is a large download (about 1 MB) the first time.

## How to test
Needs a real HEIC file (browsers can't make one). `mod.default.process([heic], { to: 'jpg', quality: 90 }, { preset: { from: 'HEIC', options: { to: 'jpg' } } })` gives a `.jpg` with the same pixel size. A damaged HEIC throws an error instead of hanging.
