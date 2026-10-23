# Data converter

Convert between CSV, Excel, JSON and XML, in any direction.

- Opens at: `/data-converter`
- Code: `public/assets/js/tools/files/convert.js` (also powers the "X to Y" pages listed below), with Excel reading in `files/_sheets.js` and the library loader in `files/_vendor.js`
- Runs on: your device (nothing uploaded)
- Libraries: SheetJS Community Edition 0.20.3 (Apache-2.0), loaded from cdn.sheetjs.com because the npm `xlsx` package is out of date

## How to use
1. Add one or more CSV, TSV, Excel (.xlsx, .xlsm, .xls), JSON or XML files.
2. Pick the format to convert to.
3. Select **Convert** and download. Each file is converted on its own.

## Options
- Convert to: CSV, Excel, JSON or XML (default Excel). If every file you add is already Excel, it starts on CSV instead. A file that's already in the chosen format has to be removed before you can convert.

## How it works
Every file is read into a SheetJS workbook, then each sheet is written out in the new format.

- CSV and TSV in: commas, tabs and semicolons are detected. Text that looks like a number becomes a number, unless it has a leading zero (like 0800) or more than 15 digits, so postcodes, phone numbers and IDs stay as typed. Dates and TRUE/FALSE stay as text.
- Excel in: we read the values Excel last saved. Dates in Excel's default date format come out as 2026-10-20. Other number and date formats keep their look in CSV and XML.
- JSON in: a list of records, a list of rows, or the first list of records inside an object. Nested objects become columns like `address.city`. Lists of plain values are joined with commas, and lists of objects are kept as JSON text.
- XML in: the biggest group of repeated elements becomes the rows. Attributes and child elements become columns (`price.cur` for a `cur` attribute on `<price>`). Repeated children inside one record are joined with commas.
- Excel out: one .xlsx with the data on one sheet.
- CSV, JSON and XML out: one file per sheet with data, named `book-Sheet1.csv` when there's more than one. CSV with accents or emoji starts with a byte order mark so Excel reads it correctly. JSON keeps numbers as numbers (25% becomes 0.25) and writes dates as 2026-10-20, or 2026-10-20T12:00:00 when there's a time. XML is a `<rows>` list with one `<row>` per record, using the text as Excel shows it.

Preset pages: csv-to-excel, excel-to-csv, csv-to-json, json-to-csv, xml-to-json, json-to-xml, xml-to-csv, csv-to-xml, xml-to-excel, excel-to-xml. Each one fixes the input and output format: the drop box only takes that input, there's no format picker, and the button says **Convert to Excel** (or CSV, JSON, XML).

## Limits
- Formulas, formatting, colours, charts, images and merged cells aren't kept. Formulas give the result Excel last saved.
- Hidden rows and hidden sheets are included.
- Empty rows are dropped. Empty cells become `""` in JSON and empty elements in XML.
- Duplicate column names get `_1` added, and blank ones become `__EMPTY`.
- XML names are cleaned up: spaces and symbols become `_`, and names that start with a number or "xml" get a `_` in front.
- XML in: only the biggest repeated group is converted, text that sits beside child elements is dropped, and namespace prefixes are dropped.
- TSV counts as CSV, so it can't be converted to CSV here.
- Old .xls files can be read, but Excel output is always .xlsx.
- Each file is read into memory all at once, so very large files can be slow or fail on phones.

## How to test
- `mod.default.process([csv], { to: 'json' })` with `name,postcode,amount\nJess,0800,12.50`: one `.json` item with note "1 row", where `postcode` is the text `"0800"` and `amount` is the number `12.5`.
- A 2-sheet `book.xlsx` with `{ to: 'csv' }` gives 2 items, `book-Sheet1.csv` and `book-Sheet2.csv`.
- An Excel cell holding the date serial 46315 (format `dd mmm yyyy`) with `{ to: 'json' }` comes out as `"2026-10-20"`, not a day early.
- Invalid JSON or XML throws a plain-English error.
- Named exports `jsonRows(text)` and `xmlRows(text)` return the flat records with no UI. `convertFile(file, to)` returns the output items for one file.
