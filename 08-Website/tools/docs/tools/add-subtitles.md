# Add subtitles

Burn an .srt subtitle file into your video, so the captions always show.

- Opens at: `/add-subtitles`
- Code: `public/assets/js/tools/media/subtitles.js` (shared helpers in `media/_media.js`)
- Runs on: your device (nothing uploaded)
- Libraries: Mediabunny 1.61.6 (MPL-2.0), loaded through `core/vendor.js`

## How to use
1. Add one video: MP4, MOV, WebM or MKV.
2. Select **Choose .srt file** and pick your subtitles.
3. Select **Add subtitles** and download the MP4.

## Options
- Subtitle file (.srt): required.

## How it works
`parseSrt()` reads each cue's start time, end time and lines. Formatting tags like `<i>` and `{\an8}` are dropped. Mediabunny's `Conversion` decodes every frame and draws it on a canvas. If a cue covers that moment, the text goes on top: bold white Arial with a dark outline, centred near the bottom, sized to 5.5% of the shorter side (at least 14 px) and wrapped to fit 90% of the width. Any rotation is baked in first, so the text sits upright. The frames are re-encoded as H.264 at Mediabunny's "high" quality setting, and the sound is saved as AAC (copied when it already is). You always get an MP4.

## Limits
- Burned-in captions can't be turned off or edited later. Keep your .srt in case you need changes.
- Only .srt files. Styling and position tags are ignored, so every caption looks the same and sits at the bottom.
- Every frame is re-encoded, so long videos take a while and the picture softens a little.
- Text uses Arial or your device's sans-serif font, so languages your device has no font for won't show properly.
- Very long cues wrap onto several lines and can cover a lot of the picture.
- If the browser can't read the video or can't make H.264, we say so and suggest another browser.

## How to test
`parseSrt(text)` (a named export) turns a two-cue file into `[{ start: 0.5, end: 2, lines: ['Hello there'] }, { start: 2.5, end: 3.5, lines: ['Second line', 'with two rows'] }]`, with `<i>` removed. `mod.default.process([clip], { srt })` on the `mp4({ seconds: 4, width: 640, height: 360 })` fixture, with `srt` as a `File`, gives an MP4 at the same size and length with AAC sound, and the note "2 subtitles". The hook needs `srt`, because `validate()` only runs in the page. Read frames back with Mediabunny's `CanvasSink`: the bottom strip has near-white pixels at 1 s and 3 s, and none at 2.2 s, between the cues. A file with no cues throws "We couldn't find any subtitles in that file."
