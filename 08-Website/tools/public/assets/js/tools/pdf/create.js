// Create PDF: type or paste text, get an A4 PDF. Custom mount because there's no file to add.
import { h, clear } from '../../core/dom.js';
import { button, results, notice, toast, friendlyError } from '../../core/ui.js';
import { pdfBlob } from './_pages.js';
import { layoutPdf, layoutNote } from './_layout.js';

/** Plain text -> A4 PDF (11 pt Helvetica, 2 cm margins). Returns { bytes, pages, dropped }. */
export function textToPdf(text) {
  return layoutPdf([{ runs: [{ text }], after: 0 }]);
}

export default {
  mount(root) {
    const ta = h('textarea', { id: 'create-pdf-text', rows: 16, placeholder: 'Type or paste your text here' });
    const go = button('Create PDF', { variant: 'primary', size: 'lg', icon: 'file-plus', onClick: run });
    const editor = h('div', { style: { display: 'grid', gap: '16px' } },
      h('div', { class: 'pane' }, h('label', { class: 'field-label', for: ta.id }, 'Your text'), ta),
      h('div', { class: 'run-bar' }, go));
    clear(root).append(editor);

    async function run() {
      if (!ta.value.trim()) return toast('Type or paste some text first.', 'error');
      go.disabled = true;
      try {
        const r = await textToPdf(ta.value);
        const back = button('Edit text', { variant: 'ghost', icon: 'pen', onClick: () => { done.cleanup(); clear(root).append(editor); } });
        const done = results([{ name: 'document.pdf', blob: pdfBlob(r.bytes), note: layoutNote(r) }], { actions: [back] });
        if (r.dropped) done.prepend(notice('warn', `We left out ${r.dropped} character${r.dropped === 1 ? '' : 's'} (like emoji) that the standard PDF font can't show.`));
        clear(root).append(done);
      } catch (err) {
        toast(friendlyError(err), 'error');
      } finally {
        go.disabled = false;
      }
    }
  },
};
