// Paging helpers for the suggestion grid and its page dots. Pure functions, no DOM.
// Pages are zero-based.

export function perPage(panelHeight, rowHeight, columns = 2) {
  if (panelHeight <= 0 || rowHeight <= 0) return 2;
  return Math.max(2, Math.floor(panelHeight / rowHeight) * columns);
}

export const pageCount = (n, size) => Math.max(1, Math.ceil(n / size));

export const clampPage = (page, n, size) => Math.min(Math.max(page, 0), pageCount(n, size) - 1);

export const pageSlice = (items, page, size) => items.slice(page * size, (page + 1) * size);

// The dots to draw: all pages, or a run of `max` containing `page`, as centred as it can be.
export function dotWindow(page, count, max = 7) {
  const first = count <= max ? 0 : Math.min(Math.max(page - Math.floor(max / 2), 0), count - max);
  return Array.from({length: Math.min(count, max)}, (_, i) => first + i);
}

// Dots shrink and fade with distance from the current page. The 0.7 opacity floor keeps
// the faintest dot at least 3:1 against the normal background.
export function dotLook(distance) {
  if (distance === 0) return {size: 16, opacity: 1};
  return {size: Math.max(8, 14 - 2 * distance), opacity: Math.max(0.7, 1 - 0.1 * distance)};
}
