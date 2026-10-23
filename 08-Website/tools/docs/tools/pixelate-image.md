# Pixelate image

Turn an image into big pixel blocks, or blur it.

- Opens at: `/pixelate-image`
- Code: `public/assets/js/tools/image/edit.js` with preset `{ fx: 'pixelate' }` (live preview from `image/_shared.js`)
- Runs on: your device (nothing uploaded)
- Libraries: none

## How to use
1. Add one or more images.
2. Pick **Pixelate** or **Blur** and set the strength. The preview updates as you go.
3. Select **Pixelate image** and download.

## Options
- Style: Pixelate (default) or Blur.
- Block size: 2 to 100 px (default 16), for Pixelate.
- Blur strength: 2 to 100 (default 12), for Blur.

## How it works
Pixelate shrinks the picture by the block size, then stretches it back with hard edges. Blur shrinks it the same way, then stretches it back smoothly. This works the same in every browser, Safari included, and leaves no see-through edges.

## Limits
- It changes the whole picture. To hide one face or a number plate, crop and pixelate a copy, or use an editor.
- Blocks at the edges of colour areas blend a little with their neighbours.

## How to test
`mod.default.process([img], { style: 'pixels', block: 50 }, { preset: { fx: 'pixelate' } })` keeps the size and makes every 50 px block one flat colour. `{ style: 'blur', blur: 20 }` keeps solid colour far from edges and mixes colours across them.
