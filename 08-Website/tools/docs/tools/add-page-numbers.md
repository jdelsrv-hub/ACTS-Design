# Add page numbers

Number the pages of a PDF. Choose the position, start number and format.

- Opens at: `/add-page-numbers`
- Code: `public/assets/js/tools/pdf/page-numbers.js` (page geometry from `pdf/_pages.js`)
- Runs on: your device (nothing uploaded)
- Libraries: pdf-lib (Cantoo fork) 2.11.1 (MIT)

## How to use
1. Add a PDF.
2. Pick the position, format and start number.
3. Select **Add page numbers** and download.

## Options
- Position: Bottom centre (default), Bottom right, Bottom left, Top centre, Top right or Top left.
- Format: `1` (default), `Page 1`, `Page 1 of 10` or `1 / 10`.
- Start at: the first page's number (default 1, lowest 0).

## How it works
pdf-lib writes the number on every page in 11 pt Helvetica, dark grey, about 1 cm from the edge, allowing for rotated and cropped pages. In the "of" formats, the last number is the start number plus the page count, less one. The file is named with `-numbered` added.

## Limits
- Every page gets a number, including covers. You can't skip pages.
- The numbers can overlap anything already in that corner of the page.
- The font and size are fixed.
- Password-protected PDFs must be unlocked first.

## How to test
`mod.default.process([threePagePdf], { format: 'of', position: 'bottom-right' })` gives a PDF where each page's text ends "Page 1 of 3", "Page 2 of 3" and "Page 3 of 3". The core step is a named export: `addPageNumbers(bytes, { position, format, start })`.
