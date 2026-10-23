# M4A to MP3

Turn M4A audio, like iPhone voice memos, into MP3 files.

- Opens at: `/m4a-to-mp3`
- Code: `public/assets/js/tools/media/audio.js` with preset `{ from: 'M4A', options: { to: 'mp3' } }` (see [Audio converter](audio-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: Mediabunny 1.61.6 (MPL-2.0) and @mediabunny/mp3-encoder 1.61.6 (MPL-2.0, based on the LAME encoder), loaded through `core/vendor.js`

## How to use
1. Add one or more M4A files.
2. Select **Convert audio** and download each MP3, or all of them as a zip.

## Options
Same as Audio converter, starting on MP3.

## How it works
The AAC sound inside the M4A is decoded and encoded as a 320 kbps MP3 with the LAME-based encoder. Mono voice memos stay mono.

## Limits
- AAC to MP3 is lossy to lossy, so a little detail goes.
- The MP3 is often bigger than the M4A, because it's saved at 320 kbps.

## How to test
`mod.default.defaults({ from: 'M4A', options: { to: 'mp3' } })` returns `{ to: 'mp3' }`. Make an M4A with Extract audio (`{ to: 'm4a' }`), then `process([m4a], {}, { preset })` gives `audio/mpeg` with the same channels and about the same length, and `decodeAudioData` plays it.
