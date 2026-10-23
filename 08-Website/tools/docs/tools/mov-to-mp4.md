# MOV to MP4

Turn iPhone and Mac MOV videos into MP4 files that play anywhere.

- Opens at: `/mov-to-mp4`
- Code: `public/assets/js/tools/media/convert.js` with preset `{ from: 'MOV', options: { to: 'mp4' } }` (see [Video converter](video-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: Mediabunny 1.61.6 (MPL-2.0), loaded through `core/vendor.js`

## How to use
1. Add a MOV video.
2. Select **Convert video** and download.

## Options
Same as Video converter, starting on MP4.

## How it works
If the MOV already has H.264 video and AAC sound, they're copied straight into an MP4 with no loss. HEVC video, the default on recent iPhones, is re-encoded as H.264 so it plays everywhere.

## Limits
- Re-encoding HEVC needs a browser that can read it. Some Windows PCs can't, and we suggest another browser when that happens.
- Re-encoding takes longer and softens the picture a little.

## How to test
`mod.default.defaults({ from: 'MOV', options: { to: 'mp4' } })` returns `{ to: 'mp4' }`. Make a MOV with `process([mp4()], { to: 'mov' })`, then `process([mov], {}, { preset })` gives an MP4 with H.264 and AAC at the same size and length, in well under a second (copied).
