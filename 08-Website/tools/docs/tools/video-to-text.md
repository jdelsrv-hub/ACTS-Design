# Video to text

Get a written transcript and .srt captions from the speech in a video.

- Opens at: `/video-to-text`
- Code: `public/assets/js/tools/ai-device/audio-to-text.js` with preset `{ source: 'video' }` (see [Audio to text](audio-to-text.md))
- Runs on: your device, with an AI model downloaded the first time (nothing uploaded)
- Libraries and model: same as Audio to text (Whisper base, Apache-2.0, about 85 MB the first time; Transformers.js 4.3.1; Mediabunny 1.61.6)

## How to use
1. Add a video (MP4, MOV, WebM or MKV). Audio files work too.
2. Pick the language spoken.
3. Select **Transcribe**, then copy the transcript or download the .txt and .srt.

## Options
Same as Audio to text. The preset only changes the wording on the drop box.

## How it works
We read only the sound track of the video, bit by bit, so big videos don't need to fit in memory. Whisper then writes the transcript in 30-second parts, with times for the captions.

## Limits
- Same as Audio to text: about half the video's length on a laptop, slower on phones, and less accurate with music or noise.
- Videos with no sound track, or a sound format the browser can't decode, give a clear message.

## How to test
Make an 11-second MP4 in the page with Mediabunny: a `CanvasSource` (codec `avc`) for the picture and an `AudioBufferSource` (codec `aac`) holding the public `jfk.wav` sample resampled to 48 kHz. `mod.default.process([mp4], { lang: 'en' }, { preset: { source: 'video' } })` gives `speech-video.srt` (2 captions) and a transcript reading "And so my fellow Americans ask not what your country can do for you, ask what you can do for your country."
