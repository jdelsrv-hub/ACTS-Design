import { test, eq, ok } from './harness.js';
import { createPagedPanel } from '../js/panels.js';
import { dotLook } from '../js/pager.js';

const words = n => Array.from({length: n}, (_, i) => `word${i}`);

// Mounts a panel in a fixed-size box with the app's real styles, runs fn, then removes both.
async function withPanel(fn, width = 600, options = {}) {
  const link = Object.assign(document.createElement('link'), {rel: 'stylesheet', href: '../styles.css'});
  await new Promise((resolve, reject) => { link.onload = resolve; link.onerror = reject; document.head.append(link); });
  const root = document.createElement('div');
  root.style.cssText = `position: fixed; top: 0; left: 0; width: ${width}px; height: 400px; background: var(--bg)`;
  document.body.append(root);
  const live = document.createElement('div');
  const picked = [];
  const panel = createPagedPanel(root, {label: 'Favourite words', onPick: item => picked.push(item), live, ...options});
  const q = sel => [...root.querySelectorAll(sel)];
  const ui = {
    panel, root, live, picked,
    items: () => q('.paged-grid button').map(b => b.textContent),
    nav: root.querySelector('.paged-nav'),
    prev: root.querySelector('[aria-label="Previous"]'),
    next: root.querySelector('[aria-label="Next"]'),
    dots: () => q('.dots button'),
    // Page size, found by filling more items than one page holds.
    size() { panel.set(words(100), {resetPage: true}); return ui.items().length; },
  };
  try { await fn(ui); } finally { root.remove(); link.remove(); }
}

// Pointer 1 is the primary (first) finger.
const pointer = (el, type, x, y, pointerId = 1) => el.dispatchEvent(new PointerEvent(type, {bubbles: true, clientX: x, clientY: y, pointerId, isPrimary: pointerId === 1}));
const first = ui => ui.root.querySelector('.paged-grid button');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

test('renders items in pages with nav hidden for one page', () => withPanel(ui => {
  ui.panel.set(['a', 'b']);
  eq(ui.items(), ['a', 'b']);
  ok(ui.nav.hidden, 'nav hidden for one page');
  const n = ui.size();
  ok(n >= 2 && n < 100, `page size ${n}`);
  eq(ui.items(), words(n));
  ok(!ui.nav.hidden, 'nav shown for many pages');
  eq(ui.dots().length, Math.min(7, Math.ceil(100 / n)));
  ok(ui.root.querySelector('.paged-grid button').offsetHeight >= 56, 'item at least 56 px');
}));

test('a narrow panel with 10 pages keeps the nav on one row with at most 4 dots', () => withPanel(ui => {
  const n = ui.size();
  ui.panel.set(words(10 * n), {resetPage: true});
  const grid = ui.root.querySelector('.paged-grid');
  ok(ui.dots().length >= 3 && ui.dots().length <= 4, `${ui.dots().length} dots`);
  eq(ui.nav.offsetHeight, ui.next.offsetHeight, 'nav is one row');
  ok(grid.scrollHeight <= grid.clientHeight, `grid overflows: ${grid.scrollHeight} > ${grid.clientHeight}`);
  ui.next.click(); ui.next.click();
  eq(ui.dots().length, Math.min(4, ui.dots().length), 'dot count stays within the width');
  eq(ui.nav.offsetHeight, ui.next.offsetHeight, 'still one row after paging');
}, 300));

test('long labels wrap and are never cut off', () => withPanel(ui => {
  ui.panel.set(['a', 'extraordinarilylongwordwithoutanyspaces '.repeat(3), ...words(30)]);
  const b = ui.root.querySelectorAll('.paged-grid button')[1];
  ok(b.offsetHeight > 56 && b.scrollHeight <= b.clientHeight, `label cut off: ${b.scrollHeight} > ${b.clientHeight}`);
}, 300));

test('next, previous and dots reach the same pages and stop at the ends', () => withPanel(ui => {
  const n = ui.size();
  ui.panel.set(words(2 * n + 1), {resetPage: true});
  ok(ui.prev.disabled, 'previous disabled on first page');
  ui.next.click(); eq(ui.panel.page, 1); eq(ui.items()[0], `word${n}`);
  ui.next.click(); eq(ui.panel.page, 2); eq(ui.items(), [`word${2 * n}`]);
  ok(ui.next.disabled, 'next disabled on last page');
  ui.next.click(); eq(ui.panel.page, 2, 'no wrapping');
  ui.prev.click(); ui.prev.click(); eq(ui.panel.page, 0); ok(ui.prev.disabled);
  ui.dots()[2].click(); eq(ui.panel.page, 2); eq(ui.items(), [`word${2 * n}`]);
  ui.dots()[1].click(); eq(ui.items()[0], `word${n}`);
}));

test('current dot is largest and others fade', () => withPanel(ui => {
  const n = ui.size();
  ui.panel.set(words(5 * n), {resetPage: true});
  ui.dots()[2].click();
  ui.dots().forEach((dot, i) => {
    const look = dotLook(Math.abs(i - 2)), span = dot.firstElementChild;
    eq(dot.getAttribute('aria-label'), `Go to page ${i + 1} of 5`);
    eq(dot.getAttribute('aria-current'), i === 2 ? 'page' : null);
    eq([span.style.width, span.style.height, span.style.opacity], [`${look.size}px`, `${look.size}px`, String(look.opacity)], `dot ${i}`);
    ok(dot.offsetWidth >= 48 && dot.offsetHeight >= 48, 'dot hit area at least 48 px');
  });
}));

test('clamps after set() with fewer items', () => withPanel(ui => {
  const n = ui.size();
  ui.panel.set(words(2 * n + 1), {resetPage: true});
  ui.dots()[2].click(); eq(ui.panel.page, 2);
  ui.panel.set(words(2 * n));
  eq(ui.panel.page, 1);
  eq(ui.items().length, n);
}));

test('a horizontal pointer swipe over an item changes page and does not call onPick', () => withPanel(ui => {
  ui.size();
  const b = ui.root.querySelector('.paged-grid button');
  pointer(b, 'pointerdown', 300, 100);
  pointer(b, 'pointerup', 240, 110);
  eq(ui.panel.page, 1, 'left swipe goes forward');
  ui.root.querySelector('.paged-grid button').click();
  eq(ui.picked, [], 'the click after a swipe is ignored');
  ui.root.querySelector('.paged-grid button').click();
  eq(ui.picked.length, 1, 'only one click is ignored');
  const c = ui.root.querySelector('.paged-grid button');
  pointer(c, 'pointerdown', 200, 100);
  pointer(c, 'pointerup', 260, 100);
  eq(ui.panel.page, 0, 'right swipe goes back');
}));

test('a short vertical movement then click does call onPick', () => withPanel(ui => {
  ui.size();
  const b = ui.root.querySelector('.paged-grid button');
  pointer(b, 'pointerdown', 100, 100);
  pointer(b, 'pointerup', 130, 150);
  b.click();
  eq(ui.panel.page, 0);
  eq(ui.picked, ['word0']);
}));

test('a second finger does not swipe or swallow the first finger tap', () => withPanel(ui => {
  ui.size();
  const b = first(ui);
  pointer(b, 'pointerdown', 300, 100);
  pointer(b, 'pointerdown', 100, 100, 2);
  pointer(b, 'pointerup', 300, 100, 2);
  pointer(b, 'pointerup', 302, 101);
  eq(ui.panel.page, 0);
  b.click();
  eq(ui.picked, ['word0']);
}));

test('a cancelled gesture changes nothing and selects nothing', () => withPanel(ui => {
  ui.size();
  const b = first(ui);
  pointer(b, 'pointerdown', 300, 100);
  pointer(b, 'pointercancel', 300, 100);
  pointer(b, 'pointerup', 200, 100);
  eq(ui.panel.page, 0);
  eq(ui.picked, []);
}));

test('a swipe with no click does not swallow a later keyboard click', () => withPanel(async ui => {
  ui.size();
  pointer(first(ui), 'pointerdown', 300, 100);
  pointer(first(ui), 'pointerup', 240, 100);
  eq(ui.panel.page, 1);
  await wait(400);
  first(ui).click();
  eq(ui.picked.length, 1);
}));

test('a diagonal movement that is more vertical than sideways is a tap', () => withPanel(ui => {
  ui.size();
  const b = first(ui);
  pointer(b, 'pointerdown', 100, 100);
  pointer(b, 'pointerup', 160, 190);
  b.click();
  eq(ui.panel.page, 0);
  eq(ui.picked, ['word0']);
}));

test('focus moves to the first item when the nav hides under it', () => withPanel(ui => {
  ui.size();
  ui.dots()[1].focus();
  ui.panel.set(['a', 'b']);
  ok(ui.nav.hidden);
  ok(document.activeElement === first(ui), 'focus on the first item');
}));

test('announces the page in the live region', () => withPanel(ui => {
  const n = ui.size();
  ui.panel.set(words(2 * n + 1), {resetPage: true});
  const writes = [];
  Object.defineProperty(ui.live, 'textContent', {set: v => writes.push(v), get: () => writes.at(-1)});
  ui.next.click();
  eq(ui.live.textContent, 'Favourite words, page 2 of 3');
  eq(writes, ['', 'Favourite words, page 2 of 3'], 'cleared first so a repeat is announced again');
}));

const tap = el => el.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, detail: 1}));

test('a quick tap picks when there is no minimum press', () => withPanel(ui => {
  ui.panel.set(['a', 'b']);
  pointer(first(ui), 'pointerdown', 100, 100);
  pointer(first(ui), 'pointerup', 100, 100);
  tap(first(ui));
  eq(ui.picked, ['a']);
}));

test('tap safety ignores a press shorter than minPress, but never a keyboard or switch click', () => withPanel(async ui => {
  ui.panel.set(['a', 'b']);
  const b = first(ui);
  pointer(b, 'pointerdown', 100, 100);
  pointer(b, 'pointerup', 100, 100);
  tap(b);
  eq(ui.picked, [], 'a quick tap is ignored');
  b.click();
  eq(ui.picked, ['a'], 'a click with no pointer (detail 0) counts');
  pointer(b, 'pointerdown', 100, 100);
  await wait(320);
  pointer(b, 'pointerup', 100, 100);
  tap(b);
  eq(ui.picked, ['a', 'a'], 'a press held long enough counts');
}, 600, {minPress: () => 300}));

test('a pick that redraws the list moves focus to the first item', () => {
  let panel;
  return withPanel(ui => {
    panel = ui.panel;
    panel.set(['a', 'b', 'c']);
    const b = ui.root.querySelectorAll('.paged-grid button')[1];
    b.focus();
    b.click();
    ok(document.activeElement === first(ui) && first(ui).textContent === 'x', 'focus on the first new item');
  }, 600, {onPick: () => panel.set(['x', 'y'])});
});

test('the panel is a named group that takes focus when it has no items', () => withPanel(ui => {
  eq([ui.root.getAttribute('role'), ui.root.getAttribute('aria-label'), ui.root.tabIndex], ['group', 'Favourite words', -1]);
  ui.panel.set([]);
  ui.panel.focus();
  ok(document.activeElement === ui.root, 'focus on the panel');
  ui.panel.set(['a']);
  ui.panel.focus();
  ok(document.activeElement === first(ui), 'focus on the first item');
}));
