import { fileTool } from '../../core/filetool.js';
import { h } from '../../core/dom.js';
import { getPdfLib } from '../../core/vendor.js';
import { withSuffix } from '../../core/files.js';
import { PDF_ACCEPT, pdfBlob, parseRanges, formatRanges, thumbGrid, isNewFile } from './_pages.js';

let tiles = [];

/** Pages in the typed list, ignoring anything we can't read yet (it may still be being typed). */
function chosen(text) {
  try {
    return new Set(parseRanges(text, tiles.length).flat());
  } catch {
    return new Set();
  }
}

function paint(text) {
  const set = chosen(text);
  tiles.forEach((tile, i) => {
    const on = set.has(i + 1);
    tile.classList.toggle('is-removed', on);
    tile.setAttribute('aria-pressed', String(on));
    tile.querySelector('.thumb-label').textContent = on ? `${i + 1} · removed` : String(i + 1);
  });
}

export default fileTool({
  accept: PDF_ACCEPT,
  dropTitle: 'Drop your PDF here',
  action: 'Delete pages',
  actionIcon: 'trash',
  options: [{ id: 'pages', type: 'text', label: 'Pages to delete', placeholder: 'For example: 2, 5-7', help: 'Click pages above, or type their numbers here.' }],
  optionsTitle: false,
  validate: (_files, o) => (o.pages.trim() ? null : 'Choose the pages you want to delete.'),
  renderExtra(extra, api) {
    if (isNewFile(api)) api.setOption('pages', '');
    tiles = [];
    const toggle = (n) => {
      const set = chosen(api.options.pages);
      if (set.has(n)) set.delete(n);
      else set.add(n);
      api.setOption('pages', formatRanges([...set]));
      paint(api.options.pages);
    };
    const grid = thumbGrid(api.files[0], (i) => h('button', { type: 'button', class: 'thumb', 'aria-pressed': 'false', title: `Page ${i + 1}`, onclick: () => toggle(i + 1) },
      h('span', { class: 'thumb-label' }, String(i + 1))));
    grid.tiles.then((list) => {
      tiles = list;
      paint(api.options.pages);
    }, () => {});
    extra.append(h('p', { class: 'small muted' }, 'Click the pages you want to remove.'), grid.el);
  },
  onOptionsChange: (values) => paint(values.pages),
  async processFile(file, { pages }) {
    const { PDFDocument } = await getPdfLib();
    const src = await PDFDocument.load(await file.arrayBuffer());
    const drop = new Set(parseRanges(pages, src.getPageCount()).flat());
    const keep = src.getPageIndices().filter((i) => !drop.has(i + 1));
    if (!keep.length) throw new Error('A PDF needs at least one page, so leave one or more pages in.');
    const doc = await PDFDocument.create();
    for (const p of await doc.copyPages(src, keep)) doc.addPage(p);
    return { name: withSuffix(file.name, 'edited'), blob: pdfBlob(await doc.save()), note: `${keep.length} page${keep.length === 1 ? '' : 's'} left` };
  },
});
