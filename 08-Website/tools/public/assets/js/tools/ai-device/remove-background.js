// Remove, recolour or blur the background of a photo with two small AI models that run in the browser:
// U-2-Net small finds the subject of any photo, MODNet is better at people and hair. We keep whichever is surer.
// One module powers remove-background, transparent-background, change-background and blur-background (preset.options).
// Named exports for tests: subjectMask(image) -> mask canvas, composite(image, mask, options) -> canvas,
// removeBackground(file, options) -> { name, blob }.
import { fileTool } from '../../core/filetool.js';
import { IMAGE_ACCEPT, decodeImage, drawToCanvas, fitWithin, makeCanvas, encodeCanvas } from '../../core/image.js';
import { withSuffix } from '../../core/files.js';
import { MODELS, DOWNLOAD_MB, getTransformers } from './_vendor.js';
import { isModelCached, modelNotice, downloadProgress } from './_model.js';

const { cutout: CUTOUT, portrait: PORTRAIT } = MODELS;
const MAX_SIDE = 4096; // phones can't hold much bigger canvases

let modelsReady;
function loadModels(ctx = {}) {
  modelsReady ||= getTransformers()
    .then((T) => {
      const progress_callback = ctx.progress ? downloadProgress(ctx, CUTOUT.bytes + PORTRAIT.bytes) : null;
      // Both are plain one-file ONNX models (image in, mask out). Giving MODNet's type skips config.json.
      const load = (m) => T.AutoModel.from_pretrained(m.id, { revision: m.revision, config: { model_type: 'modnet' }, dtype: m.dtype, device: 'wasm', progress_callback });
      return Promise.all([load(CUTOUT), load(PORTRAIT)]);
    })
    .catch((err) => {
      modelsReady = null;
      throw err;
    });
  return modelsReady;
}

/** Run a model on the image at w x h. Pixels go in as (value / 255 - mean) / std; the first output comes back. */
async function run(T, model, image, w, hgt, mean, std) {
  const px = drawToCanvas(image, w, hgt).getContext('2d').getImageData(0, 0, w, hgt).data;
  const n = w * hgt;
  const input = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) input[c * n + i] = (px[i * 4 + c] / 255 - mean[c]) / std[c];
  const { inputNames, outputNames } = model.sessions.model;
  const out = await model({ [inputNames[0]]: new T.Tensor('float32', input, [1, 3, hgt, w]) });
  return out[outputNames[0]].data;
}

/** Find the subject. Returns a canvas (about 512 px on the short side) that is opaque on the subject and clear elsewhere. */
export async function subjectMask(image, ctx = {}) {
  const [T, [cutout, portrait]] = await Promise.all([getTransformers(), loadModels(ctx)]);
  // MODNet: short side 512, long side at most 1024, both multiples of 32.
  const k = Math.min(512 / Math.min(image.width, image.height), 1024 / Math.max(image.width, image.height));
  const w = Math.max(32, Math.round((image.width * k) / 32) * 32);
  const hgt = Math.max(32, Math.round((image.height * k) / 32) * 32);
  const person = await run(T, portrait, image, w, hgt, [0.5, 0.5, 0.5], [0.5, 0.5, 0.5]);
  // U-2-Net looks at a 320 x 320 copy. Stretch its answer to the full 0-1 range, then scale it up to MODNet's size.
  const any = await run(T, cutout, image, 320, 320, [0.485, 0.456, 0.406], [0.229, 0.224, 0.225]);
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of any) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const small = makeCanvas(320, 320);
  const sg = small.getContext('2d');
  const sp = sg.createImageData(320, 320);
  for (let i = 0; i < any.length; i++) sp.data[i * 4 + 3] = Math.round((255 * (any[i] - lo)) / (hi - lo || 1));
  sg.putImageData(sp, 0, 0);
  const mask = makeCanvas(w, hgt);
  const g = mask.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(small, 0, 0, w, hgt);
  const px = g.getImageData(0, 0, w, hgt);
  for (let i = 0; i < person.length; i++) px.data[i * 4 + 3] = Math.max(px.data[i * 4 + 3], Math.round(person[i] * 255));
  g.putImageData(px, 0, 0);
  return mask;
}

/**
 * Put the subject on its new background.
 * options.background: 'transparent' | 'colour' | 'blur'; options.colour: '#RRGGBB'; options.blur: 1-10.
 */
export function composite(image, mask, { background = 'transparent', colour = '#FFFFFF', blur = 5 } = {}) {
  const { width: w, height: hgt } = image;
  const cut = makeCanvas(w, hgt);
  const g = cut.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(mask, 0, 0, w, hgt); // the small mask, stretched smoothly to full size
  g.globalCompositeOperation = 'source-in';
  g.drawImage(image, 0, 0, w, hgt);
  if (background === 'transparent') return cut;

  const out = makeCanvas(w, hgt);
  const o = out.getContext('2d');
  if (background === 'colour') {
    o.fillStyle = colour;
    o.fillRect(0, 0, w, hgt);
  } else {
    const r = (blur * Math.max(w, hgt)) / 400;
    if ('filter' in o) {
      // Draw slightly oversized so the blur doesn't fade at the edges.
      o.filter = `blur(${r}px)`;
      o.drawImage(image, -2 * r, -2 * r, w + 4 * r, hgt + 4 * r);
      o.filter = 'none';
    } else {
      o.imageSmoothingQuality = 'high';
      o.drawImage(drawToCanvas(image, w / r, hgt / r), 0, 0, w, hgt);
    }
  }
  o.drawImage(cut, 0, 0);
  return out;
}

const OUTPUT = {
  transparent: { suffix: 'no-bg', format: 'png' },
  colour: { suffix: 'new-bg', format: 'jpg' },
  blur: { suffix: 'blurred-bg', format: 'jpg' },
};

/** The whole job for one file. Returns { name, blob, note? }. */
export async function removeBackground(file, options = {}, ctx = {}) {
  const progress = ctx.progress || (() => {});
  const img = await decodeImage(file);
  try {
    progress(0.05, 'Starting the AI model');
    await loadModels(ctx);
    progress(0.6, 'Finding the subject');
    const { width, height } = fitWithin(img.width, img.height, MAX_SIDE, MAX_SIDE);
    const photo = drawToCanvas(img.image, width, height);
    const mask = await subjectMask(photo);
    progress(0.9, 'Saving your image');
    const out = OUTPUT[options.background] || OUTPUT.transparent;
    const blob = await encodeCanvas(composite(photo, mask, options), out.format, 0.92);
    const note = width < img.width ? `Resized to ${width} × ${height}` : undefined;
    return { name: withSuffix(file.name, out.suffix, out.format), blob, note, transparent: out.format === 'png' };
  } finally {
    img.close();
  }
}

const downloadNotice = () => modelNotice(
  `The first time, we download two small AI models (about ${DOWNLOAD_MB.background} MB in all). After that your browser keeps them, so it starts faster.`,
  { cached: isModelCached(CUTOUT, PORTRAIT) },
);

const WORDING = {
  transparent: { dropTitle: 'Drop a photo to remove its background', action: 'Remove background' },
  colour: { dropTitle: 'Drop a photo to change its background', action: 'Change background' },
  blur: { dropTitle: 'Drop a photo to blur its background', action: 'Blur background' },
};

export default fileTool((preset) => ({
  ...(WORDING[preset.options?.background] || WORDING.transparent),
  accept: IMAGE_ACCEPT,
  multiple: true,
  maxFiles: 20,
  dropHint: 'Works best with one clear subject, like a person, pet or product.',
  actionIcon: 'eraser',
  workingLabel: 'Removing the background',
  options: [
    { id: 'background', type: 'segmented', label: 'New background', default: 'transparent',
      choices: [{ value: 'transparent', label: 'Transparent' }, { value: 'colour', label: 'Colour' }, { value: 'blur', label: 'Blur the original' }] },
    { id: 'colour', type: 'color', label: 'Background colour', default: '#FFFFFF', showIf: (v) => v.background === 'colour' },
    { id: 'blur', type: 'range', label: 'Blur strength', min: 1, max: 10, default: 5, showIf: (v) => v.background === 'blur' },
  ],
  renderEmpty: (view) => view.append(downloadNotice()),
  renderExtra: (extra) => extra.append(downloadNotice()),
  processFile: (file, options, ctx) => removeBackground(file, options, ctx),
}));
