import { fileTool } from '../../core/filetool.js';
import { h } from '../../core/dom.js';
import { getPdfLib } from '../../core/vendor.js';
import { withSuffix } from '../../core/files.js';
import { PDF_ACCEPT, pdfBlob, pageFrame, pageViewer } from './_pages.js';

const MM = 72 / 25.4;
const SIDES = ['top', 'bottom', 'left', 'right'];
let preview = null; // { box, width, height } of the page on screen

function paint(o) {
  if (!preview) return;
  const { box, width, height } = preview;
  const pct = (mm, size) => `${Math.max(0, ((Number(mm) || 0) * MM * 100) / size)}%`;
  Object.assign(box.style, { top: pct(o.top, height), bottom: pct(o.bottom, height), left: pct(o.left, width), right: pct(o.right, width) });
}

/** Trim margins (in mm) off every page, measured from the edges as you see them. */
export async function cropPdf(bytes, margins) {
  const { PDFDocument } = await getPdfLib();
  const doc = await PDFDocument.load(bytes);
  const [t, b, l, r] = SIDES.map((s) => Math.max(0, Number(margins[s]) || 0) * MM);
  for (const page of doc.getPages()) {
    const f = pageFrame(page);
    if (l + r > f.vw - 10 || t + b > f.vh - 10) throw new Error('Those margins are bigger than the page. Try smaller numbers.');
    const [x1, y1] = f.toPdf(l, t);
    const [x2, y2] = f.toPdf(f.vw - r, f.vh - b);
    const box = [Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)];
    page.setCropBox(...box);
    page.setMediaBox(...box);
  }
  return doc.save();
}

export default fileTool({
  accept: PDF_ACCEPT,
  dropTitle: 'Drop your PDF here',
  action: 'Crop PDF',
  actionIcon: 'crop',
  optionsTitle: 'Trim from each edge',
  options: SIDES.map((id) => ({ id, type: 'number', label: id[0].toUpperCase() + id.slice(1), default: 10, min: 0, step: 1, unit: 'mm' })),
  validate: (_files, o) => (SIDES.some((s) => Number(o[s]) > 0) ? null : 'Set at least one edge to trim.'),
  renderExtra(extra, api) {
    preview = null;
    const box = h('div', { style: { position: 'absolute', outline: '2px dashed #CBBDF7', boxShadow: '0 0 0 100vmax rgba(22, 17, 42, .62)', pointerEvents: 'none' } });
    extra.append(h('p', { class: 'small muted' }, 'The shaded edges will be trimmed off every page.'), pageViewer(api.files[0], (_n, wrap, size) => {
      wrap.style.overflow = 'hidden';
      wrap.append(box);
      preview = { box, ...size };
      paint(api.options);
    }));
  },
  onOptionsChange: (values) => paint(values),
  async processFile(file, options) {
    return { name: withSuffix(file.name, 'cropped'), blob: pdfBlob(await cropPdf(await file.arrayBuffer(), options)) };
  },
});
