# JPG to PDF

Turn JPG photos into one PDF, in the order you choose.

- Opens at: `/jpg-to-pdf`
- Code: `public/assets/js/tools/pdf/images-to-pdf.js` with preset `{ label: 'JPG' }` (see [Images to PDF](images-to-pdf.md))
- Runs on: your device (nothing uploaded)
- Libraries: pdf-lib (Cantoo fork) 2.11.1 (MIT)

## How to use
1. Add your JPG photos.
2. Drag them into order and pick a page size.
3. Select **Create PDF** and download.

## Options
Same as Images to PDF. The preset only changes the drop zone wording ("Drop your JPG images here"). It still takes every image type Images to PDF does.

## How it works
Each JPG goes into the PDF unchanged, one photo per page at 96 DPI, so no quality is lost. Photos a phone saved sideways are turned upright first, which saves them again as JPG at 92% quality.

## Limits
- Big photos make big PDFs. Use Compress PDF afterwards if you need it smaller.
- On A4 or Letter, small photos aren't enlarged.

## How to test
`mod.default.process([jpg800x600], {}, { preset: { label: 'JPG' } })` gives a 1-page PDF with a 600 × 450 point page.
