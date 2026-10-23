# Watermark PDF

Stamp text or an image across every page of a PDF.

- Opens at: `/watermark-pdf`
- Code: `public/assets/js/tools/pdf/watermark.js` (page geometry from `pdf/_pages.js`, character check from `pdf/_layout.js`)
- Runs on: your device (nothing uploaded)
- Libraries: pdf-lib (Cantoo fork) 2.11.1 (MIT); heic2any 0.0.4 (MIT, bundles libheif under LGPL) and UTIF.js 3.1.0 (MIT) only if the stamp image is HEIC or TIFF

## How to use
1. Add a PDF.
2. Choose **Text** and type the words, or choose **Image** and pick a picture (a PNG logo with a see-through background works best).
3. Set the opacity.
4. Select **Add watermark** and download.

## Options
- Stamp: Text (default) or Image.
- Text: up to 60 characters (default `DRAFT`).
- Image: any image file.
- Opacity: 5 to 100%, in steps of 5 (default 30%).

## How it works
Text is set in grey Helvetica Bold, running corner to corner across the page and sized to about three-quarters of the diagonal (no taller than a quarter of the page). An image is centred, at most half the page wide and half the page high, keeping its shape. Both go on every page at the opacity you chose, allowing for rotated pages. The file is named with `-watermarked` added.

## Limits
- A watermark sits on top of the page. Anyone with a PDF editor can remove it, so it isn't protection.
- The position, angle, colour and size are set for you, and it goes on every page.
- Characters Helvetica can't show (emoji, Chinese, Arabic and so on) are left out. A note on the page says so, and if no characters are left we stop with a message.
- Image stamps are saved as PNG inside the PDF, so a large photo makes the file much bigger.
- Password-protected PDFs must be unlocked first.

## How to test
`mod.default.process([pdf], {})` gives a PDF where pdf.js reads "DRAFT" on every page. `mod.default.process([pdf], { kind: 'image', image: pngFile, opacity: 50 })` gives a PDF with one image on every page. The core step is a named export: `watermarkPdf(bytes, { kind, text, image, opacity })`.
