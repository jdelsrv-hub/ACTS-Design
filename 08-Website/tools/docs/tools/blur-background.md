# Blur background

Blur the background behind the subject, like portrait mode on a phone.

- Opens at: `/blur-background`
- Code: `public/assets/js/tools/ai-device/remove-background.js` with preset `{ options: { background: 'blur' } }` (see [Remove background](remove-background.md))
- Runs on: your device, with AI models downloaded the first time (nothing uploaded)
- Libraries and models: same as Remove background (Transformers.js 4.3.1; U-2-Net small and MODNet, both Apache-2.0, about 15 MB the first time)

## How to use
1. Add one or more photos.
2. Set the blur strength (5 to start).
3. Select **Blur background** and download the JPG.

## Options
Same as Remove background, starting on Blur the original. Blur strength runs from 1 (soft) to 10 (heavy) and scales with the photo's size.

## How it works
Two small AI models find the subject in the browser. We draw a blurred copy of the whole photo (canvas blur filter, or shrink-and-stretch in browsers without it), then the sharp subject on top, and save a JPG.

## Limits
- The blur is even, not a real depth effect: things near the subject are blurred as much as things far away.
- A little of the subject's edge colour can show as a soft halo in the blurred background.
- Same limits as Remove background otherwise.

## How to test
Red circle on a plain grey 600 × 400 canvas, then `mod.default.process([file], { background: 'blur', blur: 5 })`: `circle-blurred-bg.jpg`, same size, with a sharp red centre and grey corners.
