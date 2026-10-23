# Building tools for acTS Tools

Read this before adding or changing a tool. It's the contract every tool agent works to.

## How the site works

One page (`public/index.html`). `public/assets/js/app.js` lists every tool on `/` and opens one at `/<slug>`, its own URL so search engines can index it. Every path gets `index.html` (Cloudflare Pages' single-page fallback, copied by `dev_server.py`), and `functions/sitemap.xml.js` lists every tool from the registry. `#/<slug>` still opens a tool without reloading the page. No build step: edit a file, refresh the browser.

| Path | What it is | Who edits it |
| --- | --- | --- |
| `public/assets/js/core/` | Shared building blocks (UI, file helpers, library loader) | Lead only |
| `public/assets/js/registry.js` | Categories and the list of families | Lead only |
| `public/assets/js/tools/<family>/index.js` | That family's tool list (registry entries) | That family's agent |
| `public/assets/js/tools/<family>/*.js` | That family's tool code | That family's agent |
| `docs/tools/<slug>.md` | One README per tool | The agent that owns the tool |
| `tests/` | Test runner and tests | Tester agent |

Never edit `core/`, `registry.js`, `site.css` or another family's folder. If you need something shared, put a helper in your own family folder (for example `tools/pdf/_pages.js`) and mention it in your report so the lead can promote it.

## A registry entry

```js
// tools/<family>/index.js
export default [
  { slug: 'merge-pdf', name: 'Merge PDF', cat: 'pdf', icon: 'merge', module: 'merge.js',
    summary: 'Combine two or more PDFs into one file, in the order you choose.',
    keywords: ['combine', 'join'],          // optional, helps search
    preset: { to: 'jpeg' },                 // optional, passed to the module (lets one module power several entries)
    runsOn: 'device' },                     // optional: 'device' (default) | 'model' (downloads an AI model) | 'server' (our AI service)
];
```

- `slug`: lowercase-with-dashes, unique across the whole site.
- `cat`: one of `pdf`, `image`, `video`, `ai`, `convert`, `other` (see `registry.js`).
- `icon`: an id from `public/assets/img/icons.svg` without the `i-` prefix (for example `merge`, `image`, `video`, `sparkles`). Don't add icons; pick the closest one.
- `summary`: one sentence, under 90 characters, shown on the card and under the tool title.

## Writing a tool

Pick the smallest option that fully works:

1. **`fileTool()`** (`core/filetool.js`) for "add files, pick options, download results". Most tools are only a config object. The header comment in that file documents every field: `accept`, `multiple`, `minFiles`, `reorder`, `options`, `action`, `process(files, options, ctx)` or `processFile(file, options, ctx, i)`, `describe`, `validate`, `renderExtra`, `onFilesChange`.
2. **`textTool()`** (`core/texttool.js`) for "type or paste text, get text or stats back". Also for generators (`input: false`).
3. **Custom**: default-export `{ mount(root, ctx) }` and build the UI from `core/ui.js` pieces. Use this only when the tool needs its own interaction (page thumbnails, crop box, signature pad). Put the actual work in named exports so it can be tested without the UI.

Options schema (both tools): `{ id, type, label, default, help, showIf(values), wide }` with types `select`, `segmented`, `text`, `textarea`, `number`, `range`, `checkbox`, `color`, `password`, `file`. Choices: `['a', 'b']` or `[{ value, label }]`.

`ctx` in `process()`: `ctx.progress(fraction, message)`, `await ctx.tick()` inside long loops (keeps the page responsive and honours Cancel), `ctx.preset`.

A result is `{ name, blob, note? }` (a file to download) or `{ name, text }` (shown in a copyable box). Return one, an array, or `{ items, summary }` where `summary` is a one-line win like "Saved 42% (2.1 MB to 1.2 MB)".

### Shared helpers you should reuse

- `core/vendor.js`: pinned CDN libraries and loaders. `getPdfLib()`, `getPdfjs()`, `openPdfjs(bytes, { password })`, `getFflate()`, `getGifenc()`, `getMediabunny()`, `enableMp3Encoding()`, `loadModule(url)`, `loadScript(url, globalName)`.
- `core/image.js`: `decodeImage(file)` (any browser image plus HEIC and TIFF, EXIF rotation applied), `drawToCanvas`, `fitWithin`, `encodeCanvas(canvas, 'jpeg'|'png'|'webp'|'avif', quality)`, `canEncode(mime)`, `IMAGE_ACCEPT`.
- `core/files.js`: `formatBytes`, `sizeChange`, `withSuffix`, `renameExt`, `baseName`, `zipFiles`, `unzipFile`, `readText`, `downloadBlob`, `sniffType`.
- `core/ui.js`: `button`, `notice`, `toast`, `dropzone`, `fileList`, `optionsForm`, `progressBar`, `results`, `textOutput`, `statGrid`, `copyButton`, `modal`, `friendlyError`.
- `core/dom.js`: `h(tag, props, ...children)`, `icon(name)`, `clear`, `debounce`.
- CSS classes ready to use: `.thumb-grid` and `.thumb` (page or tile pickers), `.stage` (canvas area for crop, sign, place), `.checker` (transparency background), `.text-panes`, `.stat-grid`, `.opts`.

## Rules

- **Smallest complete version.** Do the core job well. No extra options nobody asked for. If TinyWow has ten "X to Y" pages, build one converter with format pickers and add cheap registry entries (presets) for the popular pairs.
- **Runs in the browser.** No uploads, no servers, except the AI writing family. Files never leave the device, and the copy can say so.
- **Libraries**: load from jsDelivr or cdnjs with an exact version. Licence must allow commercial use (MIT, Apache-2.0, BSD, ISC, MPL-2.0, or LGPL loaded unmodified). No GPL, AGPL or non-commercial licences, including AI model weights.
- **Honest limits.** If a conversion loses layout or quality, say so in the tool (a short `notice('info', ...)`) and in the README. Never claim more than the tool does.
- **Errors**: throw `new Error('A sentence a creator can act on.')`. `friendlyError()` already handles common cases (password-protected PDFs, out of memory, no internet).
- **Big files**: process page by page or frame by frame, call `await ctx.tick()` in loops, and free canvases/bitmaps (`bitmap.close()`).
- **Brand voice** for every word a visitor sees (see `02-Brand/`): calm, kind, plain words, Australian spelling (colour, optimise, centre), sentence case, "we" not "I", no hype words (magical, revolutionary), at most one exclamation mark, no emoji. Write **acTS**, never ACTS.

## One README per tool

`docs/tools/<slug>.md`, short. Several slugs that share one module still get one README each, and each points to the shared code.

```md
# Merge PDF

Combine two or more PDFs into one file, in the order you choose.

- Opens at: `/merge-pdf`
- Code: `public/assets/js/tools/pdf/merge.js`
- Runs on: your device (nothing uploaded)
- Libraries: pdf-lib (Cantoo fork) 2.11.1, MIT

## How to use
1. Add two or more PDFs.
2. Drag them into order.
3. Select **Merge PDFs** and download.

## Options
None.

## How it works
Copies every page from each file into a new PDF with pdf-lib.

## Limits
- Password-protected PDFs must be unlocked first.
- Form fields with the same name in different files may clash.

## How to test
Merge a 2-page and a 3-page PDF: the result has 5 pages in that order.
```

## Checking your work

The preview server is already running: `http://localhost:8787/public/<slug>` (start it with `python 08-Website/tools/dev_server.py` if it isn't).

Use the built-in browser tools (`mcp__Claude_Browser__*`). Open **your own tab** with `tabs_create` and pass that `tabId` on every call, because other agents share the browser. Then:

1. Load your tool's page and confirm `#tool-root` gets `data-mounted="true"` with no console errors (`read_console_messages`).
2. Make a test file in the page with `javascript_tool` and feed it to the tool:

```js
location.hash = '#/merge-pdf';
const wait = (fn, ms = 20000) => new Promise((ok, fail) => { const t = Date.now(); const i = setInterval(() => { const v = fn(); if (v) { clearInterval(i); ok(v); } else if (Date.now() - t > ms) { clearInterval(i); fail(new Error('timeout')); } }, 100); });
await wait(() => document.querySelector('#tool-root[data-mounted]'));
const { PDFDocument } = await import('https://cdn.jsdelivr.net/npm/@cantoo/pdf-lib@2.11.1/dist/pdf-lib.esm.min.js');
const doc = await PDFDocument.create(); doc.addPage(); doc.addPage();
const dt = new DataTransfer(); dt.items.add(new File([await doc.save()], 'a.pdf', { type: 'application/pdf' }));
const input = document.querySelector('#tool-root input[type=file]'); input.files = dt.files; input.dispatchEvent(new Event('change'));
```

3. Click the main button, wait for `.results`, and check the output is right (open it, count pages, check dimensions, play it).
4. Images: draw on a canvas and `toBlob` it. Video and audio: generate a 2-second MP4 with a tone in the page (the page's import map makes `import('mediabunny')` work):

```js
const MB = await import('mediabunny');
const canvas = new OffscreenCanvas(320, 240); const g = canvas.getContext('2d');
const out = new MB.Output({ format: new MB.Mp4OutputFormat(), target: new MB.BufferTarget() });
const video = new MB.CanvasSource(canvas, { codec: 'avc', bitrate: 1e6 }); out.addVideoTrack(video, { frameRate: 30 });
const audio = new MB.AudioBufferSource({ codec: 'aac', bitrate: 128e3 }); out.addAudioTrack(audio);
await out.start();
for (let i = 0; i < 60; i++) { g.fillStyle = `hsl(${i * 6} 70% 50%)`; g.fillRect(0, 0, 320, 240); await video.add(i / 30, 1 / 30); }
const ab = new AudioBuffer({ length: 96000, numberOfChannels: 2, sampleRate: 48000 });
for (let c = 0; c < 2; c++) ab.getChannelData(c).forEach((_, i, d) => (d[i] = Math.sin(i / 17) * 0.3));
await audio.add(ab); await out.finalize();
const mp4 = new File([out.target.buffer], 'test.mp4', { type: 'video/mp4' });
```
5. Also check the tool at phone width once (`resize_window` preset `mobile`, then back to `desktop`).

## Test hooks (for the tester agent)

- `fileTool` modules: `mod.default.defaults(preset)` and `await mod.default.process(files, options, { preset })` return `{ items, summary, errors }` with no UI.
- `textTool` modules: `await mod.default.transform(text, options, { preset })` returns `{ text, stats, error }`.
- Custom modules: export the core functions by name and list them in the tool's README under "How to test".

## Definition of done (per tool)

- Works end to end in the browser on a real-looking file, with no console errors.
- Registry entry added in your family's `index.js`.
- README at `docs/tools/<slug>.md`.
- Anything you skipped or couldn't verify is in your final report.
