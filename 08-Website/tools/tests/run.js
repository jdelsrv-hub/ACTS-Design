// Test runner for acTS Tools: http://localhost:8787/tests/ (python 08-Website/tools/dev_server.py).
//
// Every entry loadTools() returns gets:
//   Smoke     ../public/index.html#/<slug> opens in an iframe and #tool-root reaches data-mounted="true"
//             with no console.error, uncaught error or unhandled rejection on that page.
//   Function  specs/<family>.js default-exports { '<slug>': async (mod, fx, t) => { ...checks } }.
//             mod: the tool's module. fx: fixtures.js. t: everything in check.js, plus t.tool, t.preset,
//             t.process(files, options) and t.transform(text, options), which pass the entry's preset.
//             A string instead of a function is a deliberate skip (the string says why).
//             A slug with no entry shows "no function test yet".
// Failures run once more to rule out flaky timing. Results: the tables on the page, window.__results,
// window.__fixtures and window.__summary. window.__done is true when the run has finished.
//
// URL options: ?only=merge-pdf,image (slugs or families) · ?fixtures=0 · ?smoke=0 · ?func=0
import { FAMILIES, loadTools } from '../public/assets/js/registry.js';
import * as fx from './fixtures.js';
import * as check from './check.js';

const SMOKE_MS = 20000; // page load until data-mounted
const SETTLE_MS = 300; // keep listening for errors after the tool mounts
const FUNC_MS = 120000; // one function test
const MODEL_FUNC_MS = 600000; // one function test of a runsOn: 'model' tool (the first run downloads the AI model, up to ~100 MB)
const FIXTURE_MS = 60000; // one fixture check

const params = new URLSearchParams(location.search);
const only = (params.get('only') || '').split(',').map((s) => s.trim()).filter(Boolean);
const on = (name) => params.get(name) !== '0';

const $ = (sel) => document.querySelector(sel);
const familyOf = (tool) => tool.module.split('/')[0];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isFail = (r) => r.smoke === 'fail' || r.func === 'fail';
const errText = (e) => (e && typeof e === 'object' && 'message' in e
  ? (e.name && e.name !== 'Error' ? `${e.name}: ${e.message}` : e.message)
  : String(e));

window.__results = [];
window.__fixtures = [];
window.__summary = [];
window.__done = false;
const started = performance.now();

main()
  .catch((err) => {
    banner(`The runner stopped: ${errText(err)}`);
    status('Stopped early. See the message above.');
    console.error(err);
  })
  .finally(() => {
    window.__done = true;
  });

async function main() {
  await Promise.all([checkImportMap(), checkFrames()]);
  if (on('fixtures')) await runFixtures();

  // A family whose index.js is broken drops out of loadTools(), so report it here.
  for (const { family, error } of await checkFamilies()) {
    if (error) addResult({ slug: `${family} tool list`, family, smoke: 'fail', func: 'skip', error: `tools/${family}/index.js didn't load, so its tools are missing: ${error}` });
  }
  let all;
  try {
    all = await loadTools();
  } catch (err) {
    throw new Error(`loadTools() failed, so the site can't list its tools: ${errText(err)}`);
  }
  const slugs = new Set(all.map((t) => t.slug));

  const { specs, broken } = await loadSpecs();
  for (const [family, error] of broken) addResult({ slug: `specs/${family}.js`, family, smoke: 'skip', func: 'fail', error: `The spec file didn't load: ${error}` });
  for (const [family, list] of Object.entries(specs)) {
    for (const slug of Object.keys(list)) if (!slugs.has(slug)) banner(`specs/${family}.js has a test for "${slug}", but no tool has that slug.`);
  }
  const specFor = (slug) => Object.values(specs).find((list) => slug in list)?.[slug];

  const tools = all.filter((t) => !only.length || only.includes(t.slug) || only.includes(familyOf(t)));
  for (const [i, tool] of tools.entries()) {
    status(`Testing ${i + 1} of ${tools.length}: ${tool.slug}`);
    const r = addResult({ slug: tool.slug, family: familyOf(tool), smoke: 'running', func: 'running' });
    update(r, await runTool(tool, specFor(tool.slug)));
  }

  const failed = window.__results.filter((r) => isFail(r) && slugs.has(r.slug));
  for (const [i, r] of failed.entries()) {
    status(`Running failure ${i + 1} of ${failed.length} again: ${r.slug}`);
    const again = await runTool(all.find((t) => t.slug === r.slug), specFor(r.slug));
    update(r, { ...again, retried: isFail(again) ? 'failed again on retry' : `passed on retry, so probably flaky (first run: ${r.error})` });
  }
  summarise(tools.length);
}

async function runTool(tool, spec) {
  const t0 = performance.now();
  const r = { smoke: 'skip', func: 'skip', error: null, note: null };
  const errors = [];
  if (on('smoke')) {
    try {
      await smoke(tool);
      r.smoke = 'pass';
    } catch (err) {
      r.smoke = 'fail';
      errors.push(`Smoke: ${errText(err)}`);
    }
  }
  if (on('func') && typeof spec === 'function') {
    try {
      await withTimeout(runSpec(tool, spec), tool.runsOn === 'model' ? MODEL_FUNC_MS : FUNC_MS, 'The function test');
      r.func = 'pass';
    } catch (err) {
      r.func = 'fail';
      errors.push(`Function: ${errText(err)}`);
    }
  } else if (on('func')) {
    r.note = typeof spec === 'string' ? `Function test skipped: ${spec}` : 'no function test yet';
  }
  r.error = errors.join(' | ') || null;
  r.ms = Math.round(performance.now() - t0);
  return r;
}

async function runSpec(tool, spec) {
  const mod = await import(`../public/assets/js/tools/${tool.module}`);
  const preset = tool.preset || {};
  const ctx = { preset, tool };
  await spec(mod, fx, {
    ...check,
    tool,
    preset,
    process: (files, options = {}) => mod.default.process(files, options, ctx),
    transform: (text, options = {}) => mod.default.transform(text, options, ctx),
  });
}

// ---------- Smoke test ----------

async function smoke(tool) {
  const frame = document.createElement('iframe');
  frame.title = `Smoke test: ${tool.slug}`;
  frame.src = `../public/index.html#/${tool.slug}`;
  $('#stage').replaceChildren(frame);
  const problems = [];
  let reason = null;
  try {
    const win = await whenPageStarts(frame, problems);
    const root = await waitFor(win.document, () => {
      const el = win.document.querySelector('#tool-root');
      if (el && (el.dataset.mounted === 'true' || 'mountError' in el.dataset)) return el;
      if (!el && win.document.querySelector('.hero')) throw new Error('the site showed its home page, so it has no tool with this slug');
      return null;
    }, SMOKE_MS, `#tool-root didn't get data-mounted="true" within ${SMOKE_MS / 1000} s`);
    if ('mountError' in root.dataset) reason = `mount failed: ${root.dataset.mountError}`;
    else await sleep(SETTLE_MS);
  } catch (err) {
    reason = errText(err);
  } finally {
    frame.remove();
  }
  // When mount fails, app.js logs the same error to the console, so don't repeat it.
  const all = reason?.startsWith('mount failed') ? [reason] : [reason, ...problems].filter(Boolean);
  if (all.length) throw new Error(all.join(' | '));
}

// The tool page's window exists once navigation commits, before any of its scripts run. Poll until then
// (MessageChannel, so background-tab timer throttling can't make us late) and install the error hooks.
function whenPageStarts(frame, problems) {
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    const { port1, port2 } = new MessageChannel();
    port1.onmessage = () => {
      const win = frame.contentWindow;
      if (win && win.location.href.includes('/public/')) {
        port1.close();
        hook(win, problems);
        resolve(win);
      } else if (performance.now() - t0 > 10000) {
        port1.close();
        reject(new Error("the tool page didn't start loading within 10 s"));
      } else port2.postMessage(0);
    };
    port2.postMessage(0);
  });
}

function hook(win, problems) {
  const text = (a) => {
    if (typeof a === 'string') return a;
    if (a && typeof a === 'object' && 'message' in a) return errText(a);
    try {
      return JSON.stringify(a);
    } catch {
      return String(a);
    }
  };
  const original = win.console.error;
  win.console.error = (...args) => {
    problems.push(`console.error: ${args.map(text).join(' ')}`);
    original.apply(win.console, args);
  };
  win.addEventListener('error', (e) => problems.push(`${e.message}${e.filename ? ` (${e.filename.split('/').pop()}:${e.lineno})` : ''}`));
  win.addEventListener('unhandledrejection', (e) => problems.push(`Unhandled rejection: ${text(e.reason)}`));
}

/** Resolves with test()'s first truthy value, checked on every DOM change; rejects if test() throws or on timeout. */
function waitFor(doc, test, ms, timeoutMessage) {
  return new Promise((resolve, reject) => {
    const finish = (fn, value) => {
      observer.disconnect();
      clearTimeout(timer);
      fn(value);
    };
    const run = () => {
      try {
        const value = test();
        if (value) finish(resolve, value);
      } catch (err) {
        finish(reject, err);
      }
    };
    const observer = new MutationObserver(run);
    const timer = setTimeout(() => finish(reject, new Error(timeoutMessage)), ms);
    observer.observe(doc, { subtree: true, childList: true, attributes: true });
    run();
  });
}

function withTimeout(promise, ms, what) {
  let timer;
  const late = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} took longer than ${ms / 1000} s`)), ms);
  });
  return Promise.race([promise, late]).finally(() => clearTimeout(timer));
}

// ---------- Setup checks ----------

async function runFixtures() {
  const tbody = $('#fixtures tbody');
  for (const [name, fn] of Object.entries(fx.CHECKS)) {
    status(`Checking fixture: ${name}`);
    const tr = row(tbody, [name, badge('running'), '', '']);
    const r = { name, ok: false, ms: 0, detail: null, error: null };
    const t0 = performance.now();
    try {
      r.detail = (await withTimeout(fn(), FIXTURE_MS, `The ${name} fixture`)) || null;
      r.ok = true;
    } catch (err) {
      r.error = errText(err);
    }
    r.ms = Math.round(performance.now() - t0);
    window.__fixtures.push(r);
    fill(tr, [name, badge(r.ok ? 'pass' : 'fail'), `${r.ms} ms`, r.error || r.detail || '']);
  }
}

async function checkFamilies() {
  const loaded = await Promise.allSettled(FAMILIES.map((f) => import(`../public/assets/js/tools/${f}/index.js`)));
  return FAMILIES.map((family, i) => {
    const l = loaded[i];
    if (l.status === 'rejected') return { family, error: errText(l.reason) };
    return { family, error: Array.isArray(l.value.default) ? null : 'its default export is not a list' };
  });
}

async function loadSpecs() {
  const specs = {};
  const broken = [];
  await Promise.all(FAMILIES.map(async (family) => {
    const url = new URL(`specs/${family}.js`, import.meta.url).href;
    if (!(await fetch(url, { method: 'HEAD' })).ok) return; // no spec file for this family yet
    try {
      specs[family] = (await import(url)).default || {};
    } catch (err) {
      broken.push([family, errText(err)]);
    }
  }));
  return { specs, broken };
}

async function checkImportMap() {
  try {
    const html = await (await fetch('../public/index.html')).text();
    const site = /<script type="importmap">([\s\S]*?)<\/script>/.exec(html)?.[1];
    const ours = $('script[type="importmap"]')?.textContent;
    if (site && JSON.stringify(JSON.parse(site)) !== JSON.stringify(JSON.parse(ours || '{}'))) {
      banner('The import map in tests/index.html differs from public/index.html. Copy it across so media tests load the same libraries as the site.');
    }
  } catch (err) {
    banner(`Couldn't compare the import maps: ${errText(err)}`);
  }
}

async function checkFrames() {
  const ran = await Promise.race([new Promise((r) => requestAnimationFrame(() => r(true))), sleep(1000).then(() => false)]);
  if (!ran) banner('Animation frames are paused (the browser pane is probably hidden). A tool that waits for a frame will time out here, so recheck that kind of failure with the pane visible.');
}

// ---------- Page output ----------

const rowOf = new Map();

function addResult(r) {
  const full = { slug: r.slug, family: r.family, smoke: r.smoke, func: r.func, ms: r.ms ?? 0, error: r.error ?? null, note: r.note ?? null };
  window.__results.push(full);
  rowOf.set(full, row($('#results tbody'), []));
  paint(full);
  return full;
}

function update(r, patch) {
  Object.assign(r, patch);
  paint(r);
}

function paint(r) {
  fill(rowOf.get(r), [r.family, r.slug, badge(r.smoke), badge(r.func), r.ms ? `${r.ms} ms` : '', [r.error, r.note, r.retried].filter(Boolean).join(' · ')]);
}

function summarise(count) {
  const by = {};
  for (const r of window.__results) {
    const s = (by[r.family] ||= { family: r.family, smoke: { pass: 0, fail: 0, skip: 0 }, func: { pass: 0, fail: 0, skip: 0 } });
    s.smoke[r.smoke]++;
    s.func[r.func]++;
  }
  window.__summary = Object.values(by);
  const fmt = (c) => `${c.pass} pass, ${c.fail} fail, ${c.skip} skip`;
  for (const s of window.__summary) row($('#summary tbody'), [s.family, fmt(s.smoke), fmt(s.func)]);
  $('#summary').hidden = !window.__summary.length;
  const failing = window.__results.filter(isFail).length;
  const badFixtures = window.__fixtures.filter((f) => !f.ok).length;
  status(`Finished ${count} tool${count === 1 ? '' : 's'} in ${((performance.now() - started) / 1000).toFixed(1)} s: `
    + `${failing ? `${failing} with failures` : 'no failures'}${badFixtures ? `, ${badFixtures} broken fixture${badFixtures === 1 ? '' : 's'}` : ''}.`);
}

function row(tbody, cells) {
  const tr = tbody.insertRow();
  fill(tr, cells);
  return tr;
}

function fill(tr, cells) {
  tr.replaceChildren(...cells.map((c) => {
    const td = document.createElement('td');
    td.append(c ?? '');
    return td;
  }));
}

function badge(state) {
  const span = document.createElement('span');
  span.className = `st ${state}`;
  span.textContent = state;
  return span;
}

function status(text) {
  $('#status').textContent = text;
}

function banner(text) {
  const p = document.createElement('p');
  p.className = 'banner';
  p.textContent = text;
  $('#banners').append(p);
}
