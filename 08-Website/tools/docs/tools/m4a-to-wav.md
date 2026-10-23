# M4A to WAV

Turn M4A audio into WAV files, ready for editing.

- Opens at: `/m4a-to-wav`
- Code: `public/assets/js/tools/media/audio.js` with preset `{ from: 'M4A', options: { to: 'wav' } }` (see [Audio converter](audio-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: Mediabunny 1.61.6 (MPL-2.0), loaded through `core/vendor.js`

## How to use
1. Add one or more M4A files.
2. Select **Convert audio** and download each WAV, or all of them as a zip.

## Options
Same as Audio converter, starting on WAV.

## How it works
The AAC sound is decoded to uncompressed 16-bit PCM, keeping the sample rate and channels.

## Limits
- WAV doesn't bring back detail the M4A already lost.
- WAV files are big: about 10 MB a minute for stereo at 44.1 kHz.

## How to test
`mod.default.defaults({ from: 'M4A', options: { to: 'wav' } })` returns `{ to: 'wav' }`. Make an M4A with Extract audio (`{ to: 'm4a' }`), then `process([m4a], {}, { preset })` gives `audio/wav` that `mediaInfo()` reads as WAVE with `pcm-s16`, the same channels and sample rate, and about the same length.
