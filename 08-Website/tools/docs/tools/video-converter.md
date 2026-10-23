# Video converter

Convert videos between MP4, MOV, WebM and MKV.

- Opens at: `/video-converter`
- Code: `public/assets/js/tools/media/convert.js` (also powers the "X to Y" pages listed below; shared helpers in `media/_media.js`)
- Runs on: your device (nothing uploaded)
- Libraries: Mediabunny 1.61.6 (MPL-2.0), loaded through `core/vendor.js`

## How to use
1. Add one video: MP4, MOV, WebM or MKV.
2. Pick the format to convert to.
3. Select **Convert video** and download.

## Options
- Convert to: MP4 (default), MOV, WebM or MKV.

## How it works
Mediabunny's `Conversion` copies the video and sound across untouched when the new format can hold them, and re-encodes only what it can't, at its "high" quality setting.
- MP4 and MOV: H.264 video and AAC sound, the mix that plays everywhere. H.264 and AAC are copied. Anything else (HEVC, VP9, Opus) is re-encoded.
- WebM: usually VP9 video and Opus sound (Mediabunny picks the first one the browser can encode). H.264 from phones and cameras can't go in a WebM, so it's re-encoded.
- MKV: holds almost anything, so it's usually a straight copy.

Preset pages: mov-to-mp4, mkv-to-mp4, webm-to-mp4, mp4-to-webm, mp4-to-mov. Each one only changes the drop box title and the starting format.

## Limits
- Re-encoding takes longer and softens the picture a little. The tool says so before you start.
- If the browser can't read the sound, or can't save it in the new format, the video is saved without it and the result says "No sound" and why.
- HEVC (common on iPhones) needs a browser that can decode it. Some Windows PCs can't, and we suggest another browser when that happens.
- AVI files can't be opened or made.
- One video at a time. The finished file is held in memory, so very large videos can fail on phones.

## How to test
On the `mp4({ seconds: 4, width: 640, height: 360 })` fixture, check each result with `mediaInfo()`. `mod.default.process([clip], { to: 'mov' })` gives QuickTime with the same H.264 and AAC, in well under a second (copied). `{ to: 'mkv' }` gives Matroska, also copied. `{ to: 'webm' }` gives VP9 and Opus and takes a few seconds (re-encoded). Converting that WebM with `{ to: 'mp4' }` gives H.264 and AAC. Every result stays 640 × 360 and about 4 s long. `mod.default.defaults({ from: 'MOV', options: { to: 'mp4' } })` returns `{ to: 'mp4' }`.
