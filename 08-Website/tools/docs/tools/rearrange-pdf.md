# Rearrange PDF

Drag the pages of a PDF into a new order.

- Opens at: `/rearrange-pdf`
- Code: `public/assets/js/tools/pdf/rearrange.js` (thumbnails and page ranges from `pdf/_pages.js`)
- Runs on: your device (nothing uploaded)
- Libraries: pdf-lib (Cantoo fork) 2.11.1 (MIT); pdf.js (pdfjs-dist) 6.4.299 (Apache-2.0) for the page previews

## How to use
1. Add a PDF. A preview of every page appears.
2. Drag the pages into the order you want, or use the arrows under each page to move it earlier or later.
3. Select **Save new order** and download.

## Options
None on screen. The new order is kept in a hidden option, `order`, as page numbers like `3, 1, 2`. It's set by dragging, and it's empty while the pages are in their first order.

## How it works
pdf.js draws a small preview of each page. When you run it, pdf-lib copies the pages into a new PDF in the new order, named with `-reordered` added.

## Limits
- On touch screens, the arrow buttons are the easiest way to move pages.
- Bookmarks aren't copied into the new file.
- Password-protected PDFs must be unlocked first.

## How to test
`mod.default.process([threePagePdf], { order: '3, 1, 2' })` gives a PDF whose pages read page 3, page 1, page 2.
