import { fileTool } from '../../core/filetool.js';
import { getPdfLib } from '../../core/vendor.js';
import { baseName } from '../../core/files.js';
import { encodeCanvas } from '../../core/image.js';
import { PDF_ACCEPT, openPdf, closePdf, pageImages, refFor, imageCanvas } from './_pages.js';

/** The original JPEG bytes of an image, if it's stored as a plain JPEG we can hand back untouched. */
async function plainJpeg(doc, ref, lib) {
  const { PDFName, PDFArray, PDFRawStream } = lib;
  const stream = doc && ref ? doc.context.lookup(await refFor(ref)) : null;
  if (!(stream instanceof PDFRawStream)) return null;
  const d = stream.dict;
  const dct = PDFName.of('DCTDecode');
  const filter = d.lookup(PDFName.of('Filter'));
  const isJpeg = filter === dct || (filter instanceof PDFArray && filter.size() === 1 && filter.lookup(0) === dct);
  if (!isJpeg || ['SMask', 'Mask', 'Decode'].some((k) => d.has(PDFName.of(k)))) return null;
  return stream.contents;
}

/** Every picture in a PDF: JPEGs exactly as stored, everything else as PNG. Returns [{ name, blob }]. */
export async function extractImages(file, ctx = {}) {
  const lib = await getPdfLib();
  const pdf = await openPdf(file);
  const doc = await lib.PDFDocument.load(await file.arrayBuffer()).catch(() => null);
  const out = [];
  const seen = new Set();
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      ctx.progress?.((n - 1) / pdf.numPages, `Page ${n} of ${pdf.numPages}`);
      const page = await pdf.getPage(n);
      for (const { id, ref, obj } of await pageImages(page)) {
        const key = ref || id;
        if ((key && seen.has(key)) || obj.width < 8 || obj.height < 8) continue;
        seen.add(key);
        const name = `${baseName(file.name)}-page${n}-${out.length + 1}`;
        const jpeg = await plainJpeg(doc, ref, lib);
        if (jpeg) {
          out.push({ name: `${name}.jpg`, blob: new Blob([jpeg], { type: 'image/jpeg' }), note: `${obj.width} × ${obj.height}` });
          continue;
        }
        const canvas = imageCanvas(obj);
        if (canvas) out.push({ name: `${name}.png`, blob: await encodeCanvas(canvas, 'png'), note: `${obj.width} × ${obj.height}` });
      }
      page.cleanup();
      await ctx.tick?.();
    }
  } finally {
    closePdf(pdf);
  }
  if (!out.length) throw new Error("We didn't find any pictures in this PDF. Text and drawn shapes aren't pictures, so there's nothing to save.");
  return out;
}

export default fileTool({
  accept: PDF_ACCEPT,
  dropTitle: 'Drop your PDF here',
  action: 'Extract images',
  actionIcon: 'image-down',
  zipName: 'pdf-images.zip',
  async processFile(file, _options, ctx) {
    return extractImages(file, ctx);
  },
});
