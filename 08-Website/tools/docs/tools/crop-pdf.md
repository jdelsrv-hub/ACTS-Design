# Crop PDF

Trim the margins off every page of a PDF.

- Opens at: `/crop-pdf`
- Code: `public/assets/js/tools/pdf/crop.js` (page viewer and page geometry from `pdf/_pages.js`)
- Runs on: your device (nothing uploaded)
- Libraries: pdf-lib (Cantoo fork) 2.11.1 (MIT); pdf.js (pdfjs-dist) 6.4.299 (Apache-2.0) for the preview

## How to use
1. Add a PDF.
2. Set how many millimetres to trim from the top, bottom, left and right. The preview shades the parts that will go.
3. Select **Crop PDF** and download.

## Options
- Top, Bottom, Left, Right: in mm (default 10 each, lowest 0). At least one has to be more than 0.

## How it works
The same margins come off every page, measured from the edges as you see them (rotated pages are allowed for). pdf-lib sets each page's crop box and media box to what's left. The file is named with `-cropped` added.

## Limits
- Trimmed parts are hidden, not deleted. The content is still in the file, so it isn't a way to remove private details, and the file doesn't get smaller.
- Every page gets the same margins. The preview shows one page at a time.
- If the margins leave less than about 3.5 mm of page, we stop and ask for smaller numbers.
- Password-protected PDFs must be unlocked first.

## How to test
`mod.default.process([a4Pdf], {})` gives pages of 539 × 785 points (A4 is 595 × 842; 10 mm is about 28 points off each side). `{ left: 200, right: 200 }` rejects with "Those margins are bigger than the page…". The core step is a named export: `cropPdf(bytes, { top, bottom, left, right })`.
