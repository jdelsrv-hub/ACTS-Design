# Meme maker

Add top and bottom text to any picture in the classic meme style.

- Opens at: `/meme-maker` (listed under Other)
- Code: `public/assets/js/tools/image/text.js` with preset `{ meme: true }` (shared with Add text to image)
- Runs on: your device (nothing uploaded)
- Libraries: Anton font 5.2.5 from @fontsource (SIL Open Font Licence), used when Impact isn't installed

## How to use
1. Add a picture.
2. Type the top line, the bottom line or both. The preview updates as you type.
3. Select **Make meme** and download.

## Options
- Top text and Bottom text.
- Text size: 4 to 20% of the image height (default 10%).

## How it works
Text is made uppercase and drawn in white with a black outline, centred near the top and bottom edges. It wraps across lines and shrinks to fit. The font is Impact where the device has it, otherwise Anton (loaded once from jsDelivr), then Arial Black.

## Limits
- Bring your own picture: there's no template library.
- One picture at a time.

## How to test
`mod.default.process([img], { top: 'Top line', bottom: 'Bottom line', size: 10 }, { preset: { meme: true } })` keeps the size and adds white and black pixels near the top and bottom edges. In the UI the run button stays disabled until a line is typed.
