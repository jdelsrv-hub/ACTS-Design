// Paging helpers for the paged word and phrase lists and their page dots. Pure functions, no DOM.
// Pages are zero-based.

// Start index of each page. Items go in rows of `columns`, each row as tall as its tallest item, and a page
// takes rows while they fit `available` (with `gap` between rows). A page always gets at least one row,
// so an item taller than the space is alone on its page.
export function packPages(heights, available, columns, gap) {
  const starts = [0];
  let used = 0;
  for (let i = 0; i < heights.length; i += columns) {
    const row = Math.max(...heights.slice(i, i + columns));
    if (i > starts.at(-1) && used + gap + row > available) {
      starts.push(i);
      used = row;
    } else {
      used += (i > starts.at(-1) ? gap : 0) + row;
    }
  }
  return starts;
}

export const clampPage = (page, count) => Math.min(Math.max(page, 0), count - 1);

export const pageSlice = (items, starts, page) => items.slice(starts[page], starts[page + 1]);

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
