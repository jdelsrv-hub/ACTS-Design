# Images to PDF

Combine JPG, PNG, WebP, HEIC, TIFF or GIF images into one PDF.

- Opens at: `/images-to-pdf`
- Code: `public/assets/js/tools/pdf/images-to-pdf.js`. The same code runs [JPG to PDF](jpg-to-pdf.md), [PNG to PDF](png-to-pdf.md) and [HEIC to PDF](heic-to-pdf.md).
- Runs on: your device (nothing uploaded)
- Libraries: pdf-lib (Cantoo fork) 2.11.1 (MIT); heic2any 0.0.4 (MIT, bundles libheif under LGPL) for HEIC photos your browser can't open itself; UTIF.js 3.1.0 (MIT) for TIFF

## How to use
1. Add your images.
2. Drag them into the order you want. Each image becomes one page.
3. Pick a page size.
4. Select **Create PDF** and download.

## Options
- Page size: Fit each image (default), A4 or Letter.

## How it works
JPG and PNG files go into the PDF as they are, so no quality is lost. WebP, HEIC, TIFF and GIF images, and JPGs a phone saved sideways (with an EXIF rotation tag), are opened with `decodeImage()`, turned upright and saved as JPG at 92% quality on white. Pictures are sized at 96 DPI. With **Fit each image**, each page is exactly the picture's size. With A4 or Letter, the page turns landscape for wide pictures and the picture is centred inside a 24-point margin, shrunk to fit but never enlarged. The PDF is named after the first image.

## Limits
- GIFs use the first frame only, and TIFFs the first page only.
- See-through areas in WebP, HEIC, TIFF and GIF images turn white. PNGs keep their transparency.
- On A4 or Letter, small images stay small (they aren't stretched to fill the page).
- Big phone photos make big PDFs, because JPGs go in unchanged. Use Compress PDF afterwards if you need it smaller.
- HEIC needs an extra download the first time, unless your browser can open HEIC itself.

## How to test
`mod.default.process([jpg800x600, png2400x1800, webp600x800], { size: 'fit' })` gives one 3-page PDF named after the first image, with pages of 600 × 450, 1800 × 1350 and 450 × 600 points. With `{ size: 'a4' }`, a wide image gets an 842 × 595 page and a tall one 595 × 842.
