# GIF to MP4

Turn an animated GIF into an MP4 or WebM video, usually a much smaller file.

- Opens at: `/gif-to-mp4`
- Code: `public/assets/js/tools/media/gif-to-video.js` (uses `even` and `formatTime` from `media/_media.js`)
- Runs on: your device (nothing uploaded)
- Libraries: Mediabunny 1.61.6 (MPL-2.0), loaded through `core/vendor.js`, to write the video. GIF frames are read with the browser's built-in `ImageDecoder`.

## How to use
1. Add one animated GIF.
2. Pick MP4 or WebM.
3. Select **Convert GIF** and download.

## Options
- Convert to: MP4 (default) or WebM.

## How it works
The browser's `ImageDecoder` reads each GIF frame and how long it shows. Each frame is drawn on a white canvas (width and height rounded to even numbers) and Mediabunny encodes it at its "high" quality setting: H.264 for MP4, VP9 for WebM. Every frame keeps its own timing, so the video plays at the GIF's speed. Delays of 10 ms or less become 100 ms, the same as browsers show them.

## Limits
- The video plays once. Most players and social apps can loop it for you.
- Videos have no see-through areas, so transparent parts turn white. The tool says so.
- No sound, because GIFs have none.
- Needs a browser with `ImageDecoder` and a video encoder (WebCodecs). Where it's missing, we suggest the latest Chrome or Edge.
- An odd width or height is rounded to an even number, so the picture can stretch by a pixel.

## How to test
Make a 40-frame GIF at 100 ms a frame, for example Video to GIF's output from the 4-second `mp4()` fixture. `mod.default.process([gif], { to: 'mp4' })` gives an H.264 MP4 at 480 × 270, 4.0 s long, with no audio track (check with `mediaInfo()`), and the note "40 frames · 0:04". `{ to: 'webm' }` gives a VP9 WebM. A text file named `x.gif` throws "We couldn't read this GIF."
