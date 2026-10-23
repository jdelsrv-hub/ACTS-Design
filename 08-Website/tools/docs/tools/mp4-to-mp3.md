# MP4 to MP3

Save the sound from an MP4 video as an MP3.

- Opens at: `/mp4-to-mp3`
- Code: `public/assets/js/tools/media/audio.js` with preset `{ source: 'video', from: 'MP4', options: { to: 'mp3' } }` (see [Extract audio](extract-audio.md))
- Runs on: your device (nothing uploaded)
- Libraries: Mediabunny 1.61.6 (MPL-2.0) and @mediabunny/mp3-encoder 1.61.6 (MPL-2.0, based on the LAME encoder), loaded through `core/vendor.js`

## How to use
1. Add one or more MP4 videos.
2. Select **Extract audio** and download each MP3, or all of them as a zip.

## Options
Same as Extract audio, starting on MP3.

## How it works
The video track is dropped and the sound is decoded and encoded as a 320 kbps MP3 with the LAME-based encoder, because browsers can't make MP3 on their own.

## Limits
- MP3 is lossy. If you'll edit the sound, pick WAV instead.
- The MP3 can be a few hundredths of a second longer than the video (encoder padding).
- A video with no sound shows an error.

## How to test
`mod.default.defaults(preset)` returns `{ to: 'mp3' }`. `process([mp4()], {}, { preset })` gives `audio/mpeg` with one audio track, no video, about the fixture's length, and `decodeAudioData` plays it.
