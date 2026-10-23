// Resize image: by pixels (always keeping the shape) or by percent, one image or many.
import { fileTool } from '../../core/filetool.js';
import { decodeImage, drawToCanvas, IMAGE_ACCEPT } from '../../core/image.js';
import { saveCanvas } from './_shared.js';

const MAX = 16384;

/** New size for a w × h image. Pixels: fits inside the width and/or height given. */
export function targetSize(w, h, o) {
  const k = o.mode === 'percent' ? o.percent / 100 : Math.min(o.width > 0 ? o.width / w : Infinity, o.height > 0 ? o.height / h : Infinity);
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}

export default fileTool({
  accept: IMAGE_ACCEPT,
  multiple: true,
  dropTitle: 'Drop your images here',
  dropHint: 'Resize one, or a whole batch at once.',
  action: 'Resize',
  actionIcon: 'scaling',
  options: [
    { id: 'mode', type: 'segmented', label: 'Resize by', default: 'pixels', choices: [{ value: 'pixels', label: 'Pixels' }, { value: 'percent', label: 'Percent' }] },
    { id: 'width', type: 'number', label: 'Width', min: 1, step: 1, unit: 'px', placeholder: 'Auto', default: 1080, showIf: (v) => v.mode === 'pixels' },
    { id: 'height', type: 'number', label: 'Height', min: 1, step: 1, unit: 'px', placeholder: 'Auto', default: '', showIf: (v) => v.mode === 'pixels',
      help: 'Fill in one and we work out the other. Fill in both and the image fits inside, keeping its shape.' },
    { id: 'percent', type: 'range', label: 'New size', min: 5, max: 200, step: 5, default: 50, unit: '%', showIf: (v) => v.mode === 'percent' },
  ],
  validate: (_, o) => (o.mode === 'pixels' && !(o.width > 0) && !(o.height > 0) ? 'Enter a width, a height or both.' : null),
  async describe(file) {
    const img = await decodeImage(file);
    img.close();
    return `${img.width} × ${img.height}`;
  },
  async processFile(file, o) {
    const img = await decodeImage(file);
    try {
      const { width, height } = targetSize(img.width, img.height, o);
      if (width > MAX || height > MAX) throw new Error(`That would make ${file.name} over ${MAX.toLocaleString('en-AU')} pixels wide or tall, which browsers can't handle. Try a smaller size.`);
      return await saveCanvas(drawToCanvas(img.image, width, height), file, `${width}x${height}`);
    } finally {
      img.close();
    }
  },
});
