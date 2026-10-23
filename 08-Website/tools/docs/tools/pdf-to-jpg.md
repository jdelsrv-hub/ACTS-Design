# PDF to JPG

Save every page of a PDF as a JPG or PNG image.

- Opens at: `/pdf-to-jpg`
- Code: `public/assets/js/tools/pdf/to-images.js` (helpers in `pdf/_pages.js`). The same code runs [PDF to PNG](pdf-to-png.md).
- Runs on: your device (nothing uploaded)
- Libraries: pdf.js (pdfjs-dist) 6.4.299 (Apache-2.0); fflate 0.8.3 (MIT) for the zip

## How to use
1. Add a PDF.
2. Pick **JPG** or **PNG**.
3. Select **Convert pages**. Download each page, or select **Download all (.zip)**.

## Options
- Format: JPG (default) or PNG.

## How it works
pdf.js draws each page on a canvas at 150 DPI, so an A4 page comes out 1240 × 1754 pixels. The browser saves it as JPG at 90% quality, or as PNG. Files are named `<name>-page-1.jpg`, `<name>-page-2.jpg` and so on, and **Download all** zips them as `pdf-to-jpg.zip`.

## Limits
- One PDF at a time, and the resolution is fixed at 150 DPI.
- Very large pages are capped at 5000 pixels on the longest side (and about 16 megapixels) so the browser can draw them.
- Password-protected PDFs must be unlocked first.

## How to test
`mod.default.process([threePageA4Pdf], {})` gives three `image/jpeg` files, `…-page-1.jpg` to `…-page-3.jpg`, each noted 1240 × 1754. With `{ format: 'png' }` they're `image/png`.
