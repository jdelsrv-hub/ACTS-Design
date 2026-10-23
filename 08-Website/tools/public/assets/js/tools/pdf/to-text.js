import { fileTool } from '../../core/filetool.js';
import { renameExt } from '../../core/files.js';
import { PDF_ACCEPT, NO_TEXT, openPdf, closePdf, pageLines } from './_pages.js';

/** All the text in a PDF, page by page. A bigger gap between lines becomes a blank line. */
export async function pdfToText(file, ctx = {}) {
  const pdf = await openPdf(file);
  const pages = [];
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      ctx.progress?.((n - 1) / pdf.numPages, `Reading page ${n} of ${pdf.numPages}`);
      const page = await pdf.getPage(n);
      let text = '';
      let prev = null;
      for (const line of await pageLines(page)) {
        if (prev && line.y - prev.y > prev.size * 1.8) text += '\n';
        text += `${line.text.trimEnd()}\n`;
        prev = line;
      }
      pages.push(text);
      page.cleanup();
      await ctx.tick?.();
    }
  } finally {
    closePdf(pdf);
  }
  const text = pages.filter((p) => p.trim()).join('\n').trim();
  if (!text) throw new Error(NO_TEXT);
  return text;
}

export default fileTool({
  accept: PDF_ACCEPT,
  dropTitle: 'Drop your PDF here',
  action: 'Get the text',
  actionIcon: 'text',
  async processFile(file, _options, ctx) {
    return { name: renameExt(file.name, 'txt'), label: 'Text from your PDF', text: await pdfToText(file, ctx) };
  },
});
