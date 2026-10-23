// One-page app: / lists every tool, /<tool-slug> opens a tool (its own URL, so search engines can index it),
// #/<category> filters the list. Every path gets index.html: Cloudflare Pages' single-page fallback, copied by
// dev_server.py. Old #/<tool-slug> links still open the tool.
import { h, icon, clear, $ } from './core/dom.js';
import { notice, button } from './core/ui.js';
import { CATEGORIES, loadTools } from './registry.js';

const main = $('#main');
const TITLE = document.title;
const DESCRIPTION = $('meta[name="description"]').content;
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const RUNS_ON = {
  device: ['shield-check', 'Runs on your device. Nothing is uploaded'],
  model: ['cpu', 'AI runs on your device. The model downloads the first time'],
  server: ['sparkles', 'Uses our AI service to write the result'],
};

let tools = [];
loadTools().then((list) => {
  tools = list;
  route();
});
// Only #/ hashes are routes, so the skip link (#main) doesn't reload the page's tool.
addEventListener('hashchange', () => { if (!location.hash || location.hash.startsWith('#/')) route(); });

function route() {
  const hash = location.hash.startsWith('#/') ? location.hash.slice(2) : '';
  const key = decodeURIComponent(hash || location.pathname.split('/').pop().replace(/\.html$/, '').replace(/^index$/, ''));
  const tool = tools.find((t) => t.slug === key);
  scrollTo(0, 0);
  if (tool) showTool(tool);
  else showHome(key);
}

// Search engines run the script, so they read these. No canonical or robots tag in index.html: one there
// would point every tool page at the home page before the script runs.
function headTag(tag, attr, value) {
  return document.head.querySelector(`${tag}[${attr}="${value}"]`) || document.head.appendChild(h(tag, { [attr]: value }));
}

function setHead(title, description, path) {
  document.title = title;
  headTag('meta', 'name', 'description').content = description;
  headTag('link', 'rel', 'canonical').href = new URL(path, location.href).href;
}

const card = (t) => h('a', { class: 'tool-card', href: t.slug },
  h('span', { class: 'ti' }, icon(t.icon || 'file')),
  h('span', { class: 'tn' }, t.name),
  h('span', { class: 'ts' }, t.summary),
  t.runsOn === 'server' && h('span', { class: 'tb' }, h('span', { class: 'badge badge-ai' }, 'AI')));

function showHome(catKey) {
  setHead(TITLE, DESCRIPTION, './');
  let cat = CATEGORIES.some((c) => c.slug === catKey) ? catKey : 'all';
  // An unknown path still shows the list, so keep it out of search results.
  if (catKey && cat === 'all') headTag('meta', 'name', 'robots').content = 'noindex';
  const all = [{ slug: 'all', name: 'All' }, ...CATEGORIES];
  const search = h('input', { type: 'search', placeholder: `Search ${tools.length} free tools`, 'aria-label': 'Search tools', autocomplete: 'off' });
  const chips = all.map((c) => h('button', { class: 'chip', type: 'button', onclick: () => {
    cat = c.slug;
    history.replaceState(null, '', c.slug === 'all' ? './' : `#/${c.slug}`);
    paint();
  } }, c.icon && icon(c.icon), c.name));
  const cards = tools.map((t) => [t, card(t)]);
  const empty = h('p', { class: 'no-results', hidden: true }, 'No tools match that yet. Try a simpler word, like "pdf" or "resize".');

  function paint() {
    chips.forEach((b, i) => b.setAttribute('aria-pressed', String(all[i].slug === cat)));
    const words = norm(search.value).split(' ').filter(Boolean);
    let shown = 0;
    for (const [t, el] of cards) {
      const hay = norm(`${t.name} ${t.summary} ${(t.keywords || []).join(' ')}`);
      el.hidden = !((cat === 'all' || t.cat === cat) && words.every((w) => hay.includes(w)));
      if (!el.hidden) shown++;
    }
    empty.hidden = shown > 0;
  }
  search.addEventListener('input', paint);

  clear(main).append(
    h('section', { class: 'hero' }, h('div', { class: 'wrap' },
      h('span', { class: 'pill' }, h('span', { class: 'dot', 'aria-hidden': 'true' }), 'Free · No sign-up · No watermarks'),
      h('h1', null, 'Free online tools, ', h('span', { class: 'soft' }, 'sorted.')),
      h('p', { class: 'lead' }, 'PDF, image, video and AI writing tools from All Creative Technology Solutions (acTS). Most run right in your browser, so your files stay on your device.'),
      h('div', { class: 'search hero-search' }, icon('search'), search),
      h('div', { class: 'chips' }, chips))),
    h('section', { class: 'section' }, h('div', { class: 'wrap' }, h('div', { class: 'tool-grid' }, cards.map(([, el]) => el)), empty)));
  paint();
}

async function showTool(t) {
  setHead(`${t.name} · Free online tool · acTS Tools`,
    `${t.summary} Free, no sign-up${t.runsOn === 'server' ? '.' : ', and your files stay on your device.'}`, t.slug);
  const c = CATEGORIES.find((x) => x.slug === t.cat);
  const [ic, label] = RUNS_ON[t.runsOn] || RUNS_ON.device;
  const root = h('section', { class: 'tool-app', id: 'tool-root', 'aria-label': t.name },
    h('div', { class: 'tool-loading' }, h('span', { class: 'spinner' }), 'Loading the tool'));
  clear(main).append(h('div', { class: 'wrap', style: { paddingBottom: '56px' } },
    h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' }, h('a', { href: './' }, 'All tools'), c && h('span', { class: 'sep' }, '/'), c && h('a', { href: `./#/${c.slug}` }, c.name)),
    h('header', { class: 'tool-head' },
      h('span', { class: 'tool-ico' }, icon(t.icon || 'file')),
      h('div', null, h('h1', null, t.name), h('p', { class: 'lead' }, t.summary), h('ul', { class: 'tool-badges' }, h('li', { class: 'badge' }, icon(ic), label)))),
    root));
  try {
    const mod = await import(`./tools/${t.module}`);
    if (!root.isConnected) return;
    await mod.default.mount(root, { tool: t, preset: t.preset || {} });
    root.dataset.mounted = 'true';
  } catch (err) {
    console.error(`[acTS tools] ${t.slug} failed to load`, err);
    root.dataset.mountError = String(err?.message || err);
    clear(root).append(notice('error', "This tool didn't load properly. Refresh the page to try again."),
      h('div', null, button('Refresh', { variant: 'purple', icon: 'refresh', onClick: () => location.reload() })));
  }
}
