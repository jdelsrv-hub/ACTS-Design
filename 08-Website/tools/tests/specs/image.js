// Function tests for the image family. One entry per slug: async (mod, fx, t) => { ...checks }.
// mod: the tool's module · fx: test files (fixtures.js) · t: checks and readers (check.js)
// plus t.process(files, options) with the entry's preset applied.
//
// Extra test files made in this spec (candidates for fixtures.js): quad(), solid(), stripes(), pngPhoto(),
// alphaWebp(), animatedGif(), heic() (a real HEIC: one HEVC keyframe from WebCodecs in a HEIF box), svg(),
// traceLogo(), exifJpeg() and textPng(). Helpers: pixels(), colourAt(), alphaAt(), items().
import { assert, eq, near, match, rejects, imageInfo } from '../check.js';
import { sniffType } from '../../public/assets/js/core/files.js';
import { canEncode } from '../../public/assets/js/core/image.js';
import { getGifenc } from '../../public/assets/js/core/vendor.js';

const RED = [255, 0, 0];
const GREEN = [0, 255, 0];
const BLUE = [0, 0, 255];
const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];
const MAGENTA = [255, 0, 255];
const CYAN = [0, 255, 255];
const PURPLE = [124, 77, 255]; // #7c4dff, the fixtures.js logo colour

const css = ([r, g, b]) => `rgb(${r}, ${g}, ${b})`;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const ascii = (s) => [...s].map((c) => c.charCodeAt(0));
const be16 = (n) => [(n >>> 8) & 255, n & 255];
const be32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const latin1 = async (blob) => new TextDecoder('latin1').decode(await blob.arrayBuffer());
const within = (p, ms, what) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(`${what} took longer than ${ms / 1000} s`)), ms))]);

// ---------- Test files ----------

const cache = new Map();
function once(key, make) {
  if (!cache.has(key)) cache.set(key, Promise.resolve().then(make).catch((err) => {
    cache.delete(key);
    throw err;
  }));
  return cache.get(key);
}

async function canvasFile(w, h, draw, type = 'image/png', name = 'image.png', quality = 0.92) {
  const c = new OffscreenCanvas(w, h);
  await draw(c.getContext('2d'), w, h);
  return new File([await c.convertToBlob({ type, quality })], name, { type });
}
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

/** Quadrants: red top left, green top right, blue bottom left, white bottom right. */
const quad = (w = 800, h = 600, type = 'image/png') => once(`quad ${w} ${h} ${type}`, () => canvasFile(w, h, (g) => {
  const [hw, hh] = [Math.floor(w / 2), Math.floor(h / 2)];
  for (const [c, x, y] of [[RED, 0, 0], [GREEN, hw, 0], [BLUE, 0, hh], [WHITE, hw, hh]]) {
    g.fillStyle = css(c);
    g.fillRect(x, y, x ? w - hw : hw, y ? h - hh : hh);
  }
}, type, `quad.${EXT[type]}`));

const solid = (w, h, rgb, name, type = 'image/png') => once(`solid ${w} ${h} ${rgb} ${name} ${type}`, () => canvasFile(w, h, (g) => {
  g.fillStyle = css(rgb);
  g.fillRect(0, 0, w, h);
}, type, name));

/** 300 × 100: red, green and blue thirds. */
const stripes = () => once('stripes', () => canvasFile(300, 100, (g) => {
  [RED, GREEN, BLUE].forEach((c, i) => {
    g.fillStyle = css(c);
    g.fillRect(i * 100, 0, 100, 100);
  });
}, 'image/png', 'stripes.png'));

/** The fixtures.js photo saved as a lossless PNG. */
const pngPhoto = (fx, w, h) => once(`pngPhoto ${w} ${h}`, async () => {
  const bmp = await createImageBitmap(await fx.jpg({ width: w, height: h }));
  return canvasFile(w, h, (g) => g.drawImage(bmp, 0, 0), 'image/png', 'photo.png');
});

/** The fixtures.js see-through logo saved as WebP (keeps its clear corners). */
const alphaWebp = (fx) => once('alphaWebp', async () => {
  const bmp = await createImageBitmap(await fx.png());
  return canvasFile(bmp.width, bmp.height, (g) => g.drawImage(bmp, 0, 0), 'image/webp', 'logo.webp', 0.9);
});

/** 200 × 150 animated GIF. Frame 1: red top half, green bottom half. Frame 2: all blue. */
const animatedGif = () => once('gif', async () => {
  const { GIFEncoder, quantize, applyPalette } = await getGifenc();
  const [w, h] = [200, 150];
  const gif = GIFEncoder();
  const frames = [
    (g) => {
      g.fillStyle = '#ff0000';
      g.fillRect(0, 0, w, h / 2);
      g.fillStyle = '#00ff00';
      g.fillRect(0, h / 2, w, h / 2);
    },
    (g) => {
      g.fillStyle = '#0000ff';
      g.fillRect(0, 0, w, h);
    },
  ];
  for (const draw of frames) {
    const g = new OffscreenCanvas(w, h).getContext('2d');
    draw(g);
    const { data } = g.getImageData(0, 0, w, h);
    const palette = quantize(data, 256);
    gif.writeFrame(applyPalette(data, palette), w, h, { palette, delay: 500 });
  }
  gif.finish();
  return new File([gif.bytes()], 'animation.gif', { type: 'image/gif' });
});

// HEIC: browsers can't save one, but Chrome can encode HEVC with WebCodecs. One keyframe in a minimal
// HEIF wrapper (ftyp, meta with hdlr/pitm/iloc/iinf/iprp, mdat) is a real HEIC that heic2any opens.
const HEVC_CODEC = 'hvc1.1.6.L93.B0';
const HEVC = typeof VideoEncoder !== 'undefined'
  && await VideoEncoder.isConfigSupported({ codec: HEVC_CODEC, width: 320, height: 240, bitrate: 4e6 }).then((r) => r.supported, () => false);

async function hevcKeyframe(canvas) {
  const chunks = [];
  let desc = null;
  let failed = null;
  const enc = new VideoEncoder({
    output(chunk, meta) {
      const b = new Uint8Array(chunk.byteLength);
      chunk.copyTo(b);
      chunks.push(b);
      const d = meta?.decoderConfig?.description;
      if (d) desc = ArrayBuffer.isView(d) ? new Uint8Array(d.buffer, d.byteOffset, d.byteLength).slice() : new Uint8Array(d).slice();
    },
    error(e) {
      failed = e;
    },
  });
  enc.configure({ codec: HEVC_CODEC, width: canvas.width, height: canvas.height, bitrate: 4e6, hevc: { format: 'hevc' } });
  const frame = new VideoFrame(canvas, { timestamp: 0 });
  enc.encode(frame, { keyFrame: true });
  frame.close();
  await enc.flush();
  enc.close();
  if (failed) throw failed;
  if (!chunks.length || !desc) throw new Error('HEVC encoder gave no keyframe or no hvcC (test file problem)');
  return { data: chunks[0], desc };
}

const box = (type, ...parts) => {
  const body = parts.flatMap((p) => Array.from(p));
  return [...be32(8 + body.length), ...ascii(type), ...body];
};
const fullBox = (type, version, ...parts) => box(type, [version, 0, 0, 0], ...parts);

function heifBytes(desc, data, w, h) {
  const build = (offset) => [
    box('ftyp', ascii('heic'), be32(0), ascii('mif1'), ascii('heic')),
    fullBox('meta', 0,
      fullBox('hdlr', 0, be32(0), ascii('pict'), be32(0), be32(0), be32(0), [0]),
      fullBox('pitm', 0, be16(1)),
      fullBox('iloc', 0, [0x44, 0x00], be16(1), be16(1), be16(0), be16(1), be32(offset), be32(data.length)),
      fullBox('iinf', 0, be16(1), fullBox('infe', 2, be16(1), be16(0), ascii('hvc1'), [0])),
      box('iprp', box('ipco', box('hvcC', desc), fullBox('ispe', 0, be32(w), be32(h))), fullBox('ipma', 0, be32(1), be16(1), [2, 0x81, 0x02]))),
  ];
  const [ftyp, meta] = build(0);
  const [ftyp2, meta2] = build(ftyp.length + meta.length + 8); // the picture starts after the mdat header
  return new Uint8Array([...ftyp2, ...meta2, ...be32(8 + data.length), ...ascii('mdat'), ...data]);
}

/** 320 × 240 HEIC: left half red, right half blue. */
const heic = () => once('heic', async () => {
  const c = new OffscreenCanvas(320, 240);
  const g = c.getContext('2d');
  g.fillStyle = '#ff0000';
  g.fillRect(0, 0, 160, 240);
  g.fillStyle = '#0000ff';
  g.fillRect(160, 0, 160, 240);
  const { data, desc } = await hevcKeyframe(c);
  return new File([heifBytes(desc, data, 320, 240)], 'iphone.heic', { type: 'image/heic' });
});

/** Starts like a HEIC, then garbage. */
const brokenHeic = () => new File([new Uint8Array([...box('ftyp', ascii('heic'), be32(0), ascii('mif1'), ascii('heic')), ...Array.from({ length: 3000 }, (_, i) => (i * 37) % 251)])], 'broken.heic', { type: 'image/heic' });

/** A red square with a blue circle, sized only by its viewBox. */
const svg = (vb = '0 0 64 64') => {
  const [, , w, h] = vb.split(' ').map(Number);
  return new File([`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"><rect width="${w}" height="${h}" fill="#ff0000"/><circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 4}" fill="#0000ff"/></svg>`],
    'icon.svg', { type: 'image/svg+xml' });
};

/** 600 × 400 see-through PNG: purple circle, green square, dark text. */
const traceLogo = () => once('traceLogo', () => canvasFile(600, 400, (g) => {
  g.fillStyle = '#7c4dff';
  g.beginPath();
  g.arc(140, 140, 100, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#2fd47f';
  g.fillRect(330, 40, 200, 200);
  g.fillStyle = '#16112a';
  g.font = 'bold 110px sans-serif';
  g.fillText('acTS', 40, 380);
}, 'image/png', 'logo.png'));

// Metadata: an 800 × 600 quad JPG with EXIF (camera, Orientation 6, date taken, GPS), XMP and a comment.
const META = { make: 'AcmeCam', model: 'Snapper 9000', taken: '2024:03:15 09:30:00', creator: 'Secret Creator Person', comment: 'Private comment text', pngNote: 'Private PNG note' };

/** One big-endian TIFF IFD at byte `at`: entries are [tag, type, count, bytes]. Values over 4 bytes go after it. */
function ifd(entries, at) {
  const head = [...be16(entries.length)];
  const data = [];
  const dataAt = at + 2 + entries.length * 12 + 4;
  for (const [tag, type, count, bytes] of entries) {
    head.push(...be16(tag), ...be16(type), ...be32(count));
    if (bytes.length <= 4) head.push(...bytes, ...Array(4 - bytes.length).fill(0));
    else {
      head.push(...be32(dataAt + data.length));
      data.push(...bytes);
      if (data.length % 2) data.push(0);
    }
  }
  return [...head, ...be32(0), ...data];
}

function exifTiff() {
  const str = (s) => [...ascii(s), 0];
  const rat = (...pairs) => pairs.flatMap(([n, d]) => [...be32(n), ...be32(d)]);
  const ifd0 = (exifAt, gpsAt) => [
    [0x010f, 2, META.make.length + 1, str(META.make)],
    [0x0110, 2, META.model.length + 1, str(META.model)],
    [0x0112, 3, 1, be16(6)],
    [0x8769, 4, 1, be32(exifAt)],
    [0x8825, 4, 1, be32(gpsAt)],
  ];
  const exif = [[0x9003, 2, META.taken.length + 1, str(META.taken)]];
  const gps = [
    [0x0000, 1, 4, [2, 3, 0, 0]],
    [0x0001, 2, 2, str('S')],
    [0x0002, 5, 3, rat([33, 1], [51, 1], [3549, 100])],
    [0x0003, 2, 2, str('E')],
    [0x0004, 5, 3, rat([151, 1], [12, 1], [4080, 100])],
  ];
  const exifAt = 8 + ifd(ifd0(0, 0), 8).length;
  const exifBytes = ifd(exif, exifAt);
  const gpsAt = exifAt + exifBytes.length;
  return [...ascii('MM'), 0, 42, ...be32(8), ...ifd(ifd0(exifAt, gpsAt), 8), ...exifBytes, ...ifd(gps, gpsAt)];
}

const exifJpeg = () => once('exifJpeg', async () => {
  const b = new Uint8Array(await (await quad(800, 600, 'image/jpeg')).arrayBuffer());
  const seg = (marker, bytes) => [0xff, marker, ...be16(bytes.length + 2), ...bytes];
  const xmp = `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator><rdf:Seq><rdf:li>${META.creator}</rdf:li></rdf:Seq></dc:creator></rdf:Description></rdf:RDF></x:xmpmeta>`;
  const extra = new Uint8Array([
    ...seg(0xe1, [...ascii('Exif'), 0, 0, ...exifTiff()]),
    ...seg(0xe1, [...ascii('http://ns.adobe.com/xap/1.0/'), 0, ...ascii(xmp)]),
    ...seg(0xfe, ascii(META.comment)),
  ]);
  const at = b[2] === 0xff && b[3] === 0xe0 ? 4 + ((b[4] << 8) | b[5]) : 2; // after the JFIF block, if there is one
  return new File([b.subarray(0, at), extra, b.subarray(at)], 'camera.jpg', { type: 'image/jpeg' });
});

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (bytes) => {
  let c = 0xffffffff;
  for (const x of bytes) c = CRC[(c ^ x) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

/** A quad PNG with a tEXt comment chunk. */
const textPng = () => once('textPng', async () => {
  const b = new Uint8Array(await (await quad(200, 150)).arrayBuffer());
  const body = [...ascii('tEXt'), ...ascii('Comment'), 0, ...ascii(META.pngNote)];
  const chunk = new Uint8Array([...be32(body.length - 4), ...body, ...be32(crc32(body))]);
  const iend = b.length - 12;
  return new File([b.subarray(0, iend), chunk, b.subarray(iend)], 'notes.png', { type: 'image/png' });
});

// ---------- Readers and checks ----------

function wrap(width, height, data) {
  return {
    width,
    height,
    data,
    at(x, y) {
      const i = (y * width + x) * 4;
      return Array.from(data.subarray(i, i + 4));
    },
  };
}

/** Decoded RGBA pixels of an image blob (SVG drawn at its own size, or at w × h). */
async function pixels(blob, w, h) {
  let src;
  let url;
  try {
    if (/svg/.test(blob.type)) {
      url = URL.createObjectURL(blob);
      src = new Image();
      src.src = url;
      await src.decode();
    } else src = await createImageBitmap(blob);
  } catch (err) {
    if (url) URL.revokeObjectURL(url);
    throw new Error(`The browser couldn't decode this output (${(await sniffType(blob)) || blob.type || 'unknown type'}, ${kb(blob.size)}): ${err.message}`);
  }
  try {
    const width = w || src.naturalWidth || src.width;
    const height = h || src.naturalHeight || src.height;
    const g = new OffscreenCanvas(width, height).getContext('2d', { willReadFrequently: true });
    g.drawImage(src, 0, 0, width, height);
    return wrap(width, height, g.getImageData(0, 0, width, height).data);
  } finally {
    src.close?.();
    if (url) URL.revokeObjectURL(url);
  }
}

const rgba = (p) => `rgba(${p.join(', ')})`;

/** The pixel at x, y is this colour (opaque unless want has an alpha) within tol per channel. */
function colourAt(p, x, y, want, tol, label) {
  const got = p.at(x, y);
  const a = want[3] ?? 255;
  const ok = want.slice(0, 3).every((v, i) => Math.abs(got[i] - v) <= tol) && Math.abs(got[3] - a) <= tol;
  assert(ok, `${label}: expected ${rgba([...want.slice(0, 3), a])} ± ${tol} at ${x}, ${y}, got ${rgba(got)}`);
}

function alphaAt(p, x, y, want, label) {
  const a = p.at(x, y)[3];
  assert(a === want, `${label}: expected alpha ${want} at ${x}, ${y}, got ${a}`);
}

/** Number of pixels in [x0, y0, x1, y1) that pass test([r, g, b, a]). */
function count(p, test, [x0, y0, x1, y1] = [0, 0, p.width, p.height]) {
  let n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (test(p.at(x, y))) n++;
  return n;
}

const isWhite = ([r, g, b, a]) => a === 255 && r >= 235 && g >= 235 && b >= 235;
const isBlack = ([r, g, b, a]) => a === 255 && r <= 25 && g <= 25 && b <= 25;
const near3 = (want, tol) => ([r, g, b, a]) => a > 200 && Math.abs(r - want[0]) <= tol && Math.abs(g - want[1]) <= tol && Math.abs(b - want[2]) <= tol;

/** The results of a fileTool process(): no per-file errors and n items. */
function items(out, n, what = 'output files') {
  const errs = (out.errors || []).map((e) => `${e.file?.name}: ${e.error?.message || e.error}`);
  assert(!errs.length, `the tool reported errors: ${errs.join('; ')}`);
  eq(out.items.length, n, `number of ${what}`);
  return out.items;
}

/** Sniffed format and decoded size (and alpha) of a raster image. */
async function isImage(blob, want, label = 'output') {
  const info = await imageInfo(blob).catch(async (err) => {
    throw new Error(`${label}: the browser couldn't decode it (${(await sniffType(blob)) || blob.type || 'unknown type'}, ${kb(blob.size)}): ${err.message}`);
  });
  for (const [k, v] of Object.entries(want)) eq(info[k], v, `${label} ${k}`);
  return info;
}

/** A spot whose (2r+1)² neighbourhood all passes test, so a traced copy should still have it. */
function solidSpot(p, test, r, [x0, y0, x1, y1]) {
  for (let y = y0 + r; y < y1 - r; y++) {
    for (let x = x0 + r; x < x1 - r; x++) {
      let ok = true;
      for (let dy = -r; dy <= r && ok; dy++) for (let dx = -r; dx <= r && ok; dx++) ok = test(p.at(x + dx, y + dy));
      if (ok) return [x, y];
    }
  }
  return null;
}

/** Corners (5 px in) are these four colours: top left, top right, bottom left, bottom right. */
function corners(p, [tl, tr, bl, br], tol, label) {
  const [r, b] = [p.width - 6, p.height - 6];
  colourAt(p, 5, 5, tl, tol, `${label}, top left`);
  colourAt(p, r, 5, tr, tol, `${label}, top right`);
  colourAt(p, 5, b, bl, tol, `${label}, bottom left`);
  colourAt(p, r, b, br, tol, `${label}, bottom right`);
}

const svgText = async (blob) => blob.text();

/** SVG checks shared by the trace tools: the type, a viewBox of w × h, and paths in it. */
async function checkSvg(item, w, h) {
  eq(item.blob.type, 'image/svg+xml', 'SVG MIME type');
  match(item.name, /\.svg$/, 'file name');
  const text = await svgText(item.blob);
  match(text, new RegExp(`^<svg viewBox="0 0 ${w} ${h}"`), 'SVG start');
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  assert(!doc.querySelector('parsererror'), 'the SVG does not parse as XML');
  assert(doc.querySelectorAll('path').length > 0, 'the SVG has no paths');
  return text;
}

/** For the "X to Y" converter pages: the preset picks the format, and the output is that format at the same size. */
async function converted(mod, t, file, to, { width, height, quality } = {}) {
  eq(mod.default.defaults(t.preset).to, to, 'default format from the preset');
  const [item] = items(await t.process([file], quality ? { quality } : {}), 1);
  match(item.name, new RegExp(`\\.${to}$`), 'file name');
  const info = await isImage(item.blob, { type: to, width, height });
  return { item, info };
}

const AVIF = await canEncode('image/avif');

// ---------- Tests ----------

export default {
  async 'compress-image'(mod, fx, t) {
    const jpg = await fx.jpg({ width: 1600, height: 1200 });
    const png = await pngPhoto(fx, 1000, 750);
    const webp = await fx.webp({ width: 1600, height: 1200 });
    for (const f of [jpg, png, webp]) assert(f.size > 150 * 1024, `test file ${f.name} should be over 150 KB to be worth compressing, but is ${kb(f.size)}`);

    const out = await t.process([jpg, png, webp], { mode: 'target', target: 100 });
    const target = items(out, 3);
    for (const [i, type] of ['jpg', 'png', 'webp'].entries()) {
      const { name, blob } = target[i];
      assert(blob.size <= 100 * 1024, `${name}: expected at most 100 KB, got ${kb(blob.size)}`);
      eq(await sniffType(blob), type, `${name} format`);
      const info = await imageInfo(blob); // still opens
      assert(info.width >= 100 && info.height >= 75, `${name} came out too small to use: ${info.width} × ${info.height}`);
      match(name, new RegExp(`-compressed\\.${type}$`), 'file name');
    }
    match(out.summary, /^Saved \d+%/, 'summary');

    const [q] = items(await t.process([jpg], { mode: 'quality', quality: 75 }), 1);
    await isImage(q.blob, { type: 'jpg', width: 1600, height: 1200 }, 'quality 75 JPG');
    assert(q.blob.size < jpg.size * 0.75, `quality 75 should be well under the original ${kb(jpg.size)}, got ${kb(q.blob.size)}`);

    const [pq] = items(await t.process([png], { mode: 'quality', quality: 50 }), 1);
    await isImage(pq.blob, { type: 'png', width: 1000, height: 750 }, 'quality 50 PNG');
    assert(pq.blob.size < png.size * 0.8, `PNG at 50% should be smaller than the original ${kb(png.size)}, got ${kb(pq.blob.size)}`);

    const logo = await fx.png({ width: 1200, height: 900 });
    const [lq] = items(await t.process([logo], { mode: 'quality', quality: 50 }), 1);
    await isImage(lq.blob, { type: 'png', width: 1200, height: 900, alpha: true }, 'see-through PNG');
    assert(lq.blob.size <= logo.size, `see-through PNG got bigger: ${kb(logo.size)} to ${kb(lq.blob.size)}`);
  },

  async 'resize-image'(mod, fx, t) {
    const jpg = await fx.jpg({ width: 1600, height: 1200 });
    eq(mod.targetSize(1600, 1200, { mode: 'pixels', width: 1080, height: '' }), { width: 1080, height: 810 }, 'targetSize');

    const [a] = items(await t.process([jpg], { mode: 'pixels', width: 1080, height: '' }), 1);
    await isImage(a.blob, { type: 'jpg', width: 1080, height: 810 }, 'width 1080');
    eq(a.name, 'photo-1080x810.jpg', 'file name');
    const [b] = items(await t.process([jpg], { mode: 'pixels', width: 500, height: 500 }), 1);
    await isImage(b.blob, { type: 'jpg', width: 500, height: 375 }, 'fit in 500 × 500');
    const [c] = items(await t.process([jpg], { mode: 'percent', percent: 25 }), 1);
    await isImage(c.blob, { type: 'jpg', width: 400, height: 300 }, '25%');
    const [d] = items(await t.process([jpg], { mode: 'pixels', width: '', height: 300 }), 1);
    await isImage(d.blob, { type: 'jpg', width: 400, height: 300 }, 'height 300 only');

    // A batch, and a PNG keeps its see-through areas and its picture.
    const [, logo] = items(await t.process([jpg, await quad()], { mode: 'percent', percent: 50 }), 2);
    await isImage(logo.blob, { type: 'png', width: 400, height: 300 }, 'quad PNG at 50%');
    corners(await pixels(logo.blob), [RED, GREEN, BLUE, WHITE], 3, 'resized quad');
    const [clear] = items(await t.process([await fx.png()], { mode: 'percent', percent: 50 }), 1);
    await isImage(clear.blob, { type: 'png', width: 200, height: 150, alpha: true }, 'see-through PNG at 50%');
  },

  async 'crop-image'(mod, fx, t) {
    eq(mod.centredBox(800, 600, 16 / 9), { x: 0, y: 75, w: 800, h: 450 }, 'centredBox 16:9');
    eq(mod.centredBox(800, 600, 1), { x: 100, y: 0, w: 600, h: 600 }, 'centredBox 1:1');
    const q = await quad();

    const [a] = items(await t.process([q], { ratio: 'free', box: { x: 350, y: 250, w: 100, h: 100 } }), 1);
    await isImage(a.blob, { type: 'png', width: 100, height: 100 }, 'box crop');
    eq(a.name, 'quad-cropped.png', 'file name');
    const p = await pixels(a.blob);
    colourAt(p, 1, 1, RED, 2, 'crop top left');
    colourAt(p, 98, 1, GREEN, 2, 'crop top right');
    colourAt(p, 1, 98, BLUE, 2, 'crop bottom left');
    colourAt(p, 98, 98, WHITE, 2, 'crop bottom right');

    const [b] = items(await t.process([q], { ratio: '16:9' }), 1);
    await isImage(b.blob, { type: 'png', width: 800, height: 450 }, '16:9 with no box');
    const [c] = items(await t.process([q], { ratio: '9:16' }), 1);
    const ci = await imageInfo(c.blob);
    eq([ci.height, Math.abs(ci.width - 338) <= 1], [600, true], `9:16 size (got ${ci.width} × ${ci.height})`);
    const [d] = items(await t.process([await fx.jpg()], { ratio: '1:1' }), 1);
    await isImage(d.blob, { type: 'jpg', width: 480, height: 480 }, 'JPG 1:1 stays JPG');
  },

  async 'profile-photo'(mod, fx, t) {
    const [a] = items(await t.process([await fx.jpg({ width: 1600, height: 1200 })], { ring: true, ringColour: '#00ffff', ringWidth: 10 }), 1);
    await isImage(a.blob, { type: 'png', width: 1024, height: 1024, alpha: true }, 'profile photo (capped at 1024)');
    eq(a.name, 'photo-profile.png', 'file name');
    const p = await pixels(a.blob);
    alphaAt(p, 2, 2, 0, 'top left corner');
    alphaAt(p, 1021, 1021, 0, 'bottom right corner');
    colourAt(p, 512, 30, CYAN, 10, 'ring near the top edge');
    colourAt(p, 30, 512, CYAN, 10, 'ring near the left edge');
    eq(p.at(512, 512)[3], 255, 'centre alpha');
    assert(!near3(CYAN, 40)(p.at(512, 512)), 'the centre should be the photo, not the ring');

    const [b] = items(await t.process([await fx.jpg()], { ring: false }), 1);
    await isImage(b.blob, { type: 'png', width: 480, height: 480, alpha: true }, 'no ring, small photo (not enlarged)');
    const [r, g, bl, al] = (await pixels(b.blob)).at(240, 20);
    assert(al === 255 && bl > r + 30, `top centre should be blue sky without a ring, got ${rgba([r, g, bl, al])}`);
  },

  async 'image-converter'(mod, fx, t) {
    const logo = await fx.png(); // 400 × 300, clear corners
    const formats = ['jpg', 'png', 'webp', 'gif', 'bmp', 'ico', 'tiff', ...(AVIF ? ['avif'] : [])];
    const out = {};
    for (const to of formats) {
      const [item] = items(await t.process([logo], { to }), 1, `${to} files`);
      eq(item.name, `logo.${to}`, `${to} file name`);
      eq(await sniffType(item.blob), to === 'jpg' ? 'jpg' : to, `${to} format (sniffed)`);
      out[to] = item.blob;
    }
    for (const to of ['jpg', 'bmp']) {
      const p = await pixels(out[to]);
      eq([p.width, p.height], [400, 300], `${to} size`);
      colourAt(p, 1, 1, WHITE, 3, `${to} clear corner`);
      colourAt(p, 200, 70, PURPLE, 12, `${to} logo colour`);
    }
    for (const to of ['png', 'webp', 'gif', ...(AVIF ? ['avif'] : [])]) {
      const p = await pixels(out[to]);
      eq([p.width, p.height], [400, 300], `${to} size`);
      alphaAt(p, 1, 1, 0, `${to} clear corner`);
      colourAt(p, 200, 70, PURPLE, 16, `${to} logo colour`);
    }

    // ICO: 4 PNGs inside, 16, 32, 48 and 256 px square.
    const ico = new Uint8Array(await out.ico.arrayBuffer());
    const v = new DataView(ico.buffer);
    eq([v.getUint16(0, true), v.getUint16(2, true), v.getUint16(4, true)], [0, 1, 4], 'ICO header (reserved, type, image count)');
    const sizes = [];
    for (let i = 0; i < 4; i++) {
      const o = 6 + 16 * i;
      const s = ico[o] || 256;
      sizes.push(s);
      const png = new Blob([ico.subarray(v.getUint32(o + 12, true), v.getUint32(o + 12, true) + v.getUint32(o + 8, true))], { type: 'image/png' });
      await isImage(png, { type: 'png', width: s, height: s }, `ICO image ${i + 1}`);
      if (s === 256) {
        const p = await pixels(png);
        alphaAt(p, 1, 1, 0, 'ICO 256 clear corner');
        colourAt(p, 128, 128 - 40, PURPLE, 16, 'ICO 256 logo colour');
      }
    }
    eq(sizes, [16, 32, 48, 256], 'ICO sizes');

    // TIFF converts back to JPG at the same size.
    const [back] = items(await t.process([new File([out.tiff], 'logo.tiff', { type: 'image/tiff' })], { to: 'jpg' }), 1);
    const bp = await pixels(back.blob);
    eq([await sniffType(back.blob), bp.width, bp.height], ['jpg', 400, 300], 'TIFF back to JPG');
    colourAt(bp, 200, 70, PURPLE, 12, 'TIFF round trip logo colour');

    // An SVG with only a viewBox comes out 1024 px wide (the default SVG width).
    const [s] = items(await t.process([svg()], { to: 'png' }), 1);
    await isImage(s.blob, { type: 'png', width: 1024, height: 1024 }, 'SVG with only a viewBox');

    // A batch of different inputs.
    const batch = items(await t.process([logo, await fx.jpg(), await fx.webp()], { to: 'webp', quality: 80 }), 3);
    for (const b of batch) eq(await sniffType(b.blob), 'webp', `${b.name} format`);
  },

  'heic-to-jpg': HEVC
    ? async (mod, fx, t) => {
      const file = await heic();
      eq(await sniffType(file), 'heic', 'test file is HEIC');
      const { item } = await converted(mod, t, file, 'jpg', { width: 320, height: 240, quality: 90 });
      eq(item.name, 'iphone.jpg', 'file name');
      const p = await pixels(item.blob);
      colourAt(p, 60, 120, RED, 40, 'left half');
      colourAt(p, 260, 120, BLUE, 40, 'right half');
      const err = await within(rejects(t.process([brokenHeic()]), 'converting a damaged HEIC'), 30000, 'A damaged HEIC');
      match(err.message, /couldn't open broken\.heic/i, 'damaged HEIC message');
    }
    : "This browser can't encode HEVC, so we can't make a HEIC test file in the page.",

  'heic-to-png': HEVC
    ? async (mod, fx, t) => {
      const { item } = await converted(mod, t, await heic(), 'png', { width: 320, height: 240 });
      const p = await pixels(item.blob);
      colourAt(p, 60, 120, RED, 40, 'left half');
      colourAt(p, 260, 120, BLUE, 40, 'right half');
    }
    : "This browser can't encode HEVC, so we can't make a HEIC test file in the page.",

  async 'webp-to-jpg'(mod, fx, t) {
    const { item } = await converted(mod, t, await fx.webp(), 'jpg', { width: 640, height: 480, quality: 90 });
    eq(item.blob.type, 'image/jpeg', 'MIME type');
    const [r, , b] = (await pixels(item.blob)).at(20, 20);
    assert(b > r + 30, 'top left should still be blue sky');
  },

  async 'webp-to-png'(mod, fx, t) {
    const src = await alphaWebp(fx);
    await isImage(src, { type: 'webp', alpha: true }, 'test WebP');
    const { item } = await converted(mod, t, src, 'png', { width: 400, height: 300 });
    const p = await pixels(item.blob);
    alphaAt(p, 1, 1, 0, 'clear corner');
    alphaAt(p, 398, 298, 0, 'clear corner');
    colourAt(p, 200, 70, PURPLE, 16, 'logo colour');
  },

  async 'png-to-jpg'(mod, fx, t) {
    const { item } = await converted(mod, t, await fx.png(), 'jpg', { width: 400, height: 300, quality: 90 });
    eq(item.blob.type, 'image/jpeg', 'MIME type');
    const p = await pixels(item.blob);
    colourAt(p, 1, 1, WHITE, 3, 'clear corner turns white');
    colourAt(p, 200, 70, PURPLE, 12, 'logo colour');
  },

  async 'jpg-to-png'(mod, fx, t) {
    const src = await fx.jpg();
    const { item } = await converted(mod, t, src, 'png', { width: 640, height: 480 });
    const [a, b] = [await pixels(src), await pixels(item.blob)];
    for (const [x, y] of [[20, 20], [320, 240], [600, 450]]) colourAt(b, x, y, a.at(x, y), 2, 'same pixels as the JPG');
  },

  async 'png-to-webp'(mod, fx, t) {
    const { item } = await converted(mod, t, await fx.png(), 'webp', { width: 400, height: 300, quality: 90 });
    const p = await pixels(item.blob);
    alphaAt(p, 1, 1, 0, 'clear corner');
    colourAt(p, 200, 70, PURPLE, 16, 'logo colour');
  },

  async 'jpg-to-webp'(mod, fx, t) {
    const src = await fx.jpg();
    const { item } = await converted(mod, t, src, 'webp', { width: 640, height: 480, quality: 90 });
    const [a, b] = [await pixels(src), await pixels(item.blob)];
    colourAt(b, 320, 240, a.at(320, 240).slice(0, 3), 30, 'centre pixel');
  },

  async 'svg-to-png'(mod, fx, t) {
    eq(mod.default.defaults(t.preset).to, 'png', 'default format from the preset');
    const [a] = items(await t.process([svg()], { svgWidth: 1024 }), 1);
    await isImage(a.blob, { type: 'png', width: 1024, height: 1024 }, 'square viewBox at 1024');
    eq(a.name, 'icon.png', 'file name');
    const p = await pixels(a.blob);
    colourAt(p, 20, 20, RED, 3, 'square colour');
    colourAt(p, 512, 512, BLUE, 3, 'circle colour (drawn sharp at full size)');
    const [b] = items(await t.process([svg()], { svgWidth: '' }), 1);
    await isImage(b.blob, { type: 'png', width: 150, height: 150 }, 'no width given');
    const [c] = items(await t.process([svg('0 0 200 100')], { svgWidth: 1024 }), 1);
    await isImage(c.blob, { type: 'png', width: 1024, height: 512 }, '2:1 viewBox at 1024');
  },

  async 'gif-to-jpg'(mod, fx, t) {
    const gif = await animatedGif();
    eq(await sniffType(gif), 'gif', 'test file is a GIF');
    if ('ImageDecoder' in window) {
      const dec = new ImageDecoder({ data: await gif.arrayBuffer(), type: 'image/gif' });
      await dec.tracks.ready;
      eq(dec.tracks.selectedTrack.frameCount, 2, 'test GIF frame count');
      dec.close();
    }
    const { item } = await converted(mod, t, gif, 'jpg', { width: 200, height: 150, quality: 80 });
    eq(item.name, 'animation.jpg', 'file name');
    const p = await pixels(item.blob);
    colourAt(p, 100, 30, RED, 20, 'first frame, top half');
    colourAt(p, 100, 120, GREEN, 20, 'first frame, bottom half');
  },

  async 'tiff-to-jpg'(mod, fx, t) {
    const [tiff] = items(await mod.default.process([await quad(400, 300)], { to: 'tiff' }, {}), 1);
    eq(await sniffType(tiff.blob), 'tiff', 'test TIFF (made with the converter)');
    const scan = new File([tiff.blob], 'scan.tiff', { type: 'image/tiff' });
    const { item } = await converted(mod, t, scan, 'jpg', { width: 400, height: 300, quality: 90 });
    eq(item.name, 'scan.jpg', 'file name');
    corners(await pixels(item.blob), [RED, GREEN, BLUE, WHITE], 12, 'TIFF to JPG');
  },

  async 'rotate-flip-image'(mod, fx, t) {
    const q = await quad();
    const turn = async (o, size, cols, label) => {
      const [r] = items(await t.process([q], { turn: 0, flipH: false, flipV: false, ...o }), 1);
      await isImage(r.blob, { type: 'png', width: size[0], height: size[1] }, label);
      corners(await pixels(r.blob), cols, 2, label);
      return r;
    };
    const r90 = await turn({ turn: 90 }, [600, 800], [BLUE, RED, WHITE, GREEN], 'turn 90');
    eq(r90.name, 'quad-rotated.png', 'file name');
    await turn({ turn: 180 }, [800, 600], [WHITE, BLUE, GREEN, RED], 'turn 180');
    await turn({ turn: 270 }, [600, 800], [GREEN, WHITE, RED, BLUE], 'turn 270');
    await turn({ flipH: true }, [800, 600], [GREEN, RED, WHITE, BLUE], 'flip horizontally');
    await turn({ flipV: true }, [800, 600], [BLUE, WHITE, RED, GREEN], 'flip vertically');
    const [j] = items(await t.process([await fx.jpg()], { turn: 90 }), 1);
    await isImage(j.blob, { type: 'jpg', width: 480, height: 640 }, 'JPG turned 90');
  },

  async 'add-border'(mod, fx, t) {
    const q = await quad();
    const [a] = items(await t.process([q], { size: 20, colour: '#000000', radius: 0 }), 1);
    await isImage(a.blob, { type: 'png', width: 840, height: 640, alpha: false }, 'square border');
    eq(a.name, 'quad-border.png', 'file name');
    const p = await pixels(a.blob);
    colourAt(p, 5, 5, BLACK, 2, 'border');
    colourAt(p, 834, 634, BLACK, 2, 'border');
    colourAt(p, 25, 25, RED, 2, 'picture inside the border');
    colourAt(p, 814, 614, WHITE, 2, 'picture inside the border');

    const [b] = items(await t.process([q], { size: 20, colour: '#000000', radius: 80 }), 1);
    await isImage(b.blob, { type: 'png', width: 840, height: 640 }, 'rounded border');
    const pb = await pixels(b.blob);
    alphaAt(pb, 1, 1, 0, 'rounded corner');
    colourAt(pb, 420, 5, BLACK, 2, 'border middle of the top');

    const [c] = items(await t.process([await fx.jpg()], { size: 10, colour: '#ff0000', radius: 0 }), 1);
    await isImage(c.blob, { type: 'jpg', width: 660, height: 500 }, 'JPG with a square border stays JPG');
    colourAt(await pixels(c.blob), 3, 250, RED, 20, 'red border');
    const [d] = items(await t.process([await fx.jpg()], { size: 10, colour: '#ff0000', radius: 60 }), 1);
    await isImage(d.blob, { type: 'png', width: 660, height: 500, alpha: true }, 'JPG with rounded corners becomes PNG');
  },

  async 'pixelate-image'(mod, fx, t) {
    const photo = await pngPhoto(fx, 640, 480);
    const [a] = items(await t.process([photo], { style: 'pixels', block: 50 }), 1);
    await isImage(a.blob, { type: 'png', width: 640, height: 480 }, 'pixelated');
    eq(a.name, 'photo-pixelated.png', 'file name');
    const p = await pixels(a.blob);
    const colours = new Set();
    for (let by = 0; by + 50 <= 480; by += 50) {
      for (let bx = 0; bx + 50 <= 640; bx += 50) {
        const first = p.at(bx, by).join();
        colours.add(first);
        for (let y = by; y < by + 50; y++) {
          for (let x = bx; x < bx + 50; x++) {
            if (p.at(x, y).join() !== first) throw new Error(`block at ${bx}, ${by} isn't one flat colour: ${rgba(p.at(x, y))} at ${x}, ${y} vs rgba(${first})`);
          }
        }
      }
    }
    assert(colours.size >= 20, `expected many different blocks, got ${colours.size} colours`);

    const [b] = items(await t.process([await quad()], { style: 'blur', blur: 20 }), 1);
    await isImage(b.blob, { type: 'png', width: 800, height: 600 }, 'blurred');
    const pb = await pixels(b.blob);
    colourAt(pb, 100, 100, RED, 6, 'far from edges, red stays red');
    colourAt(pb, 700, 500, WHITE, 6, 'far from edges, white stays white');
    const [r, g] = pb.at(400, 150);
    assert(r > 40 && g > 40, `colours should mix across the red and green edge, got ${rgba(pb.at(400, 150))} at 400, 150`);
  },

  async 'black-and-white'(mod, fx, t) {
    const s = await stripes();
    const grey = async (contrast, want) => {
      const [r] = items(await t.process([s], { contrast }), 1);
      await isImage(r.blob, { type: 'png', width: 300, height: 100 }, `contrast ${contrast}`);
      const p = await pixels(r.blob);
      want.forEach((v, i) => colourAt(p, 50 + i * 100, 50, [v, v, v], 1, `contrast ${contrast}, ${['red', 'green', 'blue'][i]}`));
      return r;
    };
    eq((await grey(0, [76, 150, 29])).name, 'stripes-bw.png', 'file name');
    await grey(100, [24, 171, 0]);
    const [j] = items(await t.process([await fx.jpg()], { contrast: 0 }), 1);
    const p = await pixels(j.blob);
    eq(await sniffType(j.blob), 'jpg', 'JPG stays JPG');
    for (const [x, y] of [[20, 20], [480, 140], [100, 440]]) {
      const [r, g, b] = p.at(x, y);
      assert(Math.max(r, g, b) - Math.min(r, g, b) <= 3, `photo pixel at ${x}, ${y} isn't grey: ${rgba(p.at(x, y))}`);
    }
  },

  async 'sharpen-image'(mod, fx, t) {
    const edge = await once('edge', () => canvasFile(200, 100, (g) => {
      g.fillStyle = 'rgb(100, 100, 100)';
      g.fillRect(0, 0, 100, 100);
      g.fillStyle = 'rgb(160, 160, 160)';
      g.fillRect(100, 0, 100, 100);
    }, 'image/png', 'edge.png'));
    const [a] = items(await t.process([edge], { amount: 50 }), 1);
    await isImage(a.blob, { type: 'png', width: 200, height: 100 }, 'sharpened');
    eq(a.name, 'edge-sharpened.png', 'file name');
    const p = await pixels(a.blob);
    colourAt(p, 20, 50, [100, 100, 100], 1, 'flat area, dark side');
    colourAt(p, 180, 50, [160, 160, 160], 1, 'flat area, light side');
    colourAt(p, 99, 50, [70, 70, 70], 1, 'dark pixel next to the edge gets darker');
    colourAt(p, 100, 50, [190, 190, 190], 1, 'light pixel next to the edge gets lighter');
  },

  async 'add-text-to-image'(mod, fx, t) {
    const BG = [48, 128, 192];
    const flat = await solid(800, 600, BG, 'flat.png');
    const before = await pixels(flat);
    eq([count(before, isWhite), count(before, isBlack)], [0, 0], 'white and black pixels before');

    const [a] = items(await t.process([flat], { text: 'Hello', size: 10, position: 'bottom', colour: '#ffffff', outline: true, outlineColour: '#000000' }), 1);
    await isImage(a.blob, { type: 'png', width: 800, height: 600 }, 'with text');
    eq(a.name, 'flat-text.png', 'file name');
    const p = await pixels(a.blob);
    const bottom = [0, 540, 800, 600];
    const [w, k] = [count(p, isWhite, bottom), count(p, isBlack, bottom)];
    assert(w > 100 && k > 100, `bottom tenth should now have white text with a black outline, got ${w} white and ${k} black pixels`);
    eq(count(p, (px) => !near3(BG, 0)(px), [0, 0, 800, 300]), 0, 'changed pixels in the top half');

    const [b] = items(await t.process([flat], { text: 'Hello', size: 10, position: 'top-left', colour: '#ffffff', outline: false }), 1);
    const pb = await pixels(b.blob);
    assert(count(pb, isWhite, [0, 0, 400, 120]) > 100, 'top left: no white text in the top left corner');
    eq(count(pb, isWhite, [400, 0, 800, 600]), 0, 'top left: white pixels in the right half');
    eq(count(pb, isBlack), 0, 'top left without an outline: black pixels');
  },

  async 'meme-maker'(mod, fx, t) {
    const BG = [48, 128, 192];
    const flat = await solid(800, 600, BG, 'flat.png');
    const [a] = items(await t.process([flat], { top: 'Top line', bottom: 'Bottom line', size: 10 }), 1);
    await isImage(a.blob, { type: 'png', width: 800, height: 600 }, 'meme');
    eq(a.name, 'flat-meme.png', 'file name');
    const p = await pixels(a.blob);
    for (const [label, region] of [['top', [0, 0, 800, 100]], ['bottom', [0, 500, 800, 600]]]) {
      const [w, k] = [count(p, isWhite, region), count(p, isBlack, region)];
      assert(w > 200 && k > 100, `${label} edge should have white text with a black outline, got ${w} white and ${k} black pixels`);
    }
    eq(count(p, (px) => !near3(BG, 0)(px), [0, 200, 800, 400]), 0, 'changed pixels in the middle');

    const [b] = items(await t.process([flat], { top: '', bottom: 'Only bottom', size: 10 }), 1);
    const pb = await pixels(b.blob);
    eq(count(pb, isWhite, [0, 0, 800, 300]), 0, 'white pixels in the top half with no top line');
    assert(count(pb, isWhite, [0, 500, 800, 600]) > 200, 'bottom line missing');
  },

  async 'image-splitter'(mod, fx, t) {
    const tiles = items(await t.process([await quad(1080, 1080)], { rows: 3, cols: 3 }), 9, 'tiles');
    for (const [i, tile] of tiles.entries()) {
      await isImage(tile.blob, { type: 'png', width: 360, height: 360 }, `tile ${i + 1}`);
      eq(tile.name, `quad-${i + 1}.png`, `tile ${i + 1} name`);
    }
    const at = async (i) => pixels(tiles[i].blob);
    colourAt(await at(0), 180, 180, RED, 2, 'tile 1');
    colourAt(await at(2), 180, 180, GREEN, 2, 'tile 3');
    colourAt(await at(6), 180, 180, BLUE, 2, 'tile 7');
    colourAt(await at(8), 180, 180, WHITE, 2, 'tile 9');
    corners(await at(4), [RED, GREEN, BLUE, WHITE], 2, 'middle tile');

    const odd = items(await t.process([await solid(1001, 700, [200, 100, 50], 'wide.jpg', 'image/jpeg')], { rows: 2, cols: 3 }), 6, 'tiles');
    const sizes = [];
    for (const tile of odd) {
      const i = await imageInfo(tile.blob);
      eq(i.type, 'jpg', 'JPG tiles stay JPG');
      sizes.push([i.width, i.height]);
    }
    eq(sizes, [[334, 350], [333, 350], [334, 350], [334, 350], [333, 350], [334, 350]], 'tile sizes for 1001 × 700 in 2 × 3');
  },

  async 'combine-images'(mod, fx, t) {
    const photo = await fx.jpg({ width: 1600, height: 1200 });
    const magenta = await solid(600, 800, MAGENTA, 'magenta.jpg', 'image/jpeg');
    const out = await t.process([photo, magenta], { direction: 'side' });
    const [a] = items(out, 1);
    await isImage(a.blob, { type: 'jpg', width: 1667, height: 800 }, 'side by side');
    eq(a.name, 'photo-combined.jpg', 'file name');
    const p = await pixels(a.blob);
    colourAt(p, 1660, 400, MAGENTA, 12, 'second image on the right');
    const [r, , b] = p.at(30, 30);
    assert(b > r + 30, `first image on the left should start with blue sky, got ${rgba(p.at(30, 30))}`);

    const logo = await fx.png({ width: 1000, height: 500 });
    const [s] = items(await t.process([photo, magenta, logo], { direction: 'stack' }), 1);
    await isImage(s.blob, { type: 'png', width: 600, height: 1550 }, 'stacked with a PNG');
    eq(s.name, 'photo-combined.png', 'file name');
    const ps = await pixels(s.blob);
    colourAt(ps, 300, 850, MAGENTA, 12, 'second image in the middle');
    alphaAt(ps, 2, 1547, 0, 'clear corner of the PNG at the bottom');
  },

  async 'collage-maker'(mod, fx, t) {
    const [red, green, blue] = await Promise.all([[RED, 'red'], [GREEN, 'green'], [BLUE, 'blue']].map(([c, n]) => solid(800, 600, c, `${n}.jpg`, 'image/jpeg')));
    const [a] = items(await t.process([red, green, blue], { layout: 'three-left', spacing: 20, background: '#ff00ff' }), 1);
    await isImage(a.blob, { type: 'jpg', width: 2000, height: 2000 }, 'collage');
    eq(a.name, 'collage.jpg', 'file name');
    const p = await pixels(a.blob);
    colourAt(p, 10, 10, MAGENTA, 12, 'background in the outer gap');
    colourAt(p, 1000, 1000, MAGENTA, 12, 'background between cells');
    colourAt(p, 505, 1000, RED, 12, 'big left cell (first photo)');
    colourAt(p, 1495, 505, GREEN, 12, 'top right cell (second photo)');
    colourAt(p, 1495, 1495, BLUE, 12, 'bottom right cell (third photo)');

    const [b] = items(await t.process([red, green, blue, await fx.jpg()], { layout: 'four', spacing: 0, background: '#ffffff' }), 1);
    const pb = await pixels(b.blob);
    colourAt(pb, 2, 2, RED, 12, 'four, no spacing: first cell reaches the corner');
    colourAt(pb, 1997, 2, GREEN, 12, 'four, no spacing: second cell');
    colourAt(pb, 2, 1997, BLUE, 12, 'four, no spacing: third cell');
  },

  async 'image-metadata'(mod, fx, t) {
    const file = await exifJpeg();
    const raw = await latin1(file);
    for (const v of Object.values(META).slice(0, 5)) assert(raw.includes(v), `test file should contain "${v}"`);

    const tags = await mod.readMetadata(file);
    eq([tags.Make, tags.Model], [META.make, META.model], 'camera found');
    near(tags.latitude, -33.85986, 0.0001, 'latitude');
    near(tags.longitude, 151.21133, 0.0001, 'longitude');
    const facts = Object.fromEntries(mod.keyFacts(tags).map((f) => [f.label, f.value]));
    eq(facts.Camera, `${META.make} ${META.model}`, 'Camera fact');
    eq(facts.Location, '-33.85986, 151.21133', 'Location fact');
    assert(facts.Taken, 'no Taken fact');

    const [clean] = items(await t.process([file]), 1);
    eq(clean.name, 'camera-clean.jpg', 'file name');
    eq(await sniffType(clean.blob), 'jpg', 'clean copy format');
    eq(Object.keys(await mod.readMetadata(clean.blob)), ['Orientation'], 'tags left in the clean copy');
    const cleanRaw = await latin1(clean.blob);
    for (const v of Object.values(META).slice(0, 5)) assert(!cleanRaw.includes(v), `the clean copy still contains "${v}"`);
    const [before, after] = [await pixels(file), await pixels(clean.blob)];
    eq([after.width, after.height], [600, 800], 'clean copy still shows rotated (Orientation 6)');
    let diff = -1;
    for (let i = 0; i < before.data.length && diff < 0; i++) if (before.data[i] !== after.data[i]) diff = i;
    assert(diff < 0, `decoded pixels differ from the original at byte ${diff}`);
    colourAt(after, 5, 5, BLUE, 12, 'top left after the orientation is applied');

    // A PNG text note goes too, and the pixels stay exact.
    const png = await textPng();
    assert((await latin1(png)).includes(META.pngNote), 'test PNG should contain its note');
    const [cp] = items(await t.process([png]), 1);
    eq([cp.name, await sniffType(cp.blob)], ['notes-clean.png', 'png'], 'clean PNG name and format');
    assert(!(await latin1(cp.blob)).includes(META.pngNote), 'the clean PNG still contains its text note');
    const [pa, pb] = [await pixels(png), await pixels(cp.blob)];
    assert(pa.data.every((v, i) => v === pb.data[i]), 'clean PNG pixels differ from the original');
  },

  async 'chart-maker'(mod, fx, t) {
    eq(mod.parseData('Month\tViews\nJan\t1,200\nFeb\t$1,850'), { labels: ['Jan', 'Feb'], series: [{ name: 'Views', values: [1200, 1850] }] }, 'pasted tab data');
    const data = mod.parseData('Month, Views, Likes\nJan, 1200, 310\nFeb, 1850, 420\nMar, 1600, 390');
    eq(data, { labels: ['Jan', 'Feb', 'Mar'], series: [{ name: 'Views', values: [1200, 1850, 1600] }, { name: 'Likes', values: [310, 420, 390] }] }, 'comma data with two series');
    eq(mod.parseData('A, 5\nB, 7'), { labels: ['A', 'B'], series: [{ name: 'Value', values: [5, 7] }] }, 'no header row');

    const purple = near3([0x6c, 0x3f, 0xe0], 12);
    const green = near3([0x2f, 0xd4, 0x7f], 12);
    for (const type of ['bar', 'line', 'pie']) {
      const { canvas, chart } = await mod.renderChart(data, { type, title: 'Views per month' });
      try {
        eq([canvas.width, canvas.height], [1600, 900], `${type} canvas size`);
        const p = wrap(1600, 900, canvas.getContext('2d').getImageData(0, 0, 1600, 900).data);
        colourAt(p, 1, 1, WHITE, 0, `${type} corner`);
        colourAt(p, 1598, 898, WHITE, 0, `${type} corner`);
        const [np, ng] = [count(p, purple), count(p, green)];
        assert(np > 1000, `${type}: first colour barely drawn (${np} pixels)`);
        assert(ng > 1000, `${type}: second colour barely drawn (${ng} pixels)`);
        assert(count(p, ([r, g, b]) => r + g + b < 200, [0, 0, 1600, 90]) > 100, `${type}: no title text at the top`);
      } finally {
        chart.destroy();
      }
    }
  },

  async 'image-to-svg'(mod, fx, t) {
    const logo = await traceLogo();
    const src = await pixels(logo);
    const dark = ([r, g, b, a]) => a === 255 && r + g + b < 150;
    const spot = solidSpot(src, dark, 3, [0, 280, 600, 400]);
    assert(spot, 'test logo: no solid dark text pixel found');

    const [item] = items(await t.process([logo], { colours: 16, detail: 'medium' }), 1);
    eq(item.name, 'logo.svg', 'file name');
    await checkSvg(item, 600, 400);
    const p = await pixels(item.blob, 600, 400);
    colourAt(p, 140, 140, PURPLE, 30, 'circle centre');
    colourAt(p, 430, 140, [0x2f, 0xd4, 0x7f], 30, 'square centre');
    alphaAt(p, 3, 3, 0, 'background (top left)');
    alphaAt(p, 590, 390, 0, 'background (bottom right)');
    alphaAt(p, 280, 140, 0, 'background between the shapes');
    const [r, g, b, a] = p.at(...spot);
    assert(a > 200 && r + g + b < 200, `text pixel at ${spot.join(', ')} should be dark, got ${rgba([r, g, b, a])}`);
  },

  async 'png-to-svg'(mod, fx, t) {
    const [item] = items(await t.process([await fx.png()], { colours: 16, detail: 'medium' }), 1);
    eq(item.name, 'logo.svg', 'file name');
    await checkSvg(item, 400, 300);
    const p = await pixels(item.blob, 400, 300);
    alphaAt(p, 2, 2, 0, 'corner');
    alphaAt(p, 397, 297, 0, 'corner');
    colourAt(p, 200, 70, PURPLE, 30, 'logo colour');
  },

  async 'jpg-to-svg'(mod, fx, t) {
    const [item] = items(await t.process([await fx.jpg({ width: 1600, height: 1200 })], { colours: 8, detail: 'low' }), 1);
    eq(item.name, 'photo.svg', 'file name');
    const text = await checkSvg(item, 600, 450);
    match(text, /width="600" height="450"/, 'traced size (Low traces at most 600 px across)');
    const p = await pixels(item.blob, 600, 450);
    const [r, , b, a] = p.at(20, 20);
    assert(a === 255 && b > r + 30, `top left should be blue sky, got ${rgba(p.at(20, 20))}`);
  },
};
