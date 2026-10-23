// Excel to PDF: each sheet drawn as a plain table with pdf-lib. Portrait when the table fits, landscape when not.
// Tables wider than a landscape page continue on extra pages (the next columns), like Excel's own printing.
import { fileTool } from '../../core/filetool.js';
import { notice } from '../../core/ui.js';
import { renameExt } from '../../core/files.js';
import { getPdfLib } from '../../core/vendor.js';
import { readExcel, sheetsWithData, EXCEL_ACCEPT } from './_sheets.js';

const SIZE = 9;
const LINE = 11;
const PAD = 4;
const MARGIN = 36;
const MAX_COL = 200;
const A4 = [595.28, 841.89];
const NUMERIC = /^[-+(]?[$€£¥]?\d[\d,]*(\.\d+)?%?\)?$/;

export default fileTool({
  accept: EXCEL_ACCEPT,
  dropTitle: 'Drop your Excel file here',
  action: 'Convert to PDF',
  actionIcon: 'file-text',
  renderExtra: (extra) => extra.append(notice('info', "Each sheet becomes a plain table of its values. Colours, charts, images and merged cells aren't kept.")),
  async processFile(file, _options, ctx) {
    const [{ X, wb }, { PDFDocument, StandardFonts, rgb }] = await Promise.all([readExcel(file), getPdfLib()]);
    const pdf = await PDFDocument.create();
    const fonts = { body: await pdf.embedFont(StandardFonts.Helvetica), bold: await pdf.embedFont(StandardFonts.HelveticaBold) };
    // The built-in PDF fonts only cover Western European characters. Anything else shows as "?".
    const known = new Set(fonts.body.getCharacterSet());
    const clean = (v) => [...String(v).replace(/\t/g, ' ').replace(/\r/g, '')].map((ch) => (ch === '\n' || known.has(ch.codePointAt(0)) ? ch : '?')).join('');
    const names = sheetsWithData(wb);
    for (const [i, name] of names.entries()) {
      const ws = wb.Sheets[name];
      const rows = X.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '', blankrows: false }).map((r) => r.map(clean));
      if (!rows.length) continue;
      const colName = (c) => X.utils.encode_col(X.utils.decode_range(ws['!ref']).s.c + c);
      await drawSheet(pdf, fonts, rgb, clean(name), rows, colName, async (f) => {
        ctx.progress((i + f) / names.length);
        await ctx.tick();
      });
    }
    if (!pdf.getPageCount()) throw new Error("We couldn't find any data in this workbook.");
    const pages = pdf.getPageCount();
    return { name: renameExt(file.name, 'pdf'), blob: new Blob([await pdf.save()], { type: 'application/pdf' }), note: `${pages} page${pages === 1 ? '' : 's'}` };
  },
});

async function drawSheet(pdf, { body, bold }, rgb, title, rows, colName, tick) {
  const ink = rgb(0.1, 0.1, 0.12);
  const rule = rgb(0.82, 0.8, 0.88);
  const shade = rgb(0.93, 0.92, 0.97);
  const count = rows.reduce((m, r) => Math.max(m, r.length), 0);

  // Column widths from the first 300 rows, capped so long text wraps instead of running off the page.
  const widths = [];
  for (let c = 0; c < count; c++) {
    let w = 0;
    for (let r = 0; r < Math.min(rows.length, 300); r++) {
      for (const line of String(rows[r][c] ?? '').split('\n')) w = Math.max(w, (r ? body : bold).widthOfTextAtSize(line, SIZE));
    }
    widths.push(Math.min(MAX_COL, Math.max(18, w)) + PAD * 2);
  }
  const [pw, ph] = widths.reduce((a, b) => a + b, 0) <= A4[0] - MARGIN * 2 ? A4 : [A4[1], A4[0]];
  const usable = pw - MARGIN * 2;
  const groups = [[]];
  let gw = 0;
  widths.forEach((w, c) => {
    if (gw + w > usable && groups.at(-1).length) {
      groups.push([]);
      gw = 0;
    }
    groups.at(-1).push(c);
    gw += w;
  });

  for (const [gi, group] of groups.entries()) {
    const tableW = group.reduce((s, c) => s + widths[c], 0);
    const label = groups.length > 1 ? `${title} · columns ${colName(group[0])} to ${colName(group.at(-1))}` : title;
    let page;
    let y;
    let fresh = false;
    const drawRow = (cells, header) => {
      const f = header ? bold : body;
      const lines = group.map((c) => wrap(cells[c] ?? '', widths[c] - PAD * 2, f, header ? 4 : 30));
      const h = Math.max(...lines.map((l) => l.length)) * LINE + PAD * 2;
      if (!header && !fresh && y - h < MARGIN) newPage();
      if (header) page.drawRectangle({ x: MARGIN, y: y - h, width: tableW, height: h, color: shade });
      let x = MARGIN;
      group.forEach((c, i) => {
        const right = !header && NUMERIC.test(cells[c] ?? '');
        lines[i].forEach((t, j) => {
          const tx = right ? x + widths[c] - PAD - f.widthOfTextAtSize(t, SIZE) : x + PAD;
          page.drawText(t, { x: tx, y: y - PAD - (j + 1) * LINE + 2.5, size: SIZE, font: f, color: ink });
        });
        x += widths[c];
      });
      page.drawLine({ start: { x: MARGIN, y: y - h }, end: { x: MARGIN + tableW, y: y - h }, thickness: 0.5, color: rule });
      y -= h;
      fresh = header;
    };
    const newPage = () => {
      page = pdf.addPage([pw, ph]);
      y = ph - MARGIN;
      page.drawText(label, { x: MARGIN, y: y - 11, size: 11, font: bold, color: ink });
      y -= 22;
      drawRow(rows[0], true); // the header row repeats on every page
    };
    newPage();
    for (let r = 1; r < rows.length; r++) {
      drawRow(rows[r], false);
      if (r % 200 === 0) await tick((gi + r / rows.length) / groups.length);
    }
    await tick((gi + 1) / groups.length);
  }
}

/** Word-wrap text to a width, breaking very long words. At most `max` lines (the last one ends in "…"). */
function wrap(text, width, f, max) {
  const fits = (s) => f.widthOfTextAtSize(s, SIZE) <= width;
  const lines = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (fits(next)) {
        line = next;
        continue;
      }
      if (line) lines.push(line);
      line = word;
      while (line.length > 1 && !fits(line)) {
        let k = Math.max(1, Math.floor((line.length * width) / f.widthOfTextAtSize(line, SIZE)));
        while (k > 1 && !fits(line.slice(0, k))) k--;
        lines.push(line.slice(0, k));
        line = line.slice(k);
      }
      if (lines.length > max) break;
    }
    lines.push(line);
    if (lines.length > max) break;
  }
  if (lines.length > max) {
    lines.length = max;
    lines[max - 1] += ' …';
  }
  return lines;
}
