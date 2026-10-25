import { test, eq, ok, near } from './harness.js';
import { createMemory } from '../js/memory.js';

const T = 1_700_000_000_000;
test('slips ranked', () => { const m = createMemory(); m.recordSlip('becuz', 'because'); m.recordSlip('becuz', 'because'); m.recordSlip('becuz', 'became'); eq(m.slipsFor('becuz')[0], {word: 'because', count: 2}); });
test('slips for an unknown word are empty', () => { eq(createMemory().slipsFor('nothing'), []); });
test('slips keyed by Object property names are safe', () => { const m = createMemory(); m.recordSlip('constructor', '__proto__'); m.recordSlip('constructor', '__proto__'); eq(m.slipsFor('constructor'), [{word: '__proto__', count: 2}]); eq(m.slipsFor('toString'), []); });
test('penalty lowers score', () => { const m = createMemory(); m.commit('the cat', T); const before = m.score(['the'], 'cat', T); m.penalize('the', 'cat'); near(m.score(['the'], 'cat', T), before / 2); });
test('penalty compounds and only hits its own context', () => {
  const m = createMemory(); m.commit('the cat', T); m.commit('a cat', T); const a = m.score(['a'], 'cat', T), the = m.score(['the'], 'cat', T);
  m.penalize('the', 'cat'); m.penalize('the', 'cat'); near(m.score(['the'], 'cat', T), the / 4); near(m.score(['a'], 'cat', T), a);
});
test('blocked', () => { const m = createMemory(); m.block('darn'); ok(m.isBlocked('darn')); m.unblock('darn'); ok(!m.isBlocked('darn')); });
test('blocked lists blocked words in order', () => { const m = createMemory(); m.block('darn'); m.block('heck'); m.block('darn'); eq(m.blocked(), ['darn', 'heck']); m.unblock('darn'); eq(m.blocked(), ['heck']); });
test('deleteWord removes its ngrams', () => { const m = createMemory(); m.commit('see you', T); m.commit('see you', T); m.deleteWord('you'); eq(m.followers(['see'], 5), []); });
test('deleteWord keeps unrelated learning', () => { const m = createMemory(); m.commit('see you', T); m.commit('go home', T); m.deleteWord('you'); eq(m.followers(['go'], 5), ['home']); eq(m.words().map(w => w.key).sort(), ['go', 'home', 'see']); });
test('deleteWord removes it from slips and penalties', () => {
  const m = createMemory(); m.commit('see you', T); m.recordSlip('yu', 'you'); m.recordSlip('yu', 'yo'); m.recordSlip('yoo', 'you');
  m.penalize('see', 'you'); m.penalize('you', 'see'); m.penalize('see', 'me'); m.deleteWord('you');
  eq(m.slipsFor('yu'), [{word: 'yo', count: 1}]); eq(Object.keys(m.toJSON().slips), ['yu']); eq(Object.keys(m.toJSON().penalties), ['see me']);
});
test('deletePhrase removes it from phrases, pins and recent', () => {
  const m = createMemory(); m.commit('I need help', T); m.pinPhrase('I need help'); m.deletePhrase('I need help');
  eq(m.phrases(), []); eq(m.pinned(), []); eq(m.recent(), []);
});
test('pinned keeps pin order and unpin removes', () => {
  const m = createMemory(); m.commit('b phrase', T); m.commit('a phrase', T);
  m.pinPhrase('a phrase'); m.pinPhrase('b phrase'); m.pinPhrase('a phrase'); eq(m.pinned(), ['a phrase', 'b phrase']);
  m.unpinPhrase('a phrase'); eq(m.pinned(), ['b phrase']);
});
test('pinned order survives a snapshot round trip', () => {
  const m = createMemory(); m.commit('b phrase', T); m.commit('a phrase', T); m.pinPhrase('b phrase'); m.pinPhrase('a phrase');
  eq(createMemory(JSON.parse(JSON.stringify(m.toJSON()))).pinned(), ['b phrase', 'a phrase']);
});
test('a pinned phrase is not offered for pinning again', () => {
  const m = createMemory(); m.commit('I need help', T); m.pinPhrase('I need help'); m.commit('I need help', T); eq(m.commit('I need help', T).offerPin, null);
});
test('phrases and words lists', () => {
  const m = createMemory(); m.commit('hi Maria', T); m.commit('hi Maria', T); m.pinPhrase('hi Maria');
  eq(m.phrases(), [{text: 'hi Maria', count: 2, pinned: true}]);
  eq(m.words().find(w => w.key === 'maria'), {key: 'maria', display: 'Maria', count: 2});
});
test('clearLearned empties everything but paused and blocked words', () => {
  const m = createMemory(); m.commit('see you soon', T); m.recordSlip('teh', 'the'); m.penalize('see', 'you'); m.block('darn'); m.pinPhrase('see you soon'); m.paused = true;
  m.clearLearned();
  eq(m.words(), []); eq(m.phrases(), []); eq(m.pinned(), []); eq(m.recent(), []); eq(m.slipsFor('teh'), []); ok(m.isBlocked('darn'));
  eq(m.committedWords, 0); eq(m.followers(['see'], 5), []); ok(m.paused);
  eq(Object.keys(m.toJSON().penalties), []);
});
test('pins naming no phrase are dropped on load', () => {
  const m = createMemory(); m.commit('real one', T); m.pinPhrase('real one');
  const snap = JSON.parse(JSON.stringify(m.toJSON())); snap.pins.push('ghost');
  const copy = createMemory(snap); eq(copy.pinned(), ['real one']); eq(copy.phrases().filter(p => p.pinned).length, 1);
});
test('favourites keep order, refuse duplicates and blanks', () => { const m = createMemory(); ok(m.addFavourite(' coffee ')); ok(m.addFavourite('tea')); ok(!m.addFavourite('Coffee')); ok(!m.addFavourite('  ')); eq(m.favourites(), ['coffee', 'tea']); });
test('favourites refuse words over 60 characters', () => { const m = createMemory(); ok(!m.addFavourite('x'.repeat(61))); ok(m.addFavourite('x'.repeat(60))); });
test('move, rename and remove favourites', () => { const m = createMemory(); ['a', 'b', 'c'].forEach(w => m.addFavourite(w)); m.moveFavourite(2, -1); eq(m.favourites(), ['a', 'c', 'b']); m.moveFavourite(0, -1); eq(m.favourites(), ['a', 'c', 'b']); ok(m.renameFavourite(1, 'cat')); m.removeFavourite(0); eq(m.favourites(), ['cat', 'b']); });
test('renameFavourite refuses blanks and duplicates', () => { const m = createMemory(); ['a', 'b'].forEach(w => m.addFavourite(w)); ok(!m.renameFavourite(0, ' ')); ok(!m.renameFavourite(0, 'B')); eq(m.favourites(), ['a', 'b']); });
test('favourites survive Start fresh and work while paused', () => { const m = createMemory(); m.paused = true; ok(m.addFavourite('music')); m.clearLearned(); eq(m.favourites(), ['music']); });
test('favourites survive a snapshot round trip and are returned as a copy', () => { const m = createMemory(); m.addFavourite('tea'); m.favourites().push('x'); eq(createMemory(JSON.parse(JSON.stringify(m.toJSON()))).favourites(), ['tea']); });
test('movePin and renamePin', () => { const m = createMemory(); ['Yes', 'No', 'Wait'].forEach(p => m.pinPhrase(p)); m.movePin(2, -1); eq(m.pinned(), ['Yes', 'Wait', 'No']); ok(m.renamePin(0, 'Yes please')); eq(m.pinned(), ['Yes please', 'Wait', 'No']); ok(!m.renamePin(1, 'No')); });
test('movePin does nothing at the ends; renamePin keeps the old phrase and refuses blanks', () => {
  const m = createMemory(); ['Yes', 'No'].forEach(p => m.pinPhrase(p)); m.movePin(0, -1); m.movePin(1, 1); eq(m.pinned(), ['Yes', 'No']);
  ok(!m.renamePin(0, '  ')); ok(m.renamePin(0, 'Sure')); eq(m.phrases().map(p => p.text).sort(), ['No', 'Sure', 'Yes']); eq(m.phrases().find(p => p.text === 'Sure').count, 0);
});
test('favourites are cleaned on load', () => { eq(createMemory({...createMemory().toJSON(), favourites: ['', ' tea ', 'Tea', 'x'.repeat(61), 'coffee']}).favourites(), ['tea', 'coffee']); });
test('bad indexes change nothing', () => { const m = createMemory(); ['a', 'b'].forEach(w => { m.addFavourite(w); m.pinPhrase(w); }); m.moveFavourite(0.5, 1); m.movePin('1', -1); ok(!m.renameFavourite(1.5, 'z')); ok(!m.renamePin(NaN, 'z')); eq(m.favourites(), ['a', 'b']); eq(m.pinned(), ['a', 'b']); });
