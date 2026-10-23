import { fileTool } from '../../core/filetool.js';
import { h } from '../../core/dom.js';
import { button, optionsForm } from '../../core/ui.js';
import { getPdfLib } from '../../core/vendor.js';
import { withSuffix } from '../../core/files.js';
import { makeCanvas } from '../../core/image.js';
import { PDF_ACCEPT, pdfBlob, pageFrame, pageViewer, dragWithin, hidden, clamp, isNewFile } from './_pages.js';

// Dancing Script (SIL Open Font Licence) for typed signatures.
const FONT = 'https://cdn.jsdelivr.net/npm/@fontsource/dancing-script@5.3.0/files/dancing-script-latin-700-normal.woff2';
const INK = '#14112B';
let fontReady;

/** A canvas cut down to its ink (plus a little room), as a PNG data URL. '' if it's blank. */
function trimmed(canvas) {
  const { data, width, height } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return '';
  const out = makeCanvas(x1 - x0 + 13, y1 - y0 + 13);
  out.getContext('2d').drawImage(canvas, x0 - 6, y0 - 6, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}

/** A typed name in a handwriting font, as a PNG data URL. */
export async function typedSignature(name) {
  fontReady ||= new FontFace('acTS Signature', `url(${FONT})`).load().then((f) => document.fonts.add(f)).catch(() => {});
  await fontReady;
  const c = makeCanvas(Math.min(4000, 80 * name.length + 100), 220);
  const g = c.getContext('2d');
  g.font = '700 120px "acTS Signature", cursive';
  g.fillStyle = INK;
  g.fillText(name, 40, 150);
  return trimmed(c);
}

/** Put a signature (PNG data URL or bytes) on one page. page is 1-based; x, y, w are fractions of the page as you see it. */
export async function signPdf(bytes, signature, { page = 1, x = 0.55, y = 0.8, w = 0.3 } = {}) {
  const { PDFDocument, degrees } = await getPdfLib();
  const doc = await PDFDocument.load(bytes);
  const p = doc.getPage(Number(page) - 1);
  const img = await doc.embedPng(signature);
  const f = pageFrame(p);
  const width = Number(w) * f.vw;
  const height = (width * img.height) / img.width;
  const [px, py] = f.toPdf(Number(x) * f.vw, Number(y) * f.vh + height);
  p.drawImage(img, { x: px, y: py, width, height, rotate: degrees(f.r) });
  return doc.save();
}

/** A drawing pad. pad.onEnd runs after each stroke. */
function makePad() {
  const el = makeCanvas(1000, 300);
  Object.assign(el.style, { width: '100%', height: 'auto', background: '#fff', borderRadius: '10px', touchAction: 'none', cursor: 'crosshair' });
  el.setAttribute('aria-label', 'Signature pad');
  const g = el.getContext('2d');
  Object.assign(g, { lineWidth: 5, lineCap: 'round', lineJoin: 'round', strokeStyle: INK });
  let last = null;
  let empty = true;
  const at = (e) => {
    const r = el.getBoundingClientRect();
    return [((e.clientX - r.left) * el.width) / r.width, ((e.clientY - r.top) * el.height) / r.height];
  };
  const pad = {
    el,
    png: () => (empty ? '' : trimmed(el)),
    clear() {
      g.clearRect(0, 0, el.width, el.height);
      empty = true;
    },
  };
  el.addEventListener('pointerdown', (e) => {
    el.setPointerCapture(e.pointerId);
    last = at(e);
    g.beginPath();
    g.arc(last[0], last[1], 2.5, 0, Math.PI * 2);
    g.fillStyle = INK;
    g.fill();
    empty = false;
  });
  el.addEventListener('pointermove', (e) => {
    if (!last) return;
    const p = at(e);
    g.beginPath();
    g.moveTo(...last);
    g.lineTo(...p);
    g.stroke();
    last = p;
  });
  const end = () => {
    if (!last) return;
    last = null;
    pad.onEnd?.();
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  return pad;
}

const uis = new WeakMap(); // signature pad state for each open copy of the tool

export default fileTool({
  accept: PDF_ACCEPT,
  dropTitle: 'Drop your PDF here',
  action: 'Sign PDF',
  actionIcon: 'signature',
  // Set by the signature pad and by dragging the signature on the page.
  options: [hidden('signature', ''), hidden('page', 1), hidden('x', 0.55), hidden('y', 0.8), hidden('w', 0.3)],
  optionsTitle: false,
  validate: (_files, o) => (o.signature ? null : 'Draw or type your signature first.'),
  renderExtra(extra, api) {
    if (isNewFile(api)) [['page', 1], ['x', 0.55], ['y', 0.8]].forEach(([k, v]) => api.setOption(k, v));
    if (!uis.has(api)) uis.set(api, { mode: 'draw', name: '', pad: makePad() });
    const ui = uis.get(api);
    const set = (k, v) => api.setOption(k, v);
    const sig = h('img', { alt: 'Your signature', draggable: 'false', hidden: true, style: { position: 'absolute', cursor: 'move', touchAction: 'none', outline: '1.5px dashed #6C3FE0', outlineOffset: '2px', maxHeight: 'none' } });
    let wrap = null;
    const paint = () => {
      const o = api.options;
      sig.hidden = !o.signature;
      if (o.signature && sig.getAttribute('src') !== o.signature) sig.src = o.signature;
      Object.assign(sig.style, { left: `${o.x * 100}%`, top: `${o.y * 100}%`, width: `${o.w * 100}%` });
    };
    const keepInside = () => {
      const o = api.options;
      const hf = wrap && sig.offsetHeight ? sig.offsetHeight / wrap.clientHeight : 0;
      set('x', clamp(o.x, 0, 1 - o.w));
      set('y', clamp(o.y, 0, 1 - hf));
      paint();
    };
    sig.addEventListener('load', keepInside);
    const useSignature = async () => {
      set('signature', ui.mode === 'draw' ? ui.pad.png() : ui.name.trim() ? await typedSignature(ui.name.trim()) : '');
      paint();
    };
    ui.pad.onEnd = useSignature;

    const drawBox = h('div', { style: { display: 'grid', gap: '6px' } }, ui.pad.el,
      h('div', { class: 'opt-row', style: { justifyContent: 'space-between' } },
        h('span', { class: 'small muted' }, 'Sign with your mouse, finger or a stylus.'),
        button('Clear', { variant: 'quiet', size: 'sm', icon: 'eraser', onClick: () => { ui.pad.clear(); useSignature(); } })));
    const typeBox = h('input', { type: 'text', value: ui.name, placeholder: 'Type your name', 'aria-label': 'Your name', maxlength: '60', oninput: (e) => { ui.name = e.target.value; useSignature(); } });
    const show = () => {
      drawBox.hidden = ui.mode !== 'draw';
      typeBox.hidden = ui.mode !== 'type';
    };
    const modeForm = optionsForm([{ id: 'mode', type: 'segmented', label: 'Your signature', choices: [{ value: 'draw', label: 'Draw' }, { value: 'type', label: 'Type' }] }], ui, (v) => {
      ui.mode = v.mode;
      show();
      useSignature();
    });
    show();

    const size = h('input', { type: 'range', min: 5, max: 80, value: Math.round(api.options.w * 100), 'aria-label': 'Signature size', oninput: (e) => { set('w', Number(e.target.value) / 100); keepInside(); } });
    const viewer = pageViewer(api.files[0], (n, box) => {
      set('page', n);
      box.append(sig);
      paint();
      if (wrap) return;
      wrap = box;
      dragWithin(sig, wrap, (dx, dy) => {
        set('x', api.options.x + dx);
        set('y', api.options.y + dy);
        keepInside();
      });
      wrap.addEventListener('pointerdown', (e) => {
        if (e.target === sig || !api.options.signature) return;
        const r = wrap.getBoundingClientRect();
        set('x', (e.clientX - r.left) / r.width - api.options.w / 2);
        set('y', (e.clientY - r.top) / r.height - sig.offsetHeight / wrap.clientHeight / 2);
        keepInside();
      });
    });

    extra.append(modeForm.el, drawBox, typeBox,
      h('p', { class: 'opts-title' }, 'Place it on the page'),
      h('p', { class: 'small muted' }, 'Drag your signature into place, or click where it should go.'),
      h('label', { class: 'opt-row' }, 'Size', size),
      viewer);
    paint();
  },
  async processFile(file, o) {
    return { name: withSuffix(file.name, 'signed'), blob: pdfBlob(await signPdf(await file.arrayBuffer(), o.signature, o)) };
  },
});
