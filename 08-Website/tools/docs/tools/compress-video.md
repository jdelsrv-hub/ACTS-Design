# Compress video

Make a video file smaller, so it's easier to send, share or upload.

- Opens at: `/compress-video`
- Code: `public/assets/js/tools/media/compress.js` (shared helpers in `media/_media.js`)
- Runs on: your device (nothing uploaded)
- Libraries: Mediabunny 1.61.6 (MPL-2.0), loaded through `core/vendor.js`

## How to use
1. Add one video: MP4, MOV, WebM or MKV.
2. Pick how strong the compression is, and a smaller video size if you want one.
3. Select **Compress video** and download. The result shows how much smaller it got.

## Options
- Compression: Light, Balanced or Strong (default Balanced).
- Video size: Keep the same size (default), 1080p, 720p or 480p. The shorter side shrinks to that size, so portrait videos work too. A video that's already smaller is never made bigger.

## How it works
We work out the video's bitrate (how much data it uses each second) from the file size and length, minus 128 kbps if it has sound. The new bitrate is a share of that, capped at a rate that still looks good for the frame size:

| Level | Share of the original | Cap at 1080p |
| --- | --- | --- |
| Light | 70% | 6 Mbps |
| Balanced | 50% | 3 Mbps |
| Strong | 30% | 1.5 Mbps |

The cap scales with the number of pixels, and the bitrate never goes below 100 kbps. Mediabunny's `Conversion` then re-encodes the picture as H.264 with the browser's own encoder (WebCodecs). Sound is saved as AAC: copied as it is when it's already AAC, otherwise re-encoded at 192 kbps. You always get an MP4.

## Limits
- Re-encoding always loses some detail. Strong can look soft or blocky in fast-moving scenes.
- If the result isn't smaller than the original, we show an error instead of handing back a bigger file. Videos that are already tightly compressed often hit this.
- One video at a time. The finished file is held in memory, so very long or very large videos can run out of memory, especially on phones.
- Your browser does the decoding and encoding. If it can't read the video (for example HEVC on some Windows PCs) or can't make H.264, we say so and suggest another browser.

## How to test
Use the `mp4({ seconds: 4, width: 640, height: 360 })` fixture from `tests/fixtures.js` and measure with `mediaInfo()` from `tests/check.js`. `mod.default.process([clip], {})` returns one MP4 that is smaller than the input, still 640 × 360, about 4 s long and with AAC sound. `summary` reads like "38% smaller: 252 KB down to 157 KB". `{ level: 'strong', size: 240 }` gives 426 × 240 with the same length and sound.
