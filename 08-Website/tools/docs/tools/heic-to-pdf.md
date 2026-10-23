# HEIC to PDF

Turn iPhone HEIC photos into one PDF, in the order you choose.

- Opens at: `/heic-to-pdf`
- Code: `public/assets/js/tools/pdf/images-to-pdf.js` with preset `{ label: 'HEIC' }` (see [Images to PDF](images-to-pdf.md))
- Runs on: your device (nothing uploaded)
- Libraries: pdf-lib (Cantoo fork) 2.11.1 (MIT); heic2any 0.0.4 (MIT, bundles libheif under LGPL), loaded only if your browser can't open HEIC itself

## How to use
1. Add your HEIC photos.
2. Drag them into order and pick a page size.
3. Select **Create PDF** and download.

## Options
Same as Images to PDF. The preset only changes the drop zone wording ("Drop your HEIC images here"). It still takes every image type Images to PDF does.

## How it works
Each photo is opened with `decodeImage()` (the browser first, heic2any if that fails), turned upright and saved as JPG at 92% quality, one photo per page at 96 DPI.

## Limits
- HEIC can't go into a PDF as it is, so each photo is saved again as JPG. The quality loss is small but real.
- HEIC files holding several images (bursts, some Live Photos) use the first image only.
- The HEIC decoder is an extra download the first time, and big photos take a few seconds each.

## How to test
`mod.default.process([heicPhoto], {}, { preset: { label: 'HEIC' } })` gives a 1-page PDF whose page is the photo's pixel size × 0.75 points, the right way up.
