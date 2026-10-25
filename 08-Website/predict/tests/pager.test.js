import { test, eq } from './harness.js';
import { perPage, pageCount, clampPage, pageSlice, dotWindow, dotLook } from '../js/pager.js';

test('perPage', () => { eq(perPage(400, 90), 8); eq(perPage(100, 90), 2); eq(perPage(0, 90), 2); });
test('pageCount and clampPage', () => { eq(pageCount(0, 6), 1); eq(pageCount(13, 6), 3); eq(clampPage(2, 12, 6), 1); eq(clampPage(-1, 5, 6), 0); });
test('pageSlice', () => eq(pageSlice([1, 2, 3, 4, 5], 1, 2), [3, 4]));
test('dotWindow', () => { eq(dotWindow(0, 3), [0, 1, 2]); eq(dotWindow(0, 10), [0, 1, 2, 3, 4, 5, 6]); eq(dotWindow(9, 10), [3, 4, 5, 6, 7, 8, 9]); eq(dotWindow(5, 10), [2, 3, 4, 5, 6, 7, 8]); });
test('dotLook fades with distance and keeps a floor', () => { eq(dotLook(0), {size: 16, opacity: 1}); eq(dotLook(1), {size: 12, opacity: 0.9}); eq(dotLook(5), {size: 8, opacity: 0.7}); });
