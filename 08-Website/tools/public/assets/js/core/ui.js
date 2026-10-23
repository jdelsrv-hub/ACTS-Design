// Reusable tool UI pieces. Every tool builds from these so the whole site looks and behaves the same.
import { h, icon, clear, uniqueId } from './dom.js';
import { formatBytes, matchesAccept, downloadBlob, downloadText, zipFiles, extOf } from './files.js';

// ---------- Buttons, notices, toasts ----------

/** variant: 'primary' (green, the ONE main action per view) | 'purple' | 'ghost' | 'quiet' | 'icon' */
export function button(label, { variant = 'ghost', size, icon: ic, onClick, type = 'button', disabled, title, block, attrs } = {}) {
  const cls = ['btn', variant === 'icon' ? 'btn-icon' : `btn-${variant}`, size && `btn-${size}`, block && 'btn-block'];
  const b = h('button', { class: cls, type, disabled, title, 'aria-label': variant === 'icon' ? title || label : null, ...attrs }, ic && icon(ic), variant === 'icon' ? null : label);
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

const NOTICE_ICONS = { info: 'info', success: 'check-circle', warn: 'alert', error: 'alert' };
/** kind: 'info' | 'success' | 'warn' | 'error'. content: strings or nodes. */
export function notice(kind, ...content) {
  return h('div', { class: `notice notice-${kind}`, role: kind === 'error' ? 'alert' : 'status' },
    icon(NOTICE_ICONS[kind] || 'info'),
    h('div', null, ...content.map((c) => (typeof c === 'string' ? h('p', null, c) : c))));
}

let toastHost;
export function toast(message, kind = 'info', ms = 3200) {
  toastHost ||= document.body.appendChild(h('div', { class: 'toasts', 'aria-live': 'polite' }));
  const t = h('div', { class: `toast toast-${kind}` }, icon(kind === 'success' ? 'check-circle' : kind === 'error' ? 'alert' : 'info'), h('span', null, message));
  toastHost.append(t);
  setTimeout(() => t.remove(), ms);
}

/** Turn any thrown error into a sentence a creator can act on. */
export function friendlyError(err) {
  const msg = String(err?.message || err || '');
  if (err?.name === 'AbortError') return 'Stopped. Nothing was changed.';
  if (/password|encrypted/i.test(msg) && /pdf|document/i.test(msg)) return 'This PDF is password protected. Unlock it first with our Unlock PDF tool, then try again.';
  if (/PasswordException|password/i.test(err?.name || '')) return 'That password didn\'t work. Check it and try again.';
  if (/Invalid PDF|No PDF header|InvalidPDF/i.test(msg)) return "This file doesn't look like a valid PDF. It may be damaged.";
  if (/out of memory|allocation failed|RangeError: Array buffer/i.test(msg)) return 'This file is too big for your browser to handle. Try a smaller file, or use a computer instead of a phone.';
  if (/NotSupportedError|not supported|unsupported/i.test(msg) && !/^We /.test(msg)) return "Your browser doesn't support this yet. Try the latest Chrome or Edge.";
  if (/Failed to fetch|NetworkError|load failed/i.test(msg)) return "We couldn't reach the internet to load part of this tool. Check your connection and try again.";
  return msg && msg.length < 240 ? msg : 'Something went wrong. Try again, or try a different file.';
}

// ---------- Dropzone ----------

/**
 * A drag-and-drop upload box. Files never leave the device: they're read in the browser.
 * opts: accept, multiple, title, hint, onFiles(files), compact, privacy (true), paste (true), buttonLabel, icon
 */
export function dropzone(opts) {
  const { accept = '', multiple = false, title, hint, onFiles, compact = false, privacy = true, paste = true, buttonLabel, icon: ic = 'upload' } = opts;
  const inputId = uniqueId('file');
  const input = h('input', { type: 'file', id: inputId, class: 'visually-hidden', accept: accept || null, multiple: multiple || null, tabindex: '-1' });
  const chooseBtn = button(buttonLabel || (multiple ? 'Choose files' : 'Choose a file'), { variant: 'purple', icon: 'file-plus' });
  const zone = h('div', { class: ['dropzone', compact && 'is-compact'] },
    h('div', { class: 'dz-ico' }, icon(ic)),
    h('div', { style: compact ? null : { display: 'grid', gap: '6px', justifyItems: 'center' } },
      h('p', { class: 'dz-title' }, title || (multiple ? 'Drop your files here' : 'Drop your file here')),
      hint && h('p', { class: 'dz-hint' }, hint)),
    chooseBtn,
    privacy && !compact && h('p', { class: 'dz-private' }, icon('shield-check'), 'Your files stay on your device. Nothing is uploaded.'),
    input);

  const take = (list) => {
    let files = [...list].filter((f) => f && f.size !== undefined);
    if (!files.length) return;
    const rejected = files.filter((f) => !matchesAccept(f, accept));
    files = files.filter((f) => matchesAccept(f, accept));
    if (rejected.length) toast(`${rejected.length === 1 ? `${rejected[0].name} isn't` : `${rejected.length} files aren't`} the right type for this tool, so we skipped ${rejected.length === 1 ? 'it' : 'them'}.`, 'error', 5000);
    if (!multiple) files = files.slice(0, 1);
    if (files.length) onFiles(files);
  };

  chooseBtn.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    take(input.files);
    input.value = '';
  });
  let depth = 0;
  zone.addEventListener('dragenter', (e) => {
    if (![...(e.dataTransfer?.types || [])].includes('Files')) return;
    e.preventDefault();
    depth++;
    zone.classList.add('is-over');
  });
  zone.addEventListener('dragover', (e) => {
    if (![...(e.dataTransfer?.types || [])].includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  zone.addEventListener('dragleave', () => {
    depth = Math.max(0, depth - 1);
    if (!depth) zone.classList.remove('is-over');
  });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    depth = 0;
    zone.classList.remove('is-over');
    take(e.dataTransfer?.files || []);
  });
  if (paste) {
    const onPaste = (e) => {
      if (!zone.isConnected) return document.removeEventListener('paste', onPaste);
      if (zone.offsetParent === null) return;
      const files = [...(e.clipboardData?.files || [])];
      if (files.length && !/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName)) {
        e.preventDefault();
        take(files);
      }
    };
    document.addEventListener('paste', onPaste);
  }
  zone.open = () => input.click();
  zone.input = input;
  return zone;
}

// ---------- File list ----------

const TYPE_ICONS = { pdf: 'file-text', doc: 'file-text', docx: 'file-text', txt: 'file-text', md: 'file-text', csv: 'file-spreadsheet', xls: 'file-spreadsheet', xlsx: 'file-spreadsheet', json: 'file-code', xml: 'file-code', zip: 'file-archive', epub: 'book', mp4: 'video', mov: 'video', webm: 'video', mkv: 'video', avi: 'video', mp3: 'music', wav: 'music', m4a: 'music', aac: 'music', ogg: 'music', flac: 'music', pptx: 'presentation' };
export function fileTypeIcon(file) {
  if ((file.type || '').startsWith('image/') || /\.(heic|heif|tiff?|avif|psd)$/i.test(file.name)) return 'image';
  if ((file.type || '').startsWith('video/')) return 'video';
  if ((file.type || '').startsWith('audio/')) return 'music';
  return TYPE_ICONS[extOf(file.name)] || 'file';
}

/**
 * List of chosen files with optional reordering (drag, or up/down buttons) and remove.
 * opts: reorder, describe(file) -> Promise<string>, thumbs (true = image previews), onChange(files)
 */
export function fileList({ reorder = false, describe, thumbs = true, onChange } = {}) {
  let files = [];
  const meta = new WeakMap();
  const urls = [];
  const ul = h('ul', { class: 'file-list' });
  let dragIndex = -1;

  const changed = () => {
    render();
    onChange?.(files.slice());
  };
  const move = (i, j) => {
    if (j < 0 || j >= files.length) return;
    const [f] = files.splice(i, 1);
    files.splice(j, 0, f);
    changed();
  };

  function row(file, i) {
    const thumb = h('div', { class: 'file-thumb' }, icon(fileTypeIcon(file)));
    if (thumbs && /^image\//.test(file.type) && !/svg|tiff|heic/.test(file.type) && file.size < 25e6) {
      const url = URL.createObjectURL(file);
      urls.push(url);
      const img = h('img', { src: url, alt: '', loading: 'lazy', decoding: 'async' });
      img.onerror = () => img.remove();
      thumb.prepend(img);
    }
    const metaEl = h('p', { class: 'file-meta' }, formatBytes(file.size));
    const cached = meta.get(file);
    if (cached) metaEl.textContent = `${formatBytes(file.size)} · ${cached}`;
    else if (describe) {
      Promise.resolve(describe(file)).then((d) => {
        if (d) {
          meta.set(file, d);
          metaEl.textContent = `${formatBytes(file.size)} · ${d}`;
        }
      }).catch(() => {});
    }
    const li = h('li', { class: ['file-row', !reorder && 'no-grip'], draggable: reorder ? 'true' : null },
      reorder && h('span', { class: 'file-grip', title: 'Drag to reorder' }, icon('grip')),
      thumb,
      h('div', { class: 'file-main' }, h('p', { class: 'file-name', title: file.name }, file.name), metaEl),
      h('div', { class: 'file-actions' },
        reorder && button('Move up', { variant: 'icon', icon: 'chevron-up', title: `Move ${file.name} up`, disabled: i === 0, onClick: () => move(i, i - 1) }),
        reorder && button('Move down', { variant: 'icon', icon: 'chevron-down', title: `Move ${file.name} down`, disabled: i === files.length - 1, onClick: () => move(i, i + 1) }),
        button('Remove', { variant: 'icon', icon: 'x', title: `Remove ${file.name}`, onClick: () => { files.splice(i, 1); changed(); } })));
    if (reorder) {
      li.addEventListener('dragstart', (e) => {
        dragIndex = i;
        li.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(i));
      });
      li.addEventListener('dragend', () => {
        dragIndex = -1;
        render();
      });
      li.addEventListener('dragover', (e) => {
        if (dragIndex < 0) return;
        e.preventDefault();
        const after = e.offsetY > li.offsetHeight / 2;
        li.classList.toggle('drop-before', !after);
        li.classList.toggle('drop-after', after);
      });
      li.addEventListener('dragleave', () => li.classList.remove('drop-before', 'drop-after'));
      li.addEventListener('drop', (e) => {
        if (dragIndex < 0) return;
        e.preventDefault();
        const after = e.offsetY > li.offsetHeight / 2;
        let to = after ? i + 1 : i;
        if (dragIndex < to) to--;
        move(dragIndex, to);
      });
    }
    return li;
  }

  function render() {
    urls.splice(0).forEach((u) => URL.revokeObjectURL(u));
    clear(ul).append(...files.map(row));
  }

  return {
    el: ul,
    get: () => files.slice(),
    set(list) {
      files = [...list];
      changed();
    },
    add(list) {
      files.push(...list);
      changed();
    },
    setMeta(file, text) {
      meta.set(file, text);
      render();
    },
  };
}

// ---------- Options form ----------

/**
 * Render an options schema. Each field:
 *   { id, type, label, default, help, wide, showIf(values), ...type-specific }
 * types: select (choices), segmented (choices), text, textarea (rows), number (min,max,step,unit),
 *        range (min,max,step,unit), checkbox, color, password, file (accept) , date, time
 * choices: ['a','b'] or [{ value, label }]
 * Returns { el, values(), set(id, value), refresh() }
 */
export function optionsForm(schema = [], initial = {}, onChange) {
  const values = {};
  for (const f of schema) values[f.id] = initial[f.id] !== undefined ? initial[f.id] : f.default !== undefined ? f.default : defaultFor(f);
  const wrap = h('div', { class: 'opts' });
  const fields = new Map();

  const emit = (id) => {
    refresh();
    onChange?.({ ...values }, id);
  };

  for (const f of schema) {
    const id = uniqueId(`opt-${f.id}`);
    let control;
    const choices = (f.choices || []).map((c) => (typeof c === 'object' ? c : { value: c, label: String(c) }));
    switch (f.type) {
      case 'select':
        control = h('select', { id, onchange: (e) => { values[f.id] = coerce(choices, e.target.value); emit(f.id); } },
          choices.map((c) => h('option', { value: c.value, selected: String(c.value) === String(values[f.id]) || null }, c.label)));
        break;
      case 'segmented': {
        control = h('div', { class: 'seg', role: 'group', 'aria-labelledby': `${id}-label` });
        const paint = () => [...control.children].forEach((b, i) => b.setAttribute('aria-pressed', String(String(choices[i].value) === String(values[f.id]))));
        choices.forEach((c) => control.append(h('button', { type: 'button', onclick: () => { values[f.id] = c.value; paint(); emit(f.id); } }, c.label)));
        paint();
        control.paint = paint;
        break;
      }
      case 'textarea':
        control = h('textarea', { id, rows: f.rows || 4, placeholder: f.placeholder, class: f.mono ? 'mono' : null, oninput: (e) => { values[f.id] = e.target.value; emit(f.id); } });
        control.value = values[f.id] ?? '';
        break;
      case 'checkbox':
        control = h('input', { type: 'checkbox', id, checked: !!values[f.id], onchange: (e) => { values[f.id] = e.target.checked; emit(f.id); } });
        break;
      case 'range': {
        const out = h('output', { class: 'opt-range-value', for: id });
        const show = () => (out.textContent = f.format ? f.format(values[f.id]) : `${values[f.id]}${f.unit || ''}`);
        const input = h('input', { type: 'range', id, min: f.min ?? 0, max: f.max ?? 100, step: f.step ?? 1, value: values[f.id], oninput: (e) => { values[f.id] = Number(e.target.value); show(); emit(f.id); } });
        show();
        control = h('div', { class: 'opt-row' }, input, out);
        control.input = input;
        control.show = show;
        break;
      }
      case 'number': {
        const input = h('input', { type: 'number', id, min: f.min, max: f.max, step: f.step ?? 'any', placeholder: f.placeholder, inputmode: 'decimal', value: values[f.id] ?? '',
          oninput: (e) => { values[f.id] = e.target.value === '' ? '' : Number(e.target.value); emit(f.id); } });
        control = f.unit ? h('div', { class: 'opt-unit' }, input, h('span', null, f.unit)) : input;
        control.input = input;
        break;
      }
      case 'color':
        control = h('div', { class: 'opt-row' },
          h('input', { type: 'color', id, value: values[f.id] || '#000000', oninput: (e) => { values[f.id] = e.target.value; e.target.nextSibling.textContent = e.target.value.toUpperCase(); emit(f.id); } }),
          h('span', { class: 'mono small muted' }, String(values[f.id] || '#000000').toUpperCase()));
        break;
      case 'file': {
        const name = h('span', { class: 'small muted' }, values[f.id]?.name || 'No file chosen');
        const input = h('input', { type: 'file', class: 'visually-hidden', accept: f.accept, onchange: (e) => { values[f.id] = e.target.files[0] || null; name.textContent = values[f.id]?.name || 'No file chosen'; emit(f.id); } });
        control = h('div', { class: 'opt-row' }, button(f.buttonLabel || 'Choose file', { variant: 'ghost', size: 'sm', icon: 'file-plus', onClick: () => input.click() }), name, input);
        break;
      }
      default: {
        const type = ['password', 'date', 'time', 'url', 'email', 'datetime-local'].includes(f.type) ? f.type : 'text';
        const input = h('input', { type, id, placeholder: f.placeholder, maxlength: f.maxLength, autocomplete: f.type === 'password' ? 'new-password' : 'off', spellcheck: f.spellcheck ?? null, value: values[f.id] ?? '', class: f.mono ? 'mono-input' : null,
          oninput: (e) => { values[f.id] = e.target.value; emit(f.id); } });
        control = f.unit ? h('div', { class: 'opt-unit' }, input, h('span', null, f.unit)) : input;
      }
    }
    const field = f.type === 'checkbox'
      ? h('div', { class: ['opt', f.wide && 'opt-wide'] }, h('label', { class: 'opt-check', for: id }, control, f.label), f.help && h('p', { class: 'opt-help' }, f.help))
      : h('div', { class: ['opt', (f.wide || f.type === 'textarea') && 'opt-wide'] },
        h('label', { class: 'field-label', for: f.type === 'segmented' ? null : id, id: `${id}-label` }, f.label),
        control,
        f.help && h('p', { class: 'opt-help' }, f.help));
    fields.set(f.id, { f, field, control });
    wrap.append(field);
  }

  function refresh() {
    for (const { f, field } of fields.values()) field.hidden = f.showIf ? !f.showIf(values) : false;
  }
  refresh();

  return {
    el: wrap,
    values: () => ({ ...values }),
    set(id, value) {
      values[id] = value;
      const entry = fields.get(id);
      if (entry) {
        const { f, control } = entry;
        if (f.type === 'segmented') control.paint();
        else if (f.type === 'range') { control.input.value = value; control.show(); }
        else if (f.type === 'checkbox') control.checked = !!value;
        else if (f.type === 'number') control.input.value = value;
        else if (control.tagName === 'SELECT' || control.tagName === 'TEXTAREA' || control.tagName === 'INPUT') control.value = value;
        else if (f.type === 'color') { const i = control.querySelector('input'); i.value = value; control.lastChild.textContent = String(value).toUpperCase(); }
        else { const i = control.querySelector?.('input'); if (i) i.value = value; }
      }
      refresh();
    },
    refresh,
  };
}

function defaultFor(f) {
  if (f.type === 'checkbox') return false;
  if (f.type === 'number' || f.type === 'range') return f.min ?? 0;
  if (f.type === 'select' || f.type === 'segmented') {
    const c = f.choices?.[0];
    return typeof c === 'object' ? c.value : c;
  }
  if (f.type === 'file') return null;
  return '';
}

function coerce(choices, raw) {
  const match = choices.find((c) => String(c.value) === raw);
  return match ? match.value : raw;
}

/** Read current option values with defaults, without rendering (used by tests and process()). */
export function optionDefaults(schema = [], overrides = {}) {
  const v = {};
  for (const f of schema) v[f.id] = overrides[f.id] !== undefined ? overrides[f.id] : f.default !== undefined ? f.default : defaultFor(f);
  return v;
}

// ---------- Progress ----------

export function progressBar(label = 'Working on it') {
  const fill = h('div', { class: 'progress-fill' });
  const msg = h('span', null, label);
  const pct = h('span', null, '');
  const el = h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': label },
    h('div', { class: 'progress-row' }, msg, pct),
    h('div', { class: 'progress-track' }, fill));
  return {
    el,
    /** fraction 0..1 (or null for "busy"), optional message */
    set(fraction, message) {
      if (message) msg.textContent = message;
      if (fraction === null || fraction === undefined || Number.isNaN(fraction)) {
        el.classList.add('is-indeterminate');
        pct.textContent = '';
        el.removeAttribute('aria-valuenow');
      } else {
        const p = Math.max(0, Math.min(1, fraction));
        el.classList.remove('is-indeterminate');
        fill.style.width = `${(p * 100).toFixed(1)}%`;
        pct.textContent = `${Math.round(p * 100)}%`;
        el.setAttribute('aria-valuenow', String(Math.round(p * 100)));
      }
    },
  };
}

// ---------- Results ----------

/**
 * Show finished files with download buttons.
 * items: [{ name, blob?, text?, note?, preview?: 'image'|'video'|'audio'|false, transparent? }]
 * opts: title, summary (string), zipName, actions (extra nodes)
 */
export function results(items, { title, summary, zipName = 'acts-tools.zip', actions = [] } = {}) {
  const urls = [];
  const objUrl = (blob) => {
    const u = URL.createObjectURL(blob);
    urls.push(u);
    return u;
  };
  const kindOf = (it) => {
    if (it.preview === false) return null;
    if (it.preview) return it.preview;
    const t = it.blob?.type || '';
    if (t.startsWith('image/')) return 'image';
    if (t.startsWith('video/')) return 'video';
    if (t.startsWith('audio/')) return 'audio';
    return null;
  };
  const files = items.filter((i) => i.blob);
  const textItems = items.filter((i) => !i.blob && typeof i.text === 'string');
  const head = h('div', { class: 'results-head' },
    h('h3', null, icon('check-circle'), title || (files.length > 1 ? `${files.length} files ready` : 'Done. Your file is ready')),
    files.length > 1 && button(`Download all (.zip)`, { variant: 'primary', icon: 'download', onClick: async (e) => {
      const b = e.currentTarget;
      b.disabled = true;
      try {
        downloadBlob(await zipFiles(files.map((f) => ({ name: f.name, blob: f.blob }))), zipName);
      } catch (err) {
        toast(friendlyError(err), 'error');
      } finally {
        b.disabled = false;
      }
    } }));
  const box = h('div', { class: 'results', 'aria-live': 'polite' }, head);
  if (summary) box.append(notice('success', summary));

  if (files.length === 1 && kindOf(files[0])) {
    const it = files[0];
    const k = kindOf(it);
    const url = objUrl(it.blob);
    const media = k === 'image' ? h('img', { src: url, alt: `Preview of ${it.name}`, class: it.transparent ? 'checker' : null })
      : k === 'video' ? h('video', { src: url, controls: true, playsinline: true, preload: 'metadata' })
        : h('audio', { src: url, controls: true, preload: 'metadata' });
    box.append(h('div', { class: 'result-preview' }, media));
  }
  if (files.length) {
    const list = h('ul', { class: 'result-list' });
    for (const it of files) {
      const thumb = h('div', { class: ['result-thumb', it.transparent && 'is-checker'] }, icon(fileTypeIcon({ name: it.name, type: it.blob.type })));
      if (kindOf(it) === 'image' && it.blob.size < 30e6) thumb.prepend(h('img', { src: objUrl(it.blob), alt: '', loading: 'lazy' }));
      list.append(h('li', { class: 'result-row' },
        thumb,
        h('div', { class: 'result-main' },
          h('p', { class: 'result-name', title: it.name }, it.name),
          h('p', { class: 'result-meta' }, [formatBytes(it.blob.size), it.note].filter(Boolean).join(' · '))),
        button('Download', { variant: files.length === 1 ? 'primary' : 'ghost', size: files.length === 1 ? null : 'sm', icon: 'download', onClick: () => downloadBlob(it.blob, it.name) })));
    }
    box.append(list);
  }
  for (const t of textItems) box.append(textOutput({ label: t.label || t.name || 'Result', value: t.text, filename: t.name || 'result.txt', rows: t.rows || 12, mono: t.mono }).el);
  if (actions.length) box.append(h('div', { class: 'result-actions' }, ...actions));
  box.cleanup = () => urls.forEach((u) => URL.revokeObjectURL(u));
  return box;
}

// ---------- Text output, copy, stats ----------

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied', 'success', 1600);
    return true;
  } catch {
    const ta = h('textarea', { style: { position: 'fixed', opacity: '0' } });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    toast(ok ? 'Copied' : "Couldn't copy. Select the text and copy it yourself.", ok ? 'success' : 'error', 2000);
    return ok;
  }
}

export function copyButton(getText, label = 'Copy') {
  return button(label, { variant: 'quiet', size: 'sm', icon: 'copy', onClick: () => copyText(typeof getText === 'function' ? getText() : getText) });
}

/** Read-only result box with Copy and Download. Returns { el, set(text), get() } */
export function textOutput({ label = 'Result', value = '', filename = 'result.txt', rows = 10, mono = false, download = true } = {}) {
  const id = uniqueId('out');
  const ta = h('textarea', { id, rows, readonly: true, class: mono ? 'mono' : null, spellcheck: 'false' });
  ta.value = value;
  const api = { set: (t) => (ta.value = t), get: () => ta.value, textarea: ta, filename };
  api.el = h('div', { class: 'pane' },
    h('div', { class: 'pane-head' },
      h('label', { class: 'field-label', for: id }, label),
      h('div', { class: 'pane-tools' },
        copyButton(() => ta.value),
        download && button('Download', { variant: 'quiet', size: 'sm', icon: 'download', onClick: () => downloadText(ta.value, api.filename) }))),
    ta);
  return api;
}

/** stats: [{ label, value }] -> definition-list grid. Returns { el, set(stats) } */
export function statGrid(stats = []) {
  const el = h('dl', { class: 'stat-grid' });
  const set = (list) => clear(el).append(...list.map((s) => h('div', { class: 'stat' }, h('dt', null, s.label), h('dd', { title: String(s.value) }, String(s.value)))));
  set(stats);
  return { el, set };
}

// ---------- Modal ----------

export function modal({ title, body, actions = [], onClose } = {}) {
  const dlg = h('dialog', { class: 'modal' },
    h('div', { class: 'modal-head' }, h('h3', null, title), button('Close', { variant: 'icon', icon: 'x', title: 'Close', onClick: () => dlg.close() })),
    h('div', { class: 'modal-body' }, body),
    actions.length ? h('div', { class: 'modal-foot' }, ...actions) : null);
  dlg.addEventListener('close', () => {
    onClose?.();
    dlg.remove();
  });
  return {
    el: dlg,
    open() {
      document.body.append(dlg);
      dlg.showModal();
    },
    close: () => dlg.close(),
  };
}

/** Section wrapper with an optional small heading. */
export function section(title, ...children) {
  return h('div', { class: 'pane' }, title && h('p', { class: 'opts-title' }, title), ...children);
}
