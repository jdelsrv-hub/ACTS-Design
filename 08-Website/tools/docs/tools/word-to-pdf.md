# Word to PDF

Turn a Word document (.docx) into a PDF.

- Opens at: `/word-to-pdf`
- Code: `public/assets/js/tools/pdf/word-to-pdf.js` (page layout from `pdf/_layout.js`)
- Runs on: your device (nothing uploaded)
- Libraries: mammoth 1.13.0 (BSD-2-Clause) to read the .docx; pdf-lib (Cantoo fork) 2.11.1 (MIT) to write the PDF

## How to use
1. Add a .docx file from Word, Google Docs or Pages.
2. Select **Convert to PDF** and download.

## Options
None.

## How it works
mammoth reads the .docx into simple HTML. We turn that into headings (20, 16, 14 or 12 pt bold), paragraphs with bold and italic text, bulleted and numbered lists (indented by level), tables and pictures. `_layout.js` lays them out on A4 pages with 2 cm margins in 11 pt Helvetica. Tables get equal-width columns with thin borders. Pictures are placed at 96 DPI and shrunk to fit the page. The result shows the page count and anything we had to leave out.

## Limits
- Simple formatting only, and the tool says so. Fonts, colours, underlines, alignment, columns, headers and footers aren't kept.
- Page breaks aren't kept: the text flows onto new pages as each one fills.
- Table cells keep their text only, and merged cells aren't kept.
- Pictures in formats a browser can't open (like EMF or WMF drawings) are left out and counted.
- Characters Helvetica can't show (emoji, Chinese, Arabic and so on) are left out and counted.
- Older `.doc` files don't work. Save them as `.docx` first.

## How to test
Make a .docx (the output of PDF to Word works) and run `mod.default.process([docx], {})`. It gives `<name>.pdf` with a note like "1 page", and pdf.js reads the same text back. The core step is a named export: `docxToPdf(arrayBuffer)` resolves to `{ bytes, pages, dropped, skipped }`.
