// Chart maker: type or paste data, pick bar, line or pie, and download a 1600 × 900 PNG. Drawn with Chart.js.
import { h, clear, debounce } from '../../core/dom.js';
import { optionsForm, optionDefaults, button, notice, friendlyError } from '../../core/ui.js';
import { downloadBlob, blobFromCanvas } from '../../core/files.js';
import { getChart } from './_vendor.js';

const COLOURS = ['#6C3FE0', '#2FD47F', '#F2A93B', '#E5484D', '#3E9BFF', '#CBBDF7', '#16112A', '#8E84B5'];
const SAMPLE = 'Month, Views, Likes\nJan, 1200, 310\nFeb, 1850, 420\nMar, 1600, 390\nApr, 2400, 610\nMay, 3100, 870';

const OPTIONS = [
  { id: 'type', type: 'segmented', label: 'Chart type', default: 'bar', choices: [{ value: 'bar', label: 'Bar' }, { value: 'line', label: 'Line' }, { value: 'pie', label: 'Pie' }] },
  { id: 'title', type: 'text', label: 'Title', default: 'Views per month', placeholder: 'Leave blank for no title' },
  { id: 'data', type: 'textarea', label: 'Your data', rows: 8, mono: true, default: SAMPLE,
    help: 'One row per line: a label, then one or more numbers, split by commas or tabs (pasting from a spreadsheet works). A first row of names labels each series. Pie charts use the first series.' },
];

/** "Label, 1, 2" lines (commas or tabs) -> { labels, series: [{ name, values }] }. A first row without numbers names the series. */
export function parseData(text) {
  const num = (s) => parseFloat(String(s ?? '').replace(/[^\d.eE-]/g, ''));
  const rows = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    .map((l) => l.split(l.includes('\t') ? '\t' : ',').map((c) => c.trim()));
  const head = rows.length > 1 && rows[0].slice(1).every((c) => Number.isNaN(num(c))) ? rows.shift() : null;
  const width = Math.max(0, ...rows.map((r) => r.length - 1));
  const series = Array.from({ length: width }, (_, i) => ({
    name: head?.[i + 1] || (width > 1 ? `Series ${i + 1}` : 'Value'),
    values: rows.map((r) => num(r[i + 1])),
  }));
  return { labels: rows.map((r) => r[0]), series };
}

/** Draw the chart on a new canvas (1600 × 900 pixels). Returns { canvas, chart }; call chart.destroy() when done. */
export async function renderChart({ labels, series }, { type, title }) {
  const Chart = await getChart();
  await document.fonts.load('600 16px Inter');
  Object.assign(Chart.defaults.font, { family: 'Inter, Arial, sans-serif', size: 15 });
  Chart.defaults.color = '#3A3355';
  const pie = type === 'pie';
  const canvas = h('canvas', { width: 800, height: 450 });
  const chart = new Chart(canvas, {
    type,
    data: {
      labels,
      datasets: (pie ? series.slice(0, 1) : series).map((s, i) => ({
        label: s.name,
        data: s.values,
        backgroundColor: pie ? labels.map((_, j) => COLOURS[j % COLOURS.length]) : COLOURS[i % COLOURS.length],
        borderColor: pie ? '#FFFFFF' : COLOURS[i % COLOURS.length],
        borderWidth: pie ? 2 : 3,
        borderRadius: type === 'bar' ? 6 : 0,
        tension: 0.3,
        pointRadius: 4,
      })),
    },
    options: {
      responsive: false,
      animation: false,
      events: [],
      devicePixelRatio: 2,
      layout: { padding: 16 },
      plugins: {
        title: { display: !!title.trim(), text: title.trim(), color: '#16112A', font: { size: 22, weight: '700' } },
        legend: { display: pie || series.length > 1, position: pie ? 'right' : 'top' },
      },
      scales: pie ? {} : { y: { beginAtZero: true } },
    },
    // Charts are see-through by default. Paint a white background so the PNG works anywhere.
    plugins: [{ id: 'white', beforeDraw: ({ ctx, width, height }) => { ctx.save(); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, width, height); ctx.restore(); } }],
  });
  return { canvas, chart };
}

export default {
  mount(root) {
    let opts = optionDefaults(OPTIONS);
    let current = null;
    let seq = 0;
    const stage = h('div', { class: 'stage', style: { touchAction: 'auto' } }, h('span', { class: 'spinner' }));
    const msg = h('div');
    const fileName = () => `${opts.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'chart'}.png`;
    const download = button('Download PNG', { variant: 'primary', size: 'lg', icon: 'download', disabled: true,
      onClick: async () => current && downloadBlob(await blobFromCanvas(current.canvas, 'image/png'), fileName()) });
    const paint = debounce(async () => {
      const mine = ++seq;
      const data = parseData(opts.data);
      clear(msg);
      if (!data.labels.length || !data.series.some((s) => s.values.some(Number.isFinite))) {
        download.disabled = true;
        return msg.append(notice('info', 'Add at least one row with a number, like: Jan, 1200'));
      }
      try {
        const next = await renderChart(data, opts);
        if (mine !== seq) return next.chart.destroy();
        next.canvas.style.cssText = 'width:100%;max-width:800px;height:auto';
        stage.replaceChildren(next.canvas);
        current?.chart.destroy();
        current = next;
        download.disabled = false;
      } catch (err) {
        msg.append(notice('error', friendlyError(err)));
      }
    }, 150);
    const form = optionsForm(OPTIONS, opts, (v) => {
      opts = v;
      paint();
    });
    clear(root).append(form.el, stage, msg, h('div', { class: 'run-bar' }, download));
    paint();
  },
};
