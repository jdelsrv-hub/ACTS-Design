// A paged two-column list of word or phrase buttons, with Previous, page dots and Next below.
import { perPage, pageCount, clampPage, pageSlice, dotWindow, dotLook } from './pager.js';

const button = (text, aria) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  if (aria) b.setAttribute('aria-label', aria);
  return b;
};

// minPress is tap safety: a pointer press shorter than it (ms) picks nothing.
export function createPagedPanel(root, {label, onPick, live, minPress = () => 0}) {
  let items = [], page = 0, size = 2, maxDots = 7, start = null, swipedAt = -Infinity, pressedAt = -Infinity;
  const grid = document.createElement('div'), nav = document.createElement('div'), dots = document.createElement('div');
  // U+FE0E keeps the arrows as text, not emoji.
  const prev = button('◀︎', 'Previous'), next = button('▶︎', 'Next');
  grid.className = 'paged-grid';
  nav.className = 'paged-nav';
  dots.className = 'dots';
  nav.append(prev, dots, next);
  root.classList.add('paged');
  // A named group that can take focus, for when there are no buttons to land on.
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', label);
  root.tabIndex = -1;
  root.replaceChildren(grid, nav);
  const focusFirst = () => (grid.firstElementChild || root).focus();

  function render() {
    const count = pageCount(items.length, size);
    const focused = document.activeElement, inNav = nav.contains(focused);
    grid.replaceChildren(...pageSlice(items, page, size).map(item => {
      const b = button(item);
      b.onclick = e => {
        // detail 0 means a keyboard, switch or screen reader activated it, so tap safety doesn't apply.
        if (e.detail && e.timeStamp - pressedAt < minPress()) return;
        const was = document.activeElement;
        onPick(item);
        // A pick that redraws the list (new suggestions) mustn't drop keyboard and switch users at the top of the page.
        if (!was.isConnected) focusFirst();
      };
      return b;
    }));
    nav.hidden = count === 1;
    prev.disabled = page === 0;
    next.disabled = page === count - 1;
    dots.replaceChildren(...dotWindow(page, count, maxDots).map(i => {
      const b = button('', `Go to page ${i + 1} of ${count}`), dot = document.createElement('span');
      const look = dotLook(Math.abs(i - page));
      if (i === page) b.setAttribute('aria-current', 'page');
      dot.style.width = dot.style.height = `${look.size}px`;
      dot.style.opacity = look.opacity;
      b.append(dot);
      b.onclick = () => go(i);
      return b;
    }));
    // Keyboard and switch users keep their place when the control they used is redrawn, disabled or hidden.
    if (inNav && (nav.hidden || focused.disabled || !focused.isConnected)) {
      if (nav.hidden) focusFirst();
      else dots.querySelector('[aria-current]').focus();
    }
  }

  function go(to) {
    const count = pageCount(items.length, size);
    to = Math.min(Math.max(to, 0), count - 1);
    if (to === page) return;
    page = to;
    render();
    live.textContent = ''; // so the same words twice are announced twice
    live.textContent = `${label}, page ${page + 1} of ${count}`;
  }

  // Page size is however many rows at the current text size fit the grid, measured with the nav showing.
  // Only as many 48 px dots as fit beside Previous and Next, so the nav never wraps onto a second row.
  function refresh() {
    nav.hidden = false;
    maxDots = Math.max(3, Math.min(7, Math.floor(dots.clientWidth / 48)));
    const probe = grid.appendChild(button('Ag'));
    const gap = parseFloat(getComputedStyle(grid).rowGap) || 0;
    // shortcut: assumes one-line rows; a wrapped long phrase can push the last row out of view, so the grid scrolls to keep it reachable.
    size = perPage(grid.clientHeight + gap, probe.offsetHeight + gap);
    probe.remove();
    page = clampPage(page, items.length, size);
    render();
  }

  prev.onclick = () => go(page - 1);
  next.onclick = () => go(page + 1);

  // Only the first finger swipes; a second finger, or a gesture the browser takes over (scroll, zoom), does nothing.
  root.addEventListener('pointerdown', e => {
    if (!e.isPrimary) return;
    start = e;
    pressedAt = e.timeStamp;
    swipedAt = -Infinity;
  });
  root.addEventListener('pointercancel', () => { start = null; });
  root.addEventListener('pointerup', e => {
    if (!start || e.pointerId !== start.pointerId) return;
    const dx = e.clientX - start.clientX, dy = e.clientY - start.clientY;
    start = null;
    if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
    swipedAt = e.timeStamp;
    go(page + (dx < 0 ? 1 : -1));
  });
  // The click that ends a swipe must never pick the button the swipe started on. A swipe often ends with
  // no click at all, so only a click within 300 ms counts; a later keyboard or switch click goes through.
  root.addEventListener('click', e => {
    if (e.timeStamp - swipedAt > 300) return;
    swipedAt = -Infinity;
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
    focus: focusFirst,
    get page() { return page; },
  };
}
