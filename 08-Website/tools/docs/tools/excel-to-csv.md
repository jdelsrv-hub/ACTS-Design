# Excel to CSV

Save each sheet of an Excel file as a CSV.

- Opens at: `/excel-to-csv`
- Code: `public/assets/js/tools/files/convert.js` with preset `{ from: 'xlsx', to: 'csv' }` (see [Data converter](data-converter.md)), Excel reading in `files/_sheets.js`
- Runs on: your device (nothing uploaded)
- Libraries: SheetJS Community Edition 0.20.3 (Apache-2.0)

## How to use
1. Add one or more Excel files (.xlsx, .xlsm or .xls).
2. Select **Convert to CSV** and download.

## Options
None. The input and output formats are fixed.

## How it works
Each sheet with data becomes its own CSV, named `book-Sheet1.csv` when the workbook has more than one. Cells are written as Excel shows them ("25%", "20 Oct 2026"). Dates in Excel's default date format come out as 2026-10-20. If the text has accents or emoji, the file starts with a byte order mark so Excel opens it correctly.

## Limits
- Formulas, formatting, charts and images aren't kept. Formulas give the result Excel last saved.
- Hidden rows and hidden sheets are included.
- Empty rows are dropped.

## How to test
`mod.default.process([xlsx], {}, { preset: { from: 'xlsx', to: 'csv' } })` with a 2-sheet `book.xlsx`: 2 items, `book-Sheet1.csv` and `book-Sheet2.csv`, each with a "N rows" note. A cell holding 0.25 with format `0%` reads `25%` in the CSV.
