import { fileTool } from '../../core/filetool.js';
import { getPdfLib } from '../../core/vendor.js';
import { withSuffix } from '../../core/files.js';
import { PDF_ACCEPT, pdfBlob, pageCount, parseRanges } from './_pages.js';

export default fileTool({
  accept: PDF_ACCEPT,
  dropTitle: 'Drop your PDF here',
  action: 'Rotate PDF',
  actionIcon: 'rotate-cw',
  describe: pageCount,
  options: [
    { id: 'angle', type: 'segmented', label: 'Turn', default: 90, choices: [{ value: 90, label: '90° clockwise' }, { value: 180, label: '180°' }, { value: 270, label: '90° anticlockwise' }] },
    { id: 'which', type: 'segmented', label: 'Pages', default: 'all', choices: [{ value: 'all', label: 'All pages' }, { value: 'some', label: 'Chosen pages' }] },
    { id: 'pages', type: 'text', label: 'Pages to rotate', placeholder: 'For example: 1-3, 5', showIf: (v) => v.which === 'some' },
  ],
  validate: (_files, o) => (o.which === 'some' && !o.pages.trim() ? 'Type the pages to rotate, like 1-3, 5.' : null),
  async processFile(file, { angle, which, pages }) {
    const { PDFDocument, degrees } = await getPdfLib();
    const doc = await PDFDocument.load(await file.arrayBuffer());
    const chosen = which === 'some' ? new Set(parseRanges(pages, doc.getPageCount()).flat()) : null;
    doc.getPages().forEach((page, i) => {
      if (!chosen || chosen.has(i + 1)) page.setRotation(degrees((page.getRotation().angle + Number(angle)) % 360));
    });
    return { name: withSuffix(file.name, 'rotated'), blob: pdfBlob(await doc.save()) };
  },
});
