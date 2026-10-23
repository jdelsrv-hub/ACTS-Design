# PNG to PDF

Turn PNG images into one PDF, in the order you choose.

- Opens at: `/png-to-pdf`
- Code: `public/assets/js/tools/pdf/images-to-pdf.js` with preset `{ label: 'PNG' }` (see [Images to PDF](images-to-pdf.md))
- Runs on: your device (nothing uploaded)
- Libraries: pdf-lib (Cantoo fork) 2.11.1 (MIT)

## How to use
1. Add your PNG images, like screenshots.
2. Drag them into order and pick a page size.
3. Select **Create PDF** and download.

## Options
Same as Images to PDF. The preset only changes the drop zone wording ("Drop your PNG images here"). It still takes every image type Images to PDF does.

## How it works
Each PNG goes into the PDF unchanged, one image per page at 96 DPI, so it stays lossless and keeps any see-through areas.

## Limits
- Large PNG photos make large PDFs, because PNG is lossless.
- On A4 or Letter, small images aren't enlarged.

## How to test
`mod.default.process([png2400x1800], {}, { preset: { label: 'PNG' } })` gives a 1-page PDF with an 1800 × 1350 point page.
