// Crop image (drag a box, pick a shape) and, with preset.round, the profile photo maker:
// a round crop with an optional ring, saved as a transparent PNG.
import { fileTool } from '../../core/filetool.js';
import { decodeImage, drawToCanvas, makeCanvas, IMAGE_ACCEPT } from '../../core/image.js';
import { h } from '../../core/dom.js';
import { notice, friendlyError } from '../../core/ui.js';
import { previewImage, saveCanvas } from './_shared.js';

const RATIOS = { free: 0, '1:1': 1, '4:5': 4 / 5, '16:9': 16 / 9, '9:16': 9 / 16 };
const PROFILE_MAX = 1024;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** The largest box of this shape (width / height, 0 = any) centred in a W × H image, at k of full size. */
export function centredBox(W, H, ratio = 0, k = 1) {
  let [w, h] = [W, H];
  if (ratio) [w, h] = W / H > ratio ? [H * ratio, H] : [W, W / ratio];
  w = Math.round(w * k);
  h = Math.round(h * k);
  return { x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), w, h };
}

/** Keep a box inside the image (falls back to the centred box when there isn't one). */
function fitBox(b, W, H, ratio) {
  if (!b) return centredBox(W, H, ratio);
  const x = clamp(Math.round(b.x), 0, W - 1);
  const y = clamp(Math.round(b.y), 0, H - 1);
  return { x, y, w: clamp(Math.round(b.w), 1, W - x), h: clamp(Math.round(b.h), 1, H - y) };
}

/** Crop a decoded image. Round: a circle up to 1024 px with an optional ring, on a transparent background. */
export function cropCanvas(image, box, { round, ring, ringColour, ringWidth } = {}) {
  if (!round) return drawToCanvas(image, box.w, box.h, { sx: box.x, sy: box.y, sw: box.w, sh: box.h });
  const side = Math.min(box.w, box.h);
  const s = Math.min(PROFILE_MAX, side);
  const c = makeCanvas(s, s);
  const g = c.getContext('2d');
  g.beginPath();
  g.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
  g.clip();
  g.drawImage(drawToCanvas(image, s, s, { sx: box.x, sy: box.y, sw: side, sh: side }), 0, 0);
  if (ring) {
    const t = (s * ringWidth) / 100;
    Object.assign(g, { lineWidth: t, strokeStyle: ringColour });
    g.beginPath();
    g.arc(s / 2, s / 2, s / 2 - t / 2, 0, Math.PI * 2);
    g.stroke();
  }
  return c;
}

/** A crop box over a preview. W × H is the real image size, and the box is in real pixels. */
function cropper(preview, W, H, { box, ratio, round, onChange }) {
  const MIN = Math.max(8, Math.round(Math.min(W, H) / 50));
  let ring = null;
  let drag = null;
  const handles = ['nw', 'ne', 'sw', 'se'].map((c) => h('span', { dataset: { c }, style: {
    position: 'absolute', width: '22px', height: '22px', margin: '-11px', borderRadius: '50%', background: '#FFFFFF',
    boxShadow: '0 0 0 3px #6C3FE0', left: c[1] === 'w' ? '0' : '100%', top: c[0] === 'n' ? '0' : '100%', cursor: `${c}-resize` } }));
  const frame = h('div', { tabindex: '0', role: 'group', 'aria-label': 'Crop area. Drag it to move, drag a corner to resize, or move it with the arrow keys.',
    style: { position: 'absolute', cursor: 'move', border: '2px solid #FFFFFF', borderRadius: round ? '50%' : '0' } }, handles);
  preview.style.cssText = 'display:block;width:100%;height:100%';
  const wrap = h('div', { style: { position: 'relative', width: `min(100%, ${(60 * W) / H}vh)`, aspectRatio: `${W} / ${H}`, containerType: 'inline-size', overflow: 'hidden', touchAction: 'none', userSelect: 'none' } }, preview, frame);
  const size = h('p', { class: 'small muted', 'aria-live': 'polite' });

  function paint() {
    const ringShadow = ring ? `inset 0 0 0 ${(ring.width * box.w) / W}cqw ${ring.colour}, ` : '';
    Object.assign(frame.style, { left: `${(box.x / W) * 100}%`, top: `${(box.y / H) * 100}%`, width: `${(box.w / W) * 100}%`, height: `${(box.h / H) * 100}%`, boxShadow: `${ringShadow}0 0 0 9999px rgba(8, 5, 20, .6)` });
    size.textContent = `${box.w} × ${box.h} px`;
  }
  const at = (e) => {
    const r = wrap.getBoundingClientRect();
    return { x: clamp(((e.clientX - r.left) / r.width) * W, 0, W), y: clamp(((e.clientY - r.top) / r.height) * H, 0, H) };
  };
  // Resize from a fixed corner (the anchor) to the pointer, keeping the shape when one is set.
  function fromAnchor(a, p) {
    const left = p.x < a.x;
    const up = p.y < a.y;
    const maxW = left ? a.x : W - a.x;
    const maxH = up ? a.y : H - a.y;
    let w = Math.min(Math.max(Math.abs(p.x - a.x), MIN), maxW);
    let hh = Math.min(Math.max(Math.abs(p.y - a.y), MIN), maxH);
    if (ratio) {
      if (w / hh > ratio) hh = w / ratio;
      else w = hh * ratio;
      const k = Math.min(1, maxW / w, maxH / hh);
      w *= k;
      hh *= k;
    }
    w = Math.round(w);
    hh = ratio ? Math.round(w / ratio) : Math.round(hh);
    if (w < 1 || hh < 1) return box;
    const x = Math.round(left ? a.x - w : a.x);
    const y = Math.round(up ? a.y - hh : a.y);
    return { x, y, w: Math.min(w, W - x), h: Math.min(hh, H - y) };
  }

  wrap.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    const p = at(e);
    const c = e.target.dataset?.c;
    if (c) drag = { anchor: { x: c[1] === 'w' ? box.x + box.w : box.x, y: c[0] === 'n' ? box.y + box.h : box.y } };
    else if (e.target === frame) drag = { from: p, start: { ...box } };
    else drag = { anchor: p };
    wrap.setPointerCapture(e.pointerId);
    e.preventDefault();
    if (e.target === frame) frame.focus();
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = at(e);
    if (drag.start) box = { ...box, x: Math.round(clamp(drag.start.x + p.x - drag.from.x, 0, W - box.w)), y: Math.round(clamp(drag.start.y + p.y - drag.from.y, 0, H - box.h)) };
    else box = fromAnchor(drag.anchor, p);
    paint();
  });
  const end = () => {
    if (!drag) return;
    drag = null;
    onChange({ ...box });
  };
  wrap.addEventListener('pointerup', end);
  wrap.addEventListener('pointercancel', end);
  frame.addEventListener('keydown', (e) => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!d) return;
    e.preventDefault();
    const step = Math.max(1, Math.round(W / 100)) * (e.shiftKey ? 10 : 1);
    box = { ...box, x: clamp(box.x + d[0] * step, 0, W - box.w), y: clamp(box.y + d[1] * step, 0, H - box.h) };
    paint();
    onChange({ ...box });
  });
  paint();

  return {
    el: wrap,
    size,
    setRatio(r) {
      ratio = r;
      if (r) box = centredBox(W, H, r);
      paint();
      onChange({ ...box });
    },
    setRing(r) {
      ring = r;
      paint();
    },
  };
}

const saved = new WeakMap(); // file -> last crop box, so "Change options" keeps it
const ringOf = (o) => (o.ring ? { colour: o.ringColour, width: o.ringWidth } : null);

export default fileTool((preset) => {
  const round = !!preset.round;
  const ratioOf = (o) => (round ? 1 : RATIOS[o.ratio] || 0);
  return {
    accept: IMAGE_ACCEPT,
    dropTitle: round ? 'Drop your photo here' : 'Drop your image here',
    action: round ? 'Make profile photo' : 'Crop image',
    actionIcon: round ? 'circle-user' : 'crop',
    options: round
      ? [
        { id: 'ring', type: 'checkbox', label: 'Add a ring', default: false },
        { id: 'ringColour', type: 'color', label: 'Ring colour', default: '#6C3FE0', showIf: (v) => v.ring },
        { id: 'ringWidth', type: 'range', label: 'Ring thickness', min: 1, max: 15, default: 4, unit: '%', showIf: (v) => v.ring },
      ]
      : [{ id: 'ratio', type: 'segmented', label: 'Shape', default: 'free', choices: [{ value: 'free', label: 'Free' }, '1:1', '4:5', '16:9', '9:16'],
        help: '1:1 and 4:5 suit Instagram posts, 9:16 suits Stories, Reels and TikTok, and 16:9 suits YouTube.' }],
    renderExtra(extra, api) {
      const file = api.files[0];
      api.setOption('box', null);
      const stage = h('div', { class: 'stage' }, h('span', { class: 'spinner' }));
      extra.append(stage);
      previewImage(file).then((p) => {
        if (!stage.isConnected) return;
        const save = (b) => {
          saved.set(file, b);
          api.setOption('box', b);
        };
        const ratio = ratioOf(api.options);
        const box = saved.get(file) || centredBox(p.fullWidth, p.fullHeight, ratio, ratio ? 1 : 0.9);
        api.cropper = cropper(p.image, p.fullWidth, p.fullHeight, { box, ratio, round, onChange: save });
        if (round) api.cropper.setRing(ringOf(api.options));
        stage.replaceChildren(api.cropper.el);
        stage.after(api.cropper.size);
        save(box);
      }).catch((err) => stage.replaceChildren(notice('error', friendlyError(err))));
    },
    onOptionsChange(v, api, id) {
      if (id === 'ratio') api.cropper?.setRatio(RATIOS[v.ratio] || 0);
      if (round) api.cropper?.setRing(ringOf(v));
    },
    async processFile(file, o) {
      const img = await decodeImage(file);
      try {
        const box = fitBox(o.box, img.width, img.height, ratioOf(o));
        const canvas = cropCanvas(img.image, box, { ...o, round });
        return await saveCanvas(canvas, file, round ? 'profile' : 'cropped', round ? 'png' : undefined);
      } finally {
        img.close();
      }
    },
  };
});
