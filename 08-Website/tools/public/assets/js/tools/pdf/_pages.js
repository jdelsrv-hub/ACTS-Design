// Shared helpers for the PDF tools: opening files, page ranges, rendering pages, page geometry,
// images on a page, page thumbnails and a one-page viewer for placing things.
// Candidates for core/ if other families need them.
import { h } from '../../core/dom.js';
import { notice, friendlyError } from '../../core/ui.js';
import { openPdfjs, getPdfjs, getPdfLib } from '../../core/vendor.js';
import { makeCanvas } from '../../core/image.js';

export const PDF_ACCEPT = '.pdf,application/pdf';
export const pdfBlob = (bytes) => new Blob([bytes], { type: 'application/pdf' });
export const NO_TEXT = "We couldn't find any text in this PDF. If it's a scan (photos of pages), there's no text inside it to copy.";
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
/** A fileTool option that holds state set by the tool's own UI. It's never shown. */
export const hidden = (id, value) => ({ id, type: 'text', default: value, showIf: () => false });
const dpr = () => Math.min(2, window.devicePixelRatio || 1);

const seenFiles = new WeakMap();
/** In renderExtra: true the first time this tool sees this file, so it can clear choices left from the last file. */
export function isNewFile(api) {
  const file = api.files[0];
  if (seenFiles.get(api) === file) return false;
  seenFiles.set(api, file);
  return true;
}

/** Open a PDF with pdf.js. Password-protected files get a clear next step. */
export async function openPdf(file) {
  try {
    return await openPdfjs(await file.arrayBuffer());
  } catch (err) {
    if (err?.name === 'PasswordException') throw new Error('This PDF is password protected. Unlock it first with our Unlock PDF tool, then try again.');
    throw err;
  }
}

/** Free a pdf.js document (pdf.js 6 moved destroy() to the loading task). */
export const closePdf = (pdf) => pdf?.loadingTask?.destroy();

/** For fileTool `describe`: "12 pages". */
export async function pageCount(file) {
  const pdf = await openPdf(file);
  const n = pdf.numPages;
  closePdf(pdf);
  return `${n} page${n === 1 ? '' : 's'}`;
}

/** "1-3, 5, 8-" -> [[1, 2, 3], [5], [8, ..., count]] (1-based). Throws a sentence a creator can act on. */
export function parseRanges(text, count) {
  const parts = String(text || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) throw new Error('Type the pages you want, like 1-3, 5.');
  return parts.map((part) => {
    const m = /^(\d+)\s*(?:[-–]\s*(\d*))?$/.exec(part);
    if (!m) throw new Error(`We couldn't read "${part}". Use page numbers and ranges, like 1-3, 5.`);
    let a = Number(m[1]);
    let b = m[2] === undefined ? a : m[2] === '' ? count : Number(m[2]);
    if (a > b) [a, b] = [b, a];
    if (a < 1 || b > count) throw new Error(`This PDF has ${count} page${count === 1 ? '' : 's'}, so ${a < 1 ? a : b} is out of range.`);
    return Array.from({ length: b - a + 1 }, (_, i) => a + i);
  });
}

/** [1, 2, 3, 5] -> "1-3, 5" */
export function formatRanges(numbers) {
  const s = [...new Set(numbers)].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (s[j + 1] === s[j] + 1) j++;
    out.push(j > i ? `${s[i]}-${s[j]}` : `${s[i]}`);
    i = j;
  }
  return out.join(', ');
}

/**
 * Draw a pdf.js page on a new canvas. scale 1 = 72 DPI. Very large pages are capped so the canvas stays valid.
 * The 'print' intent renders the page as it prints, and keeps going when the tab is in the background
 * (the 'display' intent waits for animation frames, which pause there).
 */
export async function renderPage(page, scale) {
  const base = page.getViewport({ scale: 1 });
  const s = Math.min(scale, 5000 / Math.max(base.width, base.height), Math.sqrt(16e6 / (base.width * base.height)));
  const viewport = page.getViewport({ scale: s });
  const canvas = makeCanvas(viewport.width, viewport.height);
  await page.render({ canvas, viewport, intent: 'print' }).promise;
  return canvas;
}

/**
 * Page geometry for a pdf-lib page as you see it (rotation and crop box applied).
 * vw, vh: visible size in points. toPdf(x, y): from the visible top-left corner to PDF coordinates.
 * Draw with rotate: degrees(r) at toPdf(left, bottom) so things come out upright.
 */
export function pageFrame(page) {
  const { x: bx, y: by, width: bw, height: bh } = page.getCropBox();
  const r = ((page.getRotation().angle % 360) + 360) % 360;
  const turned = r === 90 || r === 270;
  const toPdf = (x, y) => (r === 90 ? [bx + y, by + x] : r === 180 ? [bx + bw - x, by + y] : r === 270 ? [bx + bw - y, by + bh - x] : [bx + x, by + bh - y]);
  return { vw: turned ? bh : bw, vh: turned ? bw : bh, r, toPdf };
}

/** Text pieces on a pdf.js page in content order, in points from the visible top-left: [{ str, x, y (baseline), w, size, eol }]. */
export async function pageItems(page) {
  const { Util } = await getPdfjs();
  const vp = page.getViewport({ scale: 1 });
  const { items } = await page.getTextContent();
  return items.filter((it) => typeof it.str === 'string').map((it) => {
    const [, , c, d, x, y] = Util.transform(vp.transform, it.transform);
    return { str: it.str, x, y, w: it.width, size: Math.hypot(c, d) || 1, eol: it.hasEOL };
  });
}

/** Lines of text in reading order: [{ text, y, size }]. */
export async function pageLines(page) {
  const lines = [];
  let line = null;
  for (const it of await pageItems(page)) {
    if (!line || Math.abs(it.y - line.y) > line.size * 0.6) lines.push((line = { text: '', y: it.y, size: it.size }));
    line.text += it.str;
    line.size = Math.max(line.size, it.size);
    if (it.eol) line = null;
  }
  return lines.filter((l) => l.text.trim());
}

/** Images drawn on a pdf.js page: [{ id, ref, obj }]. obj has width, height and bitmap (or data). Inline images have no id or ref. */
export async function pageImages(page) {
  const { OPS } = await getPdfjs();
  const ops = await page.getOperatorList();
  const out = [];
  const seen = new Set();
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    if (fn !== OPS.paintImageXObject && fn !== OPS.paintImageXObjectRepeat && fn !== OPS.paintInlineImageXObject) continue;
    const arg = ops.argsArray[i][0];
    if (typeof arg !== 'string') {
      out.push({ obj: arg });
      continue;
    }
    if (seen.has(arg)) continue;
    seen.add(arg);
    const store = arg.startsWith('g_') ? page.commonObjs : page.objs;
    const obj = await Promise.race([new Promise((ok) => store.get(arg, ok)), new Promise((ok) => setTimeout(ok, 15000, null))]);
    if (obj) out.push({ id: arg, ref: obj.ref, obj });
  }
  return out;
}

/** The pdf-lib PDFRef for a pdf.js image ref like "12R" (or "12R3"), so pdf.js and pdf-lib can work on the same image. */
export async function refFor(ref) {
  const { PDFRef } = await getPdfLib();
  const m = /^(\d+)R(\d*)$/.exec(ref || '');
  return m ? PDFRef.of(Number(m[1]), Number(m[2] || 0)) : null;
}

/** A pdf.js image object drawn on a canvas at full size (null if it can't be read). Inline images come as raw RGB(A) data. */
export function imageCanvas(obj) {
  if (!obj?.width || !obj.height) return null;
  const c = makeCanvas(obj.width, obj.height);
  const g = c.getContext('2d');
  const n = obj.width * obj.height;
  if (obj.bitmap) g.drawImage(obj.bitmap, 0, 0, c.width, c.height);
  else if (obj.data && obj.kind === 3) g.putImageData(new ImageData(new Uint8ClampedArray(obj.data.buffer, obj.data.byteOffset, n * 4), obj.width, obj.height), 0, 0);
  else if (obj.data && obj.kind === 2) g.putImageData(new ImageData(Uint8ClampedArray.from({ length: n * 4 }, (_, i) => (i % 4 === 3 ? 255 : obj.data[(i >> 2) * 3 + (i % 4)])), obj.width, obj.height), 0, 0);
  else return null;
  return c;
}

/**
 * A .thumb-grid with one tile per page. makeTile(i) builds tile i (0-based); its page preview is
 * prepended once rendered. Returns { el, tiles } where tiles resolves as soon as the tiles exist.
 */
export function thumbGrid(file, makeTile) {
  const el = h('div', { class: 'thumb-grid' });
  const tiles = openPdf(file).then((pdf) => {
    const list = Array.from({ length: pdf.numPages }, (_, i) => makeTile(i));
    el.append(...list);
    (async () => {
      for (let i = 0; i < list.length && el.isConnected; i++) {
        const page = await pdf.getPage(i + 1);
        list[i].prepend(await renderPage(page, (130 * dpr()) / page.getViewport({ scale: 1 }).width));
        page.cleanup();
      }
    })().catch(() => {}).finally(() => closePdf(pdf));
    return list;
  });
  tiles.catch((err) => el.replaceChildren(notice('error', friendlyError(err))));
  return { el, tiles };
}

let viewerDoc = null; // the pdf.js document behind the page viewer on screen
/**
 * One page at a time, with a page picker, sized to fit the screen. After each page renders,
 * onShow(pageNumber, wrap, { width, height }) runs. wrap is the positioned box over the page (for overlays,
 * in % units, and cqw for sizes); width and height are the visible page size in points.
 */
export function pageViewer(file, onShow) {
  const wrap = h('div', { style: { position: 'relative', containerType: 'inline-size', touchAction: 'none' } });
  const select = h('select', { 'aria-label': 'Page', style: { width: 'auto' } });
  const picker = h('label', { class: 'opt-row', hidden: true }, 'Page', select);
  const el = h('div', { style: { display: 'grid', gap: '10px' } }, picker, h('div', { class: 'stage' }, wrap));
  let pdf;
  const show = async (n) => {
    const page = await pdf.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    const canvas = await renderPage(page, Math.min(3, (900 * dpr()) / vp.width));
    page.cleanup();
    Object.assign(canvas.style, { width: '100%', maxHeight: 'none' });
    wrap.style.width = `min(100%, ${((70 * vp.width) / vp.height).toFixed(2)}vh)`;
    wrap.replaceChildren(canvas);
    onShow(n, wrap, { width: vp.width, height: vp.height });
  };
  select.addEventListener('change', () => show(Number(select.value)));
  closePdf(viewerDoc);
  openPdf(file).then(async (doc) => {
    viewerDoc = pdf = doc;
    select.append(...Array.from({ length: pdf.numPages }, (_, i) => h('option', { value: i + 1 }, `${i + 1} of ${pdf.numPages}`)));
    picker.hidden = pdf.numPages < 2;
    await show(1);
  }).catch((err) => el.replaceChildren(notice('error', friendlyError(err))));
  return el;
}

/** Drag el inside box with mouse, finger or pen. onMove(dx, dy) gets the movement as fractions of box. */
export function dragWithin(el, box, onMove) {
  el.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || e.target.closest('button, input')) return;
    e.preventDefault();
    e.stopPropagation();
    el.setPointerCapture(e.pointerId);
    let lx = e.clientX;
    let ly = e.clientY;
    const move = (ev) => {
      const r = box.getBoundingClientRect();
      onMove((ev.clientX - lx) / r.width, (ev.clientY - ly) / r.height);
      lx = ev.clientX;
      ly = ev.clientY;
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  });
}
