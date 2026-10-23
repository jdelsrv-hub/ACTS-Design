# OGG to MP3

Turn OGG audio into MP3 files that play on any device.

- Opens at: `/ogg-to-mp3`
- Code: `public/assets/js/tools/media/audio.js` with preset `{ from: 'OGG', options: { to: 'mp3' } }` (see [Audio converter](audio-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: Mediabunny 1.61.6 (MPL-2.0) and @mediabunny/mp3-encoder 1.61.6 (MPL-2.0, based on the LAME encoder), loaded through `core/vendor.js`

## How to use
1. Add one or more OGG files (Opus or Vorbis sound).
2. Select **Convert audio** and download each MP3, or all of them as a zip.

## Options
Same as Audio converter, starting on MP3.

## How it works
The Opus or Vorbis sound is decoded and encoded as a 320 kbps MP3 with the LAME-based encoder, keeping the channels.

## Limits
- Lossy to lossy, so a little detail goes.
- The MP3 is usually bigger than the OGG, because it's saved at 320 kbps.
- The browser has to be able to decode the sound inside the OGG. If it can't, we say so.

## How to test
`mod.default.defaults({ from: 'OGG', options: { to: 'mp3' } })` returns `{ to: 'mp3' }`. Make an OGG with `process([wav()], { to: 'ogg' })`, then `process([ogg], {}, { preset })` gives `audio/mpeg`, mono at 48 kHz and about the same length, and `decodeAudioData` plays it.
