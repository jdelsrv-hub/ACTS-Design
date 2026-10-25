// A paged two-column list of word or phrase buttons, with Previous, page dots and Next below.
import { perPage, pageCount, clampPage, pageSlice, dotWindow, dotLook } from './pager.js';

const button = (text, aria) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  if (aria) b.setAttribute('aria-label', aria);
  return b;
};

export function createPagedPanel(root, {label, onPick, live}) {
  let items = [], page = 0, size = 2, start = null, swiped = false;
  const grid = document.createElement('div'), nav = document.createElement('div'), dots = document.createElement('div');
  // U+FE0E keeps the arrows as text, not emoji.
  const prev = button('◀︎', 'Previous'), next = button('▶︎', 'Next');
  grid.className = 'paged-grid';
  nav.className = 'paged-nav';
  dots.className = 'dots';
  nav.append(prev, dots, next);
  root.classList.add('paged');
  root.replaceChildren(grid, nav);

  function render() {
    const count = pageCount(items.length, size);
    const focused = document.activeElement, inNav = nav.contains(focused);
    grid.replaceChildren(...pageSlice(items, page, size).map(item => {
      const b = button(item);
      b.onclick = () => onPick(item);
      return b;
    }));
    nav.hidden = count === 1;
    prev.disabled = page === 0;
    next.disabled = page === count - 1;
    dots.replaceChildren(...dotWindow(page, count).map(i => {
      const b = button('', `Go to page ${i + 1} of ${count}`), dot = document.createElement('span');
      const look = dotLook(Math.abs(i - page));
      if (i === page) b.setAttribute('aria-current', 'page');
      dot.style.width = dot.style.height = `${look.size}px`;
      dot.style.opacity = look.opacity;
      b.append(dot);
      b.onclick = () => go(i);
      return b;
    }));
    // Keyboard and switch users keep their place when the dot they used is redrawn or the end button disables.
    if (inNav && !nav.hidden && (focused.disabled || !focused.isConnected)) dots.querySelector('[aria-current]').focus();
  }

  function go(to) {
    const count = pageCount(items.length, size);
    to = Math.min(Math.max(to, 0), count - 1);
    if (to === page) return;
    page = to;
    render();
    live.textContent = `${label}, page ${page + 1} of ${count}`;
  }

  // Page size is however many rows at the current text size fit the grid, measured with the nav showing.
  // Twice, because the first render can add dots that wrap the nav onto a second row.
  function refresh() {
    for (let pass = 0; pass < 2; pass++) {
      nav.hidden = false;
      const probe = grid.appendChild(button('Ag'));
      const gap = parseFloat(getComputedStyle(grid).rowGap) || 0;
      // shortcut: assumes one-line rows; a wrapped long phrase can push the last row out of view, so the grid scrolls to keep it reachable.
      size = perPage(grid.clientHeight + gap, probe.offsetHeight + gap);
      probe.remove();
      page = clampPage(page, items.length, size);
      render();
    }
  }

  prev.onclick = () => go(page - 1);
  next.onclick = () => go(page + 1);

  root.addEventListener('pointerdown', e => { start = e; swiped = false; });
  root.addEventListener('pointerup', e => {
    if (!start) return;
    const dx = e.clientX - start.clientX, dy = e.clientY - start.clientY;
    start = null;
    if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
    swiped = true;
    go(page + (dx < 0 ? 1 : -1));
  });
  // The click that ends a swipe must never pick the button the swipe started on.
  root.addEventListener('click', e => {
    if (!swiped) return;
    swiped = false;
    e.stopPropagation();
    e.preventDefault();
  }, true);

  return {
    set(list, {resetPage = false} = {}) {
      items = list;
      if (resetPage) page = 0;
      refresh();
    },
    refresh,
    get page() { return page; },
  };
}
