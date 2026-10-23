# Extract images from PDF

Save every picture inside a PDF. Download them together as a zip.

- Opens at: `/extract-pdf-images`
- Code: `public/assets/js/tools/pdf/extract-images.js` (helpers in `pdf/_pages.js`)
- Runs on: your device (nothing uploaded)
- Libraries: pdf.js (pdfjs-dist) 6.4.299 (Apache-2.0); pdf-lib (Cantoo fork) 2.11.1 (MIT); fflate 0.8.3 (MIT) for the zip

## How to use
1. Add a PDF.
2. Select **Extract images**.
3. Download each picture, or select **Download all (.zip)**.

## Options
None.

## How it works
pdf.js lists the pictures drawn on each page. pdf-lib looks up how each one is stored: plain JPEGs are handed back byte for byte, so no quality is lost. Everything else is decoded by pdf.js and saved as PNG. A picture used on several pages is saved once. Files are named like `<name>-page2-3.png`, and **Download all** zips them as `pdf-images.zip`.

## Limits
- Pictures smaller than 8 × 8 pixels are skipped (they're usually lines or spacers).
- Charts, logos and shapes drawn with lines (vector graphics) aren't pictures, so they aren't saved. Use PDF to JPG to capture them as part of the page.
- Pictures come out at the size stored in the file. Parts the page crops or hides come out too.
- JPEGs with a mask or special colour settings are saved as PNG instead of untouched.
- Password-protected PDFs must be unlocked first.

## How to test
Make a PDF with an 800 × 600 JPG and a 2400 × 1800 PNG on one page. `mod.default.process([pdf], {})` gives `…-page1-1.jpg` (the same bytes as the original JPG) and `…-page1-2.png` noted 2400 × 1800. A PDF with no pictures rejects with "We didn't find any pictures in this PDF…". The core step is a named export: `extractImages(file, ctx)` returns `[{ name, blob, note }]`.
