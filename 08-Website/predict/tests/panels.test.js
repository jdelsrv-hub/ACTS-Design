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

const LONG = 'a long phrase that wraps over several lines in a narrow column of buttons';
const fits = grid => grid.scrollHeight <= grid.clientHeight + 1;

test('pages are sized from the tallest item, so no item on a page is out of view', () => withPanel(ui => {
  const list = words(20);
  list.splice(5, 0, LONG);
  ui.panel.set(list);
  const grid = ui.root.querySelector('.paged-grid');
  let pages = 0;
  do {
    pages++;
    ok(ui.items().length >= 2 || ui.next.disabled, `page ${ui.panel.page} has ${ui.items().length} items`);
    ok(fits(grid), `page ${ui.panel.page} hides ${grid.scrollHeight - grid.clientHeight} px`);
    if (ui.next.disabled || ui.nav.hidden) break;
    ui.next.click();
  } while (pages < 30);
  ok(ui.root.querySelector('.more').hidden, 'no more-below cue when everything fits');
}, 300));

test('a more-below cue shows when the grid is forced to overflow, and goes when it fits', () => withPanel(ui => {
  const grid = ui.root.querySelector('.paged-grid'), cue = ui.root.querySelector('.more');
  ui.panel.set(['a', LONG]);
  ok(cue.hidden, 'hidden while it fits');
  grid.style.maxHeight = '60px';
  ui.panel.refresh(true); // the grid's room changed without the panel's size changing
  ok(!fits(grid), 'forced to overflow');
  ok(!cue.hidden && ui.root.classList.contains('overflowing'), 'cue shown');
  eq(cue.getAttribute('aria-hidden'), 'true');
  grid.style.maxHeight = '';
  ui.panel.refresh(true); // the grid's room changed without the panel's size changing
  ok(cue.hidden && !ui.root.classList.contains('overflowing'), 'cue gone');
}, 300));

test('the more-below cue cannot stick: its own border is not counted when measuring', () => withPanel(ui => {
  const grid = ui.root.querySelector('.paged-grid'), cue = ui.root.querySelector('.more');
  ui.panel.set(['a']);
  const exact = grid.firstElementChild.offsetHeight; // one row, so this is the content height
  grid.style.boxSizing = 'border-box'; // so the 6 px border takes room from the content
  grid.style.maxHeight = '30px';
  ui.panel.refresh(true); // the grid's room changed without the panel's size changing
  ok(!cue.hidden && ui.root.classList.contains('overflowing'), 'cue shown while forced to overflow');
  grid.style.maxHeight = `${exact}px`; // fits exactly, but only while the cue's 6 px border is off
  ui.panel.refresh(true); // the grid's room changed without the panel's size changing
  ok(cue.hidden && !ui.root.classList.contains('overflowing'), 'cue gone when it fits');
}, 300));

test('with a minimum press, an item shows it is armed once held that long', () => withPanel(async ui => {
  ui.panel.set(['a', 'b']);
  const b = first(ui);
  pointer(b, 'pointerdown', 100, 100);
  ok(!b.classList.contains('armed'), 'not armed at once');
  await wait(80);
  ok(b.classList.contains('armed'), 'armed after the minimum press');
  pointer(b, 'pointerup', 100, 100);
  ok(!b.classList.contains('armed'), 'disarmed on lifting');
}, 600, {minPress: () => 50}));

test('a one-column panel stacks items, and a long item takes fewer items on its page only', () => withPanel(ui => {
  const list = words(30);
  list.splice(3, 0, `${LONG} ${LONG}`);
  ui.panel.set(list);
  const grid = ui.root.querySelector('.paged-grid'), [a, b] = ui.root.querySelectorAll('.paged-grid button');
  eq(a.offsetLeft, b.offsetLeft, 'one column');
  const counts = [];
  for (;;) {
    counts.push(ui.items().length);
    ok(fits(grid), `page ${ui.panel.page} hides ${grid.scrollHeight - grid.clientHeight} px`);
    if (ui.nav.hidden || ui.next.disabled) break;
    ui.next.click();
  }
  ok(counts[0] < counts[1], `the page with the long item holds fewer: ${counts}`);
}, 300, {columns: 1}));

test('a long press on an item is not left to the phone, so the hold still picks', () => withPanel(ui => {
  ui.panel.set(['a', 'b']);
  const e = new MouseEvent('contextmenu', {bubbles: true, cancelable: true});
  first(ui).dispatchEvent(e);
  ok(e.defaultPrevented, 'item long press prevented');
  const n = new MouseEvent('contextmenu', {bubbles: true, cancelable: true});
  ui.root.dispatchEvent(n);
  ok(!n.defaultPrevented, 'the panel itself keeps its menu');
}));

test('a hidden panel keeps the items set on it and packs them when shown', () => withPanel(ui => {
  ui.panel.set(['a', 'b']);
  ui.root.hidden = true;
  ui.panel.set(['x', 'y', 'z']);
  eq(ui.items(), ['a', 'b'], 'not rebuilt while hidden');
  ui.root.hidden = false;
  ui.panel.refresh();
  eq(ui.items(), ['x', 'y', 'z']);
  ok(first(ui).offsetHeight >= 56, 'measured once shown');
}));

test('a refresh with nothing changed keeps the buttons, and a repack keeps focus on the same item', () => withPanel(ui => {
  ui.panel.set(words(6));
  const b = ui.root.querySelectorAll('.paged-grid button')[3];
  b.focus();
  ui.panel.refresh();
  ok(ui.root.querySelectorAll('.paged-grid button')[3] === b && document.activeElement === b, 'nothing rebuilt');
  ui.root.style.width = '500px';
  ui.panel.refresh();
  const now = ui.root.querySelectorAll('.paged-grid button')[3];
  ok(now !== b && document.activeElement === now, 'rebuilt, with focus on the same item');
}));
