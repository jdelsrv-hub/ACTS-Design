# Audio converter

Convert audio between MP3, WAV, M4A and OGG. FLAC files open too.

- Opens at: `/audio-converter`
- Code: `public/assets/js/tools/media/audio.js` (also powers [Extract audio](extract-audio.md) and the "X to Y" pages listed below; shared helpers in `media/_media.js`)
- Runs on: your device (nothing uploaded)
- Libraries: Mediabunny 1.61.6 (MPL-2.0). For MP3, @mediabunny/mp3-encoder 1.61.6 (MPL-2.0, based on the LAME encoder), loaded only when the browser can't make MP3 itself. Both loaded through `core/vendor.js`.

## How to use
1. Add one or more audio files: MP3, WAV, M4A, AAC, OGG, Opus or FLAC.
2. Pick the format to save as.
3. Select **Convert audio** and download each file, or all of them as a zip.

## Options
- Save as: MP3 (default), WAV, M4A or OGG.

## How it works
Mediabunny's `Conversion` reads the file and writes the new format. When the new format can hold the sound as it is (MP3 to MP3, or AAC into M4A), it's copied with no loss. Otherwise it's decoded and encoded again, keeping the channels:
- MP3: 320 kbps, with the LAME-based encoder added by `enableMp3Encoding()`.
- M4A: AAC at 192 kbps.
- OGG: Opus at 128 kbps. Opus always runs at 48 kHz, so other sample rates are converted.
- WAV: uncompressed 16-bit PCM.

Preset pages: m4a-to-mp3, wav-to-mp3, ogg-to-mp3, aac-to-mp3, m4a-to-wav. Each one only changes the drop box title and the starting format.

## Limits
- FLAC opens, but there's no FLAC output: browsers can't encode it.
- No M4R (iPhone ringtone) output.
- MP3, M4A and OGG are lossy. Going from one lossy format to another loses a little more each time. Going to WAV doesn't bring back lost detail and makes the file much bigger.
- MP3s are saved at 320 kbps, so an MP3 can be bigger than the M4A or OGG it came from.
- MP3 files can be a few hundredths of a second longer than the original (encoder padding).
- Which formats open depends on the browser's decoders. If it can't read a file, we say so and suggest another browser.

## How to test
With the `wav({ seconds: 3 })` fixture (mono, 44.1 kHz) from `tests/fixtures.js`: `mod.default.process([wav], { to: 'mp3' })` gives `audio/mpeg`, mono at 44.1 kHz, about 3.03 s and about 121 KB (320 kbps). `{ to: 'ogg' }` gives Opus at 48 kHz, and `{ to: 'm4a' }` gives AAC. Each one plays with `decodeAudioData`. Feeding the MP3 back with `{ to: 'wav' }` gives `pcm-s16` at the same length, and `{ to: 'mp3' }` copies it at the same size.
