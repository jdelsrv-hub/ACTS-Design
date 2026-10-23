// Helpers shared by the image tools (owner: tools-image agent). Good candidates for core/image.js later.
import { decodeImage, drawToCanvas, fitWithin, encodeCanvas, canEncode, IMAGE_ACCEPT } from '../../core/image.js';
import { withSuffix, extOf } from '../../core/files.js';
import { h, debounce } from '../../core/dom.js';
import { friendlyError } from '../../core/ui.js';

export const EXT = { jpeg: 'jpg', png: 'png', webp: 'webp' };

/** Keep the input's format where we can: JPG (and HEIC photos) stay JPG, WebP stays WebP, the rest become PNG. */
export function keepFormat(file) {
  const t = `${file.type} ${extOf(file.name)}`.toLowerCase();
  if (/jpe?g|hei[cf]/.test(t)) return 'jpeg';
  if (/webp/.test(t)) return 'webp';
  return 'png';
}

/** Encode a finished canvas as a download named photo-<suffix>.<ext>. */
export async function saveCanvas(canvas, file, suffix, format = keepFormat(file)) {
  if (format === 'webp' && !(await canEncode('image/webp'))) format = 'png';
  const blob = await encodeCanvas(canvas, format, 0.92);
  return { name: withSuffix(file.name, suffix, EXT[format]), blob, note: `${canvas.width} × ${canvas.height}`, transparent: format !== 'jpeg' };
}

/** A canvas copy of any drawable, so we can draw on it or read its pixels. */
export const copyCanvas = (img) => drawToCanvas(img, img.width, img.height);

/** Decode a file and shrink it to fit max × max. Frees the full-size bitmap straight away. */
export async function decodeFit(file, max) {
  const img = await decodeImage(file);
  const { width, height } = fitWithin(img.width, img.height, max, max);
  const image = drawToCanvas(img.image, width, height);
  img.close();
  return { image, width, height, scale: width / img.width, fullWidth: img.width, fullHeight: img.height };
}

const previews = new WeakMap();
/** A small cached copy of a file for live previews. scale = preview size / real size. */
export function previewImage(file) {
  if (!previews.has(file)) previews.set(file, decodeFit(file, 1200));
  return previews.get(file);
}

/**
 * Adds a live preview to a fileTool config. render(previews, options) returns a canvas.
 * Only the first file is previewed unless all is true.
 */
export function withPreview(cfg, render, { all = false } = {}) {
  return {
    ...cfg,
    renderExtra(extra, api) {
      const stage = h('div', { class: 'stage', style: { touchAction: 'auto' } }, h('span', { class: 'spinner' }));
      extra.append(stage);
      let seq = 0;
      api.paint = debounce(async () => {
        const mine = ++seq;
        try {
          const files = all ? api.files : api.files.slice(0, 1);
          const out = await render(await Promise.all(files.map(previewImage)), api.options);
          if (mine !== seq) return;
          out.classList.add('checker');
          out.style.maxHeight = '45vh';
          stage.replaceChildren(out);
        } catch (err) {
          if (mine === seq) stage.replaceChildren(h('p', { class: 'small muted' }, friendlyError(err)));
        }
      }, 80);
      api.paint();
      cfg.renderExtra?.(extra, api);
    },
    onOptionsChange(values, api, id) {
      api.paint?.();
      cfg.onOptionsChange?.(values, api, id);
    },
  };
}

/** fileTool config for "image in, edited image out", with a live preview. draw(image, options, scale) -> canvas. */
export function imageConfig({ draw, suffix, format, ...cfg }) {
  return withPreview({
    accept: IMAGE_ACCEPT,
    multiple: true,
    dropTitle: 'Drop your images here',
    ...cfg,
    async processFile(file, options) {
      const img = await decodeImage(file);
      try {
        return await saveCanvas(await draw(img.image, options, 1), file, suffix, format?.(file, options));
      } finally {
        img.close();
      }
    },
  }, ([p], options) => draw(p.image, options, p.scale));
}
