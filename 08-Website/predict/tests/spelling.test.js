import { test, eq, ok } from './harness.js';
import { createMatcher, editDistance } from '../js/spelling.js';
import { loadWordList } from '../js/wordlist.js';

const m = createMatcher(['phone', 'night', 'hello', 'help', 'because', 'wednesday', 'clinic']);
const none = () => [];
const kinds = (p) => Object.fromEntries(m.candidates(p, none).map(c => [c.word, c.kind]));
test('prefix', () => eq(kinds('hel'), {hello: 'prefix', help: 'prefix'}));
test('sounds like', () => { eq(kinds('fone').phone, 'sound'); eq(kinds('nite').night, 'sound'); });
test('neighbour-key typo', () => eq(kinds('hrllo').hello, 'typo'));
test('neighbour substitution is cheaper', () => ok(editDistance('hwllo', 'hello') < editDistance('hzllo', 'hello')));
test('learned slip wins', () => { const c = m.candidates('becuz', () => [{word: 'because', count: 1}]); eq(c[0], {word: 'because', kind: 'slip', weight: 1}); });
test('ordered by weight, then kind', () => {
  const order = ['slip', 'prefix', 'sound', 'typo'];
  for (const c of [m.candidates('hel', () => [{word: 'hello', count: 1}]), m.candidates('fone', none)])
    for (let i = 1; i < c.length; i++) ok(c[i - 1].weight > c[i].weight || (c[i - 1].weight === c[i].weight && order.indexOf(c[i - 1].kind) <= order.indexOf(c[i].kind)));
  eq(m.candidates('hel', () => [{word: 'hello', count: 1}])[0].word, 'hello');
});
test('suggestFix', () => { eq(m.suggestFix('fone', none, () => 0), 'phone'); eq(m.suggestFix('phone', none, () => 0), null); });
test('non-ASCII and apostrophes do not crash', () => {
  const u = createMatcher(['café', 'josé', "don't"]);
  eq(u.candidates('caf', none)[0].word, 'café'); eq(u.candidates("don'", none)[0].word, "don't"); ok(u.has('josé'));
  u.add('naïve'); ok(u.has('naïve')); u.candidates('jose', none); u.candidates('ñ', none);
});
test('fast enough on 20k words', async () => {
  const big = createMatcher((await loadWordList('../data/words.txt')).words()); const t = performance.now();
  for (const p of ['becau', 'fone', 'tomoro', 'th', 'wensday']) big.candidates(p, none);
  ok((performance.now() - t) / 5 < 20, 'average under 20 ms');
});

const f = createMatcher(['phone', 'night', 'hello', 'help', 'held', 'because', 'wednesday', 'clinic', 'want', 'find', 'found', 'fan', 'fine', 'her', 'head', 'here', 'the', 'ten', 'tell']);
const fk = (p) => Object.fromEntries(f.candidates(p, none).map(c => [c.word, c.kind]));
// find stays in as a weight-0.5 typo (fone -> find is two neighbour-key slips), below phone; it is not a sound match.
test('sound match is exact, so fone finds phone but not want, find or found as sounds', () => {
  const k = fk('fone'); eq(k.phone, 'sound'); ok(!('want' in k) && !('found' in k), 'no noise'); ok(k.find !== 'sound', 'find is not a sound match');
});
test('fuzzy matches stay out when prefix matches fill the list', () => {
  const k = fk('hel'); eq(Object.keys(k).sort(), ['held', 'hello', 'help']); ok(Object.values(k).every(v => v === 'prefix'));
});
test('teh is a typo for the, with no sound matches', () => {
  const c = f.candidates('teh', none); eq(c.find(x => x.word === 'the').kind, 'typo'); ok(!c.some(x => x.kind === 'sound'));
});
test('suggestFix uses the slip with the highest count', () =>
  eq(f.suggestFix('becuz', () => [{word: 'clinic', count: 1}, {word: 'because', count: 5}], () => 0), 'because'));

// fone -> phone and nite -> night are not asserted via suggestFix: under the round-2 rule 'find' (fone) and 'not' (nite) win on frequency. See the task 5 report.
test('suggestFix on the real list: teh and becuz', async () => {
  const list = await loadWordList('../data/words.txt'); const real = createMatcher(list.words());
  const fix = w => real.suggestFix(w, none, x => list.freq(x));
  eq(fix('teh'), 'the'); eq(fix('becuz'), 'because');
  const sounds = (p) => real.candidates(p, none).filter(c => c.kind === 'sound').map(c => c.word);
  ok(sounds('fone').includes('phone') && sounds('nite').includes('night'), 'phone and night are still sound matches');
});
