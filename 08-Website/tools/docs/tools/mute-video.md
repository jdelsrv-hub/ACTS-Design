# Mute video

Remove the sound from a video, with no loss in picture quality.

- Opens at: `/mute-video`
- Code: `public/assets/js/tools/media/mute.js` (shared helpers in `media/_media.js`)
- Runs on: your device (nothing uploaded)
- Libraries: Mediabunny 1.61.6 (MPL-2.0), loaded through `core/vendor.js`

## How to use
1. Add one video: MP4, MOV, WebM or MKV.
2. Select **Remove sound** and download.

## Options
None.

## How it works
Mediabunny's `Conversion` runs with `audio: { discard: true }` and keeps the same file type. The video is copied across untouched, packet by packet, so nothing is re-encoded and it's quick.

## Limits
- Every sound track is removed. You can't keep one and drop another.
- The file keeps its type, so a MOV stays a MOV. Use [Video converter](video-converter.md) to change it.
- The finished file is held in memory, so very large videos can fail on phones.

## How to test
`mod.default.process([clip], {})` on the `mp4()` fixture from `tests/fixtures.js` gives an MP4 with the same video codec, dimensions and duration, no audio track (`mediaInfo().audio` is `null`), and a smaller size. It finishes in well under a second. A WebM input comes back as a WebM.
