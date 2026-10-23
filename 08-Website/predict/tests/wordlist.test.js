import { test, eq, ok, near } from './harness.js';
import { parseWordList, loadWordList } from '../js/wordlist.js';

const wl = parseWordList('the 1000\nclinic 10\ncat 100\n');
test('freq and unknown', () => { eq(wl.freq('cat'), 100); eq(wl.freq('dog'), 0); });
test('score normalised', () => { near(wl.score('the'), 1); ok(wl.score('clinic') < wl.score('cat')); eq(wl.score('dog'), 0); });
test('top', () => eq(wl.top(2), ['the', 'cat']));
test('real list loads', async () => { const real = await loadWordList('../data/words.txt'); ok(real.freq('because') > 0); eq([...real.words()].length, 20000); });
