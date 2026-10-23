# QR code generator

Make a QR code for a link, some text or your Wi-Fi. PNG or SVG.

- Opens at: `/qr-code-generator`
- Code: `public/assets/js/tools/files/qr.js` (custom tool, library loader in `files/_vendor.js`)
- Runs on: your device (nothing uploaded)
- Libraries: uqr 0.1.2 (MIT)

## How to use
1. Pick what the code opens: **Link**, **Text** or **Wi-Fi**.
2. Enter the link or text, or your network name, security type and password.
3. Set the size and colours. The preview updates as you type.
4. Select **Download PNG** or **Download SVG**.

## Options
- What it opens: Link, Text or Wi-Fi (default Link).
- Link: a web address. If it has no `https://` (or other scheme like `mailto:`), we add `https://`.
- Text: any text.
- Wi-Fi: Network name, Security (WPA, WPA2 or WPA3 by default; WEP; or None for an open network) and Network password (hidden for open networks).
- Size: 128 to 2048 px in steps of 64 (default 512). Sets the PNG size and the SVG's width and height.
- Colour: default black (#000000). Background: default white (#ffffff).

## How it works
`qrPayload()` builds the text stored in the code. Wi-Fi uses the standard `WIFI:T:WPA;S:name;P:password;;` format that phone cameras understand, with `\ ; , : "` escaped. uqr encodes it at error correction level M (about 15% of the code can be damaged and it still scans), with the 4-module quiet border scanners need. The PNG is drawn on a canvas. The SVG joins each run of dark squares into one path, so it stays small and sharp at any size. Files download as `qr-code.png` and `qr-code.svg`.

## Limits
- Up to 2,331 bytes of text (about 2,300 plain letters, fewer with accents or emoji). Long codes are dense and harder to scan, so short links work best.
- We warn when the colours have low contrast (under 4 to 1). That includes a light code on a dark background, which some phones can't read.
- Hidden Wi-Fi networks aren't supported.
- The Wi-Fi password is stored in the code as plain text, so anyone who scans it can read it.
- A link code is static: it can't be changed or tracked after printing.

## How to test
Named exports, no UI:
- `qrPayload({ type: 'wifi', ssid: 'Home;Net', security: 'WPA', password: 'p:ss' })` returns `WIFI:T:WPA;S:Home\;Net;P:p\:ss;;`. `qrPayload({ type: 'link', link: 'example.com' })` returns `https://example.com`.
- `await qrMatrix('https://example.com')` returns a 33 × 33 grid of true/false, with `false` in the corner (quiet border) and `true` at `[4][4]` (finder pattern). `qrMatrix('a'.repeat(2332))` throws.
- `qrSvg(matrix, 512, '#000000', '#ffffff')` starts with `<svg` and has `viewBox="0 0 33 33"` and `width="512"`.
- `await qrPng(matrix, 512, '#000000', '#ffffff')` gives an `image/png` that decodes to 512 × 512.
