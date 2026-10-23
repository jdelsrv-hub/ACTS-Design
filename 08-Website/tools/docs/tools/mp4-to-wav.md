# MP4 to WAV

Save the sound from an MP4 video as a WAV file, ready for editing.

- Opens at: `/mp4-to-wav`
- Code: `public/assets/js/tools/media/audio.js` with preset `{ source: 'video', from: 'MP4', options: { to: 'wav' } }` (see [Extract audio](extract-audio.md))
- Runs on: your device (nothing uploaded)
- Libraries: Mediabunny 1.61.6 (MPL-2.0), loaded through `core/vendor.js`

## How to use
1. Add one or more MP4 videos.
2. Select **Extract audio** and download each WAV, or all of them as a zip.

## Options
Same as Extract audio, starting on WAV.

## How it works
The video track is dropped and the sound is decoded to uncompressed 16-bit PCM, at its original sample rate and channels.

## Limits
- WAV doesn't bring back detail the MP4's compressed sound already lost.
- WAV files are big: about 10 MB a minute for stereo at 44.1 kHz.
- A video with no sound shows an error.

## How to test
`mod.default.defaults(preset)` returns `{ to: 'wav' }`. `process([mp4()], {}, { preset })` gives `audio/wav` that `mediaInfo()` reads as WAVE with `pcm-s16`, 2 channels at 48 kHz and the fixture's length.
