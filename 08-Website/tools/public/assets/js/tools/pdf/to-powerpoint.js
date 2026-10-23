import { fileTool } from '../../core/filetool.js';
import { notice } from '../../core/ui.js';
import { loadScript } from '../../core/vendor.js';
import { renameExt } from '../../core/files.js';
import { PDF_ACCEPT, openPdf, closePdf, renderPage } from './_pages.js';

// PptxGenJS (MIT), bundled build with its zip library.
const PPTXGENJS = 'https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.bundle.js';
const PPTX_TYPE = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const LIMIT = 'Each page becomes a picture on its own slide, so it looks the same but the text isn\'t editable.';

/** Every page as a full-slide picture. The slide shape matches the first page. Returns a .pptx Blob. */
export async function pdfToPptx(file, ctx = {}) {
  const PptxGenJS = await loadScript(PPTXGENJS, 'PptxGenJS');
  const pdf = await openPdf(file);
  try {
    const first = (await pdf.getPage(1)).getViewport({ scale: 1 });
    const W = 10; // inches
    const H = Math.min(56, Math.max(1, (W * first.height) / first.width));
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'PDF', width: W, height: H });
    pptx.layout = 'PDF';
    for (let n = 1; n <= pdf.numPages; n++) {
      ctx.progress?.((n - 1) / pdf.numPages, `Page ${n} of ${pdf.numPages}`);
      const page = await pdf.getPage(n);
      const vp = page.getViewport({ scale: 1 });
      const canvas = await renderPage(page, 150 / 72);
      page.cleanup();
      const k = Math.min(W / vp.width, H / vp.height);
      const w = vp.width * k;
      const ih = vp.height * k;
      pptx.addSlide().addImage({ data: canvas.toDataURL('image/jpeg', 0.85), x: (W - w) / 2, y: (H - ih) / 2, w, h: ih });
      canvas.width = 0;
      await ctx.tick?.();
    }
    return new Blob([await pptx.write({ outputType: 'blob' })], { type: PPTX_TYPE });
  } finally {
    closePdf(pdf);
  }
}

export default fileTool({
  accept: PDF_ACCEPT,
  dropTitle: 'Drop your PDF here',
  action: 'Convert to PowerPoint',
  actionIcon: 'presentation',
  renderEmpty: (view) => view.append(notice('info', LIMIT)),
  renderExtra: (extra) => extra.append(notice('info', LIMIT)),
  async processFile(file, _options, ctx) {
    return { name: renameExt(file.name, 'pptx'), blob: await pdfToPptx(file, ctx) };
  },
});
