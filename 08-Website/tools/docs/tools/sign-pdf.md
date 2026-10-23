# Sign PDF

Draw or type your signature and place it on a PDF.

- Opens at: `/sign-pdf`
- Code: `public/assets/js/tools/pdf/sign.js` (page viewer, dragging and page geometry from `pdf/_pages.js`)
- Runs on: your device (nothing uploaded)
- Libraries: pdf-lib (Cantoo fork) 2.11.1 (MIT); pdf.js (pdfjs-dist) 6.4.299 (Apache-2.0) for the page preview; Dancing Script font from @fontsource/dancing-script 5.3.0 (SIL Open Font Licence 1.1) for typed signatures

## How to use
1. Add a PDF.
2. Choose **Draw** and sign with your mouse, finger or a stylus. Or choose **Type** and type your name.
3. Pick the page, then drag your signature into place or click where it should go. Use **Size** to make it bigger or smaller.
4. Select **Sign PDF** and download.

## Options
None in a form. The page sets hidden options as you go:
- `signature`: the signature as a PNG data URL.
- `page`: the page number (default 1).
- `x`, `y`: the signature's top-left corner as fractions of the page (default 0.55, 0.8).
- `w`: its width as a fraction of the page width (default 0.3; the Size slider runs from 5% to 80%).

## How it works
The drawing pad (or your name in Dancing Script) is drawn in dark ink on a canvas, trimmed to the ink and kept as a PNG. pdf-lib places that picture on the chosen page at the spot you picked, allowing for rotated and cropped pages. The file is named with `-signed` added.

## Limits
- This puts a picture of your signature on the page. It isn't a certified digital signature (no certificate, and nothing that shows if the file changes later). Check first if your document needs a certified e-signature.
- One signature on one page per run. Run it again to sign another page.
- If the handwriting font can't load, a typed signature uses your device's cursive font.
- Password-protected PDFs must be unlocked first.

## How to test
`typedSignature('Sam Lee')` (named export) returns a `data:image/png` URL. `mod.default.process([twoPagePdf], { signature, page: 2, x: 0.5, y: 0.8, w: 0.3 })` gives `…-signed.pdf`, where pdf.js finds one image on page 2 and none on page 1. The core step is also a named export: `signPdf(bytes, signature, { page, x, y, w })`.
