// Function tests for the video and audio (media) family. One entry per slug: async (mod, fx, t) => { ...checks }.
// mod: the tool's module · fx: test files (fixtures.js) · t: checks and readers (check.js)
// plus t.process(files, options) with the entry's preset applied.
//
// Extra inputs (MOV, MKV, WebM, silent MP4, M4A, OGG, AAC, GIF, SRT) are made below in the page, with
// Mediabunny or gifenc directly, never with the tool under test, so one broken tool can't fail another's test.
// Candidates to promote to fixtures.js: movClip, mkvClip, webmClip, silentClip, m4a, ogg, aac, gif, SRT,
// and the readers gifInfo, videoFrames, decodes, playerDuration, ebmlDocType.
import { getMediabunny, getGifenc } from '../../public/assets/js/core/vendor.js';
import { sniffType } from '../../public/assets/js/core/files.js';
import { assert, eq, near, mediaInfo } from '../check.js';

// ---------- Extra inputs ----------

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

/** Re-save a file with Mediabunny's Conversion. formatClass: 'MovOutputFormat' etc. conv: Conversion options. */
async function remake(file, formatClass, conv, name, type) {
  const MB = await getMediabunny();
  const input = new MB.Input({ source: new MB.BlobSource(file), formats: MB.ALL_FORMATS });
  try {
    const output = new MB.Output({ format: new MB[formatClass](), target: new MB.BufferTarget() });
    const c = await MB.Conversion.init({ input, output, showWarnings: false, ...conv });
    if (!c.isValid) throw new Error(`Mediabunny can't make it (${c.discardedTracks.map((d) => d.reason).join(', ')})`);
    await c.execute();
    return new File([output.target.buffer], name, { type });
  } finally {
    input.dispose?.();
  }
}

async function checked(file, format, want = {}) {
  const i = await mediaInfo(file);
  eq(i.format, format, `${file.name} container`);
  if ('video' in want) eq(!!i.video, want.video, `${file.name} has video`);
  if ('audio' in want) eq(!!i.audio, want.audio, `${file.name} has sound`);
  return file;
}

const clip4 = (fx) => fx.mp4({ seconds: 4, width: 640, height: 360 });
// 2-second, 320 x 240 clips from fx.mp4() in other containers. MOV and MKV are straight copies (H.264 + AAC).
const movClip = (fx) => make('MOV', async () => checked(await remake(await fx.mp4(), 'MovOutputFormat', {}, 'clip.mov', 'video/quicktime'), 'QuickTime File Format', { video: true, audio: true }));
const mkvClip = (fx) => make('MKV', async () => checked(await remake(await fx.mp4(), 'MkvOutputFormat', {}, 'clip.mkv', 'video/x-matroska'), 'Matroska', { video: true, audio: true }));
const webmClip = (fx) => make('WebM', async () => checked(await remake(await fx.mp4(), 'WebMOutputFormat', {}, 'clip.webm', 'video/webm'), 'WebM', { video: true, audio: true }));
const silentClip = (fx) => make('silent MP4', async () => checked(await remake(await fx.mp4(), 'Mp4OutputFormat', { audio: { discard: true } }, 'silent.mp4', 'video/mp4'), 'MP4', { video: true, audio: false }));
// Audio only: AAC stereo 48 kHz in MP4 (like a voice memo), and the mono 44.1 kHz fx.wav() tone as Opus in Ogg and as raw ADTS AAC.
const m4a = (fx) => make('M4A', async () => checked(await remake(await fx.mp4(), 'Mp4OutputFormat', { video: { discard: true } }, 'memo.m4a', 'audio/mp4'), 'MP4', { video: false, audio: true }));
const ogg = (fx) => make('OGG', async () => checked(await remake(await fx.wav(), 'OggOutputFormat', { audio: { codec: 'opus' } }, 'tone.ogg', 'audio/ogg'), 'Ogg', { audio: true }));
const aac = (fx) => make('AAC', async () => checked(await remake(await fx.wav(), 'AdtsOutputFormat', { audio: { codec: 'aac' } }, 'tone.aac', 'audio/aac'), 'ADTS', { audio: true }));

/** Animated GIF made with gifenc: frame i is a solid hsl(i * 18) with a white square, shown for `delay` ms. */
function gif({ frames = 20, width = 200, height = 150, delay = 100 } = {}) {
  return make(`GIF ${frames} frames ${width}x${height} ${delay} ms`, async () => {
    const { GIFEncoder, quantize, applyPalette } = await getGifenc();
    const enc = GIFEncoder();
    const g = new OffscreenCanvas(width, height).getContext('2d', { willReadFrequently: true });
    for (let i = 0; i < frames; i++) {
      g.fillStyle = `hsl(${(i * 18) % 360} 70% 50%)`;
      g.fillRect(0, 0, width, height);
      g.fillStyle = '#fff';
      g.fillRect(width * 0.6, height * 0.6, width * 0.3, height * 0.3);
      const { data } = g.getImageData(0, 0, width, height);
      const palette = quantize(data, 256);
      enc.writeFrame(applyPalette(data, palette), width, height, { palette, delay });
    }
    enc.finish();
    const file = new File([enc.bytes()], 'loop.gif', { type: 'image/gif' });
    const info = await gifInfo(file);
    eq([info.frames, info.width, info.height], [frames, width, height], 'GIF fixture frames and size');
    return file;
  });
}

// Two cues with formatting tags; the 4-second clip has a gap between them at 2.2 s.
const SRT = '1\r\n00:00:00,500 --> 00:00:02,000\r\n<i>Hello there</i>\r\n\r\n2\r\n00:00:02,500 --> 00:00:03,500\r\n{\\an8}Second line\r\nwith two rows\r\n';
const SRT_CUES = [{ start: 0.5, end: 2, lines: ['Hello there'] }, { start: 2.5, end: 3.5, lines: ['Second line', 'with two rows'] }];

// ---------- Readers ----------

/** { frames, width, height, delayMs, img (frame 0 ImageData) } via the browser's ImageDecoder. */
async function gifInfo(blob) {
  const d = new ImageDecoder({ data: await blob.arrayBuffer(), type: 'image/gif' });
  try {
    await d.completed;
    await d.tracks.ready;
    const frames = d.tracks.selectedTrack.frameCount;
    const { image } = await d.decode({ frameIndex: 0 });
    const g = new OffscreenCanvas(image.displayWidth, image.displayHeight).getContext('2d');
    g.drawImage(image, 0, 0);
    const out = { frames, width: image.displayWidth, height: image.displayHeight, delayMs: image.duration / 1000, img: g.getImageData(0, 0, image.displayWidth, image.displayHeight) };
    image.close();
    return out;
  } finally {
    d.close();
  }
}

/** The frames shown at these times (s), as ImageData, decoded with Mediabunny's CanvasSink. */
async function videoFrames(blob, times) {
  const MB = await getMediabunny();
  const input = new MB.Input({ source: new MB.BlobSource(blob), formats: MB.ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    assert(track, 'no video track to read frames from');
    const out = [];
    for await (const f of new MB.CanvasSink(track, { poolSize: 0 }).canvasesAtTimestamps(times)) {
      out.push(f && f.canvas.getContext('2d').getImageData(0, 0, f.canvas.width, f.canvas.height));
    }
    return out;
  } finally {
    input.dispose?.();
  }
}

/** Plays it through the browser's own decoder; returns the AudioBuffer. */
async function decodes(blob, label) {
  try {
    return await new OfflineAudioContext(1, 1, 48000).decodeAudioData(await blob.arrayBuffer());
  } catch (err) {
    throw new Error(`${label}: decodeAudioData can't play it (${err.message})`);
  }
}

/**
 * The length a <video> element reports (from the container header). Use it for WebM video-only files:
 * Mediabunny's reader gives the last WebM frame no duration, so mediaInfo() comes up one frame short.
 */
async function playerDuration(blob) {
  const v = document.createElement('video');
  v.muted = true;
  v.preload = 'metadata';
  const url = URL.createObjectURL(blob);
  try {
    v.src = url;
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("the <video> element didn't load it within 10 s")), 10000);
      v.onloadedmetadata = () => {
        clearTimeout(timer);
        resolve(v.duration);
      };
      v.onerror = () => {
        clearTimeout(timer);
        reject(new Error(`the <video> element can't play it (${v.error?.message || v.error?.code})`));
      };
    });
  } finally {
    v.removeAttribute('src');
    URL.revokeObjectURL(url);
  }
}

/** 'matroska' or 'webm' from the EBML header (sniffType says 'webm' for both). */
async function ebmlDocType(blob) {
  const s = new TextDecoder('latin1').decode(await blob.slice(0, 64).arrayBuffer());
  return /matroska/.test(s) ? 'matroska' : /webm/.test(s) ? 'webm' : '';
}

/** Mean hue (degrees) of a 6 x 6 block at x, y. */
function hueAt(img, x = 8, y = 8) {
  let r = 0, g = 0, b = 0;
  for (let j = 0; j < 6; j++) {
    for (let i = 0; i < 6; i++) {
      const k = ((y + j) * img.width + x + i) * 4;
      r += img.data[k];
      g += img.data[k + 1];
      b += img.data[k + 2];
    }
  }
  [r, g, b] = [r, g, b].map((v) => v / 36 / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (!d) return NaN;
  const h = 60 * (max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4);
  return h < 0 ? h + 360 : h;
}

function sameHue(img, expected, label) {
  const h = hueAt(img);
  const gap = Math.min(Math.abs(h - expected) % 360, 360 - (Math.abs(h - expected) % 360));
  assert(gap <= 15, `${label}: expected a hue near ${expected}°, got ${Number.isNaN(h) ? 'grey' : `${Math.round(h)}°`}`);
}

/** Near-white pixels in rows y0..y1 (burnt-in captions are white). */
function whitePixels(img, y0, y1) {
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < img.width; x++) {
      const k = (y * img.width + x) * 4;
      if (img.data[k] > 225 && img.data[k + 1] > 225 && img.data[k + 2] > 225) n++;
    }
  }
  return n;
}

// ---------- Checks ----------

function one(out) {
  eq(out.items.length, 1, 'number of files');
  return out.items[0];
}

/**
 * Checks a result item. want: { format, sniff, type, video: null | { codec, size: [w, h] }, audio: null | { codec, channels, sampleRate }, duration, tol }.
 */
async function media(item, want, label = 'output') {
  assert(item?.blob instanceof Blob, `${label}: no file came back`);
  const i = await mediaInfo(item.blob);
  if (want.format) eq(i.format, want.format, `${label} container`);
  if (want.sniff) eq(await sniffType(item.blob), want.sniff, `${label} file signature`);
  if (want.type) eq(item.blob.type, want.type, `${label} MIME type`);
  for (const kind of ['video', 'audio']) {
    if (!(kind in want)) continue;
    const got = i[kind];
    const w = want[kind];
    if (w === null) {
      assert(!got, `${label}: expected no ${kind} track, found ${got && got.codec}`);
      continue;
    }
    assert(got, `${label}: no ${kind} track`);
    if (w.codec) eq(got.codec, w.codec, `${label} ${kind} codec`);
    if (w.size) eq([got.width, got.height], w.size, `${label} video size`);
    if (w.channels) eq(got.channels, w.channels, `${label} channels`);
    if (w.sampleRate) eq(got.sampleRate, w.sampleRate, `${label} sample rate`);
  }
  if (want.duration != null) near(i.duration, want.duration, want.tol ?? 0.15, `${label} duration (s)`);
  return i;
}

const MP4_AV = (size, duration, tol) => ({ format: 'MP4', sniff: 'mp4', type: 'video/mp4', video: { codec: 'avc', size }, audio: { codec: 'aac' }, duration, tol });
const MP3 = (channels, sampleRate, duration) => ({ format: 'MP3', sniff: 'mp3', type: 'audio/mpeg', video: null, audio: { codec: 'mp3', channels, sampleRate }, duration, tol: 0.12 });
const WAV = (channels, sampleRate, duration) => ({ format: 'WAVE', sniff: 'wav', type: 'audio/wav', video: null, audio: { codec: 'pcm-s16', channels, sampleRate }, duration, tol: 0.05 });

/** "X to MP4" presets: same size, length, H.264 + AAC. */
async function toMp4(src, t, label) {
  t.eq(t.tool.preset?.options, { to: 'mp4' }, 'catalog preset');
  t.eq(t.mod.default.defaults(t.preset), { to: 'mp4' }, 'preset defaults');
  const before = await t.mediaInfo(src);
  const it = one(await t.process([src]));
  t.match(it.name, /^clip\.mp4$/, 'file name');
  await media(it, MP4_AV([before.video.width, before.video.height], before.duration, 0.1), label);
}

/** Audio presets: defaults come from the preset, then one file in, one checked file out that the browser plays. */
async function audioPreset(t, src, to, want, label) {
  t.eq(t.mod.default.defaults(t.preset), { to }, 'preset defaults');
  const it = one(await t.process([src]));
  t.match(it.name, new RegExp(`\\.${to}$`), 'file name');
  const info = await media(it, want, label);
  if (to !== 'wav') near((await decodes(it.blob, label)).duration, info.duration, 0.1, `${label} decoded duration (s)`);
  return it;
}

// Every spec gets the module on t.mod too, so the helpers above can call defaults().
const withMod = (fn) => (mod, fx, t) => fn(mod, fx, Object.assign(t, { mod }));

export default {
  'compress-video': withMod(async (mod, fx, t) => {
    const clip = await clip4(fx);
    const out = await t.process([clip]);
    const it = one(out);
    t.match(it.name, /compressed\.mp4$/, 'file name');
    await media(it, MP4_AV([640, 360], 4), 'Balanced');
    t.assert(it.blob.size < clip.size, `Balanced: expected smaller than the ${clip.size} B input, got ${it.blob.size} B`);
    t.match(out.summary, /^\d+% smaller: .+ down to .+$/, 'summary');

    const strong = one(await t.process([clip], { level: 'strong', size: 240 }));
    await media(strong, MP4_AV([426, 240], 4), 'Strong at 240p');
    t.assert(strong.blob.size < it.blob.size, `Strong at 240p (${strong.blob.size} B) should be smaller than Balanced (${it.blob.size} B)`);
  }),

  'trim-video': withMod(async (mod, fx, t) => {
    const clip = await clip4(fx);
    const it = one(await t.process([clip], { start: '0:01', end: '0:02.5' }));
    t.match(it.name, /trimmed\.mp4$/, 'file name');
    t.eq(it.note, '0:01.5 long', 'note');
    await media(it, MP4_AV([640, 360], 1.5, 0.1), 'MP4 trim');
    // Fixture frame i has hue i * 6, so the 1 s frame is hue 180 and frame 0 is hue 0.
    const [first] = await videoFrames(it.blob, [0]);
    t.assert(first, 'MP4 trim: no frame at 0 s');
    sameHue(first, 180, 'first frame shown (should be the 1 s frame)');

    const err = await t.rejects(t.process([clip], { start: '0:05' }), 'a start after the end');
    t.match(err.message, /start is after the end of the video/i, 'error for a start after the end');

    const webm = await webmClip(fx);
    const w = one(await t.process([webm], { start: '0:00.5', end: '0:01.5' }));
    t.match(w.name, /trimmed\.webm$/, 'WebM file name');
    await media(w, { format: 'WebM', type: 'video/webm', video: { size: [320, 240] }, duration: 1, tol: 0.12 }, 'WebM trim');
  }),

  'mute-video': withMod(async (mod, fx, t) => {
    const clip = await fx.mp4();
    const src = await t.mediaInfo(clip);
    const it = one(await t.process([clip]));
    t.match(it.name, /muted\.mp4$/, 'file name');
    await media(it, { format: 'MP4', sniff: 'mp4', type: 'video/mp4', video: { codec: src.video.codec, size: [320, 240] }, audio: null, duration: src.duration, tol: 0.1 }, 'muted MP4');
    t.assert(it.blob.size < clip.size, `muted MP4: expected smaller than the ${clip.size} B input, got ${it.blob.size} B`);

    const webm = await webmClip(fx);
    const w = one(await t.process([webm]));
    t.match(w.name, /muted\.webm$/, 'WebM file name');
    await media(w, { format: 'WebM', type: 'video/webm', video: { codec: (await t.mediaInfo(webm)).video.codec, size: [320, 240] }, audio: null }, 'muted WebM');
  }),

  'resize-video': withMod(async (mod, fx, t) => {
    const clip = await clip4(fx);
    const a = one(await t.process([clip]));
    t.eq(a.note, '1280 × 720', 'note');
    t.match(a.name, /1280x720\.mp4$/, 'file name');
    await media(a, MP4_AV([1280, 720], 4), '720p');

    const b = one(await t.process([clip], { size: 'custom', width: 300 }));
    await media(b, MP4_AV([300, 168], 4), 'custom width 300');

    const portrait = await fx.mp4({ width: 360, height: 640 });
    const c = one(await t.process([portrait], { size: 480 }));
    await media(c, MP4_AV([480, 854], 2), 'portrait at 480p');
  }),

  'video-converter': withMod(async (mod, fx, t) => {
    t.eq(mod.default.defaults({ from: 'MOV', options: { to: 'mp4' } }), { to: 'mp4' }, 'defaults for a preset');
    t.eq(mod.default.defaults({}), { to: 'mp4' }, 'defaults');
    const clip = await clip4(fx);
    const src = await t.mediaInfo(clip);
    const same = { video: { codec: src.video.codec, size: [640, 360] }, audio: { codec: src.audio.codec }, duration: 4 };

    const mov = one(await t.process([clip], { to: 'mov' }));
    t.match(mov.name, /\.mov$/, 'MOV file name');
    await media(mov, { format: 'QuickTime File Format', sniff: 'mov', type: 'video/quicktime', ...same }, 'MOV');

    const mkv = one(await t.process([clip], { to: 'mkv' }));
    t.match(mkv.name, /\.mkv$/, 'MKV file name');
    await media(mkv, { format: 'Matroska', type: 'video/x-matroska', ...same }, 'MKV');
    t.eq(await ebmlDocType(mkv.blob), 'matroska', 'MKV doctype');

    const webm = one(await t.process([clip], { to: 'webm' }));
    t.match(webm.name, /\.webm$/, 'WebM file name');
    await media(webm, { format: 'WebM', type: 'video/webm', video: { codec: 'vp9', size: [640, 360] }, audio: { codec: 'opus' }, duration: 4 }, 'WebM');
    t.eq(await ebmlDocType(webm.blob), 'webm', 'WebM doctype');

    const back = one(await t.process([new File([webm.blob], webm.name, { type: 'video/webm' })], { to: 'mp4' }));
    await media(back, MP4_AV([640, 360], 4), 'WebM back to MP4');
  }),

  'mov-to-mp4': withMod(async (mod, fx, t) => toMp4(await movClip(fx), t, 'MOV to MP4')),
  'mkv-to-mp4': withMod(async (mod, fx, t) => toMp4(await mkvClip(fx), t, 'MKV to MP4')),
  'webm-to-mp4': withMod(async (mod, fx, t) => toMp4(await webmClip(fx), t, 'WebM to MP4')),

  'mp4-to-webm': withMod(async (mod, fx, t) => {
    t.eq(mod.default.defaults(t.preset), { to: 'webm' }, 'preset defaults');
    const it = one(await t.process([await fx.mp4()]));
    t.match(it.name, /^clip\.webm$/, 'file name');
    await media(it, { format: 'WebM', sniff: 'webm', type: 'video/webm', video: { codec: 'vp9', size: [320, 240] }, audio: { codec: 'opus' }, duration: 2 }, 'MP4 to WebM');
    t.eq(await ebmlDocType(it.blob), 'webm', 'doctype');
  }),

  'mp4-to-mov': withMod(async (mod, fx, t) => {
    t.eq(mod.default.defaults(t.preset), { to: 'mov' }, 'preset defaults');
    const clip = await fx.mp4();
    const src = await t.mediaInfo(clip);
    const it = one(await t.process([clip]));
    t.match(it.name, /^clip\.mov$/, 'file name');
    await media(it, { format: 'QuickTime File Format', sniff: 'mov', type: 'video/quicktime', video: { codec: src.video.codec, size: [320, 240] }, audio: { codec: src.audio.codec }, duration: src.duration, tol: 0.1 }, 'MP4 to MOV');
  }),

  'video-to-gif': withMod(async (mod, fx, t) => {
    const clip = await clip4(fx);
    const a = one(await t.process([clip]));
    t.match(a.name, /\.gif$/, 'file name');
    t.eq([a.blob.type, await sniffType(a.blob)], ['image/gif', 'gif'], 'MIME type and signature');
    t.eq(a.note, '480 × 270 · 40 frames', 'note (5 s asked, 4 s available, 10 fps)');
    const ga = await gifInfo(a.blob);
    t.eq([ga.frames, ga.width, ga.height], [40, 480, 270], 'frames and size');
    t.near(ga.delayMs, 100, 10, 'frame delay (ms)');
    sameHue(ga.img, 0, 'first GIF frame (the 0 s frame)');

    const b = one(await t.process([clip], { start: '0:01', length: 2, fps: 5, width: 800 }));
    const gb = await gifInfo(b.blob);
    t.eq([gb.frames, gb.width, gb.height], [10, 640, 360], 'frames and size from 0:01, 2 s at 5 fps, width capped at the video');
    t.near(gb.delayMs, 200, 10, 'frame delay at 5 fps (ms)');
    sameHue(gb.img, 180, 'first GIF frame from 0:01');

    const err = await t.rejects(t.process([clip], { start: '0:09' }), 'a start after the end');
    t.match(err.message, /start is after the end of the video/i, 'error for a start after the end');
  }),

  'mp4-to-gif': withMod(async (mod, fx, t) => {
    t.eq(mod.default.defaults(t.preset), { start: '0:00', length: 5, fps: 10, width: 480 }, 'preset defaults');
    const it = one(await t.process([await fx.mp4()]));
    t.eq(it.blob.type, 'image/gif', 'MIME type');
    t.eq(it.note, '320 × 240 · 20 frames', 'note');
    const g = await gifInfo(it.blob);
    t.eq([g.frames, g.width, g.height], [20, 320, 240], 'frames and size');
  }),

  'mov-to-gif': withMod(async (mod, fx, t) => {
    t.eq(mod.default.defaults(t.preset), mod.default.defaults({}), 'preset defaults match Video to GIF');
    const it = one(await t.process([await movClip(fx)], { length: 1 }));
    t.match(it.name, /^clip\.gif$/, 'file name');
    t.eq(it.blob.type, 'image/gif', 'MIME type');
    const g = await gifInfo(it.blob);
    t.eq([g.frames, g.width, g.height], [10, 320, 240], 'frames and size');
  }),

  'gif-to-mp4': withMod(async (mod, fx, t) => {
    const src = await gif({ frames: 20, width: 200, height: 150, delay: 100 });
    const it = one(await t.process([src], { to: 'mp4' }));
    t.match(it.name, /^loop\.mp4$/, 'file name');
    t.eq(it.note, '20 frames · 0:02', 'note');
    await media(it, { format: 'MP4', sniff: 'mp4', type: 'video/mp4', video: { codec: 'avc', size: [200, 150] }, audio: null, duration: 2, tol: 0.05 }, 'GIF to MP4');
    const [mid] = await videoFrames(it.blob, [1.05]);
    t.assert(mid, 'GIF to MP4: no frame at 1.05 s');
    sameHue(mid, 180, 'frame at 1.05 s (GIF frame 10)');

    const w = one(await t.process([src], { to: 'webm' }));
    t.match(w.name, /^loop\.webm$/, 'WebM file name');
    await media(w, { format: 'WebM', type: 'video/webm', video: { codec: 'vp9', size: [200, 150] }, audio: null }, 'GIF to WebM');
    t.near(await playerDuration(w.blob), 2, 0.05, 'GIF to WebM duration in a <video> element (s)');

    const odd = one(await t.process([await gif({ frames: 5, width: 161, height: 121, delay: 0 })]));
    await media(odd, { video: { codec: 'avc', size: [162, 122] }, audio: null, duration: 0.5, tol: 0.05 }, 'odd-sized GIF with 0 ms delays');

    const err = await t.rejects(t.process([new File(['not a gif at all'], 'x.gif', { type: 'image/gif' })]), 'a text file named x.gif');
    t.match(err.message, /couldn't read this GIF/i, 'error for a file that isn\'t a GIF');
  }),

  'extract-audio': withMod(async (mod, fx, t) => {
    t.eq(mod.default.defaults(t.preset), { to: 'mp3' }, 'defaults');
    const clip = await clip4(fx);

    const mp3 = one(await t.process([clip], { to: 'mp3' }));
    t.match(mp3.name, /\.mp3$/, 'MP3 file name');
    await media(mp3, MP3(2, 48000, 4), 'MP3');
    near((await decodes(mp3.blob, 'MP3')).duration, 4, 0.12, 'MP3 decoded duration (s)');

    const wav = one(await t.process([clip], { to: 'wav' }));
    t.match(wav.name, /\.wav$/, 'WAV file name');
    await media(wav, WAV(2, 48000, 4), 'WAV');

    const m = one(await t.process([clip], { to: 'm4a' }));
    t.match(m.name, /\.m4a$/, 'M4A file name');
    await media(m, { format: 'MP4', type: 'audio/mp4', video: null, audio: { codec: 'aac', channels: 2, sampleRate: 48000 }, duration: 4 }, 'M4A');

    const err = await t.rejects(t.process([await silentClip(fx)]), 'a video with no sound');
    t.match(err.message, /doesn't have the video or sound/i, 'error for a video with no sound');

    const two = await t.process([clip, await fx.mp4()], { to: 'm4a' });
    t.eq(two.items.length, 2, 'two videos in, two files out');
  }),

  'mp4-to-mp3': withMod(async (mod, fx, t) => audioPreset(t, await fx.mp4(), 'mp3', MP3(2, 48000, 2), 'MP4 to MP3')),
  'mov-to-mp3': withMod(async (mod, fx, t) => audioPreset(t, await movClip(fx), 'mp3', MP3(2, 48000, 2), 'MOV to MP3')),
  'mp4-to-wav': withMod(async (mod, fx, t) => audioPreset(t, await fx.mp4(), 'wav', WAV(2, 48000, 2), 'MP4 to WAV')),

  'audio-converter': withMod(async (mod, fx, t) => {
    t.eq(mod.default.defaults({}), { to: 'mp3' }, 'defaults');
    const wav = await fx.wav({ seconds: 3 });

    const mp3 = one(await t.process([wav], { to: 'mp3' }));
    t.match(mp3.name, /^tone\.mp3$/, 'MP3 file name');
    const mp3Info = await media(mp3, MP3(1, 44100, 3), 'WAV to MP3');
    t.near(mp3.blob.size / 1000, 121, 15, 'MP3 size at 320 kbps (KB)');
    await decodes(mp3.blob, 'MP3');

    const o = one(await t.process([wav], { to: 'ogg' }));
    t.match(o.name, /^tone\.ogg$/, 'OGG file name');
    await media(o, { format: 'Ogg', sniff: 'ogg', type: 'audio/ogg', video: null, audio: { codec: 'opus', channels: 1, sampleRate: 48000 }, duration: 3, tol: 0.1 }, 'WAV to OGG');
    await decodes(o.blob, 'OGG');

    const m = one(await t.process([wav], { to: 'm4a' }));
    await media(m, { format: 'MP4', type: 'audio/mp4', video: null, audio: { codec: 'aac', channels: 1 }, duration: 3, tol: 0.1 }, 'WAV to M4A');
    await decodes(m.blob, 'M4A');

    const mp3File = new File([mp3.blob], 'tone.mp3', { type: 'audio/mpeg' });
    const back = one(await t.process([mp3File], { to: 'wav' }));
    await media(back, { ...WAV(1, 44100, mp3Info.duration) }, 'MP3 back to WAV');
    const again = one(await t.process([mp3File], { to: 'mp3' }));
    t.near(again.blob.size, mp3.blob.size, mp3.blob.size * 0.02, 'MP3 to MP3 size (copied)');
  }),

  'm4a-to-mp3': withMod(async (mod, fx, t) => audioPreset(t, await m4a(fx), 'mp3', MP3(2, 48000, 2), 'M4A to MP3')),

  'wav-to-mp3': withMod(async (mod, fx, t) => {
    const wav = await fx.wav({ seconds: 3 });
    const it = await audioPreset(t, wav, 'mp3', MP3(1, 44100, 3), 'WAV to MP3');
    t.near(it.blob.size / 1000, 121, 15, 'MP3 size at 320 kbps (KB)');
    t.assert(it.blob.size < wav.size * 0.6, `expected well under the ${wav.size} B WAV, got ${it.blob.size} B`);
  }),

  'ogg-to-mp3': withMod(async (mod, fx, t) => audioPreset(t, await ogg(fx), 'mp3', MP3(1, 48000, 2), 'OGG to MP3')),
  'aac-to-mp3': withMod(async (mod, fx, t) => audioPreset(t, await aac(fx), 'mp3', MP3(1, 44100, 2), 'AAC to MP3')),
  'm4a-to-wav': withMod(async (mod, fx, t) => audioPreset(t, await m4a(fx), 'wav', WAV(2, 48000, 2), 'M4A to WAV')),

  'add-subtitles': withMod(async (mod, fx, t) => {
    t.eq(mod.parseSrt(SRT), SRT_CUES, 'parseSrt() on a two-cue file with <i> and {\\an8}');
    const clip = await clip4(fx);
    const srt = new File([SRT], 'captions.srt', { type: 'application/x-subrip' });
    const it = one(await t.process([clip], { srt }));
    t.match(it.name, /subtitled\.mp4$/, 'file name');
    t.eq(it.note, '2 subtitles', 'note');
    await media(it, MP4_AV([640, 360], 4), 'subtitled video');

    // Captions sit in the bottom quarter; the fixture's own white text is mid-frame.
    const frames = await videoFrames(it.blob, [1, 2.2, 3]);
    const strip = (img) => whitePixels(img, Math.round(img.height * 0.75), img.height);
    const [at1, at22, at3] = frames.map((img, i) => {
      t.assert(img, `no frame at ${[1, 2.2, 3][i]} s`);
      return strip(img);
    });
    t.assert(at1 > 50, `caption at 1 s: expected white text in the bottom strip, found ${at1} white pixels`);
    t.assert(at3 > 50, `caption at 3 s: expected white text in the bottom strip, found ${at3} white pixels`);
    t.assert(at22 < 10, `between cues at 2.2 s: expected no caption, found ${at22} white pixels`);

    const err = await t.rejects(t.process([clip], { srt: new File(['just some notes\n'], 'notes.srt') }), 'an .srt with no cues');
    t.match(err.message, /couldn't find any subtitles/i, 'error for an .srt with no cues');
  }),
};
