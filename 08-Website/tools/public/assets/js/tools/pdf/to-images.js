import { fileTool } from '../../core/filetool.js';
import { baseName } from '../../core/files.js';
import { encodeCanvas } from '../../core/image.js';
import { PDF_ACCEPT, openPdf, closePdf, renderPage } from './_pages.js';

const DPI = 150;

export default fileTool({
  accept: PDF_ACCEPT,
  dropTitle: 'Drop your PDF here',
  dropHint: 'Every page becomes its own image.',
  action: 'Convert pages',
  actionIcon: 'image',
  options: [
    { id: 'format', type: 'segmented', label: 'Format', default: 'jpeg', choices: [{ value: 'jpeg', label: 'JPG' }, { value: 'png', label: 'PNG' }] },
  ],
  async processFile(file, { format }, ctx) {
    const pdf = await openPdf(file);
    const ext = format === 'png' ? 'png' : 'jpg';
    const out = [];
    try {
      for (let n = 1; n <= pdf.numPages; n++) {
        ctx.progress((n - 1) / pdf.numPages, `Page ${n} of ${pdf.numPages}`);
        const page = await pdf.getPage(n);
        const canvas = await renderPage(page, DPI / 72);
        page.cleanup();
        out.push({ name: `${baseName(file.name)}-page-${n}.${ext}`, blob: await encodeCanvas(canvas, format, 0.9), note: `${canvas.width} × ${canvas.height}` });
        canvas.width = 0;
        await ctx.tick();
      }
    } finally {
      closePdf(pdf);
    }
    return out;
  },
});
