# PDF to PowerPoint

Turn each page of a PDF into a PowerPoint slide (.pptx).

- Opens at: `/pdf-to-powerpoint`
- Code: `public/assets/js/tools/pdf/to-powerpoint.js` (page drawing from `pdf/_pages.js`)
- Runs on: your device (nothing uploaded)
- Libraries: pdf.js (pdfjs-dist) 6.4.299 (Apache-2.0); PptxGenJS 4.0.1 (MIT), bundled build that includes JSZip (MIT or GPL-3.0, used under MIT)

## How to use
1. Add a PDF.
2. Select **Convert to PowerPoint** and download the `.pptx`.

## Options
None.

## How it works
pdf.js draws each page at 150 DPI, and PptxGenJS adds it as a JPG (85% quality) filling its own slide. The slides are 10 inches wide, shaped like the first page. Pages of a different shape are centred with space around them.

## Limits
- Each slide is a picture of the page, so it looks the same, but you can't edit or search the text in PowerPoint. The tool says so before you start.
- Links, form fields and attachments in the PDF don't come across.
- Long PDFs make big presentations, since every page is a picture.
- Password-protected PDFs must be unlocked first.

## How to test
`mod.default.process([twoPagePdf], {})` gives `<name>.pptx` (`application/vnd.openxmlformats-officedocument.presentationml.presentation`). Unzipped, it has `ppt/slides/slide1.xml` and `slide2.xml` and two JPEGs in `ppt/media/`. The core step is a named export: `pdfToPptx(file, ctx)` returns the .pptx Blob.
