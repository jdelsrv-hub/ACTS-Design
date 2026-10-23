import { test, eq, ok, near } from './harness.js';
import { personalWeight, gatherCandidates, rank } from '../js/mixer.js';
import { createMemory } from '../js/memory.js';
import { parseWordList } from '../js/wordlist.js';
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
