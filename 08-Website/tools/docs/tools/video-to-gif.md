# Video to GIF

Turn a short moment from a video into an animated GIF.

- Opens at: `/video-to-gif`
- Code: `public/assets/js/tools/media/gif.js` (also powers mp4-to-gif and mov-to-gif; shared helpers, including the preview player, in `media/_media.js`)
- Runs on: your device (nothing uploaded)
- Libraries: Mediabunny 1.61.6 (MPL-2.0) to read the frames, gifenc 1.0.3 (MIT) to write the GIF. Both loaded through `core/vendor.js`.

## How to use
1. Add one video: MP4, MOV, WebM or MKV.
2. Play the preview and select **Start here**, or type a start time. Set the length, frame rate and width.
3. Select **Make GIF** and download.

## Options
- Start: default `0:00` (minutes and seconds, like `0:05.5`).
- Length: 0.5 to 30 seconds (default 5). It stops early at the end of the video.
- Frame rate: 5, 10, 15, 20 or 25 frames a second (default 10).
- Width: 320, 480, 640 or 800 px (default 480), never wider than the video. The height keeps the shape.

## How it works
Mediabunny's `CanvasSink` decodes a frame at each moment we need (the start, then every 1/frame-rate seconds) at the chosen size. For each frame, gifenc picks the best 256 colours (`quantize`), maps the pixels to them (`applyPalette`) and writes it with a delay of one frame. The GIF has no sound.

## Limits
- GIFs keep 256 colours per frame, so gradients and skin tones can look grainy or banded.
- Real footage makes big GIFs. A shorter length, lower frame rate or smaller width keeps the file down.
- GIF timing is counted in hundredths of a second, so at 15 frames a second each frame lasts 70 ms and the GIF plays a touch slower than the video.
- Needs a browser that can decode the video. If it can't, we say so and suggest another browser.

## How to test
On the `mp4({ seconds: 4, width: 640, height: 360 })` fixture, `mod.default.process([clip], {})` gives an `image/gif` with the note "480 × 270 · 40 frames" (5 s asked, 4 s available, at 10 fps). Check it with `ImageDecoder`: after `await decoder.tracks.ready`, `frameCount` is 40 and frame 0 is 480 × 270. `{ start: '0:01', length: 2, fps: 5, width: 800 }` gives 10 frames at 640 × 360 (capped at the video's width). `{ start: '0:09' }` throws "The start is after the end of the video".
