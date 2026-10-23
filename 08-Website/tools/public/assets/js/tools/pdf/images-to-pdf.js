import { fileTool } from '../../core/filetool.js';
import { getPdfLib } from '../../core/vendor.js';
import { baseName, sniffType } from '../../core/files.js';
import { decodeImage, drawToCanvas, encodeCanvas } from '../../core/image.js';
import { pdfBlob } from './_pages.js';

const ACCEPT = '.jpg,.jpeg,.png,.webp,.heic,.heif,.tif,.tiff,.gif,image/jpeg,image/png,image/webp,image/heic,image/heif,image/tiff,image/gif';
const PAGES = { a4: [595.28, 841.89], letter: [612, 792] };
const MARGIN = 24;

/** EXIF orientation of a JPEG (1 = upright). */
function jpegOrientation(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let o = 2; o + 10 < v.byteLength;) {
    const marker = v.getUint16(o);
    if (marker === 0xffe1 && v.getUint32(o + 4) === 0x45786966) {
      const t = o + 10;
      const le = v.getUint16(t) === 0x4949;
      const ifd = t + v.getUint32(t + 4, le);
      for (let i = 0, n = v.getUint16(ifd, le); i < n; i++) {
        if (v.getUint16(ifd + 2 + i * 12, le) === 0x0112) return v.getUint16(ifd + 10 + i * 12, le);
      }
      return 1;
    }
    if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) break;
    o += 2 + v.getUint16(o + 2);
  }
  return 1;
}

/** JPG and PNG go in as they are (no quality lost). Everything else, and turned phone photos, is redrawn as a JPG. */
async function embed(doc, file) {
  const type = await sniffType(file);
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    if (type === 'png') return await doc.embedPng(bytes);
    if (type === 'jpg' && jpegOrientation(bytes) <= 1) return await doc.embedJpg(bytes);
  } catch {
    // Fall through and redraw it.
  }
  const img = await decodeImage(file);
  const canvas = drawToCanvas(img.image, img.width, img.height, { background: '#fff' });
  img.close();
  return doc.embedJpg(await (await encodeCanvas(canvas, 'jpeg', 0.92)).arrayBuffer());
}

export default fileTool((preset) => ({
  accept: ACCEPT,
  multiple: true,
  reorder: true,
  dropTitle: preset.label ? `Drop your ${preset.label} images here` : 'Drop your images here',
  dropHint: 'JPG, PNG, WebP, HEIC, TIFF or GIF. Drag them into the order you want.',
  action: 'Create PDF',
  actionIcon: 'file-text',
  options: [
    { id: 'size', type: 'segmented', label: 'Page size', default: 'fit', choices: [{ value: 'fit', label: 'Fit each image' }, { value: 'a4', label: 'A4' }, { value: 'letter', label: 'Letter' }] },
  ],
  async process(files, { size }, ctx) {
    const { PDFDocument } = await getPdfLib();
    const doc = await PDFDocument.create();
    for (const [i, file] of files.entries()) {
      ctx.progress(i / files.length, `Adding ${file.name}`);
      const img = await embed(doc, file);
      // 96 DPI, so a photo prints at a sensible size. PDF pages max out at 14,400 points.
      const k = Math.min(0.75, 14400 / Math.max(img.width, img.height));
      const w = img.width * k;
      const ih = img.height * k;
      if (size === 'fit') {
        doc.addPage([w, ih]).drawImage(img, { x: 0, y: 0, width: w, height: ih });
      } else {
        let [pw, ph] = PAGES[size];
        if (w > ih) [pw, ph] = [ph, pw];
        const s = Math.min(1, (pw - 2 * MARGIN) / w, (ph - 2 * MARGIN) / ih);
        doc.addPage([pw, ph]).drawImage(img, { x: (pw - w * s) / 2, y: (ph - ih * s) / 2, width: w * s, height: ih * s });
      }
      await ctx.tick();
    }
    const n = doc.getPageCount();
    return { name: `${baseName(files[0].name)}.pdf`, blob: pdfBlob(await doc.save()), note: `${n} page${n === 1 ? '' : 's'}` };
  },
}));
