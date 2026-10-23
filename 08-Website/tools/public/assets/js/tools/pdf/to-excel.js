import { fileTool } from '../../core/filetool.js';
import { notice } from '../../core/ui.js';
import { renameExt } from '../../core/files.js';
import { PDF_ACCEPT, NO_TEXT, openPdf, closePdf, pageItems } from './_pages.js';
import { xlsx } from './_office.js';

const LIMIT = 'Works best on simple tables with clear rows and columns. Each page becomes its own sheet. Merged cells, colours and borders aren\'t kept.';

/**
 * Text on a page -> rows of cells. Rows come from text on the same line; a wide gap starts a new cell.
 * Columns come from where cells line up across the rows that have two or more cells.
 */
export function tableRows(items) {
  const lines = [];
  for (const it of items.filter((i) => i.str.trim()).sort((a, b) => a.y - b.y || a.x - b.x)) {
    const line = lines.at(-1);
    if (line && Math.abs(it.y - line.y) < line.size * 0.5) line.items.push(it);
    else lines.push({ y: it.y, size: it.size, items: [it] });
  }
  const rows = lines.map((line) => {
    const cells = [];
    for (const it of line.items.sort((a, b) => a.x - b.x)) {
      const last = cells.at(-1);
      const gap = last ? it.x - last.x1 : Infinity;
      if (gap < line.size * 0.8) last.text += (gap > line.size * 0.15 ? ' ' : '') + it.str.trim();
      else cells.push({ text: it.str.trim(), x0: it.x });
      cells.at(-1).x1 = it.x + it.w;
    }
    return cells;
  });
  const cols = [];
  for (const [a, b] of rows.filter((r) => r.length > 1).flat().map((c) => [c.x0, c.x1]).sort((p, q) => p[0] - q[0])) {
    const last = cols.at(-1);
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else cols.push([a, b]);
  }
  return rows.map((cells) => {
    const out = [];
    for (const c of cells) {
      let i = cols.findIndex(([a, b]) => c.x0 < b && c.x1 > a);
      if (i < 0) i = Math.max(0, cols.findLastIndex(([a]) => a <= c.x0));
      out[i] = out[i] ? `${out[i]} ${c.text}` : c.text;
    }
    return Array.from(out, (v) => v ?? '');
  });
}

/** A PDF's text as a .xlsx Blob, one sheet per page. */
export async function pdfToXlsx(file, ctx = {}) {
  const pdf = await openPdf(file);
  const sheets = [];
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      ctx.progress?.((n - 1) / pdf.numPages, `Reading page ${n} of ${pdf.numPages}`);
      const page = await pdf.getPage(n);
      sheets.push({ name: `Page ${n}`, rows: tableRows(await pageItems(page)) });
      page.cleanup();
      await ctx.tick?.();
    }
  } finally {
    closePdf(pdf);
  }
  if (!sheets.some((s) => s.rows.length)) throw new Error(NO_TEXT);
  return xlsx(sheets);
}

export default fileTool({
  accept: PDF_ACCEPT,
  dropTitle: 'Drop your PDF here',
  action: 'Convert to Excel',
  actionIcon: 'file-spreadsheet',
  renderEmpty: (view) => view.append(notice('info', LIMIT)),
  renderExtra: (extra) => extra.append(notice('info', LIMIT)),
  async processFile(file, _options, ctx) {
    return { name: renameExt(file.name, 'xlsx'), blob: await pdfToXlsx(file, ctx) };
  },
});
