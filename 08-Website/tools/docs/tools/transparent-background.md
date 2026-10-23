# Transparent background

Make the background of a photo see-through, ready for thumbnails and logos.

- Opens at: `/transparent-background`
- Code: `public/assets/js/tools/ai-device/remove-background.js` with preset `{ options: { background: 'transparent' } }` (see [Remove background](remove-background.md))
- Runs on: your device, with AI models downloaded the first time (nothing uploaded)
- Libraries and models: same as Remove background (Transformers.js 4.3.1; U-2-Net small and MODNet, both Apache-2.0, about 15 MB the first time)

## How to use
1. Add one or more photos.
2. Select **Remove background** and download the PNG.

## Options
Same as Remove background, starting on Transparent.

## How it works
Two small AI models find the subject in the browser. Everything else becomes see-through and the result is saved as a PNG.

## Limits
Same as Remove background: fine hair and see-through things may keep a thin fringe, and edges on very big photos are soft.

## How to test
Same as Remove background: a red circle on a plain grey canvas gives `circle-no-bg.png` with alpha 0 in the corners and an opaque red centre.
