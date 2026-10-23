# Image to text

Pull the words out of a photo, screenshot or scan, ready to copy.

- Opens at: `/image-to-text`
- Code: `public/assets/js/tools/ai-device/image-to-text.js` (shared: `_vendor.js`, `_model.js`)
- Runs on: your device, with the text reader downloaded the first time (nothing uploaded)
- Libraries: Tesseract.js 7.0.0 and tesseract.js-core 7.0.0 (both Apache-2.0), from jsDelivr
- Model: Tesseract's LSTM text recognition, "best_int" language data from `@tesseract.js-data/<lang>` 1.0.0 (data from tessdata_best, Apache-2.0; package MIT). The first time: the reader (1.4 MB) plus the language (English 2.9 MB, others 0.6 to 3.8 MB), so about 4 MB for English. Tesseract.js keeps them in the browser (IndexedDB).

## Why this model
Tesseract is small, works on phones, needs no GPU and reads 100+ languages. The "best_int" data is the accurate set, packed small. We load the LSTM-only engine (the smaller core) since the older engine adds size for little gain.

## How to use
1. Add one or more images (up to 50).
2. Pick the language of the text (English to start).
3. Select **Get the text**, then copy it or download it as a .txt.

## Options
- Language of the text: 27 languages, one at a time. English, European languages, Arabic, Hebrew, Hindi, Thai, Vietnamese, Indonesian, Malay, Chinese (simplified and traditional), Japanese and Korean.

## How it works
We open the image in the browser, put white behind any see-through areas, and double the size of small images (under 1000 px) because Tesseract reads small text better that way. Tesseract reads it in a background worker. The worker stays open, so the next image starts quickly. Cancel stops waiting straight away; the worker finishes in the background and closes.

## Limits
- Printed text works best. Handwriting usually comes out wrong.
- Columns, tables and fancy layouts come out as plain lines of text, not the same layout.
- Blurry, dark, angled or low-contrast photos give more mistakes.
- One language per run. Pick the right one: the wrong language gives poor results.
- No text found gives a clear message rather than an empty file.

## How to test
Draw on a white 900 × 300 canvas in 44px Arial: "Creators make great content" and "The quick brown fox jumps over the lazy dog." `toBlob` it as PNG, then:

```js
const mod = await import('/public/assets/js/tools/ai-device/image-to-text.js');
const r = await mod.default.process([file], { lang: 'eng' });
```

`r.items[0]` is `{ name: 'words.txt', text }` and the text has both lines word for word. French text with accents and `{ lang: 'fra' }` comes back with the accents. A plain white image throws "We couldn't find any text in this image...". Named export: `imageToText(file, { lang }, ctx)` returns the text.
