# Sharpen image

Make soft photos look crisper, with a strength slider.

- Opens at: `/sharpen-image`
- Code: `public/assets/js/tools/image/edit.js` with preset `{ fx: 'sharpen' }` (live preview from `image/_shared.js`)
- Runs on: your device (nothing uploaded)
- Libraries: none

## How to use
1. Add one or more images.
2. Set the strength. The preview updates as you go.
3. Select **Sharpen image** and download.

## Options
- Strength: 5 to 100% (default 40).

## How it works
A sharpening filter: each pixel is boosted and a share of its four neighbours is taken away, which lifts edges and leaves flat areas alone. Edge pixels repeat at the borders. Transparency is kept.

## Limits
- It can't fix a badly blurred or out-of-focus photo. It makes existing detail stand out.
- High strength adds bright halos and grain.
- The preview runs on a smaller copy, so the full-size result looks a touch gentler.

## How to test
`mod.default.process([img], { amount: 50 }, { preset: { fx: 'sharpen' } })` keeps the size. A flat colour area stays the same; pixels next to a hard edge move further apart in value.
