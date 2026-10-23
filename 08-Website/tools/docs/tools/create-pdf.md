# Create PDF

Type or paste text and save it as a PDF.

- Opens at: `/create-pdf`
- Code: `public/assets/js/tools/pdf/create.js` (a custom tool, since there's no file to add), with page layout from `pdf/_layout.js`
- Runs on: your device (nothing uploaded)
- Libraries: pdf-lib (Cantoo fork) 2.11.1 (MIT)

## How to use
1. Type or paste your text.
2. Select **Create PDF** and download `document.pdf`.
3. Select **Edit text** to go back and change it.

## Options
None.

## How it works
`_layout.js` wraps the text onto A4 pages with 2 cm margins, in 11 pt Helvetica, adding pages as it fills them. Line breaks are kept, tabs become four spaces, and very long words are broken to fit. The result shows the page count.

## Limits
- Plain text only: no bold, headings or pictures.
- Helvetica covers English and most Western European languages. Other characters (emoji, Chinese, Arabic and so on) are left out, and we say how many.
- The page is always A4 and the file is always called `document.pdf`.

## How to test
This is a custom tool, so test the named export `textToPdf(text)`, which resolves to `{ bytes, pages, dropped, skipped }`. `textToPdf('Hello world\nSecond line 😀\n' + 'Lorem ipsum dolor sit amet. '.repeat(400))` gives 3 A4 pages (595 × 842 points) with `dropped: 1` (the emoji).
