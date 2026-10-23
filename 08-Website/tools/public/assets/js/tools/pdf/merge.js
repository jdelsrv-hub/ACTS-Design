import { fileTool } from '../../core/filetool.js';
import { getPdfLib } from '../../core/vendor.js';
import { withSuffix } from '../../core/files.js';

export default fileTool({
  accept: '.pdf,application/pdf',
  multiple: true,
  minFiles: 2,
  reorder: true,
  dropTitle: 'Drop your PDFs here',
  dropHint: 'Add two or more, then drag them into the order you want.',
  action: 'Merge PDFs',
  actionIcon: 'merge',
  async process(files, _options, ctx) {
    const { PDFDocument } = await getPdfLib();
    const out = await PDFDocument.create();
    for (const [i, file] of files.entries()) {
      ctx.progress(i / files.length, `Adding ${file.name}`);
      const src = await PDFDocument.load(await file.arrayBuffer());
      for (const page of await out.copyPages(src, src.getPageIndices())) out.addPage(page);
      await ctx.tick();
    }
    const blob = new Blob([await out.save()], { type: 'application/pdf' });
    return { name: withSuffix(files[0].name, 'merged'), blob, note: `${out.getPageCount()} pages` };
  },
});
