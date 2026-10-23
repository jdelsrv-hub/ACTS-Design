// Assertions and file readers for the tests. Specs get all of these on `t` (see run.js),
// next to t.tool, t.preset, t.process() and t.transform().
import { openPdfjs, getMediabunny, loadModule } from '../public/assets/js/core/vendor.js';
import { sniffType } from '../public/assets/js/core/files.js';

export { friendlyError } from '../public/assets/js/core/ui.js';
export { unzipFile as unzip } from '../public/assets/js/core/files.js'; // -> [{ name, data: Uint8Array }]

// Tests only: reads XLSX files back (tools may use something else).
const SHEETJS = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs';

const json = (v) => {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};
const short = (s) => (s && s.length > 300 ? `${s.slice(0, 300)}…` : s);

export function assert(ok, message = 'Check failed') {
  if (!ok) throw new Error(message);
}

/** Same JSON (so key order and number vs string matter). */
export function eq(actual, expected, label = 'value') {
  if (json(actual) !== json(expected)) throw new Error(`${label}: expected ${short(json(expected))}, got ${short(json(actual))}`);
}

export function near(actual, expected, tolerance, label = 'value') {
  if (!(Math.abs(actual - expected) <= tolerance)) throw new Error(`${label}: expected ${expected} ± ${tolerance}, got ${actual}`);
}

export function match(text, re, label = 'text') {
  if (!re.test(String(text))) throw new Error(`${label}: expected to match ${re}, got ${short(json(text))}`);
}

/** Resolves to the error when the promise (or function) fails; throws if it succeeds. */
export async function rejects(p, label = 'call') {
  try {
    await (typeof p === 'function' ? p() : p);
  } catch (err) {
    return err;
  }
  throw new Error(`${label}: expected an error, but it worked`);
}

const bytes = async (b) => (b instanceof Blob ? b.arrayBuffer() : b);

/** { pages, sizes: [[w, h]] in points (after rotation), rotations: [deg], text: ['page 1 text', ...] } via pdf.js */
export async function pdfInfo(blob, { password } = {}) {
  const doc = await openPdfjs(await bytes(blob), { password });
  try {
    const out = { pages: doc.numPages, sizes: [], rotations: [], text: [] };
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const { width, height } = page.getViewport({ scale: 1 });
      out.sizes.push([Math.round(width), Math.round(height)]);
      out.rotations.push(page.rotate);
      const { items } = await page.getTextContent();
      out.text.push(items.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim());
    }
    return out;
  } finally {
    doc.loadingTask.destroy(); // pdf.js 6 has no doc.destroy()
  }
}

/** { type: 'png' (sniffed from the bytes), width, height, alpha: true if any pixel is see-through } */
export async function imageInfo(blob) {
  const type = await sniffType(blob);
  const bmp = await createImageBitmap(blob);
  const { width, height } = bmp;
  const g = new OffscreenCanvas(width, height).getContext('2d');
  g.drawImage(bmp, 0, 0);
  bmp.close();
  const px = g.getImageData(0, 0, width, height).data;
  let alpha = false;
  for (let i = 3; i < px.length && !alpha; i += 4) alpha = px[i] < 255;
  return { type, width, height, alpha };
}

/** { format, duration (s), video: { codec, width, height } | null, audio: { codec, sampleRate, channels } | null } via Mediabunny */
export async function mediaInfo(blob) {
  const MB = await getMediabunny();
  const input = new MB.Input({ source: new MB.BlobSource(blob), formats: MB.ALL_FORMATS });
  try {
    const [v, a] = await Promise.all([input.getPrimaryVideoTrack(), input.getPrimaryAudioTrack()]);
    return {
      format: (await input.getFormat()).name,
      duration: await input.computeDuration(),
      video: v && { codec: v.codec, width: v.displayWidth, height: v.displayHeight },
      audio: a && { codec: a.codec, sampleRate: a.sampleRate, channels: a.numberOfChannels },
    };
  } finally {
    input.dispose?.();
  }
}

/** { 'Sheet name': [[cell, ...], ...] } for every sheet, read with SheetJS (numbers stay numbers). */
export async function xlsxSheets(blob) {
  const X = await loadModule(SHEETJS);
  const wb = X.read(new Uint8Array(await bytes(blob)), { type: 'array' });
  return Object.fromEntries(wb.SheetNames.map((n) => [n, X.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' })]));
}

/** RFC 4180 CSV: quoted fields, "" inside quotes, commas and line breaks inside quotes. Every cell is a string. */
export function csvRows(text, sep = ',') {
  const s = String(text).replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c !== '"') cell += c;
      else if (s[i + 1] === '"') cell += s[++i];
      else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows;
}
