# Resize video

Change a video to 1080p, 720p, 480p or a width you choose.

- Opens at: `/resize-video`
- Code: `public/assets/js/tools/media/resize.js` (shared helpers in `media/_media.js`)
- Runs on: your device (nothing uploaded)
- Libraries: Mediabunny 1.61.6 (MPL-2.0), loaded through `core/vendor.js`

## How to use
1. Add one video: MP4, MOV, WebM or MKV.
2. Pick a size, or **Custom width** and type a width.
3. Select **Resize video** and download.

## Options
- New size: 1080p, 720p (default), 480p or Custom width. For the p sizes, the shorter side becomes that many pixels, so portrait videos work too.
- Width: shown for Custom width, 16 to 7680 px (default 1280). The height changes to match, so nothing gets stretched.

## How it works
We read the video's shown width and height (after any rotation), scale both by the same amount and round them to even numbers, because video encoders need them. Mediabunny's `Conversion` then re-encodes the picture as H.264 at its "high" quality setting. Sound is saved as AAC: copied when it's already AAC, re-encoded otherwise. You always get an MP4, named like `clip-1280x720.mp4`.

## Limits
- Picking a size bigger than the video scales it up. That makes the file bigger but doesn't add detail.
- Re-encoding loses some detail, and the file can get bigger or smaller.
- If the browser can't read the video or can't make H.264, we say so and suggest another browser.
- One video at a time. The finished file is held in memory, so very large videos can fail on phones.

## How to test
On the `mp4({ seconds: 4, width: 640, height: 360 })` fixture, check with `mediaInfo()`: `mod.default.process([clip], {})` gives 1280 × 720 (note "1280 × 720"), and `{ size: 'custom', width: 300 }` gives 300 × 168. A portrait `mp4({ width: 360, height: 640 })` with `{ size: 480 }` gives 480 × 854. Each result keeps its length and has AAC sound.
