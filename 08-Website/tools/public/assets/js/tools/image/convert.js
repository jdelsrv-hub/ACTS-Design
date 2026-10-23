// Image converter: anything decodeImage() opens (including HEIC, SVG, TIFF, GIF and AVIF)
// to JPG, PNG, WebP, GIF, BMP, ICO or TIFF, plus AVIF when the browser can save it.
// Preset entries (heic-to-jpg and friends) only change the drop box title and the default format.
import { fileTool } from '../../core/filetool.js';
import { decodeImage, drawToCanvas, fitWithin, makeCanvas, encodeCanvas, canEncode, IMAGE_ACCEPT } from '../../core/image.js';
import { renameExt } from '../../core/files.js';
import { getGifenc, getUtif } from '../../core/vendor.js';
import { notice } from '../../core/ui.js';

const AVIF = await canEncode('image/avif');
const FORMATS = ['jpg', 'png', 'webp', 'gif', 'bmp', 'ico', 'tiff', ...(AVIF ? ['avif'] : [])];
const LABELS = { webp: 'WebP' };
const LOSSY = ['jpg', 'webp', 'avif'];
const ICO_SIZES = [16, 32, 48, 256];
const isSvg = (f) => /svg/.test(f.type) || /\.svg$/i.test(f.name);
const isGif = (f) => /gif/.test(f.type) || /\.gif$/i.test(f.name);
const pixels = (c) => c.getContext('2d').getImageData(0, 0, c.width, c.height);

async function toGif(canvas) {
  const { GIFEncoder, quantize, applyPalette } = await getGifenc();
  const { data, width, height } = pixels(canvas);
  let alpha = false;
  for (let i = 3; i < data.length && !alpha; i += 4) alpha = data[i] < 255;
  const format = alpha ? 'rgba4444' : 'rgb565';
  const palette = quantize(data, 256, { format, oneBitAlpha: alpha });
  const clear = palette.findIndex((p) => p[3] === 0);
  const gif = GIFEncoder();
  gif.writeFrame(applyPalette(data, palette, format), width, height, { palette, transparent: clear >= 0, transparentIndex: Math.max(0, clear) });
  gif.finish();
  return new Blob([gif.bytes()], { type: 'image/gif' });
}

// 24-bit BMP, rows stored bottom to top.
function toBmp(canvas) {
  const { data, width: w, height: hh } = pixels(canvas);
  const row = Math.ceil((w * 3) / 4) * 4;
  const out = new Uint8Array(54 + row * hh);
  const v = new DataView(out.buffer);
  v.setUint16(0, 0x4d42, true);
  v.setUint32(2, out.length, true);
  v.setUint32(10, 54, true);
  v.setUint32(14, 40, true);
  v.setInt32(18, w, true);
  v.setInt32(22, hh, true);
  v.setUint16(26, 1, true);
  v.setUint16(28, 24, true);
  v.setUint32(34, row * hh, true);
  for (let y = 0; y < hh; y++) {
    for (let x = 0, o = 54 + (hh - 1 - y) * row; x < w; x++, o += 3) {
      const i = (y * w + x) * 4;
      [out[o], out[o + 1], out[o + 2]] = [data[i + 2], data[i + 1], data[i]];
    }
  }
  return new Blob([out], { type: 'image/bmp' });
}

// ICO with 16, 32, 48 and 256 px PNG images inside (what browsers and Windows expect for favicons).
async function toIco(canvas) {
  const pngs = [];
  for (const s of ICO_SIZES) {
    const { width, height } = fitWithin(canvas.width, canvas.height, s, s, true);
    const square = makeCanvas(s, s);
    square.getContext('2d').drawImage(drawToCanvas(canvas, width, height), Math.round((s - width) / 2), Math.round((s - height) / 2));
    pngs.push(new Uint8Array(await (await encodeCanvas(square, 'png')).arrayBuffer()));
  }
  const head = new DataView(new ArrayBuffer(6 + 16 * pngs.length));
  head.setUint16(2, 1, true);
  head.setUint16(4, pngs.length, true);
  let offset = head.byteLength;
  ICO_SIZES.forEach((s, i) => {
    const o = 6 + 16 * i;
    head.setUint8(o, s % 256);
    head.setUint8(o + 1, s % 256);
    head.setUint16(o + 4, 1, true);
    head.setUint16(o + 6, 32, true);
    head.setUint32(o + 8, pngs[i].length, true);
    head.setUint32(o + 12, offset, true);
    offset += pngs[i].length;
  });
  return new Blob([head, ...pngs], { type: 'image/x-icon' });
}

async function toTiff(canvas) {
  const UTIF = await getUtif();
  return new Blob([UTIF.encodeImage(new Uint8Array(pixels(canvas).data.buffer), canvas.width, canvas.height)], { type: 'image/tiff' });
}

const ENCODERS = {
  jpg: (c, q) => encodeCanvas(c, 'jpeg', q),
  png: (c) => encodeCanvas(c, 'png'),
  webp: (c, q) => encodeCanvas(c, 'webp', q),
  avif: (c, q) => encodeCanvas(c, 'avif', q),
  gif: toGif,
  bmp: toBmp,
  ico: toIco,
  tiff: toTiff,
};

export default fileTool((preset) => ({
  accept: IMAGE_ACCEPT,
  multiple: true,
  dropTitle: preset.from ? `Drop your ${preset.from} files here` : 'Drop your images here',
  dropHint: 'Reads JPG, PNG, WebP, HEIC, SVG, TIFF, GIF, BMP and AVIF.',
  action: 'Convert',
  actionIcon: 'convert',
  options: [
    { id: 'to', type: 'segmented', label: 'Convert to', default: 'jpg', wide: true, choices: FORMATS.map((f) => ({ value: f, label: LABELS[f] || f.toUpperCase() })),
      help: "JPG and BMP can't be see-through, so clear areas turn white. GIF keeps up to 256 colours." },
    { id: 'quality', type: 'range', label: 'Quality', min: 10, max: 100, default: 90, unit: '%', showIf: (v) => LOSSY.includes(v.to) },
    { id: 'svgWidth', type: 'number', label: 'SVG width', min: 16, max: 8192, step: 1, unit: 'px', placeholder: 'Original', default: 1024, showIf: (v) => v.hasSvg,
      help: "SVGs don't have a fixed size, so choose how wide the picture should be." },
  ],
  renderExtra(extra, api) {
    api.setOption('hasSvg', api.files.some(isSvg));
    if (api.files.some(isGif)) extra.append(notice('info', 'Animated GIFs: we convert the first frame only.'));
  },
  async processFile(file, o) {
    const img = await decodeImage(file, { svgSize: isSvg(file) && o.svgWidth > 0 ? { width: o.svgWidth } : undefined });
    try {
      const canvas = drawToCanvas(img.image, img.width, img.height, { background: o.to === 'jpg' || o.to === 'bmp' ? '#FFFFFF' : undefined });
      const blob = await ENCODERS[o.to](canvas, o.quality / 100);
      const note = o.to === 'ico' ? '16, 32, 48 and 256 px' : `${canvas.width} × ${canvas.height}`;
      // Browsers can't show TIFF, so no preview for it.
      return { name: renameExt(file.name, o.to), blob, note, transparent: o.to !== 'jpg' && o.to !== 'bmp', preview: o.to === 'tiff' ? false : undefined };
    } finally {
      img.close();
    }
  },
}));
