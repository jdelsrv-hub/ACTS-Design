import { fileTool } from '../../core/filetool.js';
import { baseName, zipFiles } from '../../core/files.js';
import { getXLSX } from './_vendor.js';
import { EXCEL_ACCEPT, sheetsWithData } from './_sheets.js';

export default fileTool({
  accept: EXCEL_ACCEPT,
  dropTitle: 'Drop your Excel file here',
  action: 'Split Excel',
  actionIcon: 'split',
  options: [
    { id: 'by', type: 'segmented', label: 'Split by', default: 'rows', choices: [{ value: 'rows', label: 'Rows per file' }, { value: 'sheet', label: 'One file per sheet' }] },
    { id: 'rows', type: 'number', label: 'Rows per file', default: 1000, min: 1, step: 1, help: 'The first row of each sheet is the header. We add it to the top of every file.', showIf: (v) => v.by === 'rows' },
  ],
  validate: (_files, o) => (o.by === 'sheet' || o.rows >= 1 ? null : 'Enter how many rows you want in each file.'),
  async processFile(file, { by, rows }, ctx) {
    const X = await getXLSX();
    // cellNF keeps number and date formats, cellStyles keeps column widths.
    const wb = X.read(await file.arrayBuffer(), { cellNF: true, cellStyles: true });
    const names = sheetsWithData(wb);
    const base = baseName(file.name);
    const parts = [];
    const add = (name, ws, sheetName) => {
      for (const k in ws) if (k[0] !== '!') { delete ws[k].f; delete ws[k].F; } // formulas become their results
      const book = X.utils.book_new();
      X.utils.book_append_sheet(book, ws, sheetName);
      parts.push({ name, data: new Uint8Array(X.write(book, { bookType: 'xlsx', type: 'array', compression: true })) });
    };

    if (by === 'sheet') {
      if (names.length < 2) throw new Error('This workbook has only one sheet with data, so there is nothing to split. Try splitting by rows instead.');
      for (const n of names) {
        add(`${base}-${n}.xlsx`, wb.Sheets[n], n);
        await ctx.tick();
      }
    } else {
      const size = Math.floor(rows);
      for (const [si, n] of names.entries()) {
        const ws = wb.Sheets[n];
        const r = X.utils.decode_range(ws['!ref']);
        for (let start = r.s.r + 1; start <= r.e.r; start += size) {
          const end = Math.min(start + size - 1, r.e.r);
          const piece = {};
          const copyRow = (from, to) => {
            for (let c = r.s.c; c <= r.e.c; c++) {
              const cell = ws[X.utils.encode_cell({ r: from, c })];
              if (cell) piece[X.utils.encode_cell({ r: to, c })] = { ...cell };
            }
          };
          copyRow(r.s.r, 0);
          for (let row = start; row <= end; row++) copyRow(row, row - start + 1);
          piece['!ref'] = X.utils.encode_range({ s: { r: 0, c: r.s.c }, e: { r: end - start + 1, c: r.e.c } });
          if (ws['!cols']) piece['!cols'] = ws['!cols'];
          const k = Math.floor((start - r.s.r - 1) / size) + 1;
          add(names.length > 1 ? `${base}-${n}-${k}.xlsx` : `${base}-${k}.xlsx`, piece, n);
          ctx.progress((si + (end - r.s.r) / (r.e.r - r.s.r || 1)) / names.length);
          await ctx.tick();
        }
      }
      if (parts.length < 2) throw new Error(`Every sheet has ${size.toLocaleString('en-AU')} rows or fewer, so there's nothing to split. Try a smaller number.`);
    }
    return { name: `${base}-split.zip`, blob: await zipFiles(parts), note: `${parts.length} files` };
  },
});
