# CSV to JSON

Turn CSV rows into a JSON list of records.

- Opens at: `/csv-to-json`
- Code: `public/assets/js/tools/files/convert.js` with preset `{ from: 'csv', to: 'json' }` (see [Data converter](data-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: SheetJS Community Edition 0.20.3 (Apache-2.0)

## How to use
1. Add one or more CSV or TSV files.
2. Select **Convert to JSON** and download.

## Options
None. The input and output formats are fixed.

## How it works
The first row gives the field names. Every other row becomes one record in a JSON list, indented with 2 spaces. Text that looks like a number becomes a number, unless it has a leading zero (like 0800) or more than 15 digits.

## Limits
- Dates and TRUE/FALSE stay as text.
- Empty cells become `""`, and empty rows are dropped.
- Duplicate column names get `_1` added, and blank ones become `__EMPTY`.
- Everything is flat: no nested objects are made.

## How to test
`mod.default.process([csv], {}, { preset: { from: 'csv', to: 'json' } })` with `name,postcode,amount\nJess,0800,12.50`: the JSON parses to `[{ "name": "Jess", "postcode": "0800", "amount": 12.5 }]`.
