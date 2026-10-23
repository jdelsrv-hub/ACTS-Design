import { fileTool } from '../../core/filetool.js';
import { h } from '../../core/dom.js';
import { button } from '../../core/ui.js';
import { getPdfLib } from '../../core/vendor.js';
import { withSuffix } from '../../core/files.js';
import { PDF_ACCEPT, pdfBlob, parseRanges, thumbGrid, hidden, isNewFile } from './_pages.js';

export default fileTool({
  accept: PDF_ACCEPT,
  dropTitle: 'Drop your PDF here',
  action: 'Save new order',
  actionIcon: 'arrow-up-down',
  // The new order as page numbers, like "3, 1, 2". Set by dragging the page previews.
  options: [hidden('order', '')],
  optionsTitle: false,
  validate: (_files, o) => (o.order ? null : 'Drag the pages into a new order first.'),
  renderExtra(extra, api) {
    if (isNewFile(api)) api.setOption('order', '');
    let tiles = [];
    let order = [];
    let dragging = 0;
    const commit = () => {
      grid.el.append(...order.map((n) => tiles[n - 1]));
      api.setOption('order', order.every((n, i) => n === i + 1) ? '' : order.join(', '));
    };
    const moveTo = (page, target) => {
      const to = order.indexOf(target);
      order.splice(order.indexOf(page), 1);
      order.splice(to, 0, page);
      commit();
    };
    const step = (page, by) => {
      const i = order.indexOf(page);
      if (order[i + by] === undefined) return;
      [order[i], order[i + by]] = [order[i + by], order[i]];
      commit();
    };
    const tile = (i) => {
      const n = i + 1;
      const el = h('div', { class: 'thumb', draggable: 'true' },
        h('span', { class: 'thumb-label' }, `Page ${n}`),
        h('div', { class: 'thumb-tools' },
          button('Earlier', { variant: 'icon', icon: 'chevron-left', title: `Move page ${n} earlier`, onClick: () => step(n, -1) }),
          button('Later', { variant: 'icon', icon: 'chevron-right', title: `Move page ${n} later`, onClick: () => step(n, 1) })));
      el.addEventListener('dragstart', (e) => {
        dragging = n;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(n));
        el.classList.add('is-dragging');
      });
      el.addEventListener('dragend', () => {
        dragging = 0;
        el.classList.remove('is-dragging');
      });
      el.addEventListener('dragover', (e) => {
        if (!dragging) return;
        e.preventDefault();
        el.classList.add('drop-target');
      });
      el.addEventListener('dragleave', () => el.classList.remove('drop-target'));
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.classList.remove('drop-target');
        if (dragging && dragging !== n) moveTo(dragging, n);
      });
      return el;
    };
    const grid = thumbGrid(api.files[0], tile);
    grid.tiles.then((list) => {
      tiles = list;
      order = api.options.order ? api.options.order.split(',').map(Number) : list.map((_, i) => i + 1);
      grid.el.append(...order.map((n) => tiles[n - 1]));
    }, () => {});
    extra.append(h('p', { class: 'small muted' }, 'Drag the pages into the order you want, or use the arrows under each page.'), grid.el);
  },
  async processFile(file, { order }) {
    const { PDFDocument } = await getPdfLib();
    const src = await PDFDocument.load(await file.arrayBuffer());
    const pages = order ? parseRanges(order, src.getPageCount()).flat() : src.getPageIndices().map((i) => i + 1);
    const doc = await PDFDocument.create();
    for (const p of await doc.copyPages(src, pages.map((n) => n - 1))) doc.addPage(p);
    return { name: withSuffix(file.name, 'reordered'), blob: pdfBlob(await doc.save()) };
  },
});
