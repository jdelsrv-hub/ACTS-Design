# MOV to GIF

Turn a short moment from a MOV or iPhone video into an animated GIF.

- Opens at: `/mov-to-gif`
- Code: `public/assets/js/tools/media/gif.js` with preset `{ from: 'MOV' }` (see [Video to GIF](video-to-gif.md))
- Runs on: your device (nothing uploaded)
- Libraries: Mediabunny 1.61.6 (MPL-2.0) and gifenc 1.0.3 (MIT), loaded through `core/vendor.js`

## How to use
1. Add a MOV video.
2. Pick the start with the preview, then set the length, frame rate and width.
3. Select **Make GIF** and download.

## Options
Same as Video to GIF. The preset only changes the drop box title.

## How it works
The chosen frames are decoded with Mediabunny, drawn upright at the chosen width, and written as a 256-colour animated GIF with gifenc.

## Limits
- iPhone videos are often HEVC. Some Windows PCs can't decode HEVC in the browser, and we suggest another browser when that happens.
- 256 colours per frame, so photos and gradients can look grainy.
- Keep it short: GIFs get big fast. The longest length is 30 seconds.

## How to test
`mod.default.defaults({ from: 'MOV' })` returns the Video to GIF defaults. Make a MOV with the video converter (`process([mp4()], { to: 'mov' })`), then `process([mov], { length: 1 }, { preset: { from: 'MOV' } })` gives an `image/gif` with 10 frames at 320 × 240.
