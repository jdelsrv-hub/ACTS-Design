import { fileTool } from '../../core/filetool.js';
import { getPdfLib } from '../../core/vendor.js';
import { withSuffix, formatBytes, sizeChange } from '../../core/files.js';
import { drawToCanvas, encodeCanvas, fitWithin } from '../../core/image.js';
import { PDF_ACCEPT, pdfBlob, openPdf, closePdf, pageImages, refFor } from './_pages.js';

const MAX_SIDE = 2000; // longest side of a recompressed picture, in pixels
const QUALITY = 0.7;

/**
 * Recompress the big pictures in a PDF as JPEGs (no bigger than MAX_SIDE). Text, vector drawings and
 * see-through pictures are left alone. pdf.js decodes each picture; pdf-lib swaps it in. Returns PDF bytes.
 */
export async function compressPdf(bytes, ctx = {}) {
  const { PDFDocument, PDFName, PDFNumber, PDFRawStream, PDFBool } = await getPdfLib();
  const N = (k) => PDFName.of(k);
  const doc = await PDFDocument.load(bytes);
  const pdf = await openPdf(new Blob([bytes]));
  const done = new Set();
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      ctx.progress?.((n - 1) / pdf.numPages, `Page ${n} of ${pdf.numPages}`);
      const page = await pdf.getPage(n);
      for (const { ref, obj } of await pageImages(page)) {
        if (!ref || done.has(ref) || !obj.bitmap) continue;
        done.add(ref);
        const pdfRef = await refFor(ref);
        const stream = doc.context.lookup(pdfRef);
        if (!(stream instanceof PDFRawStream) || stream.contents.length < 50_000) continue;
        const d = stream.dict;
        if (d.has(N('SMask')) || d.has(N('Mask')) || d.lookup(N('ImageMask')) === PDFBool.True || d.lookup(N('BitsPerComponent'))?.asNumber?.() === 1) continue;
        const { width, height } = fitWithin(obj.width, obj.height, MAX_SIDE, MAX_SIDE);
        const canvas = drawToCanvas(obj.bitmap, width, height, { background: '#fff', sw: obj.width, sh: obj.height });
        const jpg = new Uint8Array(await (await encodeCanvas(canvas, 'jpeg', QUALITY)).arrayBuffer());
        canvas.width = 0;
        if (jpg.length > stream.contents.length * 0.9) continue;
        const dict = d.clone(doc.context);
        ['DecodeParms', 'Decode', 'SMaskInData', 'Length'].forEach((k) => dict.delete(N(k)));
        dict.set(N('Filter'), N('DCTDecode'));
        dict.set(N('ColorSpace'), N('DeviceRGB'));
        dict.set(N('BitsPerComponent'), PDFNumber.of(8));
        dict.set(N('Width'), PDFNumber.of(width));
        dict.set(N('Height'), PDFNumber.of(height));
        doc.context.assign(pdfRef, PDFRawStream.of(dict, jpg));
      }
      page.cleanup();
      await ctx.tick?.();
    }
  } finally {
    closePdf(pdf);
  }
  return doc.save();
}

export default fileTool({
  accept: PDF_ACCEPT,
  multiple: true,
  dropTitle: 'Drop your PDFs here',
  dropHint: 'We recompress the pictures inside. Text stays sharp and selectable.',
  action: 'Compress PDF',
  actionIcon: 'shrink',
  async processFile(file, _options, ctx) {
    const out = await compressPdf(await file.arrayBuffer(), ctx);
    if (out.length >= file.size * 0.97) throw new Error("This PDF is already about as small as we can make it. Its pictures are already compressed, or it's mostly text.");
    return { name: withSuffix(file.name, 'compressed'), blob: pdfBlob(out), note: sizeChange(file.size, out.length), before: file.size };
  },
  summarize(_files, items) {
    const before = items.reduce((s, i) => s + i.before, 0);
    const after = items.reduce((s, i) => s + i.blob.size, 0);
    return `Saved ${Math.round((1 - after / before) * 100)}% (${formatBytes(before)} to ${formatBytes(after)})`;
  },
});
