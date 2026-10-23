# XML to CSV

Turn repeated XML records into CSV rows.

- Opens at: `/xml-to-csv`
- Code: `public/assets/js/tools/files/convert.js` with preset `{ from: 'xml', to: 'csv' }` (see [Data converter](data-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: SheetJS Community Edition 0.20.3 (Apache-2.0); the XML is read with the browser's own `DOMParser`

## How to use
1. Add one or more XML files.
2. Select **Convert to CSV** and download.

## Options
None. The input and output formats are fixed.

## How it works
The biggest group of same-named sibling elements becomes the rows (see [XML to JSON](xml-to-json.md)). Attributes and child elements become columns, nested ones as `price.cur`. Repeated children inside one record are joined with commas. Records that are missing a field get an empty cell.

## Limits
- Only the biggest repeated group is converted. Anything outside it is left out.
- Text that sits beside child elements is dropped, and namespace prefixes are dropped.
- If the text has accents or emoji, the CSV starts with a byte order mark (so Excel reads it correctly).

## How to test
`mod.default.process([xml], {}, { preset: { from: 'xml', to: 'csv' } })` with `<r><i><a>1</a><b>x</b></i><i><a>2</a><b>y &lt; z</b></i></r>`: the CSV is `a,b`, `1,x`, `2,y < z` and the note says "2 rows".
