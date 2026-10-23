import { fileTool } from '../../core/filetool.js';
import { h, icon } from '../../core/dom.js';
import { notice, optionsForm } from '../../core/ui.js';
import { getPdfLib } from '../../core/vendor.js';
import { withSuffix } from '../../core/files.js';
import { PDF_ACCEPT, pdfBlob, pageFrame, pageViewer, dragWithin, hidden, clamp, isNewFile } from './_pages.js';
import { encodable } from './_layout.js';

const ACCENT = '#6C3FE0';

/**
 * items: { page, type: 'text', x, y, size, text } or { page, type: 'box', x, y, w, h }.
 * x, y, w, h are fractions of the page as you see it (x, y = top-left); size is in points.
 * White boxes go on first, then text on top.
 */
export async function editPdf(bytes, items) {
  const { PDFDocument, StandardFonts, rgb, degrees } = await getPdfLib();
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const it of [...items.filter((i) => i.type === 'box'), ...items.filter((i) => i.type === 'text')]) {
    const page = doc.getPage(it.page - 1);
    const f = pageFrame(page);
    if (it.type === 'box') {
      const [x, y] = f.toPdf(it.x * f.vw, (it.y + it.h) * f.vh);
      page.drawRectangle({ x, y, width: it.w * f.vw, height: it.h * f.vh, color: rgb(1, 1, 1), rotate: degrees(f.r) });
      continue;
    }
    const [text] = encodable(font, it.text.replace(/\n/g, ' '));
    if (!text.trim()) continue;
    const [x, y] = f.toPdf(it.x * f.vw, it.y * f.vh + it.size * 0.95);
    page.drawText(text, { x, y, size: it.size, font, color: rgb(0, 0, 0), rotate: degrees(f.r) });
  }
  return doc.save();
}

/** A small round button that sits on the page next to an item. */
function chip(name, title, side, onClick) {
  return h('button', { type: 'button', title, 'aria-label': title, onclick: onClick, style: {
    position: 'absolute', top: '50%', [side]: '100%', transform: 'translateY(-50%)', margin: '0 3px', width: '22px', height: '22px', padding: '0',
    display: 'grid', placeItems: 'center', border: '0', borderRadius: '50%', background: ACCENT, color: '#fff', cursor: 'pointer' } }, icon(name));
}

const ui = { mode: 'text', size: 12 };

export default fileTool({
  accept: PDF_ACCEPT,
  dropTitle: 'Drop your PDF here',
  action: 'Save PDF',
  actionIcon: 'download',
  // Everything added on the page. Set by the page editor below.
  options: [hidden('items', [])],
  optionsTitle: false,
  validate: (_files, o) => (o.items.some((i) => i.type === 'box' || i.text.trim()) ? null : 'Add some text or a white-out box first.'),
  renderExtra(extra, api) {
    if (isNewFile(api)) api.setOption('items', []);
    const list = () => api.options.items;
    const save = (items) => api.setOption('items', items);
    const forget = (it) => save(list().filter((i) => i !== it));
    let page = 1;
    let pageW = 1;
    let pageH = 1;
    let wrap = null;
    const layer = h('div', { style: { position: 'absolute', inset: '0', cursor: 'text' } });
    const put = (el, it) => Object.assign(el.style, { left: `${it.x * 100}%`, top: `${it.y * 100}%`, ...(it.type === 'box' && { width: `${it.w * 100}%`, height: `${it.h * 100}%` }) });
    const moveWith = (handle, el, it) => dragWithin(handle, wrap, (dx, dy) => {
      it.x = clamp(it.x + dx, 0, 1 - (it.w || 0.02));
      it.y = clamp(it.y + dy, 0, 1 - (it.h || 0.02));
      put(el, it);
      save(list().slice());
    });

    const textEl = (it) => {
      const input = h('input', { type: 'text', value: it.text, 'aria-label': 'Text on the page', spellcheck: 'false', style: {
        width: `${Math.max(2, it.text.length + 1)}ch`, minWidth: '0', padding: '0', border: '0', outline: `1px dashed ${ACCENT}`, borderRadius: '0',
        background: 'rgba(255, 255, 255, .5)', color: '#000', font: `${(it.size / pageW) * 100}cqw/1.2 Helvetica, Arial, sans-serif` } });
      const grip = h('span', { title: 'Drag to move', style: { position: 'absolute', top: '50%', right: '100%', transform: 'translateY(-50%)', margin: '0 3px', color: ACCENT, cursor: 'move', touchAction: 'none', display: 'grid' } }, icon('move'));
      const el = h('div', { style: { position: 'absolute', lineHeight: '0' } }, grip, input, chip('x', 'Remove this text', 'left', () => { el.remove(); forget(it); }));
      input.addEventListener('input', () => {
        it.text = input.value;
        input.style.width = `${Math.max(2, it.text.length + 1)}ch`;
        save(list().slice());
      });
      input.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === 'Escape') && input.blur());
      input.addEventListener('blur', () => {
        if (!it.text.trim()) {
          el.remove();
          forget(it);
        }
      });
      put(el, it);
      moveWith(grip, el, it);
      return el;
    };

    const boxEl = (it) => {
      const el = h('div', { style: { position: 'absolute', background: '#fff', outline: `1.5px dashed ${ACCENT}`, cursor: 'move', touchAction: 'none' } });
      const x = chip('x', 'Remove this box', 'left', () => { el.remove(); forget(it); });
      Object.assign(x.style, { top: '0', left: 'auto', right: '0', transform: 'translate(50%, -50%)', margin: '0' });
      el.append(x);
      put(el, it);
      moveWith(el, el, it);
      return el;
    };

    layer.addEventListener('pointerdown', (e) => {
      if (e.target !== layer || e.button > 0) return;
      const r = layer.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      if (ui.mode === 'text') {
        const size = clamp(Number(ui.size) || 12, 6, 72);
        const it = { page, type: 'text', x, y: Math.max(0, y - (0.6 * size) / pageH), size, text: '' };
        save([...list(), it]);
        const el = textEl(it);
        layer.append(el);
        setTimeout(() => el.querySelector('input').focus());
        return;
      }
      // White-out: drag out a box.
      e.preventDefault();
      layer.setPointerCapture(e.pointerId);
      const it = { page, type: 'box', x, y, w: 0, h: 0 };
      const el = boxEl(it);
      layer.append(el);
      const move = (ev) => {
        const cx = clamp((ev.clientX - r.left) / r.width, 0, 1);
        const cy = clamp((ev.clientY - r.top) / r.height, 0, 1);
        Object.assign(it, { x: Math.min(x, cx), y: Math.min(y, cy), w: Math.abs(cx - x), h: Math.abs(cy - y) });
        put(el, it);
      };
      const up = () => {
        layer.removeEventListener('pointermove', move);
        layer.removeEventListener('pointerup', up);
        layer.removeEventListener('pointercancel', up);
        if (it.w < 0.01 || it.h < 0.005) el.remove();
        else save([...list(), it]);
      };
      layer.addEventListener('pointermove', move);
      layer.addEventListener('pointerup', up);
      layer.addEventListener('pointercancel', up);
    });

    const tools = optionsForm([
      { id: 'mode', type: 'segmented', label: 'Tool', choices: [{ value: 'text', label: 'Add text' }, { value: 'box', label: 'White-out' }] },
      { id: 'size', type: 'number', label: 'Text size', min: 6, max: 72, step: 1, unit: 'pt' },
    ], ui, (v) => {
      Object.assign(ui, v);
      layer.style.cursor = ui.mode === 'text' ? 'text' : 'crosshair';
    });
    layer.style.cursor = ui.mode === 'text' ? 'text' : 'crosshair';

    const viewer = pageViewer(api.files[0], (n, box, size) => {
      [page, pageW, pageH, wrap] = [n, size.width, size.height, box];
      box.append(layer);
      save(list().filter((i) => i.type === 'box' || i.text.trim()));
      layer.replaceChildren(...list().filter((i) => i.page === n).map((i) => (i.type === 'box' ? boxEl(i) : textEl(i))));
    });

    extra.append(tools.el,
      h('p', { class: 'small muted' }, 'Click the page where you want text, then type. To cover something up, choose White-out and drag over it.'),
      viewer,
      notice('info', 'Added text uses a standard font that covers English and most Western European languages. Other characters, like emoji or Chinese, are left out.'),
      notice('warn', "White-out covers things on the page, but the original text is still in the file underneath. Don't use it to hide private details."));
  },
  async processFile(file, { items }) {
    return { name: withSuffix(file.name, 'edited'), blob: pdfBlob(await editPdf(await file.arrayBuffer(), items)) };
  },
});
