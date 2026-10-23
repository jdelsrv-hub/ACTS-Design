# JSON to XML

Turn a JSON list of records into an XML file.

- Opens at: `/json-to-xml`
- Code: `public/assets/js/tools/files/convert.js` with preset `{ from: 'json', to: 'xml' }` (see [Data converter](data-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: SheetJS Community Edition 0.20.3 (Apache-2.0)

## How to use
1. Add one or more JSON files.
2. Select **Convert to XML** and download.

## Options
None. The input and output formats are fixed.

## How it works
The JSON is flattened into rows the same way as [JSON to CSV](json-to-csv.md) (nested objects become `address.city`). Then each record is written as a `<row>` inside a `<rows>` root, with one element per field. `<`, `>` and `&` are escaped.

## Limits
- The XML is flat: nesting isn't rebuilt, and nothing becomes an attribute.
- Field names are cleaned up to be valid XML: spaces and symbols become `_`, and names that start with a number or "xml" get a `_` in front.
- Only the first list of records inside an object is converted.

## How to test
`mod.default.process([json], {}, { preset: { from: 'json', to: 'xml' } })` with `[{"1st col":"a&b","name":"Jess"}]`: the XML parses with `DOMParser` and holds one `<row>` with `<_1st_col>a&amp;b</_1st_col>` and `<name>Jess</name>`.
