import { fileTool } from '../../core/filetool.js';
import { notice } from '../../core/ui.js';
import { renameExt } from '../../core/files.js';
import { PDF_ACCEPT, NO_TEXT, openPdf, closePdf, pageLines } from './_pages.js';
import { docx } from './_office.js';

const LIMIT = "We copy the text, in reading order, into a Word document you can edit. The layout, fonts, pictures and tables aren't kept.";

/** Lines -> paragraphs: lines close together and the same size join up. */
function paragraphs(lines) {
  const out = [];
  let para = null;
  let prev = null;
  for (const line of lines) {
    const text = line.text.trim();
    const joins = para && line.y > prev.y && line.y - prev.y < prev.size * 1.6 && Math.abs(line.size - prev.size) < 1 && !/^([•▪◦·*–-]|\d+[.)])\s/.test(text);
    if (joins) para.text += (para.text.endsWith('-') ? '' : ' ') + text;
    else out.push((para = { text, size: line.size }));
    prev = line;
  }
  return out;
}

/** The text of a PDF as a .docx Blob. Bigger text than the body text comes out bold. */
export async function pdfToDocx(file, ctx = {}) {
  const pdf = await openPdf(file);
  const paras = [];
  let size;
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      ctx.progress?.((n - 1) / pdf.numPages, `Reading page ${n} of ${pdf.numPages}`);
      const page = await pdf.getPage(n);
      size ||= page.getViewport({ scale: 1 });
      const ps = paragraphs(await pageLines(page));
      if (ps.length && paras.length) ps[0].newPage = true;
      paras.push(...ps);
      page.cleanup();
      await ctx.tick?.();
    }
  } finally {
    closePdf(pdf);
  }
  if (!paras.length) throw new Error(NO_TEXT);
  // Body text = the size with the most characters.
  const bySize = new Map();
  for (const p of paras) bySize.set(Math.round(p.size), (bySize.get(Math.round(p.size)) || 0) + p.text.length);
  const body = [...bySize].sort((a, b) => b[1] - a[1])[0][0];
  for (const p of paras) p.bold = p.size >= body * 1.2;
  return docx(paras, { width: size.width, height: size.height });
}

export default fileTool({
  accept: PDF_ACCEPT,
  dropTitle: 'Drop your PDF here',
  action: 'Convert to Word',
  actionIcon: 'file-output',
  renderEmpty: (view) => view.append(notice('info', LIMIT)),
  renderExtra: (extra) => extra.append(notice('info', LIMIT)),
  async processFile(file, _options, ctx) {
    return { name: renameExt(file.name, 'docx'), blob: await pdfToDocx(file, ctx) };
  },
});
