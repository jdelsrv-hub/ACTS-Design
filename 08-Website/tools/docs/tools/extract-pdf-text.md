# PDF to text

Copy the text from every page of a PDF, or save it as a .txt file.

- Opens at: `/extract-pdf-text`
- Code: `public/assets/js/tools/pdf/to-text.js` (text lines from `pdf/_pages.js`)
- Runs on: your device (nothing uploaded)
- Libraries: pdf.js (pdfjs-dist) 6.4.299 (Apache-2.0)

## How to use
1. Add a PDF.
2. Select **Get the text**.
3. Select **Copy**, or **Download** to save it as `<name>.txt`.

## Options
None.

## How it works
pdf.js reads the text pieces on each page. Pieces on the same line are joined. A bigger gap between lines (more than 1.8 times the text size) becomes a blank line, and pages are separated by a blank line.

## Limits
- Scans (photos of pages) have no text inside, so there's nothing to copy. We say so instead of giving back an empty file.
- Columns and tables come out in the order the PDF stores the text, which isn't always reading order.
- Headers, footers and page numbers are included.
- Words split with a hyphen at the end of a line stay split.
- Password-protected PDFs must be unlocked first.

## How to test
`mod.default.process([threePagePdf], {})` gives one text result named `<name>.txt` with each page's text separated by a blank line (for example `Page 1 hello\n\nPage 2 hello\n\nPage 3 hello`). A PDF with no text rejects with "We couldn't find any text in this PDF…". The core step is a named export: `pdfToText(file, ctx)` returns the text.
