// Compress image: JPG, PNG or WebP, by a quality slider or to a target size.
// JPG and WebP use the browser's encoder. PNGs get smaller by keeping fewer colours (UPNG.js).
import { fileTool } from '../../core/filetool.js';
import { decodeImage, drawToCanvas, encodeCanvas } from '../../core/image.js';
import { formatBytes, sizeChange, withSuffix } from '../../core/files.js';
import { keepFormat, EXT } from './_shared.js';
import { getUpng } from './_vendor.js';

/** Encode at a level from 0 to 1. For PNG, 1 keeps every colour and lower levels keep fewer (down to 16). */
async function encodeAt(canvas, format, level) {
  if (format !== 'png') return encodeCanvas(canvas, format, level);
  const UPNG = await getUpng();
  const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  const colours = level >= 1 ? 0 : Math.round(16 + 240 * level * level);
  return new Blob([UPNG.encode([data.buffer], canvas.width, canvas.height, colours)], { type: 'image/png' });
}

/** The best quality that fits under target bytes. If even the lowest won't fit, shrink the picture and try again. */
async function toTarget(canvas, format, target, ctx) {
  for (let tries = 0; tries < 6; tries++) {
    ctx.progress(tries / 6, 'Finding the best quality');
    let best = await encodeAt(canvas, format, 0.05);
    if (best.size <= target) {
      let lo = 0.05;
      let hi = 1;
      // Binary search on quality. Within 10% under the target is close enough.
      for (let i = 0; i < 6 && best.size < target * 0.9; i++) {
        const mid = (lo + hi) / 2;
        const blob = await encodeAt(canvas, format, mid);
        if (blob.size <= target) [lo, best] = [mid, blob];
        else hi = mid;
        ctx.progress((i + 1) / 6, 'Finding the best quality');
        await ctx.tick();
      }
      return { blob: best, canvas };
    }
    const k = Math.max(0.3, Math.sqrt(target / best.size) * 0.9);
    canvas = drawToCanvas(canvas, canvas.width * k, canvas.height * k);
    await ctx.tick();
  }
  throw new Error("We couldn't get this image that small. Try a bigger target size.");
}

export default fileTool({
  accept: '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp',
  multiple: true,
  dropTitle: 'Drop your JPG, PNG or WebP images here',
  action: 'Compress',
  actionIcon: 'image-down',
  options: [
    { id: 'mode', type: 'segmented', label: 'Compress by', default: 'quality', choices: [{ value: 'quality', label: 'Quality' }, { value: 'target', label: 'Target size' }] },
    { id: 'quality', type: 'range', label: 'Quality', min: 10, max: 100, default: 75, unit: '%', showIf: (v) => v.mode === 'quality',
      help: 'Lower means a smaller file. Around 75% looks the same to most people. PNGs get smaller by using fewer colours.' },
    { id: 'target', type: 'number', label: 'Target size', min: 5, step: 1, default: 200, unit: 'KB', showIf: (v) => v.mode === 'target',
      help: "We find the best quality that fits. If it still won't fit, we make the picture a little smaller too." },
  ],
  validate: (_, o) => (o.mode === 'target' && !(o.target >= 5) ? 'Enter a target size of 5 KB or more.' : null),
  async processFile(file, o, ctx) {
    const target = o.target * 1024;
    if (o.mode === 'target' && file.size <= target) return { name: file.name, blob: file, note: `Already under ${o.target} KB, so we kept the original` };
    const format = keepFormat(file);
    const img = await decodeImage(file);
    const canvas = drawToCanvas(img.image, img.width, img.height);
    img.close();
    const out = o.mode === 'target' ? await toTarget(canvas, format, target, ctx) : { blob: await encodeAt(canvas, format, o.quality / 100), canvas };
    if (out.blob.size >= file.size) return { name: file.name, blob: file, note: 'Already well compressed, so we kept the original' };
    const resized = out.canvas === canvas ? '' : `, resized to ${out.canvas.width} × ${out.canvas.height}`;
    return { name: withSuffix(file.name, 'compressed', EXT[format]), blob: out.blob, note: `${formatBytes(file.size)} to ${formatBytes(out.blob.size)} (${sizeChange(file.size, out.blob.size)})${resized}` };
  },
  summarize(files, items) {
    if (items.length !== files.length) return null;
    const before = files.reduce((n, f) => n + f.size, 0);
    const after = items.reduce((n, i) => n + i.blob.size, 0);
    return after < before ? `Saved ${Math.round((1 - after / before) * 100)}% (${formatBytes(before)} to ${formatBytes(after)})` : null;
  },
});
