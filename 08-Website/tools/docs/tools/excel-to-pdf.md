# Excel to PDF

Turn each sheet of an Excel file into a readable table in a PDF.

- Opens at: `/excel-to-pdf`
- Code: `public/assets/js/tools/files/excel-pdf.js` (Excel reading in `files/_sheets.js`, library loader in `files/_vendor.js`)
- Runs on: your device (nothing uploaded)
- Libraries: SheetJS Community Edition 0.20.3 (Apache-2.0), and pdf-lib (Cantoo fork) 2.11.1 (MIT) through `getPdfLib()` in `core/vendor.js`

## How to use
1. Add one Excel file (.xlsx, .xlsm or .xls).
2. Select **Convert to PDF** and download.

## Options
None.

## How it works
Each sheet with data is drawn as a plain table on A4 pages, in 9 pt Helvetica. The sheet name sits at the top of each page, and the first row is the header: bold, shaded and repeated on every page. Cells show the text as Excel shows it, and numbers are right-aligned. Column widths come from the first 300 rows, up to 200 pt each, and longer text wraps. The page is portrait when the table fits and landscape when it doesn't. A table wider than a landscape page carries on over extra pages, labelled "Sheet1 · columns A to F" and so on, like Excel's own printing.

## Limits
- Values only: colours, fonts, borders, charts, images and merged cells aren't kept. Formulas show the result Excel last saved.
- The built-in PDF font only covers Western European letters. Other characters (Chinese, Arabic, emoji and so on) show as "?".
- A cell is cut off after 30 lines (4 for the header), ending in "…".
- Hidden rows, columns and sheets are included. Empty rows are left out.
- Excel's print settings (print area, page breaks, scaling) are ignored.

## How to test
`mod.default.process([xlsx])` with a 2-sheet workbook (sheet 1: 2 columns and 120 rows; sheet 2: 30 wide columns and 2 rows): one `report.pdf` (`application/pdf`) with note "8 pages". Open it with pdf-lib: the first 4 pages are portrait (595 × 842) and the last 4 are landscape (842 × 595).
