# Rotate PDF

Turn all the pages of a PDF, or only the ones you choose.

- Opens at: `/rotate-pdf`
- Code: `public/assets/js/tools/pdf/rotate.js` (helpers in `pdf/_pages.js`)
- Runs on: your device (nothing uploaded)
- Libraries: pdf-lib (Cantoo fork) 2.11.1 (MIT); pdf.js (pdfjs-dist) 6.4.299 (Apache-2.0) for the page count

## How to use
1. Add a PDF.
2. Pick how far to turn it.
3. Keep **All pages**, or choose **Chosen pages** and type them, like `1-3, 5`.
4. Select **Rotate PDF** and download.

## Options
- Turn: 90° clockwise (default), 180° or 90° anticlockwise.
- Pages: All pages (default) or Chosen pages.
- Pages to rotate: pages and ranges separated by commas, like `1-3, 5`.

## How it works
pdf-lib adds the turn to each page's rotation setting. The page content isn't redrawn, so nothing loses quality. The file is named with `-rotated` added.

## Limits
- One PDF at a time.
- Password-protected PDFs must be unlocked first.

## How to test
`mod.default.process([fivePagePdf], { angle: 90, which: 'some', pages: '2, 4' })` gives a PDF where pdf.js reads the page rotations as `[0, 90, 0, 90, 0]`. With the defaults, every page turns 90° clockwise.
