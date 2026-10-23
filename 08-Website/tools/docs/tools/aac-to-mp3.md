# AAC to MP3

Turn AAC audio into MP3 files that play on any device.

- Opens at: `/aac-to-mp3`
- Code: `public/assets/js/tools/media/audio.js` with preset `{ from: 'AAC', options: { to: 'mp3' } }` (see [Audio converter](audio-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: Mediabunny 1.61.6 (MPL-2.0) and @mediabunny/mp3-encoder 1.61.6 (MPL-2.0, based on the LAME encoder), loaded through `core/vendor.js`

## How to use
1. Add one or more AAC files (`.aac`, or AAC inside `.m4a`).
2. Select **Convert audio** and download each MP3, or all of them as a zip.

## Options
Same as Audio converter, starting on MP3.

## How it works
The AAC sound is decoded and encoded as a 320 kbps MP3 with the LAME-based encoder, keeping the sample rate and channels.

## Limits
- Lossy to lossy, so a little detail goes.
- The MP3 is often bigger than the AAC file, because it's saved at 320 kbps.

## How to test
`mod.default.defaults({ from: 'AAC', options: { to: 'mp3' } })` returns `{ to: 'mp3' }`. Make a raw `.aac` file by converting the `wav({ seconds: 2 })` fixture with Mediabunny's `AdtsOutputFormat` and `audio: { codec: 'aac' }`. `process([aac], {}, { preset })` gives `audio/mpeg`, mono at 44.1 kHz, about 2.06 s long, and `decodeAudioData` plays it.
