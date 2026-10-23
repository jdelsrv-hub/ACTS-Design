# Transcribe podcast

Turn a podcast episode into a written transcript you can edit and share.

- Opens at: `/transcribe-podcast`
- Code: `public/assets/js/tools/ai-device/audio-to-text.js` with preset `{ source: 'podcast' }` (see [Audio to text](audio-to-text.md))
- Runs on: your device, with an AI model downloaded the first time (nothing uploaded)
- Libraries and model: same as Audio to text (Whisper base, Apache-2.0, about 85 MB the first time; Transformers.js 4.3.1; Mediabunny 1.61.6)

## How to use
1. Add the episode (MP3, M4A, WAV or a video file).
2. Pick the language spoken.
3. Select **Transcribe** and keep the tab open. Copy the transcript, or download the .txt and .srt.

## Options
Same as Audio to text. The preset only changes the wording on the drop box.

## How it works
Whisper writes the episode in 30-second parts and shows "part 3 of 90" as it goes. The .txt starts a new paragraph after pauses and long stretches, so it's easy to edit into show notes.

## Limits
- A one-hour episode takes about 30 minutes on a laptop, longer on a phone, and uses about 400 MB of memory. On a phone, keep episodes under about 30 minutes.
- No speaker names: guests and hosts run together in one transcript.
- Intro music and crosstalk lower accuracy.

## How to test
Same as Audio to text: the public `ted_60_16k.wav` sample (60 seconds) shows "part 1 of 3" to "part 3 of 3", then gives a transcript with at least one paragraph break and a .srt of about 20 captions whose times go up and stop at 1:00.
