# MKV to MP4

Turn MKV videos into MP4 files that play on phones, TVs and social apps.

- Opens at: `/mkv-to-mp4`
- Code: `public/assets/js/tools/media/convert.js` with preset `{ from: 'MKV', options: { to: 'mp4' } }` (see [Video converter](video-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: Mediabunny 1.61.6 (MPL-2.0), loaded through `core/vendor.js`

## How to use
1. Add an MKV video, like an OBS recording.
2. Select **Convert video** and download.

## Options
Same as Video converter, starting on MP4.

## How it works
OBS recordings are usually H.264 video with AAC sound, so they're copied straight into an MP4 with no loss. Other video (like HEVC or AV1) is re-encoded as H.264, and other sound (like Opus) as AAC.

## Limits
- Re-encoding takes longer and softens the picture a little.
- If the browser can't read the sound, or can't save it in the new format, the video is saved without it and the result says "No sound" and why.
- The finished file is held in memory, so very long recordings can fail on phones.

## How to test
`mod.default.defaults({ from: 'MKV', options: { to: 'mp4' } })` returns `{ to: 'mp4' }`. Make an MKV with `process([mp4()], { to: 'mkv' })`, then `process([mkv], {}, { preset })` gives an MP4 with H.264 and AAC at the same size and length, in well under a second (copied).
