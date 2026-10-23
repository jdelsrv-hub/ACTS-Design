# Delete PDF pages

Remove pages from a PDF. Click the pages you don't want.

- Opens at: `/delete-pdf-pages`
- Code: `public/assets/js/tools/pdf/delete-pages.js` (thumbnails and page ranges from `pdf/_pages.js`)
- Runs on: your device (nothing uploaded)
- Libraries: pdf-lib (Cantoo fork) 2.11.1 (MIT); pdf.js (pdfjs-dist) 6.4.299 (Apache-2.0) for the page previews

## How to use
1. Add a PDF. A preview of every page appears.
2. Click the pages you want to remove. They're marked "removed". You can also type the page numbers.
3. Select **Delete pages** and download.

## Options
- Pages to delete: pages and ranges, like `2, 5-7`. Clicking a page adds it to this list or takes it off, and typing here marks the pages above.

## How it works
pdf.js draws a small preview of each page. When you run it, pdf-lib copies the pages you kept into a new PDF, named with `-edited` added. The result says how many pages are left.

## Limits
- At least one page has to stay.
- Bookmarks aren't copied into the new file.
- Long PDFs take a moment to draw all the previews.
- Password-protected PDFs must be unlocked first.

## How to test
`mod.default.process([fivePagePdf], { pages: '2, 4-5' })` gives a 2-page PDF (the original pages 1 and 3) with the note "2 pages left". `{ pages: '1-5' }` rejects with "A PDF needs at least one page…".
