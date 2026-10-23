# Collage maker

Put up to nine photos in a grid, with spacing and a background colour.

- Opens at: `/collage-maker`
- Code: `public/assets/js/tools/image/combine.js` with preset `{ collage: true }` (shared with Combine images; live preview from `image/_shared.js`)
- Runs on: your device (nothing uploaded)
- Libraries: none

## How to use
1. Add two to nine photos and drag them into order.
2. Pick a layout (one that fits your photos is chosen for you), then set spacing and background colour. The preview updates.
3. Select **Make collage** and download.

## Options
- Layout: two side by side, two stacked, three with one big on the left, three with one big on top, four, six or nine in a grid.
- Spacing: 0 to 80 px (default 20), between photos and around the edge.
- Background colour: default white.

## How it works
The collage is a 2000 × 2000 px square. Each photo fills its cell and is cropped from the centre to fit. Empty cells show the background. Photos are opened one at a time and shrunk to 2000 px first, so big batches fit in memory. Saved as JPG.

## Limits
- Square only, no custom cell positions.
- Cropping to fill a cell can cut off the edges of a photo.

## How to test
`mod.default.process([a, b, c], { layout: 'three-left', spacing: 20, background: '#ff00ff' }, { preset: { collage: true } })` gives a 2000 × 2000 JPG with a magenta pixel at 10, 10 and photo pixels inside the cells. In the UI, adding 3 photos picks "Three, one big on the left" and 5 picks "Six in a grid".
