import { fileTool } from '../../core/filetool.js';
import { getPdfLib } from '../../core/vendor.js';
import { withSuffix } from '../../core/files.js';
import { PDF_ACCEPT, pdfBlob, pageFrame } from './_pages.js';

const SIZE = 11;
const EDGE = 28; // about 1 cm from the edge
const FORMATS = { n: (n) => `${n}`, page: (n) => `Page ${n}`, of: (n, last) => `Page ${n} of ${last}`, slash: (n, last) => `${n} / ${last}` };

/** Number every page. position: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left'. */
export async function addPageNumbers(bytes, { position = 'bottom-center', format = 'n', start = 1 } = {}) {
  const { PDFDocument, StandardFonts, rgb, degrees } = await getPdfLib();
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const first = Math.round(Number(start) || 0);
  const last = first + doc.getPageCount() - 1;
  doc.getPages().forEach((page, i) => {
    const f = pageFrame(page);
    const label = (FORMATS[format] || FORMATS.n)(first + i, last);
    const w = font.widthOfTextAtSize(label, SIZE);
    const x = position.endsWith('left') ? EDGE : position.endsWith('right') ? f.vw - EDGE - w : (f.vw - w) / 2;
    const y = position.startsWith('top') ? EDGE + SIZE * 0.72 : f.vh - EDGE;
    const [px, py] = f.toPdf(x, y);
    page.drawText(label, { x: px, y: py, size: SIZE, font, color: rgb(0.2, 0.2, 0.2), rotate: degrees(f.r) });
  });
  return doc.save();
}

export default fileTool({
  accept: PDF_ACCEPT,
  dropTitle: 'Drop your PDF here',
  action: 'Add page numbers',
  actionIcon: 'hash',
  options: [
    { id: 'position', type: 'select', label: 'Position', default: 'bottom-center', choices: [
      { value: 'bottom-center', label: 'Bottom centre' }, { value: 'bottom-right', label: 'Bottom right' }, { value: 'bottom-left', label: 'Bottom left' },
      { value: 'top-center', label: 'Top centre' }, { value: 'top-right', label: 'Top right' }, { value: 'top-left', label: 'Top left' }] },
    { id: 'format', type: 'select', label: 'Format', default: 'n', choices: [
      { value: 'n', label: '1' }, { value: 'page', label: 'Page 1' }, { value: 'of', label: 'Page 1 of 10' }, { value: 'slash', label: '1 / 10' }] },
    { id: 'start', type: 'number', label: 'Start at', default: 1, min: 0, step: 1 },
  ],
  async processFile(file, options) {
    return { name: withSuffix(file.name, 'numbered'), blob: pdfBlob(await addPageNumbers(await file.arrayBuffer(), options)) };
  },
});
