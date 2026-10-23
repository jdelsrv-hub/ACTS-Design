# Change background colour

Swap the background of a photo for a solid colour you pick.

- Opens at: `/change-background`
- Code: `public/assets/js/tools/ai-device/remove-background.js` with preset `{ options: { background: 'colour' } }` (see [Remove background](remove-background.md))
- Runs on: your device, with AI models downloaded the first time (nothing uploaded)
- Libraries and models: same as Remove background (Transformers.js 4.3.1; U-2-Net small and MODNet, both Apache-2.0, about 15 MB the first time)

## How to use
1. Add one or more photos.
2. Pick the background colour (white to start).
3. Select **Change background** and download the JPG.

## Options
Same as Remove background, starting on Colour. You can still switch to Transparent or Blur.

## How it works
Two small AI models find the subject in the browser. We fill a new image with your colour and draw the cut-out subject on top, then save it as a JPG.

## Limits
- Fine hair can keep a thin fringe of the old background colour, which shows most on a very different new colour.
- Same limits as Remove background otherwise.

## How to test
Red circle on a plain grey 600 × 400 canvas, then `mod.default.process([file], { background: 'colour', colour: '#2E7D32' })`: `circle-new-bg.jpg`, with green corners and a red centre.
