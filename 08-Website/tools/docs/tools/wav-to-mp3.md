# WAV to MP3

Turn big WAV files into much smaller MP3s.

- Opens at: `/wav-to-mp3`
- Code: `public/assets/js/tools/media/audio.js` with preset `{ from: 'WAV', options: { to: 'mp3' } }` (see [Audio converter](audio-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: Mediabunny 1.61.6 (MPL-2.0) and @mediabunny/mp3-encoder 1.61.6 (MPL-2.0, based on the LAME encoder), loaded through `core/vendor.js`

## How to use
1. Add one or more WAV files.
2. Select **Convert audio** and download each MP3, or all of them as a zip.

## Options
Same as Audio converter, starting on MP3.

## How it works
The PCM sound is encoded as a 320 kbps MP3 with the LAME-based encoder, keeping the sample rate and channels. A CD-quality stereo WAV comes out about a quarter of the size.

## Limits
- MP3 is lossy. Keep the WAV if you'll edit the sound again.
- Mono WAVs shrink less (about half the size), because the MP3 is still 320 kbps.
- The MP3 can be a few hundredths of a second longer (encoder padding).

## How to test
`mod.default.defaults({ from: 'WAV', options: { to: 'mp3' } })` returns `{ to: 'mp3' }`. `process([wav({ seconds: 3 })], {}, { preset })` gives `audio/mpeg`, mono at 44.1 kHz, about 3.03 s and about 121 KB, down from about 265 KB.
