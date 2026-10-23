# PDF to Excel

Turn tables in a PDF into an Excel spreadsheet (.xlsx).

- Opens at: `/pdf-to-excel`
- Code: `public/assets/js/tools/pdf/to-excel.js` (text positions from `pdf/_pages.js`, .xlsx writer in `pdf/_office.js`)
- Runs on: your device (nothing uploaded)
- Libraries: pdf.js (pdfjs-dist) 6.4.299 (Apache-2.0); fflate 0.8.3 (MIT) to build the .xlsx

## How to use
1. Add a PDF.
2. Select **Convert to Excel** and download the `.xlsx`.

## Options
None.

## How it works
pdf.js gives the position of every piece of text. Pieces on the same line make a row, and a gap about as wide as the text is tall starts a new cell. Columns come from where cells line up across the rows that have two or more cells. Each page becomes its own sheet ("Page 1", "Page 2" and so on). Plain numbers, including ones with thousands commas like `1,200.50`, become real numbers. Everything else stays text, so codes with leading zeros keep them. Column widths fit the longest entry.

## Limits
- Works best on simple tables with clear rows and columns. The tool says so before you start.
- Merged cells, colours and borders aren't kept.
- Text that isn't in a table still comes out, one line per row.
- Numbers with symbols, like `$12`, `15%` or `(40)`, stay as text.
- Scans (photos of pages) have no text inside, so there's nothing to convert.
- Password-protected PDFs must be unlocked first.

## How to test
Make a PDF page with three columns: `Item Qty Price`, `Apples 3 1,200.50`, `Pears 10 4.00`. `mod.default.process([pdf], {})` gives `<name>.xlsx` with one sheet per page. In that page's sheet, A1 is the text "Item", B2 is the number 3 and C2 is the number 1200.50. The core steps are named exports: `pdfToXlsx(file, ctx)` returns the .xlsx Blob, and `tableRows(items)` turns text pieces into rows.
