import { test, eq, ok, near } from './harness.js';
import { personalWeight, gatherCandidates, rank } from '../js/mixer.js';
import { createMemory } from '../js/memory.js';
import { parseWordList, loadWordList } from '../js/wordlist.js';
import { createMatcher } from '../js/spelling.js';

const setup = (list, memory = createMemory()) => {
  const wordList = parseWordList(list);
  return { memory, wordList, matcher: createMatcher(wordList.words()) };
};
const suggest = (s, partial, context = [], limit = 5) =>
  rank(gatherCandidates({ partial, context, ...s }), { context, limit, ...s });

test('personalWeight', () => { eq(personalWeight(0), 0); near(personalWeight(500), 0.5); eq(personalWeight(1e6), 0.8); });

test('new user follows the word list', () => eq(suggest(setup('the 1000\nthey 10'), 'the'), ['the', 'they']));

test('personal habits win once learned', () => {
  const s = setup('class 1000\nclinic 1');
  for (let i = 0; i < 600; i++) s.memory.commit('from the clinic');
  eq(suggest(s, 'cl', ['from', 'the'])[0], 'clinic');
});

test('blocked never shown', () => {
  const s = setup('class 1000\nclinic 1');
  s.memory.block('class');
  const out = suggest(s, 'cl');
  ok(!out.includes('class')); ok(out.includes('clinic'));
});

test('limit respected', () => {
  const s = setup('the 1000\nthey 10\nthen 5\nthem 4\nthere 3');
  eq(suggest(s, 'the', [], 3).length, 3);
});

test('empty partial offers next words, then the word list', () => {
  const s = setup('the 1000\nto 500\nclinic 1');
  for (let i = 0; i < 600; i++) s.memory.commit('go to');
  const out = suggest(s, '', ['go']);
  eq(out[0], 'to'); ok(out.includes('the'));
});

test('duplicates are dropped and ties keep input order', () => {
  const s = setup('alpha 10\nbeta 10');
  eq(rank([{ word: 'beta', kind: 'prefix', weight: 1 }, { word: 'alpha', kind: 'prefix', weight: 1 }, { word: 'beta', kind: 'sound', weight: 0.6 }],
    { context: [], limit: 5, ...s }), ['beta', 'alpha']);
});

// Acceptance bar: the intended word is in the top 3 shown. One tap teaches the slip, after which it ranks first.
test('real list: fone and nite show phone and night in the top 3', async () => {
  const wordList = await loadWordList('../data/words.txt'); const memory = createMemory();
  const s = { memory, wordList, matcher: createMatcher(wordList.words()) };
  for (const [partial, want] of [['fone', 'phone'], ['nite', 'night']]) {
    const top = suggest(s, partial, [], 3); ok(top.includes(want), `${partial}: top 3 was ${JSON.stringify(top)}`);
  }
});

test('real list: fu, shi and rap suggest nothing rude', async () => {
  const wordList = await loadWordList('../data/words.txt');
  const s = { memory: createMemory(), wordList, matcher: createMatcher(wordList.words()) };
  for (const partial of ['fu', 'shi', 'rap']) {
    const top = suggest(s, partial, [], 3);
    ok(top.length === 3 && !top.some(w => /fuck|shit|^rap(e|ed|es|ing|ist)/.test(w)), `${partial}: top 3 was ${JSON.stringify(top)}`);
  }
});

test('starter words show before more common words', async () => {
  const wordList = await loadWordList('../data/words.txt'); const memory = createMemory();
  memory.addStarterWords(['Maria']);
  const s = { memory, wordList, matcher: createMatcher([...wordList.words(), ...memory.knownWords()]) };
  eq(suggest(s, 'ma', [], 3)[0], 'maria');
});

test('a word you have used beats a more common one you have not', () => {
  const s = setup('class 1000\nclinic 1');
  s.memory.commit('clinic');
  eq(suggest(s, 'cl')[0], 'clinic');
});
