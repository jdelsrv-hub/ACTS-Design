// fileTool(): the standard "add files -> pick options -> run -> download" tool.
// Most tools are just a config object for this. See docs/BUILDING-TOOLS.md for the full contract.
//
//   export default fileTool({
//     accept: '.pdf,application/pdf', multiple: true, minFiles: 2, reorder: true,
//     dropTitle: 'Drop your PDFs here', action: 'Merge PDFs', actionIcon: 'merge',
//     options: [{ id: 'name', type: 'text', label: 'File name', default: 'merged' }],
//     async process(files, options, ctx) { ...; return { name: 'merged.pdf', blob } },
//   });
//
// Or per file:  processFile(file, options, ctx, index) -> result | result[]
// A result is { name, blob } (a file to download) or { name, text } (shown in a copyable box).
// process() may also return { items: [...], summary: 'Saved 42%' }.
// config can be a function (preset) => config, so one module can power several catalog entries.
import { h, clear, yieldToBrowser } from './dom.js';
import { dropzone, fileList, optionsForm, optionDefaults, progressBar, results, notice, button, friendlyError, toast } from './ui.js';

export function fileTool(configOrFactory) {
  const resolve = (preset = {}) => {
    const cfg = typeof configOrFactory === 'function' ? configOrFactory(preset) : configOrFactory;
    return { multiple: false, minFiles: 1, maxFiles: 500, options: [], reorder: false, thumbs: true, ...cfg };
  };

  /** Option values with defaults (preset.options can override defaults per catalog entry). */
  const defaults = (preset = {}) => optionDefaults(resolve(preset).options, preset.options || {});

  /** Run the tool without any UI. Used by mount() and by the test runner. Returns { items, summary, errors }. */
  async function process(files, options, ctx = {}) {
    const preset = ctx.preset || {};
    const cfg = resolve(preset);
    const c = createProcessContext(ctx);
    const opts = { ...defaults(preset), ...options };
    let out;
    if (cfg.processFile) {
      const items = [];
      const errors = [];
      for (let i = 0; i < files.length; i++) {
        c.throwIfAborted();
        const sub = { ...c, progress: (f, msg) => c.progress((i + Math.max(0, Math.min(1, f ?? 0))) / files.length, msg || (files.length > 1 ? `File ${i + 1} of ${files.length}` : undefined)) };
        sub.progress(0);
        try {
          const r = await cfg.processFile(files[i], opts, sub, i);
          items.push(...normalize(r).items);
        } catch (err) {
          if (err?.name === 'AbortError' || files.length === 1) throw err;
          errors.push({ file: files[i], error: err });
        }
        await yieldToBrowser();
      }
      if (!items.length && errors.length) throw errors[0].error;
      out = { items, errors };
    } else {
      out = { errors: [], ...normalize(await cfg.process(files, opts, c)) };
    }
    if (cfg.summarize && !out.summary) out.summary = cfg.summarize(files, out.items, opts) || undefined;
    c.progress(1);
    return out;
  }

  function mount(root, ctx = {}) {
    const preset = ctx.preset || {};
    const tool = ctx.tool || {};
    const cfg = resolve(preset);
    let files = [];
    let opts = defaults(preset);
    let controller = null;
    let lastResults = null;

    const view = h('div', { class: 'tool-view', style: { display: 'grid', gap: '20px' } });
    clear(root).append(view);

    const api = {
      get files() { return files.slice(); },
      get options() { return { ...opts }; },
      setOption: (id, v) => { form.set(id, v); opts = form.values(); refreshRunState(); },
      setNote: (t) => { runNote.textContent = t || ''; },
      extra: null,
      root,
      tool,
      preset,
    };

    const dz = dropzone({
      accept: cfg.accept, multiple: cfg.multiple, title: cfg.dropTitle, hint: cfg.dropHint, buttonLabel: cfg.buttonLabel, icon: cfg.dropIcon,
      onFiles: (added) => {
        if (cfg.multiple) list.set([...files, ...added].slice(0, cfg.maxFiles));
        else list.set(added.slice(0, 1));
        if (cfg.multiple && files.length >= cfg.maxFiles) toast(`This tool takes up to ${cfg.maxFiles} files at a time.`);
        if (cfg.autoRun && files.length >= cfg.minFiles) run();
      },
    });
    const list = fileList({
      reorder: cfg.reorder, describe: cfg.describe, thumbs: cfg.thumbs,
      onChange: (f) => {
        files = f;
        if (!files.length) return showEmpty();
        showReady();
        cfg.onFilesChange?.(files, api);
      },
    });
    const form = optionsForm(cfg.options, opts, (v, changedId) => {
      opts = v;
      cfg.onOptionsChange?.(v, api, changedId);
      refreshRunState();
    });
    const extra = h('div', { class: 'tool-extra', style: { display: 'grid', gap: '14px' } });
    api.extra = extra;
    const runBtn = button(cfg.action || 'Start', { variant: 'primary', size: 'lg', icon: cfg.actionIcon || 'zap', onClick: () => run() });
    const runNote = h('p', { class: 'run-note' });
    const count = h('p', { class: 'count' });
    const changeBtn = cfg.multiple
      ? button('Add more', { variant: 'ghost', size: 'sm', icon: 'plus', onClick: () => dz.open() })
      : button('Choose a different file', { variant: 'ghost', size: 'sm', icon: 'refresh', onClick: () => dz.open() });
    const clearBtn = button(cfg.multiple ? 'Clear all' : 'Remove', { variant: 'quiet', size: 'sm', icon: 'trash', onClick: () => list.set([]) });
    const filesBar = h('div', { class: 'files-bar' }, count, h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } }, changeBtn, clearBtn));
    const optsBlock = cfg.options.length ? h('div', { style: { display: 'grid', gap: '12px' } }, cfg.optionsTitle !== false && h('p', { class: 'opts-title' }, cfg.optionsTitle || 'Options'), form.el) : null;
    const readyView = h('div', { style: { display: 'grid', gap: '18px' } }, filesBar, list.el, extra, optsBlock, h('div', { class: 'run-bar' }, runBtn, runNote));

    function validate() {
      if (files.length < cfg.minFiles) return cfg.minFiles === 1 ? 'Add a file first.' : `Add at least ${cfg.minFiles} files.`;
      return cfg.validate?.(files, opts) || null;
    }
    function refreshRunState() {
      const problem = validate();
      runBtn.disabled = !!problem;
      runNote.textContent = problem || cfg.runNote?.(files, opts) || '';
    }
    function showEmpty() {
      lastResults?.cleanup?.();
      clear(view).append(dz);
      cfg.renderEmpty?.(view, api);
    }
    function showReady() {
      lastResults?.cleanup?.();
      count.textContent = cfg.multiple ? `${files.length} file${files.length === 1 ? '' : 's'} added` : '';
      dz.hidden = true;
      clear(view).append(readyView, dz);
      clear(extra);
      cfg.renderExtra?.(extra, api);
      refreshRunState();
    }
    async function run() {
      const problem = validate();
      if (problem) return toast(problem, 'error');
      controller = new AbortController();
      const prog = progressBar(cfg.workingLabel || 'Working on it');
      prog.set(cfg.indeterminate ? null : 0);
      const cancel = button('Cancel', { variant: 'ghost', size: 'sm', icon: 'x', onClick: () => controller.abort() });
      clear(view).append(h('div', { style: { display: 'grid', gap: '14px' } }, prog.el, h('div', null, cancel), cfg.workingNote ? h('p', { class: 'small muted' }, cfg.workingNote) : null));
      try {
        const out = await process(files, opts, { preset, tool, signal: controller.signal, progress: prog.set });
        showDone(out);
      } catch (err) {
        if (err?.name === 'AbortError') return showReady();
        console.error(err);
        clear(view).append(notice('error', friendlyError(err)), h('div', { class: 'result-actions' },
          button('Try again', { variant: 'purple', icon: 'refresh', onClick: showReady }),
          button('Start over', { variant: 'ghost', onClick: () => list.set([]) })));
      } finally {
        controller = null;
      }
    }
    function showDone(out) {
      const again = button('Start again', { variant: 'ghost', icon: 'refresh', onClick: () => list.set([]) });
      const back = button('Change options', { variant: 'ghost', icon: 'sliders', onClick: showReady });
      const actions = [back, again];
      lastResults = results(out.items, { title: cfg.resultTitle?.(out.items), summary: out.summary, zipName: cfg.zipName || `${tool.slug || 'acts-tools'}.zip`, actions: cfg.options.length || cfg.multiple ? actions : [again] });
      clear(view).append(lastResults);
      if (out.errors?.length) {
        lastResults.prepend(notice('warn', `We couldn't process ${out.errors.length} file${out.errors.length === 1 ? '' : 's'}:`,
          h('ul', { style: { margin: '4px 0 0', paddingLeft: '18px' } }, out.errors.map((e) => h('li', null, `${e.file.name}: ${friendlyError(e.error)}`)))));
      }
      cfg.onDone?.(out, lastResults, api);
    }

    showEmpty();
    return api;
  }

  return { kind: 'file', resolve, defaults, process, mount };
}

/** Wraps the caller's ctx with progress/abort helpers. */
export function createProcessContext(ctx = {}) {
  const signal = ctx.signal;
  const progress = typeof ctx.progress === 'function' ? ctx.progress : () => {};
  const throwIfAborted = () => {
    if (signal?.aborted) {
      const e = new Error('Cancelled');
      e.name = 'AbortError';
      throw e;
    }
  };
  return {
    ...ctx,
    signal,
    progress,
    throwIfAborted,
    /** await ctx.tick() inside long loops: keeps the page responsive and honours Cancel. */
    async tick() {
      throwIfAborted();
      await yieldToBrowser();
    },
  };
}

/** Accepts result | result[] | { items|results, summary }. Text results get a Blob only if asked. */
export function normalize(r) {
  if (!r) return { items: [] };
  if (Array.isArray(r)) return { items: r.filter(Boolean) };
  if (r.items || r.results) return { ...r, items: (r.items || r.results).filter(Boolean) };
  return { items: [r] };
}
