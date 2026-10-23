# Compress image

Make JPG, PNG and WebP files smaller, by quality or to a target size.

- Opens at: `/compress-image`
- Code: `public/assets/js/tools/image/compress.js` (libraries in `image/_vendor.js`)
- Runs on: your device (nothing uploaded)
- Libraries: UPNG.js 2.1.0 (MIT) with pako 1.0.11 (MIT and Zlib), for PNGs only

## How to use
1. Add one or more JPG, PNG or WebP images.
2. Pick **Quality** and set the slider, or pick **Target size** and enter a size in KB.
3. Select **Compress** and download. Each file shows its before and after size.

## Options
- Compress by: Quality or Target size.
- Quality: 10 to 100% (default 75). For PNGs it sets how many colours are kept (16 to 256).
- Target size: in KB (default 200).

## How it works
Each image is drawn on a canvas and saved again in its own format. JPG and WebP use the browser's encoder at the chosen quality. PNGs are saved with UPNG.js, which keeps fewer colours (the same idea as TinyPNG). Target size does a binary search on quality and stops within 10% under the target. If even the lowest quality is too big, the picture is scaled down and tried again.

## Limits
- Saving again removes camera details and location. That's usually a plus.
- PNG photos with smooth gradients can show banding at low quality.
- If the result isn't smaller, we keep the original file.
- WebP needs a browser that can save WebP (Chrome, Edge, Firefox). Safari shows an error for WebP files.
- Big PNGs are slow in target mode (each try re-encodes the whole picture).

## How to test
`mod.default.process([jpg, png, webp], { mode: 'target', target: 100 })`: every result is at most 100 KB and still opens. With `{ mode: 'quality', quality: 75 }` a 1600 × 1200 photo JPG comes out well under its original size, at the same dimensions.
