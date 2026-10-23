# Black and white

Make images black and white, with extra contrast if you want it.

- Opens at: `/black-and-white`
- Code: `public/assets/js/tools/image/edit.js` with preset `{ fx: 'bw' }` (live preview from `image/_shared.js`)
- Runs on: your device (nothing uploaded)
- Libraries: none

## How to use
1. Add one or more images.
2. Add extra contrast if you like. The preview updates as you go.
3. Select **Make black and white** and download.

## Options
- Extra contrast: 0 to 100% (default 0). 100% doubles the contrast around mid grey.

## How it works
Each pixel becomes a grey of the same brightness (0.299 red + 0.587 green + 0.114 blue), then contrast is stretched around mid grey. Transparency is kept. The result keeps the input format.

## Limits
- It's a straight greyscale, not a film-style filter.
- Strong contrast clips the darkest and lightest areas to pure black and white.

## How to test
On pure colours with contrast 0: red gives 76, green 150, blue 29 (all three channels equal). With contrast 100, red gives 24.
