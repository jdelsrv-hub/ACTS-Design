# Rotate or flip image

Turn images a quarter at a time, or flip them like a mirror.

- Opens at: `/rotate-flip-image`
- Code: `public/assets/js/tools/image/edit.js` with preset `{ fx: 'rotate' }` (shared with border, pixelate, black and white, sharpen; live preview from `image/_shared.js`)
- Runs on: your device (nothing uploaded)
- Libraries: none

## How to use
1. Add one or more images. A preview of the first one appears.
2. Pick a turn and tick a flip if you need one. The preview updates as you go.
3. Select **Rotate image** and download (one file, or all as a zip).

## Options
- Turn: None, 90° right (default), 180°, 90° left.
- Flip horizontally (mirror) and Flip vertically (upside down). Flips apply to the turned picture, so what you see is what you get.

## How it works
Draws the image on a canvas with a rotate and scale transform, then saves it in the same format (HEIC as JPG). Phone photos are put the right way up before turning, and the result has no rotation tag, so every app shows it the same way.

## Limits
- JPG and WebP are saved again at 92% quality. It isn't a lossless JPG rotation.
- Camera details and location aren't copied.

## How to test
With a 800 × 600 image whose corners are red, green, blue and white (top left, top right, bottom left, bottom right): `{ turn: 90 }` gives 600 × 800 with corners blue, red, white, green. `{ turn: 0, flipH: true }` gives green, red, white, blue.
