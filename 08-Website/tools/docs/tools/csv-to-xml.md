# CSV to XML

Turn CSV rows into an XML file.

- Opens at: `/csv-to-xml`
- Code: `public/assets/js/tools/files/convert.js` with preset `{ from: 'csv', to: 'xml' }` (see [Data converter](data-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: SheetJS Community Edition 0.20.3 (Apache-2.0)

## How to use
1. Add one or more CSV or TSV files.
2. Select **Convert to XML** and download.

## Options
None. The input and output formats are fixed.

## How it works
The first row gives the element names. Every other row becomes a `<row>` inside a `<rows>` root, with one element per column. Values are written as they appear in the CSV, so `0800` stays `0800`. `<`, `>` and `&` are escaped.

## Limits
- Column names are cleaned up to be valid XML: spaces and symbols become `_`, and names that start with a number or "xml" get a `_` in front.
- Duplicate column names get `_1` added, and blank ones become `__EMPTY`.
- Empty rows are dropped. Nothing becomes an attribute.

## How to test
`mod.default.process([csv], {}, { preset: { from: 'csv', to: 'xml' } })` with `name,postcode\nJess,0800`: the XML parses with `DOMParser` and holds one `<row>` with `<name>Jess</name>` and `<postcode>0800</postcode>`.
