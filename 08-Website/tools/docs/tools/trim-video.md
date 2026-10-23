# Trim video

Cut a video down to the part you want, with a preview to pick the start and end.

- Opens at: `/trim-video`
- Code: `public/assets/js/tools/media/trim.js` (shared helpers, including the preview player and time parsing, in `media/_media.js`)
- Runs on: your device (nothing uploaded)
- Libraries: Mediabunny 1.61.6 (MPL-2.0), loaded through `core/vendor.js`

## How to use
1. Add one video: MP4, MOV, WebM or MKV.
2. Play the preview and select **Set start** and **Set end** at the right moments, or type the times.
3. Select **Trim video** and download.

## Options
- Start: default `0:00`.
- End: fills in with the video's length once the preview loads. Leave it empty to keep everything to the end.
- Times can be typed as `1:05.5`, `65.5` or `0:01:05`. A comma works as the decimal point too.

## How it works
Mediabunny's `Conversion` runs with `trim: { start, end }` and keeps the same file type. MP4 and MOV files are copied without re-encoding. The copy starts at the key frame (a full picture the next frames are built from) at or before your start, and the file's timing hides the extra frames, so it plays from your start with no loss in quality. WebM and MKV can't hide those frames, so unless your start lands on a key frame, the picture is re-encoded at Mediabunny's "high" quality setting.

## Limits
- WebM and MKV trims that need re-encoding are slower and lose some detail.
- MP4 and MOV trims can be a little bigger than you'd expect, because the hidden frames back to the last key frame stay in the file.
- If the browser can't play the video, there's no preview. You can still type the times.
- One video at a time. The finished file is held in memory, so very large videos can fail on phones.

## How to test
On the `mp4({ seconds: 4, width: 640, height: 360 })` fixture, `mod.default.process([clip], { start: '0:01', end: '0:02.5' })` gives an MP4 about 1.5 s long (`mediaInfo().duration`, or a `<video>` element's `duration`), with video and sound, and the note "0:01.5 long". It takes well under a second because nothing is re-encoded, and the first frame shown is the 1 s frame. The same trim on a WebM (convert the fixture first) takes longer and is also 1.5 s. `{ start: '0:05' }` throws "The start is after the end of the video". `parseTime('1:05.5')` from `_media.js` returns 65.5.
