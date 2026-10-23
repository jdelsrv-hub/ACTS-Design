# Audio to text

Turn speech in an audio or video file into a transcript and .srt captions.

- Opens at: `/audio-to-text`
- Code: `public/assets/js/tools/ai-device/audio-to-text.js` (shared: `_vendor.js`, `_model.js`)
- Runs on: your device, with an AI model downloaded the first time (nothing uploaded)
- Libraries: Transformers.js 4.3.1 (Apache-2.0) with its ONNX Runtime Web 1.31.0-dev.20260914 CPU build (MIT); Mediabunny 1.61.6 (MPL-2.0, from `core/vendor.js`) to read the sound. All from jsDelivr.
- Model: OpenAI Whisper base (multilingual), `Xenova/whisper-base` @ `64da572`, Apache-2.0, 8-bit: 23 MB encoder plus 54 MB decoder plus 3 MB of word lists. About 85 MB the first time, including the AI engine. The browser keeps it ("transformers-cache").

## Why this model
- Whisper tiny is half the size (44 MB), but on a 60-second TED sample it got words wrong in most sentences ("spread the work out of the like this"). Base got them right.
- Base still runs on phones: it needs no GPU and runs on the CPU (WebAssembly).
- Whisper small and up are 250 MB to 1.5 GB: too big for a free web tool.

## How to use
1. Add one audio or video file (MP3, M4A, WAV, OGG, FLAC, MP4, MOV, WebM, MKV).
2. Pick the language spoken (English to start).
3. Select **Transcribe**. Copy the transcript, download it as .txt, or download the .srt captions.

## Options
- Language spoken: 27 languages. Whisper can't reliably guess the language in the browser, so people pick it.

## How it works
1. Mediabunny reads the file's sound track bit by bit (big videos never need to fit in memory), mixes it to mono and the browser resamples it to 16 kHz. Browsers without WebCodecs use the Web Audio decoder instead.
2. Silent files stop here with a clear message, because Whisper makes up a word or two when it hears nothing.
3. Whisper hears 30-second parts that overlap by 5 seconds on each side, and gives each phrase a start and end time. Progress shows "part 2 of 12".
4. The .txt joins the phrases into paragraphs (a new one after a 2-second pause, or at a sentence end once a paragraph is long). The .srt splits long phrases into captions of up to 84 characters, timed by length.

The model runs in a background worker (ONNX Runtime's proxy mode), so the page stays responsive. Cancel returns straight away; the work stops once its current 30-second part is done.

## Limits
- Speed: about half the length of the recording on a laptop, slower on a phone (measured 30 to 35 seconds for 60 seconds of speech on a busy test machine). It uses one CPU core because the site isn't cross-origin isolated.
- Long recordings use a lot of memory (about 400 MB for an hour). On a phone, keep it under about 30 minutes.
- No speaker names, and no punctuation fixes beyond what Whisper writes.
- Music, noise and crosstalk lower accuracy and can produce made-up words.
- Languages other than English are less accurate with this small model.
- Captions are timed per phrase, not per word.

## How to test
Use the public sample `https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav` (11 seconds):

```js
const mod = await import('/public/assets/js/tools/ai-device/audio-to-text.js');
const file = new File([await (await fetch(url)).blob()], 'jfk.wav', { type: 'audio/wav' });
const r = await mod.default.process([file], { lang: 'en' });
```

- `r.items[0]` is `jfk.srt` (a Blob): numbered captions like `00:00:00,000 --> 00:00:05,867`, times going up, last end at or before 00:00:11,000.
- `r.items[1]` is `{ name: 'jfk.txt', text }`: "And so my fellow Americans ask not what your country can do for you, ask what you can do for your country."
- `r.summary` is "Transcribed 0:11 of audio."
- For several parts, use `ted_60_16k.wav` from the same folder (60 seconds, 3 parts): about 20 captions, every end after its start and none past 1:00.
- A video works too: put the jfk sound into an MP4 with Mediabunny (`AudioBufferSource` with codec `aac`) and you get the same text.

Named exports: `decodeAudio(file)` (Float32Array, 16 kHz mono), `transcribe(audio, { lang })` (`[{ start, end, text }]`), `toText(segments)`, `toCaptions(segments)`, `toSrt(segments)`, `audioToText(file, { lang })` (`{ text, srt, segments, duration }`).
