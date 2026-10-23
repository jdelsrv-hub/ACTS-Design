# MP4 to GIF

Turn a short moment from an MP4 video into an animated GIF.

- Opens at: `/mp4-to-gif`
- Code: `public/assets/js/tools/media/gif.js` with preset `{ from: 'MP4' }` (see [Video to GIF](video-to-gif.md))
- Runs on: your device (nothing uploaded)
- Libraries: Mediabunny 1.61.6 (MPL-2.0) and gifenc 1.0.3 (MIT), loaded through `core/vendor.js`

## How to use
1. Add an MP4 video.
2. Pick the start with the preview, then set the length, frame rate and width.
3. Select **Make GIF** and download.

## Options
Same as Video to GIF. The preset only changes the drop box title.

## How it works
The chosen frames are decoded with Mediabunny and written as a 256-colour animated GIF with gifenc.

## Limits
- 256 colours per frame, so photos and gradients can look grainy.
- Keep it short: GIFs get big fast. The longest length is 30 seconds.

## How to test
`mod.default.defaults({ from: 'MP4' })` returns `{ start: '0:00', length: 5, fps: 10, width: 480 }`. `process([mp4()], {}, { preset: { from: 'MP4' } })` gives an `image/gif` with 20 frames for the default 2-second fixture at 320 × 240.
