// File helpers: names, sizes, downloads, zips and type sniffing.
import { getFflate } from './vendor.js';

export function formatBytes(bytes, digits = 1) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 ? 0 : digits)} ${units[i]}`;
}

/** "-42%" style change between two sizes. */
export function sizeChange(before, after) {
  if (!before) return '';
  const pct = Math.round((1 - after / before) * 100);
  return pct >= 0 ? `${pct}% smaller` : `${-pct}% bigger`;
}

export function extOf(name) {
  const m = /\.([^./\\]+)$/.exec(name || '');
  return m ? m[1].toLowerCase() : '';
}

export function baseName(name) {
  return String(name || 'file').replace(/\.[^./\\]+$/, '') || 'file';
}

/** photo.png -> photo.jpg */
export function renameExt(name, ext) {
  return `${baseName(name)}.${ext.replace(/^\./, '')}`;
}

/** report.pdf + "merged" -> report-merged.pdf (ext optional to change it too) */
export function withSuffix(name, suffix, ext) {
  return `${baseName(name)}-${suffix}.${(ext || extOf(name) || 'bin').replace(/^\./, '')}`;
}

/** Make output names unique: a.png, a.png -> a.png, a-2.png */
export function uniqueNames(names) {
  const seen = new Map();
  return names.map((n) => {
    const key = n.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, 1);
      return n;
    }
    let i = seen.get(key) + 1;
    let candidate;
    do {
      candidate = `${baseName(n)}-${i}${extOf(n) ? '.' + extOf(n) : ''}`;
      i++;
    } while (seen.has(candidate.toLowerCase()));
    seen.set(key, i - 1);
    seen.set(candidate.toLowerCase(), 1);
    return candidate;
  });
}

/** Strip characters that are unsafe in file names on Windows/macOS. */
export function safeFileName(name, fallback = 'file') {
  const cleaned = String(name || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, 180) || fallback;
}

const MIME = {
  pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
  avif: 'image/avif', bmp: 'image/bmp', ico: 'image/x-icon', svg: 'image/svg+xml', tif: 'image/tiff', tiff: 'image/tiff',
  heic: 'image/heic', heif: 'image/heif', mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
  mkv: 'video/x-matroska', mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', ogg: 'audio/ogg',
  oga: 'audio/ogg', opus: 'audio/ogg', flac: 'audio/flac', txt: 'text/plain', csv: 'text/csv', json: 'application/json',
  xml: 'application/xml', html: 'text/html', md: 'text/markdown', zip: 'application/zip',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  epub: 'application/epub+zip', srt: 'application/x-subrip', vtt: 'text/vtt',
};
export const mimeFromExt = (ext) => MIME[String(ext).toLowerCase().replace(/^\./, '')] || 'application/octet-stream';
export const extFromMime = (mime) => Object.keys(MIME).find((k) => MIME[k] === mime) || '';

/** Detect a file type from its first bytes. Returns an extension like 'pdf', 'png', 'heic' or ''. */
export async function sniffType(file) {
  const b = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const s = (i, str) => [...str].every((c, k) => b[i + k] === c.charCodeAt(0));
  if (s(0, '%PDF')) return 'pdf';
  if (b[0] === 0x89 && s(1, 'PNG')) return 'png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (s(0, 'GIF8')) return 'gif';
  if (s(0, 'RIFF') && s(8, 'WEBP')) return 'webp';
  if (s(0, 'RIFF') && s(8, 'WAVE')) return 'wav';
  if (s(0, 'BM')) return 'bmp';
  if ((s(0, 'II') && b[2] === 42) || (s(0, 'MM') && b[3] === 42)) return 'tiff';
  if (s(4, 'ftyp')) {
    const brand = String.fromCharCode(...b.slice(8, 12));
    if (/^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(brand)) return 'heic';
    if (/^(avif|avis)$/.test(brand)) return 'avif';
    if (/^qt/.test(brand)) return 'mov';
    if (/^M4A/.test(brand)) return 'm4a';
    return 'mp4';
  }
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'webm';
  if (s(0, 'OggS')) return 'ogg';
  if (s(0, 'fLaC')) return 'flac';
  if (s(0, 'ID3') || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return 'mp3';
  if (s(0, 'PK')) return 'zip';
  if (s(0, '8BPS')) return 'psd';
  if (b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0) return 'ico';
  return '';
}

/** True if the file matches an accept string like ".pdf,application/pdf" or "image/*". */
export function matchesAccept(file, accept) {
  if (!accept) return true;
  const parts = accept.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean);
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  return parts.some((p) => {
    if (p.startsWith('.')) return name.endsWith(p);
    if (p.endsWith('/*')) return type.startsWith(p.slice(0, -1));
    return type === p;
  });
}

/** Trigger a browser download for a Blob. */
export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeFileName(name, 'download');
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function downloadText(text, name, type = 'text/plain;charset=utf-8') {
  downloadBlob(new Blob([text], { type }), name);
}

/** Build a .zip Blob. entries: [{ name, blob | data (Uint8Array|string) }]. Already-compressed files are stored. */
export async function zipFiles(entries, { level = 6 } = {}) {
  const { zip } = await getFflate();
  const names = uniqueNames(entries.map((e) => safeFileName(e.name)));
  const input = {};
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    let data = e.data;
    if (e.blob) data = new Uint8Array(await e.blob.arrayBuffer());
    if (typeof data === 'string') data = new TextEncoder().encode(data);
    const compressed = /\.(png|jpe?g|gif|webp|avif|heic|mp4|mov|webm|mkv|mp3|m4a|aac|ogg|opus|flac|zip|docx|xlsx|pptx|epub|gz|7z)$/i.test(names[i]);
    input[names[i]] = [data, { level: compressed ? 0 : level }];
  }
  const out = await new Promise((resolve, reject) => zip(input, (err, res) => (err ? reject(err) : resolve(res))));
  return new Blob([out], { type: 'application/zip' });
}

/** Read a .zip. Returns [{ name, data: Uint8Array }] (folders skipped). */
export async function unzipFile(file) {
  const { unzip } = await getFflate();
  const buf = new Uint8Array(await file.arrayBuffer());
  const out = await new Promise((resolve, reject) => unzip(buf, (err, res) => (err ? reject(err) : resolve(res))));
  return Object.entries(out)
    .filter(([name]) => !name.endsWith('/'))
    .map(([name, data]) => ({ name, data }));
}

/** Read a File/Blob as text, trying UTF-8 first. */
export async function readText(file) {
  const buf = await file.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(buf);
  }
}

export function blobFromCanvas(canvas, type = 'image/png', quality) {
  if (canvas.convertToBlob) return canvas.convertToBlob({ type, quality });
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create the image.'))), type, quality),
  );
}
