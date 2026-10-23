// Shared helpers for the video and audio tools. Mediabunny (MPL-2.0) reads, converts and writes the files.
import { getMediabunny, enableMp3Encoding } from '../../core/vendor.js';
import { mimeFromExt } from '../../core/files.js';
import { h } from '../../core/dom.js';
import { button, notice } from '../../core/ui.js';

export const VIDEO_ACCEPT = 'video/*,.mp4,.m4v,.mov,.webm,.mkv';
export const AUDIO_ACCEPT = 'audio/*,.mp3,.wav,.m4a,.aac,.ogg,.oga,.opus,.flac';
export const WORKING_NOTE = 'Longer videos can take a few minutes. Keep this tab open until it finishes.';
export const CANT_READ = "Your browser can't read the video or sound in this file. Some formats, like HEVC on some Windows PCs, need a different browser. Try Chrome, Edge or Safari.";

/** H.264 video and AAC sound: what MP4 and MOV files need to play everywhere. */
export const PLAYS_ANYWHERE = { video: { codec: 'avc' }, audio: { codec: 'aac' } };

const FORMAT = { mp4: 'Mp4OutputFormat', m4a: 'Mp4OutputFormat', mov: 'MovOutputFormat', webm: 'WebMOutputFormat', mkv: 'MkvOutputFormat', mp3: 'Mp3OutputFormat', wav: 'WavOutputFormat', ogg: 'OggOutputFormat' };

/** Video encoders need even sizes. */
export const even = (n) => Math.max(2, Math.round(n / 2) * 2);

export async function openInput(file) {
  const MB = await getMediabunny();
  const input = new MB.Input({ source: new MB.BlobSource(file), formats: MB.ALL_FORMATS });
  if (!(await input.canRead())) {
    input.dispose();
    throw new Error(`We can't open ${file.name}. It may be damaged, or in a format we can't read yet.`);
  }
  return input;
}

export async function getVideoTrack(input) {
  const track = await input.getPrimaryVideoTrack();
  if (!track) throw new Error("We couldn't find any video in this file.");
  return track;
}

/**
 * Convert a file with Mediabunny's Conversion. Packets are copied as-is when nothing needs to change.
 * to: output extension ('mp4', 'mp3' ...), or null to keep the input's container.
 * options: { video, audio, trim } (Mediabunny Conversion options), or async (input, MB) => that object.
 * Returns { blob, ext, note }.
 */
export async function convert(file, to, options, ctx = {}) {
  const MB = await getMediabunny();
  const input = await openInput(file);
  try {
    const f = to ? null : await input.getFormat();
    const ext = to || (f === MB.QTFF ? 'mov' : f === MB.WEBM ? 'webm' : f === MB.MATROSKA ? 'mkv' : 'mp4');
    if (ext === 'mp3') await enableMp3Encoding();
    const opts = (typeof options === 'function' ? await options(input, MB) : options) || {};
    const output = new MB.Output({ format: new MB[FORMAT[ext]](), target: new MB.BufferTarget() });
    const conversion = await MB.Conversion.init({ input, output, showWarnings: false, ...opts });
    const reasons = conversion.discardedTracks.map((d) => d.reason);
    if (!conversion.isValid) {
      if (reasons.some((r) => r.endsWith('source_codec'))) throw new Error(CANT_READ);
      if (reasons.includes('no_encodable_target_codec')) throw new Error("Your browser can't create this kind of file. Try the latest Chrome or Edge, or pick a different format.");
      throw new Error("This file doesn't have the video or sound this tool needs.");
    }
    conversion.onProgress = (p) => ctx.progress?.(p);
    const cancel = () => conversion.cancel();
    ctx.throwIfAborted?.();
    ctx.signal?.addEventListener('abort', cancel);
    try {
      await conversion.execute();
    } catch (err) {
      ctx.throwIfAborted?.();
      throw err;
    } finally {
      ctx.signal?.removeEventListener('abort', cancel);
    }
    const lost = conversion.discardedTracks.find((d) => d.track.type === 'audio' && /codec/.test(d.reason));
    const note = !lost ? undefined : lost.reason === 'no_encodable_target_codec' ? "No sound: your browser can't save it in this format" : "No sound: your browser couldn't read it";
    return { blob: new Blob([output.target.buffer], { type: mimeFromExt(ext) }), ext, note };
  } finally {
    input.dispose();
  }
}

/** "0:42 · 1920 × 1080" for the file list. */
export async function describeMedia(file) {
  const input = await openInput(file);
  try {
    const track = await input.getPrimaryVideoTrack();
    const size = track ? ` · ${await track.getDisplayWidth()} × ${await track.getDisplayHeight()}` : '';
    return formatTime(await input.computeDuration()) + size;
  } finally {
    input.dispose();
  }
}

/** 65.5 -> "1:05.5" */
export function formatTime(seconds) {
  const t = Math.round(Math.max(0, seconds || 0) * 10) / 10;
  const m = Math.floor(t / 60);
  const s = (t - m * 60).toFixed(1).replace(/\.0$/, '');
  return `${m}:${s.padStart(s.includes('.') ? 4 : 2, '0')}`;
}

/** "1:05.5", "65.5" or "0:01:05" -> seconds (NaN if it isn't a time). */
export function parseTime(text) {
  const parts = String(text ?? '').trim().replace(',', '.').split(':');
  if (parts.length > 3 || !parts.every((p) => /^\d+(\.\d*)?$/.test(p))) return NaN;
  return parts.reduce((total, p) => total * 60 + Number(p), 0);
}

let previewUrl;
/** A player for the chosen video, with buttons that copy its current time into time options. marks: [[label, optionId]] */
export function previewPlayer(extra, api, marks) {
  URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(api.files[0]);
  const video = h('video', { src: previewUrl, controls: true, playsinline: true, preload: 'metadata' });
  const wrap = h('div', { class: 'result-preview' }, video,
    h('div', { class: 'result-actions' }, marks.map(([label, id]) =>
      button(label, { variant: 'ghost', size: 'sm', icon: 'clock', onClick: () => api.setOption(id, formatTime(video.currentTime)) }))));
  video.addEventListener('error', () => wrap.replaceWith(notice('info', "Your browser can't preview this video, but you can still type the times below.")));
  extra.append(wrap);
  return video;
}
