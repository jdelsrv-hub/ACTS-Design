# Create zip

Put several files into one .zip, ready to send or store.

- Opens at: `/create-zip`
- Code: `public/assets/js/tools/files/zip.js` (uses `zipFiles()` from `core/files.js`)
- Runs on: your device (nothing uploaded)
- Libraries: fflate 0.8.3 (MIT), through `core/vendor.js`

## How to use
1. Add the files you want to zip. Any type works.
2. Select **Create zip** and download.

## Options
None.

## How it works
Every file goes into one zip, compressed with the standard zip method (deflate). Files that are already compressed (JPG, PNG, MP4, MP3, other zips, Word and Excel files) are stored as they are, because compressing them again saves next to nothing. The zip is named after the file when there's only one, or `files.zip` when there are more. The summary shows the size before and after.

## Limits
- Up to 500 files at a time.
- Add files, not folders. Everything goes in the top level of the zip.
- Two files with the same name are kept as `a.txt` and `a-2.txt`. Characters that Windows or macOS don't allow in names are replaced with spaces.
- The whole zip is built in memory, so several GB of files can fail, especially on phones.
- No password option.

## How to test
`mod.default.process([a.txt, a.txt, b.bin])` (5 bytes, 2 bytes and 1,000 zero bytes): one `files.zip` with note "3 files" and a summary like "3 files zipped (1007 B to 305 B)". Unzip it with `unzipFile()` from `core/files.js`: entries `a.txt`, `a-2.txt` and `b.bin` with the same sizes. A single `notes.txt` gives `notes.zip`.
