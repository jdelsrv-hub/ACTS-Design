# Combine images

Join images side by side or stacked into one picture.

- Opens at: `/combine-images`
- Code: `public/assets/js/tools/image/combine.js` (shared with Collage maker; live preview from `image/_shared.js`)
- Runs on: your device (nothing uploaded)
- Libraries: none

## How to use
1. Add two or more images and drag them into order.
2. Pick **Side by side** or **Stacked**. The preview updates.
3. Select **Combine images** and download.

## Options
- Layout: Side by side (default) or Stacked.

## How it works
Side by side scales every image to the height of the shortest one; stacked scales them to the width of the narrowest one, so nothing is stretched or upscaled. The joined picture is at most 16,000 px long. It's saved as JPG when every input is a JPG (or HEIC), otherwise as PNG.

## Limits
- No gaps or background colour. Use Collage maker for spacing.
- Images are opened one at a time and capped at 4,000 px, so very large photos are scaled down first.

## How to test
Named exports: `combine(images, { direction }, max)`, `collage(...)`, `LAYOUTS`.
`mod.default.process([jpg1600x1200, jpg600x800], { direction: 'side' })` gives 1667 × 800 JPG. Adding a 1000 × 500 PNG and stacking gives 600 × 1550 PNG.
