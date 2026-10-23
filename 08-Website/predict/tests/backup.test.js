import { test, eq, ok } from './harness.js';
import { createMemory } from '../js/memory.js';
import { makeBackup, readBackup, validateSnapshot } from '../js/backup.js';

const T = 1_700_000_000_000;
test('backup round trip', () => { const m = createMemory(); m.commit('hi Maria', T); const r = readBackup(makeBackup(m, {textSize: 'huge'})); eq(r.settings.textSize, 'huge'); eq(createMemory(r.memory).display('maria'), 'Maria'); });
test('corrupt backup refused', () => { eq(readBackup('{oops'), null); eq(readBackup('{"app":"other","version":1}'), null); eq(readBackup(JSON.stringify({app: 'acts-predict', version: 1, memory: {version: 1, words: []}})), null); });
test('backup with the wrong version is refused', () => { const b = JSON.parse(makeBackup(createMemory(), {})); b.version = 2; eq(readBackup(JSON.stringify(b)), null); });
test('backup that is not an object is refused', () => { eq(readBackup('null'), null); eq(readBackup('[]'), null); eq(readBackup('"x"'), null); });
test('backup without settings is refused', () => { const b = JSON.parse(makeBackup(createMemory(), {})); delete b.settings; eq(readBackup(JSON.stringify(b)), null); });
test('a fresh memory validates', () => { ok(validateSnapshot(createMemory().toJSON())); });
test('validateSnapshot rejects each bad field', () => {
  const good = () => JSON.parse(JSON.stringify(createMemory().toJSON()));
  const bad = { version: 2, words: [], ngrams: null, phrases: 'x', slips: [], penalties: null, blocked: {}, recent: [1], pins: [null], committedWords: -1 };
  for (const [k, v] of Object.entries(bad)) { const s = good(); s[k] = v; ok(!validateSnapshot(s), k); }
  for (const v of [NaN, Infinity, '3']) { const s = good(); s.committedWords = v; ok(!validateSnapshot(s), 'committedWords ' + v); }
  ok(!validateSnapshot(null)); ok(!validateSnapshot([]));
  const s = good(); delete s.pins; ok(!validateSnapshot(s));
});
