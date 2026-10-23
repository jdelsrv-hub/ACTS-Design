# Split PDF

Split a PDF into separate files by page ranges, or one file per page.

- Opens at: `/split-pdf`
- Code: `public/assets/js/tools/pdf/split.js` (helpers in `pdf/_pages.js`)
- Runs on: your device (nothing uploaded)
- Libraries: pdf-lib (Cantoo fork) 2.11.1 (MIT); pdf.js (pdfjs-dist) 6.4.299 (Apache-2.0) for the page count; fflate 0.8.3 (MIT) for the zip

## How to use
1. Add a PDF. Its page count shows in the file list.
2. Choose **By page ranges** and type the ranges, like `1-3, 5`. Or choose **Every page**.
3. Select **Split PDF**. Download each file, or select **Download all (.zip)**.

## Options
- Split: By page ranges (default) or Every page.
- Page ranges: pages and ranges separated by commas. Each range becomes its own PDF, so `1-3, 5` gives two files. `8-` runs to the last page, and a backwards range like `5-3` is read as `3-5`.

## How it works
For each range, pdf-lib copies those pages into a new PDF. Files are named after the original with `-pages-1-3` or `-page-5` added. **Download all** zips them with fflate as `split-pdf.zip`.

## Limits
- One PDF at a time.
- Password-protected PDFs must be unlocked first.
- Bookmarks aren't copied into the new files.

## How to test
`mod.default.process([fivePagePdf], { mode: 'ranges', ranges: '1-3, 5' })` gives two PDFs: `…-pages-1-3.pdf` (3 pages) and `…-page-5.pdf` (1 page). `{ mode: 'each' }` gives five one-page PDFs. `{ ranges: '9' }` on the same file rejects with "This PDF has 5 pages, so 9 is out of range."
