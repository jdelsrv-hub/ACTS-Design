// Function tests for the on-device AI family. One entry per slug: async (mod, fx, t) => { ...checks }.
// mod: the tool's module · fx: test files (fixtures.js) · t: checks and readers (check.js)
// plus t.process(files, options) with the entry's preset applied.
//
// These tools download their AI models the first time (about 15 MB for backgrounds, 4 MB for OCR, 85 MB for
// Whisper), so run.js gives runsOn: 'model' tools a longer limit. Inputs are drawn in the page, except the
// speech: the public 11-second jfk.wav from the Transformers.js docs dataset on Hugging Face (JFK_URL).
import { getMediabunny } from '../../public/assets/js/core/vendor.js';
import { assert, eq, near, mediaInfo } from '../check.js';

const JFK_URL = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav';
const JFK_TEXT = 'And so my fellow Americans ask not what your country can do for you, ask what you can do for your country.';
const JFK_KEY = 'ask not what your country can do for you';
const OCR_LINES = ['Creators make great content', 'The quick brown fox jumps over the lazy dog.'];

const made = new Map();
function make(name, fn) {
  if (!made.has(name)) {
    made.set(name, fn().catch((err) => {
      made.delete(name);
      throw new Error(`Couldn't make the ${name} test file (a test problem, not the tool): ${err.message}`);
    }));
  }
  return made.get(name);
}

function one(out) {
  eq(out.items.length, 1, 'number of files');
  return out.items[0];
}

// ---------- Images ----------

async function pngFile(canvas, name) {
  return new File([await canvas.convertToBlob({ type: 'image/png' })], name, { type: 'image/png' });
}

const GREY = [212, 212, 212];
const RED = [224, 36, 36];
const BLUE = [30, 91, 216];
const hex = (rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

/** A red circle (radius 110) in the middle of a plain light-grey 600 x 400 PNG. */
const circle = () => make('circle.png', async () => {
  const c = new OffscreenCanvas(600, 400);
  const g = c.getContext('2d');
  g.fillStyle = hex(GREY);
  g.fillRect(0, 0, 600, 400);
  g.fillStyle = hex(RED);
  g.beginPath();
  g.arc(300, 200, 110, 0, Math.PI * 2);
  g.fill();
  return pngFile(c, 'circle.png');
});

/** A blue square on a cream 480 x 360 JPG, so the second file is a different type, size and shape. */
const square = () => make('square.jpg', async () => {
  const c = new OffscreenCanvas(480, 360);
  const g = c.getContext('2d');
  g.fillStyle = '#f0ebe0';
  g.fillRect(0, 0, 480, 360);
  g.fillStyle = hex(BLUE);
  g.fillRect(160, 100, 160, 160);
  return new File([await c.convertToBlob({ type: 'image/jpeg', quality: 0.95 })], 'square.jpg', { type: 'image/jpeg' });
});

/** Two lines of 44 px Arial on white, for OCR. */
const textImage = () => make('words.png', async () => {
  const c = new OffscreenCanvas(900, 300);
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 900, 300);
  g.fillStyle = '#111';
  g.font = '44px Arial, Helvetica, sans-serif';
  g.fillText(OCR_LINES[0], 40, 115);
  g.fillText(OCR_LINES[1], 40, 205);
  return pngFile(c, 'words.png');
});

const blankImage = () => make('blank.png', async () => {
  const c = new OffscreenCanvas(600, 300);
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 600, 300);
  return pngFile(c, 'blank.png');
});

/** { width, height, type, block(x, y, size) -> { rgb: [r, g, b] mean, minA, maxA } } */
async function pixels(blob) {
  const bmp = await createImageBitmap(blob, { premultiplyAlpha: 'none' });
  const g = new OffscreenCanvas(bmp.width, bmp.height).getContext('2d');
  g.drawImage(bmp, 0, 0);
  const d = g.getImageData(0, 0, bmp.width, bmp.height);
  bmp.close();
  return {
    width: d.width,
    height: d.height,
    block(x0, y0, size = 8) {
      const sum = [0, 0, 0];
      let minA = 255;
      let maxA = 0;
      for (let y = y0; y < y0 + size; y++) {
        for (let x = x0; x < x0 + size; x++) {
          const k = (y * d.width + x) * 4;
          for (let c = 0; c < 3; c++) sum[c] += d.data[k + c];
          minA = Math.min(minA, d.data[k + 3]);
          maxA = Math.max(maxA, d.data[k + 3]);
        }
      }
      return { rgb: sum.map((v) => Math.round(v / size / size)), minA, maxA };
    },
  };
}

const corners = (w, h) => [[2, 2], [w - 10, 2], [2, h - 10], [w - 10, h - 10]];

function nearColour(rgb, want, label, tol = 30) {
  assert(rgb.every((v, i) => Math.abs(v - want[i]) <= tol), `${label}: expected about rgb(${want.join(', ')}), got rgb(${rgb.join(', ')})`);
}

/** The result is a PNG of the same size: see-through corners, an opaque centre in the subject's colour. */
async function checkCutout(item, { name, size, centre, colour }, t) {
  t.eq(item.name, name, 'file name');
  const info = await t.imageInfo(item.blob);
  t.eq([info.type, info.width, info.height, info.alpha], ['png', ...size, true], `${name}: type, size, has see-through pixels`);
  const p = await pixels(item.blob);
  for (const [x, y] of corners(...size)) {
    const b = p.block(x, y);
    t.assert(b.maxA <= 8, `${name}: corner at ${x}, ${y} should be see-through, but alpha goes up to ${b.maxA}`);
  }
  const mid = p.block(centre[0] - 4, centre[1] - 4);
  t.assert(mid.minA >= 250, `${name}: centre should be opaque, but alpha goes down to ${mid.minA}`);
  nearColour(mid.rgb, colour, `${name}: centre colour`);
}

/** The result is a JPG of the same size with this colour in every corner and a red centre. */
async function checkFilled(item, { name, corner }, t) {
  t.eq(item.name, name, 'file name');
  const info = await t.imageInfo(item.blob);
  t.eq([info.type, info.width, info.height, info.alpha], ['jpg', 600, 400, false], `${name}: type, size, no see-through pixels`);
  const p = await pixels(item.blob);
  for (const [x, y] of corners(600, 400)) nearColour(p.block(x, y).rgb, corner, `${name}: corner at ${x}, ${y}`, 12);
  nearColour(p.block(296, 196).rgb, RED, `${name}: centre`);
}

/** Standard deviation of brightness in a rectangle of a canvas. */
function spread(canvas, x0, y0, w, h) {
  const d = canvas.getContext('2d').getImageData(x0, y0, w, h).data;
  let s = 0;
  let s2 = 0;
  const n = w * h;
  for (let i = 0; i < d.length; i += 4) {
    const v = (d[i] + d[i + 1] + d[i + 2]) / 3;
    s += v;
    s2 += v * v;
  }
  return Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2));
}

// ---------- Sound ----------

/** The public jfk.wav sample: 11 s of speech, 16 kHz mono. Downloaded once per run. */
const jfk = () => make('jfk.wav', async () => {
  const res = await fetch(JFK_URL);
  if (!res.ok) throw new Error(`downloading ${JFK_URL} gave HTTP ${res.status}`);
  return new File([await res.blob()], 'jfk.wav', { type: 'audio/wav' });
});

/** Decoded and resampled by the browser to this rate. */
async function decodeAt(file, rate) {
  return new OfflineAudioContext(1, 1, rate).decodeAudioData(await file.arrayBuffer());
}

/** 16-bit PCM mono WAV from samples in -1..1. */
function wavFile(samples, rate, name) {
  const v = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const str = (at, s) => [...s].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => v.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, s)) * 32767), true));
  return new File([v.buffer], name, { type: 'audio/wav' });
}

const silence = () => make('silence.wav', async () => wavFile(new Float32Array(16000 * 2), 16000, 'silence.wav'));

/** An "episode": the jfk speech three times with 4-second pauses (41 s, so Whisper hears it in 2 parts). */
const episode = () => make('episode.wav', async () => {
  const s = (await decodeAt(await jfk(), 16000)).getChannelData(0);
  const gap = new Float32Array(16000 * 4);
  const all = new Float32Array(s.length * 3 + gap.length * 2);
  [s, gap, s, gap, s].reduce((at, part) => {
    all.set(part, at);
    return at + part.length;
  }, 0);
  return wavFile(all, 16000, 'episode.wav');
});

/** An MP4 (H.264 picture at 5 fps, stereo AAC at 48 kHz) holding the jfk speech, or no sound at all. */
function video({ sound = true } = {}) {
  const name = sound ? 'speech-video.mp4' : 'no-sound.mp4';
  return make(name, async () => {
    const MB = await getMediabunny();
    const speech = sound ? await decodeAt(await jfk(), 48000) : null;
    const seconds = speech ? speech.duration : 2;
    const out = new MB.Output({ format: new MB.Mp4OutputFormat(), target: new MB.BufferTarget() });
    const canvas = new OffscreenCanvas(320, 240);
    const g = canvas.getContext('2d');
    const picture = new MB.CanvasSource(canvas, { codec: 'avc', bitrate: 3e5 });
    out.addVideoTrack(picture, { frameRate: 5 });
    let audio;
    if (speech) {
      audio = new MB.AudioBufferSource({ codec: 'aac', bitrate: 128e3 });
      out.addAudioTrack(audio);
    }
    await out.start();
    for (let i = 0; i < Math.ceil(seconds * 5); i++) {
      g.fillStyle = `hsl(${(i * 7) % 360} 50% 40%)`;
      g.fillRect(0, 0, 320, 240);
      g.fillStyle = '#fff';
      g.font = 'bold 32px sans-serif';
      g.fillText(`${(i / 5).toFixed(1)} s`, 20, 130);
      await picture.add(i / 5, 1 / 5);
    }
    if (speech) {
      const stereo = new AudioBuffer({ length: speech.length, numberOfChannels: 2, sampleRate: 48000 });
      stereo.copyToChannel(speech.getChannelData(0), 0);
      stereo.copyToChannel(speech.getChannelData(0), 1);
      await audio.add(stereo);
    }
    await out.finalize();
    const file = new File([out.target.buffer], name, { type: 'video/mp4' });
    const info = await mediaInfo(file);
    eq([!!info.video, !!info.audio], [true, sound], `${name}: has video, has sound`);
    return file;
  });
}

// ---------- Transcript checks ----------

/** SRT text -> [{ start, end, text }], checking the numbering and time format. */
function srtCues(srt) {
  const blocks = srt.replace(/\r/g, '').trim().split(/\n\n+/);
  const sec = (h, m, s, ms) => Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000;
  return blocks.map((b, i) => {
    const lines = b.split('\n');
    const m = /^(\d\d):(\d\d):(\d\d),(\d{3}) --> (\d\d):(\d\d):(\d\d),(\d{3})$/.exec(lines[1] || '');
    assert(lines[0] === String(i + 1) && m && lines.length >= 3, `caption ${i + 1} isn't valid SRT: ${JSON.stringify(b)}`);
    return { start: sec(...m.slice(1, 5)), end: sec(...m.slice(5, 9)), text: lines.slice(2).join(' ') };
  });
}

/** Times go up, every caption ends after it starts, and none runs past the recording. */
function checkCues(cues, duration, label) {
  assert(cues.length > 0, `${label}: no captions`);
  cues.forEach((c, i) => {
    assert(c.end > c.start, `${label} caption ${i + 1}: ends at ${c.end} s, not after its start at ${c.start} s`);
    if (i) assert(c.start >= cues[i - 1].start, `${label} caption ${i + 1}: starts at ${c.start} s, before caption ${i} (${cues[i - 1].start} s)`);
    assert(c.end <= duration + 0.001, `${label} caption ${i + 1}: ends at ${c.end} s, after the ${duration} s recording`);
  });
}

const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9']+/g, ' ').trim().split(/\s+/).filter(Boolean);

/** Word-level edit distance. */
function wordGap(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = row;
  }
  return prev[b.length];
}

function sameWords(actual, expected, label, allowed = 1) {
  const gap = wordGap(words(actual), words(expected));
  assert(gap <= allowed, `${label}: expected "${expected}", got "${actual}" (${gap} word${gap === 1 ? '' : 's'} differ)`);
}

/** The .srt and .txt pair every transcription returns, checked against the recording. */
async function checkTranscript(out, { base, duration, expected }, t) {
  t.eq(out.items.map((i) => i.name), [`${base}.srt`, `${base}.txt`], 'files');
  const [srtItem, txtItem] = out.items;
  t.assert(srtItem.blob instanceof Blob, `${base}.srt: no file`);
  const cues = srtCues(await srtItem.blob.text());
  checkCues(cues, duration, `${base}.srt`);
  t.eq(srtItem.note, `${cues.length} caption${cues.length === 1 ? '' : 's'}`, 'caption count note');
  t.assert(typeof txtItem.text === 'string' && txtItem.text.trim(), `${base}.txt: no text`);
  if (expected) sameWords(txtItem.text, expected, `${base}.txt`);
  sameWords(cues.map((c) => c.text).join(' '), txtItem.text, 'captions against the transcript', 0);
  return { cues, text: txtItem.text };
}

export default {
  // ---------- Backgrounds ----------

  async 'remove-background'(mod, fx, t) {
    t.eq(mod.default.defaults({}), { background: 'transparent', colour: '#FFFFFF', blur: 5 }, 'defaults');
    const out = await t.process([await circle(), await square()]);
    t.eq(out.items.length, 2, 'two photos in, two files out');
    await checkCutout(out.items[0], { name: 'circle-no-bg.png', size: [600, 400], centre: [300, 200], colour: RED }, t);
    await checkCutout(out.items[1], { name: 'square-no-bg.png', size: [480, 360], centre: [240, 180], colour: BLUE }, t);
  },

  async 'transparent-background'(mod, fx, t) {
    t.eq(mod.default.defaults(t.preset).background, 'transparent', 'preset starts on Transparent');
    const it = one(await t.process([await circle()]));
    await checkCutout(it, { name: 'circle-no-bg.png', size: [600, 400], centre: [300, 200], colour: RED }, t);
  },

  async 'change-background'(mod, fx, t) {
    t.eq(mod.default.defaults(t.preset), { background: 'colour', colour: '#FFFFFF', blur: 5 }, 'preset starts on Colour, white');
    await checkFilled(one(await t.process([await circle()])), { name: 'circle-new-bg.jpg', corner: [255, 255, 255] }, t);
    await checkFilled(one(await t.process([await circle()], { colour: '#2E7D32' })), { name: 'circle-new-bg.jpg', corner: [46, 125, 50] }, t);
  },

  async 'blur-background'(mod, fx, t) {
    t.eq(mod.default.defaults(t.preset), { background: 'blur', colour: '#FFFFFF', blur: 5 }, 'preset starts on Blur, strength 5');
    // Whole job: a plain grey background stays grey (blurred), the subject stays sharp red.
    await checkFilled(one(await t.process([await circle()], { blur: 5 })), { name: 'circle-blurred-bg.jpg', corner: GREY }, t);

    // Blur strength, through composite(): a 4 px checkerboard, with a mask that keeps a circle in the middle.
    const img = new OffscreenCanvas(300, 200);
    const g = img.getContext('2d');
    for (let y = 0; y < 200; y += 4) for (let x = 0; x < 300; x += 4) {
      g.fillStyle = (x + y) % 8 ? '#000' : '#fff';
      g.fillRect(x, y, 4, 4);
    }
    const mask = new OffscreenCanvas(300, 200);
    const m = mask.getContext('2d');
    m.fillStyle = '#000';
    m.beginPath();
    m.arc(150, 100, 60, 0, Math.PI * 2);
    m.fill();
    const before = spread(img, 10, 10, 60, 40);
    const soft = mod.composite(img, mask, { background: 'blur', blur: 1 });
    const hard = mod.composite(img, mask, { background: 'blur', blur: 10 });
    const [bgSoft, bgHard] = [spread(soft, 10, 10, 60, 40), spread(hard, 10, 10, 60, 40)];
    t.assert(bgHard < before * 0.25, `blur 10: background should be smoothed out, but its contrast went from ${before.toFixed(0)} to only ${bgHard.toFixed(0)}`);
    t.assert(bgHard < bgSoft, `blur 10 (${bgHard.toFixed(1)}) should smooth the background more than blur 1 (${bgSoft.toFixed(1)})`);
    const subject = spread(hard, 135, 85, 30, 30);
    t.assert(subject > before * 0.9, `blur 10: the subject should stay sharp, but its contrast fell from ${before.toFixed(0)} to ${subject.toFixed(0)}`);
  },

  // ---------- OCR ----------

  async 'image-to-text'(mod, fx, t) {
    t.eq(mod.default.defaults({}), { lang: 'eng' }, 'defaults');
    const it = one(await t.process([await textImage()], { lang: 'eng' }));
    t.eq(it.name, 'words.txt', 'file name');
    // Word for word, line by line. Punctuation is ignored: Tesseract can drop a lone full stop.
    t.eq(it.text.split('\n').map(words).filter((l) => l.length), OCR_LINES.map(words), `words read, line by line (text: ${JSON.stringify(it.text)})`);
    const err = await t.rejects(t.process([await blankImage()]), 'a blank white image');
    t.match(err.message, /couldn't find any text/i, 'error for an image with no text');
  },

  // ---------- Speech ----------

  async 'audio-to-text'(mod, fx, t) {
    t.eq(mod.default.defaults({}), { lang: 'en' }, 'defaults');
    const out = await t.process([await jfk()], { lang: 'en' });
    await checkTranscript(out, { base: 'jfk', duration: 11, expected: JFK_TEXT }, t);
    t.eq(out.summary, 'Transcribed 0:11 of audio.', 'summary');
    const err = await t.rejects(t.process([await silence()]), 'a silent recording');
    t.match(err.message, /seems to be silent/i, 'error for a silent recording');
  },

  async 'video-to-text'(mod, fx, t) {
    t.eq(mod.default.defaults(t.preset), { lang: 'en' }, 'preset defaults');
    const clip = await video();
    const { duration } = await t.mediaInfo(clip);
    const out = await t.process([clip], { lang: 'en' });
    await checkTranscript(out, { base: 'speech-video', duration, expected: JFK_TEXT }, t);
    t.eq(out.summary, 'Transcribed 0:11 of audio.', 'summary');
    const err = await t.rejects(t.process([await video({ sound: false })]), 'a video with no sound');
    t.match(err.message, /couldn't find any sound/i, 'error for a video with no sound');
  },

  async 'transcribe-podcast'(mod, fx, t) {
    t.eq(mod.default.defaults(t.preset), { lang: 'en' }, 'preset defaults');
    const file = await episode();
    const steps = new Set();
    const out = await mod.default.process([file], { lang: 'en' }, { preset: t.preset, tool: t.tool, progress: (_f, msg) => msg && steps.add(msg) });
    const parts = [...steps].filter((s) => /part \d+ of \d+/.test(s));
    t.eq(parts.map((s) => /part \d+ of \d+/.exec(s)[0]), ['part 1 of 2', 'part 2 of 2'], 'progress through the 30-second parts');
    const { text } = await checkTranscript(out, { base: 'episode', duration: 41 }, t);
    t.eq(out.summary, 'Transcribed 0:41 of audio.', 'summary');
    const said = words(text).join(' ');
    const hits = said.split(JFK_KEY).length - 1;
    t.eq(hits, 3, `times "${JFK_KEY}" was heard (said 3 times) in: ${text}`);
    near(words(text).length, words(JFK_TEXT).length * 3, 4, 'words in the transcript');
    t.assert(text.split('\n\n').length >= 2, `expected a paragraph break at the 4-second pauses, got one paragraph: ${text}`);
  },
};
