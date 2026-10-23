# Excel to XML

Save each sheet of an Excel file as XML.

- Opens at: `/excel-to-xml`
- Code: `public/assets/js/tools/files/convert.js` with preset `{ from: 'xlsx', to: 'xml' }` (see [Data converter](data-converter.md)), Excel reading in `files/_sheets.js`
- Runs on: your device (nothing uploaded)
- Libraries: SheetJS Community Edition 0.20.3 (Apache-2.0)

## How to use
1. Add one or more Excel files (.xlsx, .xlsm or .xls).
2. Select **Convert to XML** and download.

## Options
None. The input and output formats are fixed.

## How it works
Each sheet with data becomes its own XML file, named `book-Sheet1.xml` when the workbook has more than one. The first row gives the element names. Every other row becomes a `<row>` inside a `<rows>` root, with each value written as Excel shows it ("25%", "20 Oct 2026"). Dates in Excel's default date format come out as 2026-10-20.

## Limits
- Formulas, formatting, charts and images aren't kept. Formulas give the result Excel last saved.
- Column names are cleaned up to be valid XML: spaces and symbols become `_`, and names that start with a number or "xml" get a `_` in front.
- Hidden rows and hidden sheets are included. Empty rows are dropped.

## How to test
`mod.default.process([xlsx], {}, { preset: { from: 'xlsx', to: 'xml' } })` with a 2-sheet `book.xlsx`: 2 items, `book-Sheet1.xml` and `book-Sheet2.xml`, each of which parses with `DOMParser`. A cell holding 0.25 with format `0%` comes out as `<Share>25%</Share>` under a `Share` header.
