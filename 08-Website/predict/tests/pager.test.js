import { test, eq, ok } from './harness.js';
import { packPages, clampPage, pageSlice, dotWindow, dotLook } from '../js/pager.js';

// Every page's rows (each as tall as its tallest item, with gaps between) fit, unless it is one row on its own.
function fitsEachPage(heights, available, columns, gap, starts) {
  starts.forEach((start, p) => {
    const end = starts[p + 1] ?? heights.length, rows = [];
    for (let i = start; i < end; i += columns) rows.push(Math.max(...heights.slice(i, Math.min(i + columns, end))));
    const used = rows.reduce((sum, r) => sum + r, 0) + gap * (rows.length - 1);
    ok(rows.length === 1 || used <= available, `page ${p} needs ${used} of ${available}`);
  });
}

test('packPages fills pages with rows of short items', () => {
  eq(packPages(Array(10).fill(50), 170, 2, 10), [0, 6]);
  eq(packPages(Array(5).fill(50), 1000, 2, 10), [0]);
  eq(packPages([], 170, 2, 10), [0]);
});

test('packPages gives a tall item its row and lets nothing overflow', () => {
  const heights = [50, 50, 200, 50, 50, 50, 50, 50];
  const starts = packPages(heights, 270, 2, 10);
  eq(starts, [0, 4]);
  fitsEachPage(heights, 270, 2, 10, starts);
  eq(packPages([50, 50, 200, 50, 50], 270, 1, 10), [0, 2, 4]);
});

test('packPages puts an item taller than the space alone on its page', () => {
  eq(packPages([50, 50, 500, 50], 200, 1, 10), [0, 2, 3]);
  eq(packPages([500], 200, 1, 10), [0]);
});

test('clampPage and pageSlice work on page starts', () => {
  eq(clampPage(2, 2), 1);
  eq(clampPage(-1, 3), 0);
  eq(pageSlice([1, 2, 3, 4, 5], [0, 2, 4], 1), [3, 4]);
  eq(pageSlice([1, 2, 3, 4, 5], [0, 2, 4], 2), [5]);
});

test('dotWindow', () => { eq(dotWindow(0, 3), [0, 1, 2]); eq(dotWindow(0, 10), [0, 1, 2, 3, 4, 5, 6]); eq(dotWindow(9, 10), [3, 4, 5, 6, 7, 8, 9]); eq(dotWindow(5, 10), [2, 3, 4, 5, 6, 7, 8]); });
test('dotLook fades with distance and keeps a floor', () => { eq(dotLook(0), {size: 16, opacity: 1}); eq(dotLook(1), {size: 12, opacity: 0.9}); eq(dotLook(5), {size: 8, opacity: 0.7}); });
