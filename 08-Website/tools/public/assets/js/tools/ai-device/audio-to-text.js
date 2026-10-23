// Audio to text with OpenAI's Whisper (base) running in the browser through Transformers.js.
// One module powers audio-to-text, video-to-text and transcribe-podcast (preset.source only changes the wording).
// Named exports for tests: decodeAudio(file) -> Float32Array (16 kHz mono), transcribe(audio, { lang }) -> segments,
// toText(segments), toCaptions(segments), toSrt(segments), audioToText(file, { lang }) -> { text, srt, segments, duration }.
import { fileTool } from '../../core/filetool.js';
import { getMediabunny } from '../../core/vendor.js';
import { baseName } from '../../core/files.js';
import { MODELS, DOWNLOAD_MB, getTransformers } from './_vendor.js';
import { isModelCached, modelNotice, downloadProgress } from './_model.js';

const MODEL = MODELS.whisper;
const RATE = 16000; // Whisper listens at 16 kHz
const WINDOW = 30; // seconds of audio Whisper hears at once
const STRIDE = 5; // seconds of overlap on each side, so words at the joins aren't lost
export const ACCEPT = 'audio/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.oga,.opus,.flac,.mp4,.m4v,.mov,.webm,.mkv';
const CANT_READ = "We couldn't read the sound in this file. It may be damaged, or in a format your browser can't open. Try turning it into an MP3 with our Audio converter, then try again.";

// Whisper language codes. Whisper can't reliably guess the language, so people pick it.
export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'nl', label: 'Dutch' },
  { value: 'sv', label: 'Swedish' },
  { value: 'da', label: 'Danish' },
  { value: 'no', label: 'Norwegian' },
  { value: 'fi', label: 'Finnish' },
  { value: 'pl', label: 'Polish' },
  { value: 'tr', label: 'Turkish' },
  { value: 'el', label: 'Greek' },
  { value: 'ru', label: 'Russian' },
  { value: 'uk', label: 'Ukrainian' },
  { value: 'ar', label: 'Arabic' },
  { value: 'he', label: 'Hebrew' },
  { value: 'hi', label: 'Hindi' },
  { value: 'th', label: 'Thai' },
  { value: 'vi', label: 'Vietnamese' },
  { value: 'id', label: 'Indonesian' },
  { value: 'ms', label: 'Malay' },
  { value: 'tl', label: 'Tagalog (Filipino)' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
];

// ---------- Reading the sound ----------

/** Average the channels into one. */
function mixDown(buffer) {
  const out = buffer.getChannelData(0).slice();
  const n = buffer.numberOfChannels;
  for (let c = 1; c < n; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < out.length; i++) out[i] += d[i];
  }
  if (n > 1) for (let i = 0; i < out.length; i++) out[i] /= n;
  return out;
}

function concat(parts) {
  const out = new Float32Array(parts.reduce((s, p) => s + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** Resample mono audio to 16 kHz with the browser's own (good quality) resampler. */
async function resample(samples, fromRate) {
  if (fromRate === RATE || !samples.length) return samples;
  const ctx = new OfflineAudioContext(1, Math.max(1, Math.round((samples.length * RATE) / fromRate)), RATE);
  const buf = ctx.createBuffer(1, samples.length, fromRate);
  buf.copyToChannel(samples, 0);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start();
  return (await ctx.startRendering()).getChannelData(0);
}

/** Mediabunny reads audio and video files bit by bit, so big videos don't need to fit in memory. null = can't. */
async function decodeWithMediabunny(file, ctx) {
  const MB = await getMediabunny();
  const input = new MB.Input({ source: new MB.BlobSource(file), formats: MB.ALL_FORMATS });
  try {
    if (!(await input.canRead())) return null;
    const track = await input.getPrimaryAudioTrack();
    if (!track) throw new Error("We couldn't find any sound in this file.");
    if (!(await track.canDecode())) return null;
    const duration = (await input.computeDuration()) || 1;
    const parts = [];
    let pending = [];
    let pendingLength = 0;
    let rate = track.sampleRate;
    const flush = async () => {
      if (pending.length) parts.push(await resample(concat(pending), rate));
      pending = [];
      pendingLength = 0;
    };
    for await (const { buffer, timestamp } of new MB.AudioBufferSink(track).buffers()) {
      if (buffer.sampleRate !== rate) {
        await flush();
        rate = buffer.sampleRate;
      }
      pending.push(mixDown(buffer));
      pendingLength += buffer.length;
      if (pendingLength >= rate * WINDOW) {
        await flush();
        ctx.progress?.(Math.min(1, timestamp / duration), 'Reading the sound');
        await ctx.tick?.();
      }
    }
    await flush();
    return concat(parts);
  } finally {
    input.dispose();
  }
}

/** Fallback for browsers without WebCodecs: the Web Audio decoder (reads the whole file at once). */
async function decodeWithWebAudio(file) {
  try {
    const ctx = new OfflineAudioContext(1, 1, RATE);
    return mixDown(await ctx.decodeAudioData(await file.arrayBuffer()));
  } catch {
    throw new Error(CANT_READ);
  }
}

/** The sound in an audio or video file as 16 kHz mono samples, the way Whisper wants it. */
export async function decodeAudio(file, ctx = {}) {
  ctx.progress?.(0, 'Reading the sound');
  let audio = null;
  try {
    audio = await decodeWithMediabunny(file, ctx);
  } catch (err) {
    if (err?.name === 'AbortError' || /^We /.test(err?.message || '')) throw err;
  }
  audio ||= await decodeWithWebAudio(file);
  if (audio.length < RATE / 4) throw new Error('This recording is too short to transcribe.');
  // Whisper makes up a word or two when it hears nothing, so catch silent files here.
  let peak = 0;
  for (let i = 0; i < audio.length; i++) peak = Math.max(peak, Math.abs(audio[i]));
  if (peak < 0.003) throw new Error("This recording seems to be silent, so there's nothing to transcribe.");
  return audio;
}

// ---------- Transcribing ----------

let asrReady;
function loadPipeline(ctx = {}) {
  asrReady ||= getTransformers()
    .then((T) => T.pipeline('automatic-speech-recognition', MODEL.id, {
      revision: MODEL.revision,
      dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' },
      device: 'wasm',
      progress_callback: ctx.progress ? downloadProgress(ctx, MODEL.bytes) : null,
    }))
    .catch((err) => {
      asrReady = null;
      throw err;
    });
  return asrReady;
}

let previous = Promise.resolve(); // runs take turns, so a cancelled run can finish its current part first

/** Transcribe 16 kHz mono samples. Returns [{ start, end, text }] with times in seconds. */
export async function transcribe(audio, { lang = 'en' } = {}, ctx = {}) {
  const progress = ctx.progress || (() => {});
  progress(0, 'Starting the AI model');
  const asr = await loadPipeline(ctx);
  await previous;
  ctx.throwIfAborted?.();
  const duration = audio.length / RATE;
  // Count the 30-second windows the pipeline will hear (they overlap by 5 seconds each side).
  const parts = duration <= WINDOW ? 1 : 1 + Math.ceil((duration - WINDOW) / (WINDOW - 2 * STRIDE));
  let done = 0;
  progress(0, 'Getting the audio ready');
  // Wrap generate() for this run: progress before each window, and a Cancel check between windows.
  const { model } = asr;
  const generate = model.generate;
  model.generate = async (...args) => {
    ctx.throwIfAborted?.();
    progress(done / parts, `Writing the transcript (part ${done + 1} of ${parts})`);
    const out = await generate.apply(model, args);
    done++;
    return out;
  };
  const run = asr(audio, { language: lang, task: 'transcribe', return_timestamps: true, chunk_length_s: WINDOW, stride_length_s: STRIDE })
    .finally(() => delete model.generate);
  previous = run.catch(() => {});
  // Cancel: stop waiting straight away. The run itself stops once its current 30-second part is done.
  const cancelled = new Promise((_, reject) => {
    ctx.signal?.addEventListener('abort', () => reject(Object.assign(new Error('Cancelled'), { name: 'AbortError' })), { once: true });
  });
  cancelled.catch(() => {});
  const result = await Promise.race([run, cancelled]);
  const segments = [];
  for (const c of result.chunks || []) {
    const text = c.text.trim();
    if (!text) continue;
    const start = c.timestamp?.[0] ?? segments.at(-1)?.end ?? 0;
    // At least half a second on screen, but never past the end of the recording.
    const end = Math.max(start, Math.min(duration, Math.max(c.timestamp?.[1] ?? start + 5, start + 0.5)));
    segments.push({ start, end, text });
  }
  return segments;
}

// ---------- Output ----------

const pad = (n, w = 2) => String(n).padStart(w, '0');
function srtTime(seconds) {
  const ms = Math.max(0, Math.round(seconds * 1000));
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
}

/** Captions people can read: long segments split at word breaks into pieces of up to `max` characters, timed by length. */
export function toCaptions(segments, max = 84) {
  return segments.flatMap((s) => {
    if (s.text.length <= max) return [s];
    const target = s.text.length / Math.ceil(s.text.length / max);
    const pieces = [];
    let cur = '';
    for (const word of s.text.split(/\s+/)) {
      if (cur && (cur.length >= target || cur.length + 1 + word.length > max)) {
        pieces.push(cur);
        cur = word;
      } else cur = cur ? `${cur} ${word}` : word;
    }
    if (cur) pieces.push(cur);
    const perChar = (s.end - s.start) / pieces.reduce((n, p) => n + p.length, 0);
    let t = s.start;
    return pieces.map((text, i) => {
      const end = i === pieces.length - 1 ? s.end : t + text.length * perChar;
      const caption = { start: t, end, text };
      t = end;
      return caption;
    });
  });
}

/** SubRip captions: number, "00:00:01,000 --> 00:00:04,500", text, blank line. */
export function toSrt(segments) {
  return toCaptions(segments).map((s, i) => `${i + 1}\n${srtTime(s.start)} --> ${srtTime(s.end)}\n${s.text}\n`).join('\n');
}

/** Plain transcript. A new paragraph after a pause, or at the end of a sentence once a paragraph gets long. */
export function toText(segments) {
  let text = '';
  let para = 0;
  segments.forEach((s, i) => {
    const prev = segments[i - 1];
    const breakHere = prev && (s.start - prev.end >= 2 || (para > 600 && /[.?!]["']?$/.test(prev.text)));
    if (prev) text += breakHere ? '\n\n' : ' ';
    if (breakHere) para = 0;
    text += s.text;
    para += s.text.length;
  });
  return text;
}

const clock = (seconds) => {
  const s = Math.round(seconds);
  return s >= 3600 ? `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}` : `${Math.floor(s / 60)}:${pad(s % 60)}`;
};

/** The whole job: file in, transcript and captions out. */
export async function audioToText(file, options = {}, ctx = {}) {
  const audio = await decodeAudio(file, ctx);
  const segments = await transcribe(audio, options, ctx);
  if (!segments.length) throw new Error("We couldn't hear any speech in this file. Check it has talking in it and the right language is picked.");
  return { text: toText(segments), srt: toSrt(segments), segments, duration: audio.length / RATE };
}

const downloadNotice = () => modelNotice(
  `The first time, we download the speech-to-text AI model (about ${DOWNLOAD_MB.whisper} MB, so Wi-Fi is best). After that your browser keeps it.`,
  { cached: isModelCached(MODEL) },
);

const WORDING = {
  video: { dropTitle: 'Drop your video here', dropHint: 'MP4, MOV, WebM or MKV. We only use the sound.' },
  podcast: { dropTitle: 'Drop your podcast episode here', dropHint: 'MP3, M4A, WAV or a video file.' },
  default: { dropTitle: 'Drop an audio or video file', dropHint: 'MP3, M4A, WAV, MP4, MOV and more.' },
};

export default fileTool((preset) => ({
  ...(WORDING[preset.source] || WORDING.default),
  accept: ACCEPT,
  action: 'Transcribe',
  actionIcon: 'captions',
  workingLabel: 'Transcribing',
  workingNote: 'This usually takes about half as long as the recording on a computer, and longer on a phone. Keep this tab open until it finishes.',
  resultTitle: () => 'Your transcript is ready',
  options: [{ id: 'lang', type: 'select', label: 'Language spoken', default: 'en', choices: LANGUAGES }],
  renderEmpty: (view) => view.append(downloadNotice()),
  renderExtra: (extra) => extra.append(downloadNotice()),
  async process([file], options, ctx) {
    const { text, srt, duration } = await audioToText(file, options, ctx);
    const name = baseName(file.name);
    const count = srt.split('\n\n').length;
    return {
      items: [
        { name: `${name}.srt`, blob: new Blob([srt], { type: 'application/x-subrip' }), note: `${count} caption${count === 1 ? '' : 's'}` },
        { name: `${name}.txt`, label: 'Transcript', text },
      ],
      summary: `Transcribed ${clock(duration)} of audio.`,
    };
  },
}));
