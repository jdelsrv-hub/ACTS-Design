import { test, eq, ok } from './harness.js';
import { createMemory, HALF_LIFE_MS } from '../js/memory.js';

const T = 1_700_000_000_000;
test('learns on commit only', () => { const m = createMemory(); eq(m.knownWords(), []); m.commit('see you soon', T); m.commit('see you later', T); eq(m.knownWords().sort(), ['see', 'you']); });
test('empty commit is ignored', () => { const m = createMemory(); m.commit('   ', T); eq(m.committedWords, 0); });
test('text with no words is ignored', () => { const m = createMemory(); m.commit('123 🐱', T); eq(m.committedWords, 0); eq(m.recent(), []); });
test('paused learns nothing, not even recent', () => { const m = createMemory(); m.paused = true; m.commit('secret words', T); eq(m.committedWords, 0); eq(m.recent(), []); });
test('context beats plain frequency', () => {
  const m = createMemory(); for (let i = 0; i < 5; i++) m.commit('the store', T); m.commit('from the clinic', T);
  ok(m.score(['from', 'the'], 'clinic', T) > m.score(['from', 'the'], 'store', T));
});
test('recency decay halves at 30 days', () => {
  const m = createMemory(); m.commit('physio', T); m.commit('walk', T + HALF_LIFE_MS);
  ok(m.score([], 'walk', T + HALF_LIFE_MS) > m.score([], 'physio', T + HALF_LIFE_MS));
});
test('followers', () => { const m = createMemory(); m.commit('see you soon', T); eq(m.followers(['see', 'you'], 5), ['soon']); });
test('no n-grams across a sentence start', () => {
  const m = createMemory(); m.commit('Go home. Then sleep', T);
  eq(m.followers(['home'], 5), []); eq(m.followers(['go'], 5), ['home']);
});
test('pin offered once at third use', () => {
  const m = createMemory(); m.commit('I need help', T); m.commit('I need help', T);
  eq(m.commit('I need help', T).offerPin, 'I need help'); eq(m.commit('I need help', T).offerPin, null);
});
test('display casing', () => {
  const m = createMemory(); m.commit('The bus. I saw Maria and maria', T); m.commit('ok Maria', T);
  m.commit("ok i'm here", T);
  eq(m.display('i'), 'I'); eq(m.display("i'm"), "I'm"); eq(m.display('maria'), 'Maria'); eq(m.display('the'), 'the');
});
test('recent keeps 20, newest first, no duplicates', () => {
  const m = createMemory(); for (let i = 0; i < 25; i++) m.commit('line ' + 'abcdefghijklmnopqrstuvwxy'[i], T); m.commit('line y', T);
  eq(m.recent().length, 20); eq(m.recent()[0], 'line y'); eq(m.recent()[1], 'line x');
});
test('starter words are known and keep their casing', () => {
  const m = createMemory(); m.addStarterWords(['Maria', 'bus']); eq(m.knownWords().sort(), ['bus', 'maria']); eq(m.display('maria'), 'Maria');
});
test('words named like Object properties work', () => {
  const m = createMemory(); m.commit('constructor toString', T); m.commit('__proto__', T);
  ok(m.score(['constructor'], 'tostring', T) > 0); eq(m.committedWords, 3);
});
test('snapshot round trip', () => {
  const m = createMemory(); m.commit('see you soon', T); m.commit('see you soon', T);
  const copy = createMemory(JSON.parse(JSON.stringify(m.toJSON())));
  eq(copy.followers(['see', 'you'], 5), ['soon']); eq(copy.committedWords, 6); eq(copy.recent(), ['see you soon']);
  eq(Object.keys(copy.toJSON()).sort(), ['blocked', 'committedWords', 'ngrams', 'penalties', 'phrases', 'recent', 'slips', 'version', 'words']);
});
