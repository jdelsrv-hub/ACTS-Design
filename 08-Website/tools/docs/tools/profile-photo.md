# Profile photo maker

A round profile picture with an optional coloured ring, as a see-through PNG.

- Opens at: `/profile-photo`
- Code: `public/assets/js/tools/image/crop.js` with preset `{ round: true }` (shared with Crop image)
- Runs on: your device (nothing uploaded)
- Libraries: none

## How to use
1. Add a photo.
2. Drag the circle over your face, or drag a corner to resize it.
3. Turn on **Add a ring** if you want one, and pick its colour and thickness. The preview shows the ring.
4. Select **Make profile photo** and download.

## Options
- Add a ring: off by default.
- Ring colour: default Studio Purple (#6C3FE0).
- Ring thickness: 1 to 15% of the photo's width (default 4%).

## How it works
Uses the same crop box as Crop image, locked to a square and shown as a circle. The square is drawn into a circle clip on a transparent canvas, the ring is stroked just inside the edge, and the result is saved as PNG.

## Limits
- At most 1024 × 1024 pixels, which covers every platform's profile picture.
- PNG only, so the corners stay see-through.

## How to test
`mod.default.process([photo], { ring: true, ringColour: '#00ffff', ringWidth: 10 }, { preset: { round: true } })` gives a square PNG with transparent corners (pixel 2,2 has alpha 0) and the ring colour near the top edge.
