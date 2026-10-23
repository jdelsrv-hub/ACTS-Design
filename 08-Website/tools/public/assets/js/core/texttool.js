// textTool(): paste text in, get text (and/or stats) out. Used by text tools, converters and generators.
//
//   export default textTool({
//     input: { label: 'Your text', placeholder: 'Paste or type here' },  // or input: false for generators
//     options: [{ id: 'mode', type: 'segmented', label: 'Change to', choices: [...] }],
//     live: true,                         // update as you type (default). false = show an action button
//     action: 'Convert',                  // button label when live is false
//     transform(text, options, ctx) {     // may be async
//       return 'result'  or  { text, stats: [{ label, value }], error, filename }
//     },
//     output: { label: 'Result', filename: 'result.txt', mono: false },   // or output: false (stats only)
//   });
import { h, clear, debounce } from './dom.js';
import { optionsForm, optionDefaults, textOutput, statGrid, notice, button, friendlyError, copyText } from './ui.js';
import { readText } from './files.js';

export function textTool(configOrFactory) {
  const resolve = (preset = {}) => {
    const cfg = typeof configOrFactory === 'function' ? configOrFactory(preset) : configOrFactory;
    return { live: true, options: [], input: {}, output: {}, ...cfg };
  };
  const defaults = (preset = {}) => optionDefaults(resolve(preset).options, preset.options || {});

  /** Run without UI (tests). Always resolves to { text, stats, error, filename }. */
  async function transform(text, options = {}, ctx = {}) {
    const cfg = resolve(ctx.preset || {});
    const r = await cfg.transform(text ?? '', { ...defaults(ctx.preset || {}), ...options }, ctx);
    return typeof r === 'string' ? { text: r } : r || { text: '' };
  }

  function mount(root, ctx = {}) {
    const preset = ctx.preset || {};
    const cfg = resolve(preset);
    let opts = defaults(preset);
    clear(root);

    const inputCfg = cfg.input === false ? null : { label: 'Your text', placeholder: 'Paste or type your text here', rows: 12, ...cfg.input };
    const outputCfg = cfg.output === false ? null : { label: 'Result', filename: 'result.txt', rows: 12, ...cfg.output };

    let ta = null;
    let inputPane = null;
    if (inputCfg) {
      ta = h('textarea', { id: 'tt-input', rows: inputCfg.rows, placeholder: inputCfg.placeholder, class: inputCfg.mono ? 'mono' : null, spellcheck: inputCfg.spellcheck ?? 'true' });
      if (inputCfg.value) ta.value = inputCfg.value;
      const fileInput = h('input', { type: 'file', class: 'visually-hidden', accept: inputCfg.accept || '.txt,.md,.csv,.json,.xml,.html,.srt,.vtt,text/*' });
      fileInput.addEventListener('change', async () => {
        const f = fileInput.files[0];
        if (f) {
          ta.value = await readText(f);
          fileInput.value = '';
          update();
        }
      });
      inputPane = h('div', { class: 'pane' },
        h('div', { class: 'pane-head' },
          h('label', { class: 'field-label', for: 'tt-input' }, inputCfg.label),
          h('div', { class: 'pane-tools' },
            inputCfg.sample && button('Try an example', { variant: 'quiet', size: 'sm', icon: 'sparkles', onClick: () => { ta.value = inputCfg.sample; update(); } }),
            inputCfg.file !== false && button('Open file', { variant: 'quiet', size: 'sm', icon: 'file-plus', onClick: () => fileInput.click() }),
            button('Clear', { variant: 'quiet', size: 'sm', icon: 'x', onClick: () => { ta.value = ''; update(); ta.focus(); } }),
            fileInput)),
        ta);
    }

    const out = outputCfg ? textOutput({ label: outputCfg.label, filename: outputCfg.filename, rows: outputCfg.rows, mono: outputCfg.mono }) : null;
    const stats = statGrid([]);
    stats.el.hidden = true;
    const msg = h('div');
    const form = optionsForm(cfg.options, opts, (v) => {
      opts = v;
      if (cfg.live) update();
    });

    const panes = h('div', { class: ['text-panes', (!inputPane || !out || cfg.layout === 'stack') && 'is-single'] }, inputPane, out?.el);
    const runBtn = !cfg.live ? button(cfg.action || 'Go', { variant: 'primary', size: 'lg', icon: cfg.actionIcon || 'zap', onClick: () => update(true) }) : null;
    const extraActions = (cfg.actions || []).map((a) => button(a.label, { variant: 'ghost', icon: a.icon, onClick: () => a.onClick({ input: ta?.value, output: out?.get(), options: opts, update }) }));

    root.append(
      cfg.options.length ? h('div', { style: { display: 'grid', gap: '12px' } }, cfg.optionsTitle && h('p', { class: 'opts-title' }, cfg.optionsTitle), form.el) : null,
      cfg.statsFirst ? stats.el : null,
      panes,
      !cfg.statsFirst ? stats.el : null,
      msg,
      runBtn || extraActions.length ? h('div', { class: 'run-bar' }, runBtn, ...extraActions) : null,
    );

    let seq = 0;
    async function update(force = false) {
      if (!cfg.live && !force) return;
      const mine = ++seq;
      try {
        const r = await transform(ta ? ta.value : '', opts, { preset, tool: ctx.tool });
        if (mine !== seq) return;
        clear(msg);
        if (r.error) msg.append(notice('warn', r.error));
        if (out) {
          out.set(r.text ?? '');
          if (r.filename) out.filename = r.filename;
        }
        if (r.stats) {
          stats.set(r.stats);
          stats.el.hidden = false;
        }
        if (r.notice) msg.append(notice(r.notice.kind || 'info', r.notice.text));
      } catch (err) {
        if (mine !== seq) return;
        clear(msg).append(notice('error', friendlyError(err)));
      }
    }
    const debounced = debounce(() => update(), cfg.debounce ?? 120);
    ta?.addEventListener('input', debounced);
    if (cfg.live) update();
    return { update, copy: () => out && copyText(out.get()) };
  }

  return { kind: 'text', resolve, defaults, transform, mount };
}
