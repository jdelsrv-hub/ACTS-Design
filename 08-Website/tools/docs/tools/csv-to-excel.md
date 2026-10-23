# CSV to Excel

Turn a CSV file into an Excel spreadsheet (.xlsx).

- Opens at: `/csv-to-excel`
- Code: `public/assets/js/tools/files/convert.js` with preset `{ from: 'csv', to: 'xlsx' }` (see [Data converter](data-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: SheetJS Community Edition 0.20.3 (Apache-2.0)

## How to use
1. Add one or more CSV or TSV files.
2. Select **Convert to Excel** and download.

## Options
None. The input and output formats are fixed.

## How it works
Each file is read with SheetJS (commas, tabs and semicolons are detected) and saved as an .xlsx with one sheet. Text that looks like a number becomes a real number, unless it has a leading zero (like 0800) or more than 15 digits.

## Limits
- Postcodes, phone numbers and long IDs stay as text on purpose.
- Dates and TRUE/FALSE stay as text, so Excel won't treat them as dates or true/false values.
- No column widths or formatting are added.

## How to test
`mod.default.process([csv], {}, { preset: { from: 'csv', to: 'xlsx' } })` with `name,postcode,amount\nJess,0800,12.50`: one `.xlsx` item with note "1 row". Read it back with SheetJS: B2 is the text `0800` and C2 is the number 12.5.
