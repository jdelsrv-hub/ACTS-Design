# Add text to image

Write on an image. Pick the size, colour, position and outline.

- Opens at: `/add-text-to-image`
- Code: `public/assets/js/tools/image/text.js` (shared with Meme maker; live preview from `image/_shared.js`)
- Runs on: your device (nothing uploaded)
- Libraries: none (uses the site's Inter font)

## How to use
1. Add one or more images.
2. Type your text. Press Enter for a new line.
3. Set the size, position and colours. The preview updates as you type.
4. Select **Add text** and download.

## Options
- Your text: one or more lines.
- Text size: 2 to 30% of the image height (default 8%).
- Position: nine spots, from top left to bottom right (default bottom centre).
- Text colour: default white.
- Outline: on by default, with its own colour (default black).

## How it works
Long lines wrap to fit inside a 5% margin, and the text shrinks if one word is still too wide. Text is drawn on the canvas in Inter, with a round-cornered outline under the fill. The result keeps the input format.

## Limits
- One font, one text block per image.
- The same text and position go on every image in a batch.

## How to test
Named export: `drawText(ctx, text, { x, y, maxWidth, size, font, fill, stroke, align, valign })`.
`mod.default.process([img], { text: 'Hello', size: 10, position: 'bottom', colour: '#ffffff', outline: true, outlineColour: '#000000' })` keeps the size, and the bottom tenth of the image now has white and black pixels it didn't have before.
