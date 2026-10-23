# Crop image

Drag a box to crop. Free, square, 4:5, 16:9 or 9:16.

- Opens at: `/crop-image`
- Code: `public/assets/js/tools/image/crop.js` (shared with Profile photo maker)
- Runs on: your device (nothing uploaded)
- Libraries: none

## How to use
1. Add an image.
2. Pick a shape, then drag the box to move it or drag a corner to resize it. Drag on the picture outside the box to draw a new one. The size in pixels shows under the picture.
3. Select **Crop image** and download.

## Options
- Shape: Free, 1:1, 4:5, 16:9 or 9:16. Picking a shape sets the biggest box of that shape in the middle.

## How it works
The box is shown over a small preview, but its position is kept in real pixels, so the crop is taken from the full-size image. The result is saved in the same format (HEIC as JPG). When the box has focus, arrow keys move it (hold Shift for bigger steps). After **Change options** the box stays where you left it.

## Limits
- One image at a time.
- JPG and WebP are saved again at 92% quality.

## How to test
Named exports: `centredBox(W, H, ratio, k)` and `cropCanvas(image, box, { round })`.
`mod.default.process([quad800x600png], { ratio: 'free', box: { x: 350, y: 250, w: 100, h: 100 } })` gives a 100 × 100 PNG with the four quadrant colours in its corners. `{ ratio: '16:9' }` with no box gives 800 × 450.
