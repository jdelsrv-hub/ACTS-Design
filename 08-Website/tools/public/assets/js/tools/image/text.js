// Add text to image, and (preset.meme) the meme maker: top and bottom text in the classic outlined style.
import { fileTool } from '../../core/filetool.js';
import { imageConfig, copyCanvas } from './_shared.js';
import { loadMemeFont } from './_vendor.js';

const FONT = 'Inter, Arial, sans-serif';
const MEME_FONT = 'Impact, Anton, "Arial Black", sans-serif';
const POSITIONS = [
  ['top-left', 'Top left'], ['top', 'Top centre'], ['top-right', 'Top right'],
  ['middle-left', 'Centre left'], ['middle', 'Centre'], ['middle-right', 'Centre right'],
  ['bottom-left', 'Bottom left'], ['bottom', 'Bottom centre'], ['bottom-right', 'Bottom right'],
];

function wrap(g, text, maxWidth) {
  const lines = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && g.measureText(next).width > maxWidth) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
  }
  return lines;
}

/** Draw wrapped text. y is the top, middle or bottom of the block (valign). Shrinks to fit maxWidth. */
export function drawText(g, text, { x, y, maxWidth, size, font, weight = 600, fill, stroke, align = 'center', valign = 'top' }) {
  g.font = `${weight} ${size}px ${font}`;
  const lines = wrap(g, text, maxWidth);
  const widest = Math.max(1, ...lines.map((l) => g.measureText(l).width));
  if (widest > maxWidth) {
    size *= maxWidth / widest;
    g.font = `${weight} ${size}px ${font}`;
  }
  const lh = size * 1.15;
  const top = valign === 'top' ? y : valign === 'bottom' ? y - lines.length * lh : y - (lines.length * lh) / 2;
  Object.assign(g, { textAlign: align, textBaseline: 'top', lineJoin: 'round', miterLimit: 2, fillStyle: fill, strokeStyle: stroke || fill, lineWidth: size * 0.14 });
  lines.forEach((line, i) => {
    if (stroke) g.strokeText(line, x, top + i * lh);
    g.fillText(line, x, top + i * lh);
  });
}

async function addText(img, o) {
  await document.fonts.load(`600 32px ${FONT}`);
  const c = copyCanvas(img);
  const [v, side] = o.position.split('-');
  const pad = Math.round(Math.min(c.width, c.height) * 0.05);
  const align = side || 'center';
  drawText(c.getContext('2d'), o.text, {
    x: align === 'left' ? pad : align === 'right' ? c.width - pad : c.width / 2,
    y: v === 'top' ? pad : v === 'bottom' ? c.height - pad : c.height / 2,
    valign: v, align, maxWidth: c.width - 2 * pad, size: (o.size / 100) * c.height, font: FONT,
    fill: o.colour, stroke: o.outline ? o.outlineColour : null,
  });
  return c;
}

async function meme(img, o) {
  await loadMemeFont();
  const c = copyCanvas(img);
  const g = c.getContext('2d');
  const pad = c.height * 0.03;
  const style = { x: c.width / 2, maxWidth: c.width * 0.94, size: (o.size / 100) * c.height, font: MEME_FONT, weight: 400, fill: '#FFFFFF', stroke: '#000000' };
  if (o.top.trim()) drawText(g, o.top.toUpperCase(), { ...style, y: pad, valign: 'top' });
  if (o.bottom.trim()) drawText(g, o.bottom.toUpperCase(), { ...style, y: c.height - pad, valign: 'bottom' });
  return c;
}

export default fileTool((preset) => (preset.meme
  ? imageConfig({
    multiple: false, dropTitle: 'Drop your picture here', action: 'Make meme', actionIcon: 'smile', suffix: 'meme', draw: meme,
    options: [
      { id: 'top', type: 'text', label: 'Top text', default: '', placeholder: 'When the stream finally works' },
      { id: 'bottom', type: 'text', label: 'Bottom text', default: '', placeholder: 'First try' },
      { id: 'size', type: 'range', label: 'Text size', min: 4, max: 20, default: 10, unit: '%' },
    ],
    validate: (_, o) => (o.top.trim() || o.bottom.trim() ? null : 'Type a top or bottom line first.'),
  })
  : imageConfig({
    action: 'Add text', actionIcon: 'type', suffix: 'text', draw: addText,
    options: [
      { id: 'text', type: 'textarea', label: 'Your text', rows: 3, default: '', placeholder: 'Type your text. Press Enter for a new line.' },
      { id: 'size', type: 'range', label: 'Text size', min: 2, max: 30, default: 8, unit: '%', help: 'Compared with the height of the image.' },
      { id: 'position', type: 'select', label: 'Position', default: 'bottom', choices: POSITIONS.map(([value, label]) => ({ value, label })) },
      { id: 'colour', type: 'color', label: 'Text colour', default: '#FFFFFF' },
      { id: 'outline', type: 'checkbox', label: 'Outline', default: true },
      { id: 'outlineColour', type: 'color', label: 'Outline colour', default: '#000000', showIf: (v) => v.outline },
    ],
    validate: (_, o) => (o.text.trim() ? null : 'Type your text first.'),
  })));
