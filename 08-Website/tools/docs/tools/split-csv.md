# Split CSV

Split a big CSV into smaller files, with the header row on each.

- Opens at: `/split-csv`
- Code: `public/assets/js/tools/files/split-csv.js`
- Runs on: your device (nothing uploaded)
- Libraries: fflate 0.8.3 (MIT) for the zip, through `core/files.js` and `core/vendor.js`

## How to use
1. Add one CSV or TSV file.
2. Enter how many rows you want in each file.
3. Select **Split CSV** and download the zip.

## Options
- Rows per file: 1 or more (default 1000). The header row isn't counted.

## How it works
`csvRecords()` splits the text into rows, keeping each row exactly as written. Line breaks inside quotes stay inside their row. The first row is the header, and it goes at the top of every part. The parts are named `file-1.csv`, `file-2.csv` and so on, and zipped as `file-split.zip`. The line endings of the original are kept.

## Limits
- One file at a time.
- The first row is always treated as the header, even if it's data.
- Blank lines are dropped.
- Files that aren't UTF-8 are read as Windows-1252 and saved as UTF-8. If there are accents or emoji, each part starts with a byte order mark so Excel reads it correctly.
- If the file has no more rows than the number you chose, there's nothing to split and the tool says so.

## How to test
`mod.default.process([csv], { rows: 10 })` with a header plus 25 rows (one of them with a quoted line break, like `3,"two\nlines"`): one `big-split.zip` with note "3 files of up to 10 rows". Unzip it: `big-1.csv` and `big-2.csv` have 11 records, `big-3.csv` has 6, and each starts with the header. The named export `csvRecords(text)` gives the same record counts without the UI.
