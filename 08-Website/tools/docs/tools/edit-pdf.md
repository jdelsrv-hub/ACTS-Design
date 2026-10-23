# Edit PDF

Add text to a PDF, or cover parts of it with white boxes.

- Opens at: `/edit-pdf`
- Code: `public/assets/js/tools/pdf/edit.js` (page viewer and page geometry from `pdf/_pages.js`, character check from `pdf/_layout.js`)
- Runs on: your device (nothing uploaded)
- Libraries: pdf-lib (Cantoo fork) 2.11.1 (MIT); pdf.js (pdfjs-dist) 6.4.299 (Apache-2.0) for the page preview

## How to use
1. Add a PDF.
2. Choose **Add text**, click the page where you want it and type. Drag the handle to move it, or select the × to remove it.
3. To cover something, choose **White-out** and drag a box over it.
4. Use the page picker for other pages, then select **Save PDF** and download.

## Options
- Tool: Add text (default) or White-out.
- Text size: 6 to 72 pt (default 12).

What you place is kept in a hidden option, `items`: `{ page, type: 'text', x, y, size, text }` or `{ page, type: 'box', x, y, w, h }`, with positions as fractions of the page from its top-left corner.

## How it works
pdf-lib draws the white boxes first, then the text on top in black Helvetica, allowing for rotated and cropped pages. The file is named with `-edited` added.

## Limits
- White-out only covers things. The original text is still in the file underneath, and people can still copy it or find it by searching. Don't use it to hide private details. The tool says this too.
- You can add text, but not change the text already in the PDF.
- Added text is one line, black Helvetica only. Characters Helvetica can't show (emoji, Chinese, Arabic and so on) are left out. A note on the page says so before you start.
- Password-protected PDFs must be unlocked first.

## How to test
`mod.default.process([twoPagePdf], { items: [{ page: 1, type: 'box', x: 0.05, y: 0.05, w: 0.6, h: 0.08 }, { page: 1, type: 'text', x: 0.1, y: 0.3, size: 14, text: 'Signed copy' }] })` gives a PDF where pdf.js reads "Signed copy" on page 1, and page 2 is unchanged. The text under the white box still extracts, which is the limit above. The core step is a named export: `editPdf(bytes, items)`.
