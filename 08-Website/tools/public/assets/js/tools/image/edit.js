// One-step image edits with a live preview, picked by preset.fx:
// rotate (rotate or flip), border, pixelate (or blur), bw (black and white), sharpen.
// Each draw(image, options, scale) returns a canvas. scale < 1 in the small preview, so pixel sizes shrink with it.
import { fileTool } from '../../core/filetool.js';
import { drawToCanvas, makeCanvas } from '../../core/image.js';
import { imageConfig, keepFormat, copyCanvas } from './_shared.js';

function rotate(img, { turn, flipH, flipV }) {
  const side = turn % 180 !== 0;
  const c = makeCanvas(side ? img.height : img.width, side ? img.width : img.height);
  const g = c.getContext('2d');
  g.translate(c.width / 2, c.height / 2);
  g.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  g.rotate((turn * Math.PI) / 180);
  g.drawImage(img, -img.width / 2, -img.height / 2);
  return c;
}

function border(img, { size, colour, radius }, s = 1) {
  const b = Math.round(size * s);
  const r = radius * s;
  const c = makeCanvas(img.width + 2 * b, img.height + 2 * b);
  const g = c.getContext('2d');
  g.fillStyle = colour;
  g.beginPath();
  g.roundRect(0, 0, c.width, c.height, r);
  g.fill();
  g.beginPath();
  g.roundRect(b, b, img.width, img.height, Math.max(0, r - b));
  g.clip();
  g.drawImage(img, b, b);
  return c;
}

// Pixelate: shrink, then stretch back with hard edges. Blur: shrink, then stretch back smoothly.
function pixelate(img, { style, block, blur }, s = 1) {
  const k = Math.max(1, (style === 'blur' ? blur : block) * s);
  const small = drawToCanvas(img, Math.ceil(img.width / k), Math.ceil(img.height / k));
  const c = makeCanvas(img.width, img.height);
  const g = c.getContext('2d');
  if (style === 'blur') {
    g.imageSmoothingQuality = 'high';
    g.drawImage(small, 0, 0, c.width, c.height);
  } else {
    g.imageSmoothingEnabled = false;
    g.drawImage(small, 0, 0, small.width * k, small.height * k);
  }
  return c;
}

function greyscale(img, { contrast }) {
  const c = copyCanvas(img);
  const g = c.getContext('2d');
  const d = g.getImageData(0, 0, c.width, c.height);
  const p = d.data;
  const k = 1 + contrast / 100;
  for (let i = 0; i < p.length; i += 4) {
    p[i] = p[i + 1] = p[i + 2] = (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2] - 128) * k + 128;
  }
  g.putImageData(d, 0, 0);
  return c;
}

// Sharpen: each pixel minus a share of its four neighbours (edge pixels repeat).
function sharpen(img, { amount }) {
  const c = copyCanvas(img);
  const g = c.getContext('2d');
  const { width: w, height: hh } = c;
  const src = g.getImageData(0, 0, w, hh).data;
  const out = g.createImageData(w, hh);
  const d = out.data;
  const k = amount / 100;
  for (let y = 0; y < hh; y++) {
    const up = (y > 0 ? y - 1 : y) * w;
    const down = (y < hh - 1 ? y + 1 : y) * w;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const l = (y * w + (x > 0 ? x - 1 : x)) * 4;
      const r = (y * w + (x < w - 1 ? x + 1 : x)) * 4;
      const u = (up + x) * 4;
      const dn = (down + x) * 4;
      for (let ch = 0; ch < 3; ch++) d[i + ch] = src[i + ch] * (1 + 4 * k) - k * (src[l + ch] + src[r + ch] + src[u + ch] + src[dn + ch]);
      d[i + 3] = src[i + 3];
    }
  }
  g.putImageData(out, 0, 0);
  return c;
}

const TOOLS = {
  rotate: {
    action: 'Rotate image', actionIcon: 'rotate-cw', suffix: 'rotated', draw: rotate,
    options: [
      { id: 'turn', type: 'segmented', label: 'Turn', default: 90, choices: [{ value: 0, label: 'None' }, { value: 90, label: '90° right' }, { value: 180, label: '180°' }, { value: 270, label: '90° left' }] },
      { id: 'flipH', type: 'checkbox', label: 'Flip horizontally (mirror)' },
      { id: 'flipV', type: 'checkbox', label: 'Flip vertically (upside down)' },
    ],
    validate: (_, o) => (o.turn || o.flipH || o.flipV ? null : 'Pick a turn or a flip first.'),
  },
  border: {
    action: 'Add border', actionIcon: 'frame', suffix: 'border', draw: border,
    format: (file, o) => (o.radius > 0 ? 'png' : keepFormat(file)),
    options: [
      { id: 'size', type: 'range', label: 'Border width', min: 0, max: 200, default: 24, unit: ' px' },
      { id: 'colour', type: 'color', label: 'Border colour', default: '#FFFFFF' },
      { id: 'radius', type: 'range', label: 'Rounded corners', min: 0, max: 300, default: 0, unit: ' px', help: 'Rounded images are saved as PNG so the corners stay see-through.' },
    ],
    validate: (_, o) => (o.size > 0 || o.radius > 0 ? null : 'Add a border width or rounded corners first.'),
  },
  pixelate: {
    action: 'Pixelate image', actionIcon: 'pixelate', suffix: 'pixelated', draw: pixelate,
    options: [
      { id: 'style', type: 'segmented', label: 'Style', default: 'pixels', choices: [{ value: 'pixels', label: 'Pixelate' }, { value: 'blur', label: 'Blur' }] },
      { id: 'block', type: 'range', label: 'Block size', min: 2, max: 100, default: 16, unit: ' px', showIf: (v) => v.style === 'pixels' },
      { id: 'blur', type: 'range', label: 'Blur strength', min: 2, max: 100, default: 12, showIf: (v) => v.style === 'blur' },
    ],
  },
  bw: {
    action: 'Make black and white', actionIcon: 'contrast', suffix: 'bw', draw: greyscale,
    options: [{ id: 'contrast', type: 'range', label: 'Extra contrast', min: 0, max: 100, default: 0, unit: '%' }],
  },
  sharpen: {
    action: 'Sharpen image', actionIcon: 'focus', suffix: 'sharpened', draw: sharpen,
    options: [{ id: 'amount', type: 'range', label: 'Strength', min: 5, max: 100, default: 40, unit: '%', help: 'A little goes a long way. Too much adds bright halos around edges.' }],
  },
};

export default fileTool((preset) => imageConfig(TOOLS[preset.fx] || TOOLS.rotate));
