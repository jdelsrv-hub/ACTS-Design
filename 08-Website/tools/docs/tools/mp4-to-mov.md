# MP4 to MOV

Turn MP4 videos into MOV files for QuickTime and other Apple apps.

- Opens at: `/mp4-to-mov`
- Code: `public/assets/js/tools/media/convert.js` with preset `{ from: 'MP4', options: { to: 'mov' } }` (see [Video converter](video-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: Mediabunny 1.61.6 (MPL-2.0), loaded through `core/vendor.js`

## How to use
1. Add an MP4 video.
2. Select **Convert video** and download.

## Options
Same as Video converter, starting on MOV.

## How it works
H.264 video and AAC sound are copied straight into a MOV with no loss, so most MP4s convert in moments. Anything else is re-encoded as H.264 and AAC.

## Limits
- The picture doesn't change, only the file type. Apps that need a special editing format (like ProRes) won't get one.
- Re-encoding, when it's needed, takes longer and softens the picture a little.

## How to test
`mod.default.defaults({ from: 'MP4', options: { to: 'mov' } })` returns `{ to: 'mov' }`. `process([mp4()], {}, { preset })` gives a `video/quicktime` file that `mediaInfo()` reads as QuickTime, with the same H.264, AAC, size and length, in well under a second.
