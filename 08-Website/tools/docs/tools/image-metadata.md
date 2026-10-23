# View or remove metadata

See camera, date and GPS details in a photo, then save a clean copy.

- Opens at: `/image-metadata`
- Code: `public/assets/js/tools/image/metadata.js` (libraries in `image/_vendor.js`)
- Runs on: your device (nothing uploaded)
- Libraries: exifr 7.1.3 (MIT)

## How to use
1. Add one or more photos (JPG, PNG, WebP, HEIC, TIFF or AVIF).
2. Read the details for each file. A warning shows when a photo holds a GPS location.
3. Select **Save clean copy** and download.

## Options
None.

## How it works
exifr reads EXIF, GPS, IPTC and XMP, plus PNG text notes. WebP isn't supported by exifr, so we hand it the WebP's EXIF chunk. The key facts (camera, lens, date taken, location, settings, software, author) show as cards, with every field in a table below.

The clean copy keeps the exact same picture for JPG, PNG and WebP:
- JPG: removes EXIF, XMP, IPTC, comments and extra images (such as HDR gain maps). Keeps colour profiles, and writes back only the orientation tag so sideways phone photos still show the right way up.
- PNG: keeps only the chunks needed to show the picture and its colours.
- WebP: removes the EXIF and XMP chunks and clears their flags.
- HEIC is saved again as JPG. TIFF, AVIF, and PNG or WebP files with a rotation tag are saved again as PNG.

## Limits
- Maker notes (camera-specific blocks) aren't listed, but they're removed.
- Editing single fields isn't supported. It's view or remove all.
- HDR photos lose their HDR boost and show as normal brightness.

## How to test
Named exports: `readMetadata(file)`, `keyFacts(tags)`, `stripMetadata(file)`.
Build a JPG with an EXIF block (Make, Model, Orientation 6, DateTimeOriginal, GPS), an XMP block and a comment. `readMetadata` finds the camera and `latitude`/`longitude`. After `mod.default.process([file])`, `readMetadata(clean)` returns only `Orientation`, the decoded pixels are identical to the original, the size is still rotated (600 × 800 from an 800 × 600 photo) and none of the text values appear in the bytes.
