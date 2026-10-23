# JSON to CSV

Turn a JSON list of records into a CSV file.

- Opens at: `/json-to-csv`
- Code: `public/assets/js/tools/files/convert.js` with preset `{ from: 'json', to: 'csv' }` (see [Data converter](data-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: SheetJS Community Edition 0.20.3 (Apache-2.0)

## How to use
1. Add one or more JSON files.
2. Select **Convert to CSV** and download.

## Options
None. The input and output formats are fixed.

## How it works
`jsonRows()` takes a list of records, a list of rows (like `[["a","b"],[1,2]]`), or the first list of records inside an object. Nested objects become columns like `address.city`. Lists of plain values are joined with commas, and lists of objects are kept as JSON text. The columns come from every record, so a field that only some records have still gets a column.

## Limits
- Only the first list of records inside an object is converted.
- Deeply nested data gets long column names and isn't easy to turn back into the same JSON.
- If the text has accents or emoji, the CSV starts with a byte order mark (so Excel reads it correctly).

## How to test
`mod.default.process([json], {}, { preset: { from: 'json', to: 'csv' } })` with `{"data":[{"name":"Jess","address":{"city":"Sydney"},"tags":["a","b"]}]}`: the CSV header is `name,address.city,tags` and the row is `Jess,Sydney,"a, b"`. Invalid JSON throws "This file isn't valid JSON...".
