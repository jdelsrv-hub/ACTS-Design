# Merge PDF

Combine two or more PDFs into one file, in the order you choose.

- Opens at: `/merge-pdf`
- Code: `public/assets/js/tools/pdf/merge.js`
- Runs on: your device (nothing uploaded)
- Libraries: pdf-lib (Cantoo fork) 2.11.1 (MIT)

## How to use
1. Add two or more PDFs.
2. Drag them into the order you want.
3. Select **Merge PDFs** and download.

## Options
None.

## How it works
pdf-lib copies every page from each file, in list order, into a new PDF. The file is named after the first PDF with `-merged` added, and the result shows the page count.

## Limits
- Password-protected PDFs must be unlocked first (Unlock PDF).
- Bookmarks (the outline in a PDF reader's sidebar) aren't copied into the new file.
- Form fields with the same name in different files may clash.

## How to test
`mod.default.process([twoPagePdf, threePagePdf], {})` gives one PDF with 5 pages in that order, named `…-merged.pdf`. Swap the files and the page order swaps. Adding a password-protected PDF rejects, and `friendlyError()` says it's password protected. `tests/specs/pdf.js` runs these checks.
