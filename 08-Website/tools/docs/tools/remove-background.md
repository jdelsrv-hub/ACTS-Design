# Remove background

Cut out the subject of a photo and save it as a see-through PNG.

- Opens at: `/remove-background`
- Code: `public/assets/js/tools/ai-device/remove-background.js` (shared: `_vendor.js`, `_model.js`)
- Runs on: your device, with AI models downloaded the first time (nothing uploaded)
- Libraries: Transformers.js 4.3.1 (Apache-2.0) with its ONNX Runtime Web 1.31.0-dev.20260914 CPU build (MIT), from jsDelivr
- Models, from Hugging Face at a fixed commit. About 15 MB the first time, including the AI engine:
  - U-2-Net small, `BritishWerewolf/U-2-Netp` @ `7112208`, Apache-2.0, 4.6 MB. Finds the main subject of any photo.
  - MODNet, `Xenova/modnet` @ `fa2fa54`, 8-bit, Apache-2.0, 6.6 MB. Portrait matting: much better at people and hair.

## Why these models
- Small enough for a phone: 11 MB of models, about 4 seconds a photo on a laptop.
- U-2-Net small alone missed most of a big afro. MODNet alone only finds people. Together they handled people, a dog, a butterfly, cars and a tiger in our tests.
- Ruled out: BiRefNet lite and BEN2 (MIT, but 115 to 220 MB), ormbg (Apache-2.0, 44 MB and about 13 seconds a photo), briaai RMBG (non-commercial) and @imgly / ISNet ports (AGPL).

## How to use
1. Add one or more photos (up to 20).
2. Pick the new background: Transparent, Colour or Blur the original.
3. Select **Remove background** and download.

## Options
- New background: Transparent (PNG), Colour (JPG on a solid colour) or Blur the original (JPG, like portrait mode).
- Background colour: for Colour. White to start.
- Blur strength: 1 to 10, for Blur. 5 to start.

## How it works
Both models look at a small copy of the photo (U-2-Net at 320 × 320, MODNet at 512 px on the short side). Each says how sure it is that every pixel is the subject, and we keep the surer answer. The mask is scaled up smoothly and becomes the photo's transparency. Colour and Blur draw the cut-out over a filled or blurred copy.

The models run in a background worker (ONNX Runtime's proxy mode), so the page stays responsive. The browser keeps them in its cache ("transformers-cache"), so the second photo starts straight away.

## Limits
- Fine hair and see-through things (glass, veils) can come out soft or keep a thin fringe of the old background.
- Busy photos with several subjects may keep more, or less, than you want.
- The mask is worked out at about 512 px, so edges on big photos are soft rather than pixel-sharp.
- Photos over 4096 px on the long side are scaled down to 4096 px.
- In Blur mode, a little of the subject's edge colour can show in the blurred background.
- The first use needs an internet connection to download the models.

## How to test
Draw a red circle (radius 110) in the middle of a plain light-grey 600 × 400 canvas and `toBlob` it as `circle.png`. Then:

```js
const mod = await import('/public/assets/js/tools/ai-device/remove-background.js');
const r = await mod.default.process([file], { background: 'transparent' });
```

`r.items[0]` is `circle-no-bg.png`, 600 × 400. The four corners have alpha 0 and the centre (300, 200) is opaque red. `{ background: 'colour' }` gives `circle-new-bg.jpg` and `{ background: 'blur' }` gives `circle-blurred-bg.jpg`.

Named exports: `subjectMask(image)` (mask canvas, alpha = subject), `composite(image, mask, { background, colour, blur })` (canvas), `removeBackground(file, options)` (`{ name, blob }`).
