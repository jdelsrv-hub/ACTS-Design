# Compress PDF

Make a PDF smaller by recompressing its pictures. The text stays sharp.

- Opens at: `/compress-pdf`
- Code: `public/assets/js/tools/pdf/compress.js` (helpers in `pdf/_pages.js`)
- Runs on: your device (nothing uploaded)
- Libraries: pdf-lib (Cantoo fork) 2.11.1 (MIT); pdf.js (pdfjs-dist) 6.4.299 (Apache-2.0)

## How to use
1. Add one or more PDFs.
2. Select **Compress PDF** and download. Each file shows how much smaller it got, and the summary shows the total saved.

## Options
None. The settings are fixed: pictures are saved as JPG at 70% quality, at most 2000 pixels on the longest side.

## How it works
pdf.js decodes the pictures on each page. Any picture stored at over 50 KB is redrawn on a white canvas, scaled down to 2000 pixels on the longest side if it's bigger, and saved as JPG at 70% quality. pdf-lib swaps the new JPG into the same object, so every page that uses that picture gets the smaller one. A picture is only swapped if the new one is at least 10% smaller. Text, fonts and drawn shapes aren't touched.

## Limits
- PDFs that are mostly text, or whose pictures are already well compressed, may not shrink. If the result isn't at least 3% smaller, we say so plainly instead of handing back the same file.
- Pictures with see-through parts (a mask) and black-and-white (1-bit) pictures are left as they are.
- Recompressed pictures are a little softer and are saved in RGB colour. Print-ready files with CMYK colour or colour profiles can shift colour slightly, so keep the original for printing.
- Scans shrink well, but small print can get softer, because big scans are scaled down to 2000 pixels.
- Password-protected PDFs must be unlocked first.

## How to test
Make a PDF with a 2400 × 1800 noisy PNG and a line of text on one page. `mod.default.process([pdf], {})` returns a much smaller PDF (7.4 MB to 220 KB in our check), a note like "97% smaller", a summary like "Saved 97% (7.4 MB to 220 KB)", and the text still reads with pdf.js. A text-only PDF rejects with "This PDF is already about as small as we can make it…". The core step is also a named export: `compressPdf(bytes, ctx)` returns the new PDF bytes.
