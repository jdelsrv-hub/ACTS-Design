# Split Excel

Split a spreadsheet by rows, or into one file per sheet.

- Opens at: `/split-excel`
- Code: `public/assets/js/tools/files/split-excel.js` (library loader in `files/_vendor.js`, shared helpers in `files/_sheets.js`)
- Runs on: your device (nothing uploaded)
- Libraries: SheetJS Community Edition 0.20.3 (Apache-2.0), and fflate 0.8.3 (MIT) for the zip through `core/vendor.js`

## How to use
1. Add one Excel file (.xlsx, .xlsm or .xls).
2. Pick **Rows per file** and enter a number, or pick **One file per sheet**.
3. Select **Split Excel** and download the zip.

## Options
- Split by: Rows per file or One file per sheet (default Rows per file).
- Rows per file: 1 or more (default 1000), shown when splitting by rows. The header row isn't counted.

## How it works
By rows: each sheet with data is cut into pieces. The first row of the sheet is the header, and it goes at the top of every piece. Pieces are named `book-1.xlsx`, `book-2.xlsx`, or `book-Sheet1-1.xlsx` when the workbook has more than one sheet. By sheet: each sheet with data becomes `book-Sheet1.xlsx` and so on. Everything is zipped as `book-split.zip`. Number formats, date formats and column widths are kept, and formulas are swapped for their saved results.

## Limits
- One file at a time. Output is always .xlsx.
- Colours, fonts, borders, charts and images aren't kept.
- Merged cells and row heights aren't kept when splitting by rows.
- Formulas become plain values, because the rows they point to may be in another file.
- Splitting by sheet needs at least 2 sheets with data. Splitting by rows needs more rows than the number you chose.

## How to test
- `mod.default.process([xlsx], { by: 'rows', rows: 10 })` with a 25-row sheet `Data` (plus header) and a 1-row sheet `Two`: one `wb-split.zip` with note "4 files". Unzip it: `wb-Data-1.xlsx` and `wb-Data-2.xlsx` span `A1:B11`, `wb-Data-3.xlsx` spans `A1:B6`, each with the header in row 1 and no formulas left. Read back with `cellStyles: true`, the column widths and a `dd/mm/yyyy` date format are still there.
- `{ by: 'sheet' }` on the same file gives `wb-Data.xlsx` and `wb-Two.xlsx`.
