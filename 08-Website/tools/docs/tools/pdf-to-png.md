# PDF to PNG

Save every page of a PDF as a PNG image.

- Opens at: `/pdf-to-png`
- Code: `public/assets/js/tools/pdf/to-images.js` with preset `{ options: { format: 'png' } }` (see [PDF to JPG](pdf-to-jpg.md))
- Runs on: your device (nothing uploaded)
- Libraries: pdf.js (pdfjs-dist) 6.4.299 (Apache-2.0); fflate 0.8.3 (MIT) for the zip

## How to use
1. Add a PDF.
2. Select **Convert pages**. Download each page, or select **Download all (.zip)**.

## Options
Same as PDF to JPG, starting on PNG.

## How it works
Each page is drawn at 150 DPI and saved as a lossless PNG named `<name>-page-1.png` and so on. **Download all** zips them as `pdf-to-png.zip`.

## Limits
- Pages full of photos make much bigger PNGs than JPGs.
- The resolution is fixed at 150 DPI, and very large pages are capped at 5000 pixels on the longest side.
- Password-protected PDFs must be unlocked first.

## How to test
`mod.default.defaults({ options: { format: 'png' } })` is `{ format: 'png' }`, and `mod.default.process([pdf], {}, { preset: { options: { format: 'png' } } })` gives one `image/png` per page.
