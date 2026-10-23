// Image to SVG: traces a bitmap into vector shapes with imagetracerjs (public domain).
// Runs the library's steps one colour at a time so we can show progress and honour Cancel.
import { fileTool } from '../../core/filetool.js';
import { decodeImage, drawToCanvas, fitWithin, IMAGE_ACCEPT } from '../../core/image.js';
import { renameExt } from '../../core/files.js';
import { notice } from '../../core/ui.js';
import { getImageTracer } from './_vendor.js';

// max: we trace a copy at most this many pixels across. ltres, qtres: how closely lines and curves follow the edges.
// pathomit: shapes smaller than this many pixels are left out.
const DETAIL = {
  low: { max: 600, ltres: 4, qtres: 4, pathomit: 24 },
  medium: { max: 1000, ltres: 1, qtres: 1, pathomit: 8 },
  high: { max: 1600, ltres: 0.5, qtres: 0.5, pathomit: 2 },
};

export default fileTool((preset) => ({
  accept: IMAGE_ACCEPT,
  multiple: true,
  dropTitle: preset.from ? `Drop your ${preset.from} images here` : 'Drop your images here',
  action: 'Convert to SVG',
  actionIcon: 'spline',
  options: [
    { id: 'colours', type: 'range', label: 'Colours', min: 2, max: 32, default: 16, help: 'Fewer colours make a simpler, smaller SVG.' },
    { id: 'detail', type: 'segmented', label: 'Detail', default: 'medium', choices: [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }] },
  ],
  renderExtra: (extra) => extra.append(notice('info', 'Tracing works best on logos, icons and drawings with flat colours. Photos come out looking like a poster.')),
  async processFile(file, o, ctx) {
    const [T, img] = await Promise.all([getImageTracer(), decodeImage(file)]);
    const { max, ...detail } = DETAIL[o.detail] || DETAIL.medium;
    const { width, height } = fitWithin(img.width, img.height, max, max);
    const pixels = drawToCanvas(img.image, width, height).getContext('2d').getImageData(0, 0, width, height);
    img.close();
    const opts = T.checkoptions({ ...detail, numberofcolors: o.colours });
    const q = T.colorquantization(pixels, opts);
    const traced = { layers: [], palette: q.palette, width, height };
    for (let i = 0; i < q.palette.length; i++) {
      // Fully see-through colours become nothing, so skip tracing them.
      traced.layers.push(q.palette[i].a === 0 ? [] : T.batchtracepaths(T.internodes(T.pathscan(T.layeringstep(q, i), opts.pathomit), opts), opts.ltres, opts.qtres));
      ctx.progress((i + 1) / q.palette.length, 'Tracing the shapes');
      await ctx.tick();
    }
    const svg = T.getsvgstring(traced, opts).replace('<svg ', `<svg viewBox="0 0 ${width} ${height}" `);
    return { name: renameExt(file.name, 'svg'), blob: new Blob([svg], { type: 'image/svg+xml' }), note: `${width} × ${height}, ${q.palette.length} colours`, transparent: true };
  },
}));
