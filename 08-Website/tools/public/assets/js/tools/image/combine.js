// Combine images side by side or stacked, and (preset.collage) the collage maker:
// a few grid layouts on a 2000 px square, with spacing and a background colour.
import { fileTool } from '../../core/filetool.js';
import { drawToCanvas, makeCanvas, encodeCanvas, IMAGE_ACCEPT } from '../../core/image.js';
import { withSuffix } from '../../core/files.js';
import { withPreview, decodeFit, keepFormat } from './_shared.js';

const SIZE = 2000;
const grid = (cols, rows) => ({ cols, rows, cells: Array.from({ length: cols * rows }, (_, i) => [i % cols, Math.floor(i / cols), 1, 1]) });
export const LAYOUTS = {
  'two-side': { label: 'Two side by side', ...grid(2, 1) },
  'two-stack': { label: 'Two stacked', ...grid(1, 2) },
  'three-left': { label: 'Three, one big on the left', cols: 2, rows: 2, cells: [[0, 0, 1, 2], [1, 0, 1, 1], [1, 1, 1, 1]] },
  'three-top': { label: 'Three, one big on top', cols: 2, rows: 2, cells: [[0, 0, 2, 1], [0, 1, 1, 1], [1, 1, 1, 1]] },
  four: { label: 'Four in a grid', ...grid(2, 2) },
  six: { label: 'Six in a grid', ...grid(3, 2) },
  nine: { label: 'Nine in a grid', ...grid(3, 3) },
};

/** Scale every image to the smallest height (side by side) or width (stacked) and join them, at most max px long. */
export function combine(images, { direction }, max = 16000) {
  const side = direction === 'side';
  const t = Math.min(...images.map((i) => (side ? i.height : i.width)));
  const along = images.map((i) => (side ? (i.width * t) / i.height : (i.height * t) / i.width));
  const k = Math.min(1, max / along.reduce((n, v) => n + v, 0));
  const across = Math.round(t * k);
  const lengths = along.map((v) => Math.max(1, Math.round(v * k)));
  const total = lengths.reduce((n, v) => n + v, 0);
  const c = makeCanvas(side ? total : across, side ? across : total);
  const g = c.getContext('2d');
  let pos = 0;
  images.forEach((img, i) => {
    const part = side ? drawToCanvas(img, lengths[i], across) : drawToCanvas(img, across, lengths[i]);
    g.drawImage(part, side ? pos : 0, side ? 0 : pos);
    pos += lengths[i];
  });
  return c;
}

/** Fill the layout's cells in order. Each image covers its cell (cropped from the centre). */
export function collage(images, { layout, spacing, background }, size = SIZE) {
  const L = LAYOUTS[layout] || LAYOUTS.four;
  const gap = (spacing * size) / SIZE;
  const c = makeCanvas(size, size);
  const g = c.getContext('2d');
  g.fillStyle = background;
  g.fillRect(0, 0, size, size);
  const cw = (size - gap * (L.cols + 1)) / L.cols;
  const ch = (size - gap * (L.rows + 1)) / L.rows;
  L.cells.forEach(([col, row, cs, rs], i) => {
    const img = images[i];
    if (!img) return;
    const w = cs * cw + (cs - 1) * gap;
    const hh = rs * ch + (rs - 1) * gap;
    const k = Math.max(w / img.width, hh / img.height);
    const [sw, sh] = [w / k, hh / k];
    g.drawImage(drawToCanvas(img, w, hh, { sx: (img.width - sw) / 2, sy: (img.height - sh) / 2, sw, sh }), Math.round(gap + col * (cw + gap)), Math.round(gap + row * (ch + gap)));
  });
  return c;
}

/** Decode one file at a time, shrunk to max px, so a batch of big photos fits in memory. */
async function decodeAll(files, max, ctx) {
  const out = [];
  for (const [i, f] of files.entries()) {
    ctx.progress(i / files.length, `Opening ${f.name}`);
    out.push((await decodeFit(f, max)).image);
    await ctx.tick();
  }
  return out;
}

export default fileTool((preset) => {
  const base = { accept: IMAGE_ACCEPT, multiple: true, minFiles: 2, reorder: true, dropTitle: 'Drop your images here', dropHint: 'Add two or more, then drag them into order.' };
  if (!preset.collage) {
    return withPreview({
      ...base,
      action: 'Combine images',
      actionIcon: 'columns',
      options: [{ id: 'direction', type: 'segmented', label: 'Layout', default: 'side', choices: [{ value: 'side', label: 'Side by side' }, { value: 'stack', label: 'Stacked' }] }],
      async process(files, o, ctx) {
        const c = combine(await decodeAll(files, 4000, ctx), o);
        const format = files.every((f) => keepFormat(f) === 'jpeg') ? 'jpeg' : 'png';
        return { name: withSuffix(files[0].name, 'combined', format === 'jpeg' ? 'jpg' : 'png'), blob: await encodeCanvas(c, format, 0.92), note: `${c.width} × ${c.height}` };
      },
    }, (p, o) => combine(p.map((x) => x.image), o, 2400), { all: true });
  }
  let count = 0;
  return withPreview({
    ...base,
    maxFiles: 9,
    action: 'Make collage',
    actionIcon: 'layout-grid',
    options: [
      { id: 'layout', type: 'select', label: 'Layout', default: 'four', choices: Object.entries(LAYOUTS).map(([value, l]) => ({ value, label: l.label })) },
      { id: 'spacing', type: 'range', label: 'Spacing', min: 0, max: 80, default: 20, unit: ' px' },
      { id: 'background', type: 'color', label: 'Background colour', default: '#FFFFFF' },
    ],
    validate(files, o) {
      const n = LAYOUTS[o.layout].cells.length;
      return files.length > n ? `This layout fits ${n} images. Pick a bigger one or remove some.` : null;
    },
    // When the number of images changes, pick the first layout with room for them all.
    onFilesChange(files, api) {
      if (files.length === count) return;
      count = files.length;
      const fit = Object.keys(LAYOUTS).find((k) => LAYOUTS[k].cells.length >= count);
      if (fit) api.setOption('layout', fit);
    },
    async process(files, o, ctx) {
      const c = collage(await decodeAll(files, SIZE, ctx), o);
      return { name: 'collage.jpg', blob: await encodeCanvas(c, 'jpeg', 0.92), note: `${c.width} × ${c.height}` };
    },
  }, (p, o) => collage(p.map((x) => x.image), o, 900), { all: true });
});
