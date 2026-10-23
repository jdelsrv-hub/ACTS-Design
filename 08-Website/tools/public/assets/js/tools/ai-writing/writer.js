// AI writing tools: one module for every template in templates.js (registry preset { template: '<id>' }).
// The browser sends only the template id and the field values to /api/ai (functions/api/ai.js), which
// owns the prompts, checks the values again and calls Claude. PDF templates read the text here with
// pdf.js and send only that text, never the file.
//
// Named exports for tests (no network needed): formSchema, readPdfText, tidyText, requestWriting
// (pass { fetch } to stub the network), isLocalPreview, and the copy strings.
import { h, clear } from '../../core/dom.js';
import { optionsForm, notice, button, textOutput, progressBar, dropzone, friendlyError } from '../../core/ui.js';
import { openPdfjs } from '../../core/vendor.js';
import { TEMPLATES, checkFields } from './templates.js';

export const API_URL = '/api/ai';
const TIMEOUT_MS = 120000;

export const PRIVACY = 'What you type is sent to our AI service (Claude, made by Anthropic) to write your result. Please leave out private details, like full names, addresses, phone numbers, passwords or health information.';
export const PDF_HINT = 'We read the text here in your browser and send only the text to our AI service, not the file.';
export const CHECK = 'AI can get facts wrong or sound a bit generic. Check the result and edit it (right here, if you like) so it sounds like you before you use it.';
export const NOT_RUNNING = "The AI service isn't running in this preview, so we can't write anything here. It works on the live acTS Tools site.";
const UNAVAILABLE = "Our AI service isn't available right now. Try again in a little while.";

/** True on a local preview (the Python dev server can't run functions/api/ai.js). */
export function isLocalPreview(host = globalThis.location?.hostname || '') {
  return host === '' || host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host.endsWith('.localhost');
}

/** The template's fields as a core/ui optionsForm schema. PDF fields get a dropzone instead. */
export function formSchema(tpl) {
  return tpl.fields.filter((f) => f.type !== 'pdf').map((f) => ({
    id: f.id,
    type: f.type,
    label: f.label,
    placeholder: f.placeholder,
    rows: f.rows,
    choices: f.choices,
    default: f.default ?? '',
    maxLength: f.type === 'text' ? f.max || 200 : undefined,
  }));
}

/** Collapse the spacing pdf.js leaves behind: single spaces, at most one blank line in a row. */
export function tidyText(s) {
  return String(s).replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * All the text in a PDF, read in the browser. Returns { text, pages }.
 * Stops early once the text passes `max` characters (checkFields then explains the limit).
 */
export async function readPdfText(file, { max = Infinity, onProgress } = {}) {
  let pdf;
  try {
    pdf = await openPdfjs(await file.arrayBuffer());
  } catch (err) {
    if (err?.name === 'PasswordException') throw new Error('This PDF is password protected. Unlock it first with our Unlock PDF tool, then try again.');
    throw err;
  }
  let text = '';
  try {
    for (let n = 1; n <= pdf.numPages && text.length <= max; n++) {
      onProgress?.(n, pdf.numPages);
      const page = await pdf.getPage(n);
      const { items } = await page.getTextContent();
      text += `${items.map((it) => (it.str ?? '') + (it.hasEOL ? '\n' : '')).join('')}\n\n`;
      page.cleanup();
    }
  } finally {
    pdf.loadingTask?.destroy();
  }
  text = tidyText(text);
  if (!text) throw new Error("We couldn't find any text in this PDF. Scanned PDFs (photos of pages) have no text for us to read.");
  return { text, pages: pdf.numPages };
}

/**
 * Ask our AI service to write. Returns { text, truncated }.
 * Throws an Error with a sentence a creator can act on (including NOT_RUNNING on a local preview).
 */
export async function requestWriting(template, fields, { fetch: doFetch = globalThis.fetch, signal } = {}) {
  let res;
  try {
    res = await doFetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ template, fields }), signal });
  } catch (err) {
    if (err?.name === 'TimeoutError') throw new Error('That took too long, so we stopped waiting. Try again, or choose a shorter length.');
    if (err?.name === 'AbortError') throw err;
    throw new Error("We couldn't reach our AI service. Check your internet connection, then try again.");
  }
  // Our function always answers in JSON. Anything else (the preview server's 404 or 501 page) means it isn't running.
  const data = /json/i.test(res.headers.get('Content-Type') || '') ? await res.json().catch(() => null) : null;
  if (!data) throw new Error(isLocalPreview() ? NOT_RUNNING : UNAVAILABLE);
  if (!res.ok || data.error) throw new Error(data.error || UNAVAILABLE);
  if (typeof data.text !== 'string' || !data.text.trim()) throw new Error("The AI didn't send anything back. Try again, or reword your request.");
  return { text: data.text, truncated: !!data.truncated };
}

export default {
  mount(root, ctx = {}) {
    const id = ctx.preset?.template;
    const tpl = Object.hasOwn(TEMPLATES, id || '') ? TEMPLATES[id] : null;
    if (!tpl) throw new Error(`There's no AI writing template called "${id}".`);
    const pdfField = tpl.fields.find((f) => f.type === 'pdf');
    let pdfText = '';
    let pdfSeq = 0;
    let busy = false;

    const values = () => ({ ...form.values(), ...(pdfField ? { [pdfField.id]: pdfText } : {}) });
    const form = optionsForm(formSchema(tpl), {}, () => refresh());
    const runBtn = button(tpl.action || 'Write it', { variant: 'primary', size: 'lg', icon: 'sparkles', onClick: () => run() });
    const runNote = h('p', { class: 'run-note' });
    const status = h('div');
    const output = h('div', { style: { display: 'grid', gap: '14px' } });

    let pdfBlock = null;
    if (pdfField) {
      const info = h('div');
      const dz = dropzone({ accept: '.pdf,application/pdf', title: 'Drop your PDF here', hint: PDF_HINT, privacy: false, onFiles: ([file]) => loadPdf(file, info) });
      pdfBlock = h('div', { style: { display: 'grid', gap: '10px' } }, dz, info);
    }

    async function loadPdf(file, info) {
      const mine = ++pdfSeq;
      pdfText = '';
      refresh();
      const msg = h('p', { class: 'small muted' }, `Reading ${file.name}`);
      clear(info).append(msg);
      try {
        const { text, pages } = await readPdfText(file, { max: pdfField.max, onProgress: (n, of) => (msg.textContent = `Reading page ${n} of ${of}`) });
        if (mine !== pdfSeq) return;
        pdfText = text;
        clear(info).append(text.length > pdfField.max
          ? notice('warn', checkFields(id, values()).error)
          : notice('success', `${file.name}: ${pages} page${pages === 1 ? '' : 's'}, ${text.length.toLocaleString('en-AU')} characters of text ready to send.`));
      } catch (err) {
        if (mine !== pdfSeq) return;
        clear(info).append(notice('error', friendlyError(err)));
      }
      refresh();
    }

    function refresh() {
      if (busy) return;
      const problem = checkFields(id, values()).error;
      runBtn.disabled = !!problem;
      runNote.textContent = pdfField && pdfText.length > pdfField.max ? 'Choose a shorter PDF.' : problem || '';
    }

    async function run() {
      if (busy) return;
      const checked = checkFields(id, values());
      if (checked.error) return refresh();
      busy = true;
      runBtn.disabled = true;
      runNote.textContent = '';
      const prog = progressBar('Writing your result. This can take up to a minute.');
      prog.set(null);
      clear(status).append(prog.el);
      try {
        const { text, truncated } = await requestWriting(id, checked.values, { signal: AbortSignal.timeout(TIMEOUT_MS) });
        clear(status);
        showResult(text, truncated);
      } catch (err) {
        clear(status).append(notice('error', friendlyError(err)));
      } finally {
        busy = false;
        refresh();
      }
    }

    function showResult(text, truncated) {
      const out = textOutput({ label: 'Your result', value: text, filename: `${ctx.tool?.slug || id}.txt`, rows: 16 });
      out.textarea.readOnly = false;
      out.textarea.spellcheck = true;
      clear(output).append(
        truncated ? notice('warn', 'This reached our length limit, so the end may be cut off. Try a shorter length, or less text.') : '',
        out.el,
        notice('info', CHECK),
        h('div', { class: 'result-actions' }, button('Write another version', { variant: 'ghost', icon: 'refresh', onClick: () => run() })));
      out.el.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
    }

    clear(root).append(h('div', { class: 'tool-view', style: { display: 'grid', gap: '20px' } },
      notice('info', PRIVACY),
      pdfBlock,
      form.el,
      tpl.note ? h('p', { class: 'small muted' }, tpl.note) : null,
      h('div', { class: 'run-bar' }, runBtn, runNote),
      status,
      output));
    refresh();
  },
};
