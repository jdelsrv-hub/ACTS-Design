# Add border to image

Put a coloured border around images, with rounded corners if you like.

- Opens at: `/add-border`
- Code: `public/assets/js/tools/image/edit.js` with preset `{ fx: 'border' }` (live preview from `image/_shared.js`)
- Runs on: your device (nothing uploaded)
- Libraries: none

## How to use
1. Add one or more images.
2. Set the border width, colour and rounded corners. The preview updates as you go.
3. Select **Add border** and download.

## Options
- Border width: 0 to 200 px (default 24). The image grows by twice this.
- Border colour: default white.
- Rounded corners: 0 to 300 px (default 0). The picture's own corners are rounded to match.

## How it works
Makes a canvas bigger than the image by the border on each side, fills a rounded rectangle with the colour, then draws the image inside a smaller rounded clip. With rounded corners the result is saved as PNG so the corners stay see-through. Otherwise it keeps the input format.

## Limits
- See-through parts of a PNG take the border colour behind them.
- Border width is in pixels, so the same width looks thinner on a big photo.

## How to test
`mod.default.process([png800x600], { size: 20, colour: '#000000', radius: 0 }, { preset: { fx: 'border' } })` gives 840 × 640 with a black pixel at 5, 5. With `radius: 80` the corner pixel 1, 1 has alpha 0 and the file is PNG.
