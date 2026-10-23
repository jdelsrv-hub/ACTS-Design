# WebM to MP4

Turn WebM videos and screen recordings into MP4 files that play anywhere.

- Opens at: `/webm-to-mp4`
- Code: `public/assets/js/tools/media/convert.js` with preset `{ from: 'WebM', options: { to: 'mp4' } }` (see [Video converter](video-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: Mediabunny 1.61.6 (MPL-2.0), loaded through `core/vendor.js`

## How to use
1. Add a WebM video.
2. Select **Convert video** and download.

## Options
Same as Video converter, starting on MP4.

## How it works
WebM holds VP8, VP9 or AV1 video with Opus or Vorbis sound, and none of those play everywhere in an MP4. So the video is re-encoded as H.264 and the sound as AAC, at Mediabunny's "high" quality setting.

## Limits
- It always re-encodes, so it takes longer than a copy and softens the picture a little.
- If the browser can't read the sound, or can't save it in the new format, the video is saved without it and the result says "No sound" and why.

## How to test
`mod.default.defaults({ from: 'WebM', options: { to: 'mp4' } })` returns `{ to: 'mp4' }`. Make a WebM with `process([mp4()], { to: 'webm' })`, then `process([webm], {}, { preset })` gives an MP4 with H.264 and AAC (check with `mediaInfo()`), the same size and about the same length.
