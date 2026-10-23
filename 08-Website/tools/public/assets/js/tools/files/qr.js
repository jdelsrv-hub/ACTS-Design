// QR code generator: a link, text or Wi-Fi details. Live preview, PNG and SVG downloads.
import { h, clear, debounce } from '../../core/dom.js';
import { optionsForm, optionDefaults, button, notice } from '../../core/ui.js';
import { downloadBlob, blobFromCanvas } from '../../core/files.js';
import { getUqr } from './_vendor.js';

const OPTIONS = [
  { id: 'type', type: 'segmented', label: 'What it opens', default: 'link', wide: true, choices: [{ value: 'link', label: 'Link' }, { value: 'text', label: 'Text' }, { value: 'wifi', label: 'Wi-Fi' }] },
  { id: 'link', type: 'url', label: 'Link', placeholder: 'https://example.com', wide: true, showIf: (v) => v.type === 'link' },
  { id: 'text', type: 'textarea', label: 'Text', rows: 3, showIf: (v) => v.type === 'text' },
  { id: 'ssid', type: 'text', label: 'Network name', spellcheck: 'false', showIf: (v) => v.type === 'wifi' },
  { id: 'security', type: 'select', label: 'Security', default: 'WPA', showIf: (v) => v.type === 'wifi', choices: [{ value: 'WPA', label: 'WPA, WPA2 or WPA3' }, { value: 'WEP', label: 'WEP' }, { value: 'nopass', label: 'None (open network)' }] },
  { id: 'password', type: 'text', label: 'Network password', spellcheck: 'false', showIf: (v) => v.type === 'wifi' && v.security !== 'nopass' },
  { id: 'size', type: 'range', label: 'Size', default: 512, min: 128, max: 2048, step: 64, unit: ' px' },
  { id: 'fg', type: 'color', label: 'Colour', default: '#000000' },
  { id: 'bg', type: 'color', label: 'Background', default: '#ffffff' },
];
const EMPTY = { link: 'Add a link to make your QR code.', text: 'Type some text to make your QR code.', wifi: 'Add your network name to make your QR code.' };

/** The text stored in the code. Wi-Fi uses the standard WIFI: format that phone cameras understand. */
export function qrPayload(v) {
  if (v.type === 'wifi') {
    if (!v.ssid) return '';
    const esc = (s) => String(s || '').replace(/([\\;,:"])/g, '\\$1');
    return `WIFI:T:${v.security};S:${esc(v.ssid)};${v.security === 'nopass' ? '' : `P:${esc(v.password)};`};`;
  }
  if (v.type === 'text') return v.text || '';
  const link = String(v.link || '').trim();
  return !link || /^[a-z][a-z0-9+.-]*:/i.test(link) ? link : `https://${link}`;
}

/** true/false grid of modules, including the 4-module quiet border scanners need. */
export async function qrMatrix(text) {
  const { encode } = await getUqr();
  return encode(text, { ecc: 'M', border: 4 }).data;
}

export function qrSvg(data, size, fg, bg) {
  const n = data.length;
  let d = '';
  data.forEach((row, y) => {
    for (let x = 0; x < n; x++) {
      if (!row[x]) continue;
      let w = 1;
      while (row[x + w]) w++;
      d += `M${x} ${y}h${w}v1h-${w}z`;
      x += w - 1;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="${bg}"/><path fill="${fg}" d="${d}"/></svg>`;
}

export function qrPng(data, size, fg, bg) {
  const n = data.length;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, size, size);
  g.fillStyle = fg;
  const at = (i) => Math.round((i * size) / n);
  data.forEach((row, y) => row.forEach((on, x) => on && g.fillRect(at(x), at(y), at(x + 1) - at(x), at(y + 1) - at(y))));
  return blobFromCanvas(c, 'image/png');
}

// Scanners need a dark code on a light background with clear contrast.
const lum = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
const hardToScan = (fg, bg) => (lum(bg) + 0.05) / (lum(fg) + 0.05) < 4;

export default {
  mount(root) {
    let v = optionDefaults(OPTIONS);
    let data = null;
    let seq = 0;
    const preview = h('div', { class: 'stage', style: { minHeight: '240px' } });
    const msg = h('div');
    const png = button('Download PNG', { variant: 'primary', size: 'lg', icon: 'download', onClick: async () => downloadBlob(await qrPng(data, v.size, v.fg, v.bg), 'qr-code.png') });
    const svg = button('Download SVG', { variant: 'ghost', icon: 'download', onClick: () => downloadBlob(new Blob([qrSvg(data, v.size, v.fg, v.bg)], { type: 'image/svg+xml' }), 'qr-code.svg') });
    const update = debounce(async () => {
      const mine = ++seq;
      const text = qrPayload(v);
      let next = null;
      let problem = null;
      if (text) {
        try {
          next = await qrMatrix(text);
        } catch (err) {
          problem = /load part of this tool/.test(err.message) ? err.message : "That's too much for one QR code. Try a shorter link or less text.";
        }
      }
      if (mine !== seq) return;
      data = next;
      png.disabled = svg.disabled = !data;
      clear(msg);
      if (problem) msg.append(notice('error', problem));
      else if (data && hardToScan(v.fg, v.bg)) msg.append(notice('warn', 'Some phones may struggle to read these colours. A dark colour on a light background works best. Test it before you print.'));
      clear(preview).append(data
        ? h('img', { src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg(data, 260, v.fg, v.bg))}`, alt: 'Preview of your QR code', width: 260, height: 260 })
        : h('p', { class: 'muted' }, problem ? 'No code yet.' : EMPTY[v.type]));
    }, 150);
    const form = optionsForm(OPTIONS, v, (next) => {
      v = next;
      update();
    });
    clear(root).append(form.el, preview, msg, h('div', { class: 'run-bar' }, png, svg));
    png.disabled = svg.disabled = true;
    update();
  },
};
