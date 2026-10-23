# Extract audio

Save the sound from a video as an MP3, WAV or M4A file.

- Opens at: `/extract-audio`
- Code: `public/assets/js/tools/media/audio.js` with preset `{ source: 'video' }` (the same module as [Audio converter](audio-converter.md); shared helpers in `media/_media.js`)
- Runs on: your device (nothing uploaded)
- Libraries: Mediabunny 1.61.6 (MPL-2.0). For MP3, @mediabunny/mp3-encoder 1.61.6 (MPL-2.0, based on the LAME encoder), loaded only when the browser can't make MP3 itself. Both loaded through `core/vendor.js`.

## How to use
1. Add one or more videos: MP4, MOV, WebM or MKV.
2. Pick MP3, WAV or M4A.
3. Select **Extract audio** and download each file, or all of them as a zip.

## Options
- Save as: MP3 (default), WAV or M4A.

## How it works
Mediabunny's `Conversion` drops the video track and keeps the sound, at its original sample rate and channels.
- M4A: AAC sound. If the video's sound is already AAC (most MP4 and MOV files), it's copied with no loss. Otherwise it's encoded at 192 kbps.
- MP3: encoded at 320 kbps. Browsers can't make MP3 on their own, so `enableMp3Encoding()` adds the LAME-based encoder first.
- WAV: uncompressed 16-bit PCM.

## Limits
- MP3 is lossy, so a little detail goes each time you convert. If you'll edit the sound, pick WAV.
- MP3 files can be a few hundredths of a second longer than the video, because MP3 encoders pad the sound.
- WAV files are big: about 10 MB a minute for stereo at 44.1 kHz.
- A video with no sound shows "This file doesn't have the video or sound this tool needs."
- If the browser can't read the sound, we say so and suggest another browser.

## How to test
With `preset = { source: 'video' }` and the `mp4({ seconds: 4, width: 640, height: 360 })` fixture: `mod.default.process([clip], { to: 'mp3' }, { preset })` gives `audio/mpeg` with no video track, 2 channels at 48 kHz, about 4.06 s (`mediaInfo()`), and `decodeAudioData` plays it. `{ to: 'wav' }` gives `pcm-s16`, about 4.01 s. `{ to: 'm4a' }` gives `audio/mp4` with AAC, copied in well under a second. A muted video throws the "doesn't have the video or sound" error. Two files in give two items back.
