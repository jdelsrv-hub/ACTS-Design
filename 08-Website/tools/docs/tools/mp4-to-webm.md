# MP4 to WebM

Turn MP4 videos into WebM, an open format made for websites.

- Opens at: `/mp4-to-webm`
- Code: `public/assets/js/tools/media/convert.js` with preset `{ from: 'MP4', options: { to: 'webm' } }` (see [Video converter](video-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: Mediabunny 1.61.6 (MPL-2.0), loaded through `core/vendor.js`

## How to use
1. Add an MP4 video.
2. Select **Convert video** and download.

## Options
Same as Video converter, starting on WebM.

## How it works
MP4s usually hold H.264 video and AAC sound, which WebM can't hold. So the video is re-encoded, usually as VP9 (Mediabunny picks the first WebM codec the browser can encode), and the sound as Opus, at Mediabunny's "high" quality setting.

## Limits
- It nearly always re-encodes, so it takes a while and softens the picture a little.
- The WebM isn't always smaller than the MP4. At "high" quality it can come out bigger.
- Some Apple apps and older devices can't play WebM.

## How to test
`mod.default.defaults({ from: 'MP4', options: { to: 'webm' } })` returns `{ to: 'webm' }`. `process([mp4()], {}, { preset })` gives a WebM with VP9 and Opus (check with `mediaInfo()`), at the same size and about the same length.
