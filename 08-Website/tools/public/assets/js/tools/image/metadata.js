// View or remove metadata. Shows EXIF details (camera, date, GPS location and more) with exifr,
// then saves a clean copy. JPG, PNG and WebP are cleaned without re-saving the picture.
import { fileTool } from '../../core/filetool.js';
import { decodeImage, drawToCanvas, encodeCanvas } from '../../core/image.js';
import { sniffType, withSuffix } from '../../core/files.js';
import { h } from '../../core/dom.js';
import { notice, statGrid } from '../../core/ui.js';
import { getExifr } from './_vendor.js';

const has = (v) => v !== undefined && v !== null && v !== '';

// WebP files are a list of chunks: 4-letter id, size, data (padded to an even length).
function* webpChunks(b) {
  for (let o = 12; o + 8 <= b.length;) {
    const size = new DataView(b.buffer, b.byteOffset + o + 4, 4).getUint32(0, true);
    const end = o + 8 + size + (size & 1);
    yield { id: String.fromCharCode(...b.subarray(o, o + 4)), data: b.subarray(o + 8, o + 8 + size), chunk: b.subarray(o, end) };
    o = end;
  }
}

/** Every tag exifr can find (EXIF, GPS, IPTC, XMP) as a flat object, or {} when there are none. */
export async function readMetadata(file) {
  const exifr = await getExifr();
  let source = file;
  // exifr doesn't read WebP, so hand it the EXIF chunk (a TIFF block, sometimes after "Exif\0\0").
  if ((await sniffType(file)) === 'webp') {
    const exif = [...webpChunks(new Uint8Array(await file.arrayBuffer()))].find((c) => c.id === 'EXIF')?.data;
    if (!exif) return {};
    source = exif[0] === 0x45 ? exif.subarray(6) : exif;
  }
  try {
    const tags = (await exifr.parse(source, { tiff: true, exif: true, gps: true, iptc: true, xmp: true, icc: false, ihdr: true, makerNote: false, mergeOutput: true })) || {};
    // ihdr brings PNG text notes, plus basic header fields that aren't personal, so leave those out.
    for (const k of ['ImageWidth', 'ImageHeight', 'BitDepth', 'ColorType', 'Compression', 'Filter', 'Interlace']) delete tags[k];
    return tags;
  } catch {
    return {};
  }
}

function show(v) {
  if (v instanceof Date) return v.toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });
  if (typeof v === 'number') return String(Math.round(v * 1e4) / 1e4);
  if (Array.isArray(v) || ArrayBuffer.isView(v)) return v.length > 12 ? `${v.length} values` : Array.from(v, show).join(', ');
  if (v && typeof v === 'object') return JSON.stringify(v).slice(0, 160);
  return String(v).slice(0, 200);
}

/** The details people usually care about, in plain words. */
export function keyFacts(t) {
  const shutter = t.ExposureTime && (t.ExposureTime < 1 ? `1/${Math.round(1 / t.ExposureTime)} s` : `${t.ExposureTime} s`);
  return [
    ['Camera', [t.Make, t.Model].filter(has).join(' ')],
    ['Lens', t.LensModel],
    ['Taken', t.DateTimeOriginal || t.CreateDate],
    ['Location', has(t.latitude) && has(t.longitude) ? `${t.latitude.toFixed(5)}, ${t.longitude.toFixed(5)}` : ''],
    ['Settings', [t.FNumber && `f/${t.FNumber}`, shutter, t.ISO && `ISO ${t.ISO}`, t.FocalLength && `${t.FocalLength} mm`].filter(Boolean).join(' · ')],
    ['Software', t.Software],
    ['Author', t.Artist || t.Copyright],
  ].filter(([, v]) => has(v)).map(([label, value]) => ({ label, value: show(value) }));
}

// JPG: drop APP1 (EXIF, XMP), APP3 to APP15 except Adobe colour info, non-colour APP2 and comments.
// Keeps an orientation tag so sideways phone photos still show the right way up. Stops at the end of the image.
function stripJpeg(b, orientation) {
  const parts = [b.subarray(0, 2)];
  let o = 2;
  let tagged = !(orientation > 1);
  while (o + 1 < b.length) {
    if (b[o] !== 0xff) throw new Error("This JPG looks damaged, so we couldn't clean it.");
    const m = b[o + 1];
    if (m === 0xff) { o++; continue; }
    if (m === 0xd9) { parts.push(b.subarray(o, o + 2)); break; }
    if (o + 4 > b.length) break;
    let end = o + 2 + ((b[o + 2] << 8) | b[o + 3]);
    if (m === 0xda) while (end + 1 < b.length && !(b[end] === 0xff && b[end + 1] !== 0 && (b[end + 1] < 0xd0 || b[end + 1] > 0xd7))) end++;
    if (!tagged && m !== 0xe0) {
      // Orientation only: "Exif", big-endian TIFF header, one IFD entry (tag 0x0112, SHORT).
      parts.push(new Uint8Array([0xff, 0xe1, 0, 34, 69, 120, 105, 102, 0, 0, 77, 77, 0, 42, 0, 0, 0, 8, 0, 1, 1, 18, 0, 3, 0, 0, 0, 1, 0, orientation, 0, 0, 0, 0, 0, 0]));
      tagged = true;
    }
    const icc = m === 0xe2 && String.fromCharCode(...b.subarray(o + 4, o + 15)) === 'ICC_PROFILE';
    if (!((m >= 0xe1 && m <= 0xef && m !== 0xee && !icc) || m === 0xfe)) parts.push(b.subarray(o, end));
    o = end;
  }
  return new Blob(parts, { type: 'image/jpeg' });
}

// PNG: keep only the chunks needed to show the picture (and its colours and animation).
function stripPng(b) {
  const keep = /^(IHDR|PLTE|tRNS|IDAT|IEND|gAMA|cHRM|sRGB|iCCP|cICP|sBIT|pHYs|bKGD|acTL|fcTL|fdAT)$/;
  const parts = [b.subarray(0, 8)];
  for (let o = 8; o + 12 <= b.length;) {
    const end = o + 12 + new DataView(b.buffer, o, 4).getUint32(0);
    if (keep.test(String.fromCharCode(...b.subarray(o + 4, o + 8)))) parts.push(b.subarray(o, end));
    o = end;
  }
  return new Blob(parts, { type: 'image/png' });
}

// WebP: drop the EXIF and XMP chunks, clear their flags and fix the file size.
function stripWebp(b) {
  const keep = /^(VP8 |VP8L|VP8X|ALPH|ANIM|ANMF|ICCP)$/;
  const parts = [];
  for (const { id, chunk } of webpChunks(b)) {
    if (!keep.test(id)) continue;
    const copy = chunk.slice();
    if (id === 'VP8X') copy[8] &= ~0x0c; // flags: no EXIF, no XMP
    parts.push(copy);
  }
  const head = b.slice(0, 12);
  new DataView(head.buffer).setUint32(4, 4 + parts.reduce((n, p) => n + p.length, 0), true);
  return new Blob([head, ...parts], { type: 'image/webp' });
}

/**
 * A copy without metadata: { blob, ext, resaved }. JPG, PNG and WebP keep their exact pixels.
 * HEIC is saved again as JPG; TIFF, AVIF and rotated PNG or WebP files are saved again as PNG.
 */
export async function stripMetadata(file) {
  const type = await sniffType(file);
  const orientation = ['jpg', 'png', 'webp'].includes(type) ? (await (await getExifr()).orientation(file).catch(() => 1)) || 1 : 1;
  if (type === 'jpg' || (orientation === 1 && (type === 'png' || type === 'webp'))) {
    const b = new Uint8Array(await file.arrayBuffer());
    const blob = type === 'jpg' ? stripJpeg(b, orientation) : type === 'png' ? stripPng(b) : stripWebp(b);
    return { blob, ext: type };
  }
  const img = await decodeImage(file);
  const canvas = drawToCanvas(img.image, img.width, img.height);
  img.close();
  const jpg = type === 'heic';
  return { blob: await encodeCanvas(canvas, jpg ? 'jpeg' : 'png', 0.92), ext: jpg ? 'jpg' : 'png', resaved: true };
}

// The stat cards, with room for long values like a camera name or GPS position.
function factCards(facts) {
  const { el } = statGrid(facts);
  el.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
  el.querySelectorAll('dd').forEach((dd) => Object.assign(dd.style, { whiteSpace: 'normal', fontSize: '18px' }));
  return el;
}

function details(file, open) {
  const body = h('div', { style: { display: 'grid', gap: '12px', paddingTop: '10px' } }, h('span', { class: 'spinner' }));
  readMetadata(file).then((tags) => {
    const all = Object.entries(tags).filter(([, v]) => has(v));
    if (!all.length) return body.replaceChildren(notice('success', "We didn't find any camera details or location in this file."));
    const facts = keyFacts(tags);
    const count = `${all.length} detail${all.length === 1 ? '' : 's'}`;
    const cell = { textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--line)', verticalAlign: 'top', overflowWrap: 'anywhere' };
    body.replaceChildren(
      has(tags.latitude)
        ? notice('warn', 'This photo has a GPS location in it. Anyone you send the file to can see where it was taken.')
        : notice('info', `We found ${count} in this file.`),
      facts.length ? factCards(facts) : null,
      h('details', null, h('summary', { style: { cursor: 'pointer' } }, `Show all ${count}`),
        h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginTop: '8px' } },
          h('tbody', null, all.map(([k, v]) => h('tr', null, h('th', { style: { ...cell, fontWeight: 600, width: '40%' } }, k), h('td', { style: cell }, show(v))))))));
  });
  return h('details', { class: 'pane', open }, h('summary', { style: { cursor: 'pointer', fontWeight: 600 } }, file.name), body);
}

export default fileTool({
  accept: '.jpg,.jpeg,.png,.webp,.heic,.heif,.tif,.tiff,.avif,image/jpeg,image/png,image/webp,image/heic,image/heif,image/tiff,image/avif',
  multiple: true,
  dropTitle: 'Drop your photos here',
  dropHint: 'JPG, PNG, WebP, HEIC, TIFF or AVIF.',
  action: 'Save clean copy',
  actionIcon: 'shield-check',
  renderExtra(extra, api) {
    extra.append(...api.files.slice(0, 20).map((f, i) => details(f, i === 0)));
  },
  async processFile(file) {
    const { blob, ext, resaved } = await stripMetadata(file);
    return { name: withSuffix(file.name, 'clean', ext), blob, note: resaved ? `Saved again as ${ext.toUpperCase()}` : 'Same picture, details removed' };
  },
});
