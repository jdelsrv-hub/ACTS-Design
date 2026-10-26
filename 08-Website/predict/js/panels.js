// A paged list of word or phrase buttons in columns, with Previous, page dots and Next below.
import { packPages, clampPage, pageSlice, dotWindow, dotLook } from './pager.js';

const button = (text, aria) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  if (aria) b.setAttribute('aria-label', aria);
  return b;
};

// minPress is tap safety: a pointer press shorter than it (ms) picks nothing.
export function createPagedPanel(root, {label, onPick, live, minPress = () => 0, columns = 2}) {
  let items = [], page = 0, starts = [0], maxDots = 7, start = null, swipedAt = -Infinity, pressedAt = -Infinity, armTimer, armed = null;
  const grid = document.createElement('div'), nav = document.createElement('div'), dots = document.createElement('div');
  // Backstop for a page that still doesn't fit; screen readers reach every item anyway, so it's hidden from them.
  const more = Object.assign(document.createElement('p'), {className: 'more', textContent: '▼︎ more', hidden: true});
  more.setAttribute('aria-hidden', 'true');
  // U+FE0E keeps the arrows as text, not emoji.
  const prev = button('◀︎', 'Previous'), next = button('▶︎', 'Next');
  grid.className = 'paged-grid';
  grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
  nav.className = 'paged-nav';
  dots.className = 'dots';
  nav.append(prev, dots, next);
  root.classList.add('paged');
  // A named group that can take focus, for when there are no buttons to land on.
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', label);
  root.tabIndex = -1;
  root.replaceChildren(grid, more, nav);
  const focusFirst = () => (grid.firstElementChild || root).focus();

  function render() {
    const count = starts.length;
    const focused = document.activeElement, inNav = nav.contains(focused);
    grid.replaceChildren(...pageSlice(items, starts, page).map(item => {
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
    more.hidden = true;
    root.classList.remove('overflowing'); // its border would shrink the grid and keep the cue stuck
    const over = grid.scrollHeight > grid.clientHeight + 1;
    more.hidden = !over;
    root.classList.toggle('overflowing', over);
  }

  function go(to) {
    const count = starts.length;
    to = clampPage(to, count);
    if (to === page) return;
    page = to;
    render();
    live.textContent = ''; // so the same words twice are announced twice
    live.textContent = `${label}, page ${page + 1} of ${count}`;
  }

  // Pages are packed from every item's height at the current width and text size, measured with the nav showing,
  // so a long phrase takes room only on its own page and no item on any page is ever out of view.
  // Only as many 48 px dots as fit beside Previous and Next, so the nav never wraps onto a second row.
  function refresh() {
    nav.hidden = false;
    more.hidden = true;
    root.classList.remove('overflowing');
    root.style.minHeight = '';
    maxDots = Math.max(3, Math.min(7, Math.floor(dots.clientWidth / 48)));
    grid.replaceChildren(...items.map(item => button(item)));
    const heights = [...grid.children].map(b => Math.ceil(b.getBoundingClientRect().height)); // offsetHeight rounds down, which could clip the last item
    const gap = parseFloat(getComputedStyle(grid).rowGap) || 0, tallest = Math.max(0, ...heights);
    // The panel never shrinks below the tallest item and the nav; the page scrolls instead. 0 means it's hidden.
    if (tallest) root.style.minHeight = `${tallest + gap + nav.offsetHeight}px`;
    starts = packPages(heights, grid.clientHeight, columns, gap);
    page = clampPage(page, starts.length);
    render();
  }

  prev.onclick = () => go(page - 1);
  next.onclick = () => go(page + 1);

  // Only the first finger swipes; a second finger, or a gesture the browser takes over (scroll, zoom), does nothing.
  // With tap safety, an item shows when letting go will pick it, like the strip.
  const disarm = () => {
    clearTimeout(armTimer);
    armed?.classList.remove('armed');
    armed = null;
  };
  root.addEventListener('pointerdown', e => {
    if (!e.isPrimary) return;
    start = e;
    pressedAt = e.timeStamp;
    swipedAt = -Infinity;
    disarm();
    const b = e.target.closest?.('.paged-grid button');
    if (b && minPress()) armTimer = setTimeout(() => (armed = b).classList.add('armed'), minPress());
  });
  root.addEventListener('pointercancel', () => { start = null; disarm(); });
  root.addEventListener('pointerleave', disarm);
  root.addEventListener('pointerup', e => {
    disarm();
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
