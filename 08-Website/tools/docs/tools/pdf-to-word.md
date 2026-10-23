# PDF to Word

Turn the text of a PDF into a Word document (.docx) you can edit.

- Opens at: `/pdf-to-word`
- Code: `public/assets/js/tools/pdf/to-word.js` (text lines from `pdf/_pages.js`, .docx writer in `pdf/_office.js`)
- Runs on: your device (nothing uploaded)
- Libraries: pdf.js (pdfjs-dist) 6.4.299 (Apache-2.0); fflate 0.8.3 (MIT) to build the .docx

## How to use
1. Add a PDF.
2. Select **Convert to Word** and download the `.docx`.

## Options
None.

## How it works
pdf.js reads the text on each page, line by line. Lines that are close together and the same size join into one paragraph. A line starting with a bullet or a number like `1.` starts a new one, and a hyphen at the end of a line joins the word back up. The most common text size counts as body text, and text at least 20% bigger comes out bold. Each PDF page starts a new page in Word. `_office.js` writes the .docx in Arial, at the PDF's text sizes, with the first page's size and 2 cm margins.

## Limits
- Only the text comes across, in reading order. The layout, fonts, colours, pictures and tables aren't kept. The tool says so before you start.
- Scans (photos of pages) have no text inside, so there's nothing to convert.
- Text in columns can come out mixed, and headers and footers become normal paragraphs.
- Password-protected PDFs must be unlocked first.

## How to test
Make a PDF with a 22 pt title, two 11 pt lines 14 pt apart, and a second page. `mod.default.process([pdf], {})` gives `<name>.docx` (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`). In its `word/document.xml`, the title is bold, the two lines are one paragraph, and the second page starts with `<w:pageBreakBefore/>`. The core step is a named export: `pdfToDocx(file, ctx)` returns the .docx Blob.
