# GIF to JPG

Turn a GIF into a JPG. Animated GIFs give their first frame.

- Opens at: `/gif-to-jpg`
- Code: `public/assets/js/tools/image/convert.js` with preset `{ from: 'GIF', options: { to: 'jpg' } }` (see [Image converter](image-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: none

## How to use
1. Add one or more GIFs.
2. Set the quality if you like (default 90%).
3. Select **Convert** and download.

## Options
Same as Image converter, starting on JPG.

## How it works
The browser opens the GIF (its first frame), draws it on a white canvas and saves it as JPG. A note appears when a GIF is added, so nobody expects the animation.

## Limits
- First frame only. To keep the animation as a video, use GIF to MP4 in the video tools.
- Clear areas turn white.

## How to test
`mod.default.process([gif], { to: 'jpg', quality: 80 })` gives an `image/jpeg` with the GIF's dimensions. In the UI, adding a `.gif` shows the "first frame only" note.
