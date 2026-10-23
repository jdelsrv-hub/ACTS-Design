# XML to Excel

Turn repeated XML records into an Excel spreadsheet.

- Opens at: `/xml-to-excel`
- Code: `public/assets/js/tools/files/convert.js` with preset `{ from: 'xml', to: 'xlsx' }` (see [Data converter](data-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: SheetJS Community Edition 0.20.3 (Apache-2.0); the XML is read with the browser's own `DOMParser`

## How to use
1. Add one or more XML files.
2. Select **Convert to Excel** and download.

## Options
None. The input and output formats are fixed.

## How it works
The biggest group of same-named sibling elements becomes the rows (see [XML to JSON](xml-to-json.md)), with attributes and child elements as columns. The result is an .xlsx with one sheet. Number-like text becomes a real number, unless it has a leading zero or more than 15 digits.

## Limits
- Only the biggest repeated group is converted. Anything outside it is left out.
- Dates stay as text.
- No column widths or formatting are added.

## How to test
`mod.default.process([xml], {}, { preset: { from: 'xml', to: 'xlsx' } })` with `<r><i><a>1</a></i><i><a>02</a></i></r>`: one `r.xlsx` with note "2 rows". Read it back with SheetJS: one sheet, A1 is `a`, A2 is the number 1, A3 is the text `02`.
