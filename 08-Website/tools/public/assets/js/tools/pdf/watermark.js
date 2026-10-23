import { fileTool } from '../../core/filetool.js';
import { notice } from '../../core/ui.js';
import { getPdfLib } from '../../core/vendor.js';
import { withSuffix } from '../../core/files.js';
import { decodeImage, drawToCanvas, encodeCanvas } from '../../core/image.js';
import { PDF_ACCEPT, pdfBlob, pageFrame } from './_pages.js';
import { encodable } from './_layout.js';

/** Bottom-left corner for a w × h box rotated by `angle` degrees with its centre at (cx, cy). */
function cornerFor(cx, cy, w, ht, angle) {
  const a = (angle * Math.PI) / 180;
  return [cx - (w / 2) * Math.cos(a) + (ht / 2) * Math.sin(a), cy - (w / 2) * Math.sin(a) - (ht / 2) * Math.cos(a)];
}

/** Stamp every page. Text runs corner to corner; an image sits in the middle at half the page width. */
export async function watermarkPdf(bytes, { kind = 'text', text = '', image = null, opacity = 30 } = {}) {
  const { PDFDocument, StandardFonts, rgb, degrees } = await getPdfLib();
  const doc = await PDFDocument.load(bytes);
  const alpha = Math.min(1, Math.max(0.05, Number(opacity) / 100));
  let font;
  let img;
  if (kind === 'image') {
    const d = await decodeImage(image);
    const canvas = drawToCanvas(d.image, d.width, d.height);
    d.close();
    img = await doc.embedPng(await (await encodeCanvas(canvas, 'png')).arrayBuffer());
  } else {
    font = await doc.embedFont(StandardFonts.HelveticaBold);
    [text] = encodable(font, String(text).replace(/\s+/g, ' ').trim());
    if (!text) throw new Error("We can't show those characters in a watermark. Try plain letters and numbers.");
  }
  for (const page of doc.getPages()) {
    const f = pageFrame(page);
    const [cx, cy] = f.toPdf(f.vw / 2, f.vh / 2);
    if (img) {
      const k = Math.min((f.vw * 0.5) / img.width, (f.vh * 0.5) / img.height);
      const [x, y] = cornerFor(cx, cy, img.width * k, img.height * k, f.r);
      page.drawImage(img, { x, y, width: img.width * k, height: img.height * k, rotate: degrees(f.r), opacity: alpha });
    } else {
      const angle = (Math.atan2(f.vh, f.vw) * 180) / Math.PI;
      const size = Math.min((0.75 * Math.hypot(f.vw, f.vh)) / font.widthOfTextAtSize(text, 1), f.vh / 4);
      const [x, y] = cornerFor(cx, cy, font.widthOfTextAtSize(text, size), size * 0.72, f.r + angle);
      page.drawText(text, { x, y, size, font, color: rgb(0.5, 0.5, 0.5), opacity: alpha, rotate: degrees(f.r + angle) });
    }
  }
  return doc.save();
}

export default fileTool({
  accept: PDF_ACCEPT,
  dropTitle: 'Drop your PDF here',
  action: 'Add watermark',
  actionIcon: 'stamp',
  options: [
    { id: 'kind', type: 'segmented', label: 'Stamp', default: 'text', choices: [{ value: 'text', label: 'Text' }, { value: 'image', label: 'Image' }] },
    { id: 'text', type: 'text', label: 'Text', default: 'DRAFT', maxLength: 60, showIf: (v) => v.kind === 'text' },
    { id: 'image', type: 'file', label: 'Image', accept: 'image/*,.heic,.heif', buttonLabel: 'Choose image', help: 'A PNG with a see-through background works best for logos.', showIf: (v) => v.kind === 'image' },
    { id: 'opacity', type: 'range', label: 'Opacity', default: 30, min: 5, max: 100, step: 5, unit: '%' },
  ],
  validate: (_files, o) => (o.kind === 'image' ? (o.image ? null : 'Choose an image for the watermark.') : o.text.trim() ? null : 'Type the watermark text.'),
  renderExtra: (extra) => extra.append(notice('info', 'Text stamps use a standard font that covers English and most Western European languages. Other characters, like emoji or Chinese, are left out.')),
  async processFile(file, options) {
    return { name: withSuffix(file.name, 'watermarked'), blob: pdfBlob(await watermarkPdf(await file.arrayBuffer(), options)) };
  },
});
