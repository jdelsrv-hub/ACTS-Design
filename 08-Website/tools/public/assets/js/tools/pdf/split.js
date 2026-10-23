import { fileTool } from '../../core/filetool.js';
import { getPdfLib } from '../../core/vendor.js';
import { withSuffix } from '../../core/files.js';
import { PDF_ACCEPT, pdfBlob, pageCount, parseRanges } from './_pages.js';

export default fileTool({
  accept: PDF_ACCEPT,
  dropTitle: 'Drop your PDF here',
  action: 'Split PDF',
  actionIcon: 'split',
  describe: pageCount,
  options: [
    { id: 'mode', type: 'segmented', label: 'Split', default: 'ranges', choices: [{ value: 'ranges', label: 'By page ranges' }, { value: 'each', label: 'Every page' }] },
    { id: 'ranges', type: 'text', label: 'Page ranges', placeholder: 'For example: 1-3, 5', help: 'Each range becomes its own PDF. "1-3, 5" gives you two files.', showIf: (v) => v.mode === 'ranges' },
  ],
  validate: (_files, o) => (o.mode === 'ranges' && !o.ranges.trim() ? 'Type the page ranges you want, like 1-3, 5.' : null),
  zipName: 'split-pdf.zip',
  async processFile(file, { mode, ranges }, ctx) {
    const { PDFDocument } = await getPdfLib();
    const src = await PDFDocument.load(await file.arrayBuffer());
    const groups = mode === 'each' ? src.getPageIndices().map((i) => [i + 1]) : parseRanges(ranges, src.getPageCount());
    const out = [];
    for (const [k, pages] of groups.entries()) {
      ctx.progress(k / groups.length, `File ${k + 1} of ${groups.length}`);
      const doc = await PDFDocument.create();
      for (const p of await doc.copyPages(src, pages.map((n) => n - 1))) doc.addPage(p);
      const label = pages.length === 1 ? `page-${pages[0]}` : `pages-${pages[0]}-${pages.at(-1)}`;
      out.push({ name: withSuffix(file.name, label), blob: pdfBlob(await doc.save()), note: `${pages.length} page${pages.length === 1 ? '' : 's'}` });
      await ctx.tick();
    }
    return out;
  },
});
