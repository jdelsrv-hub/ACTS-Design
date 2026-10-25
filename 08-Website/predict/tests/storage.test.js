import { test, eq, ok } from './harness.js';
import { openStore } from '../js/storage.js';
import { withDefaults, DEFAULTS } from '../js/settings.js';

test('memory fallback without IndexedDB', async () => { const s = await openStore(null); eq(s.persistent, false); await s.set('k', {a: 1}); eq(await s.get('k'), {a: 1}); });
test('real IndexedDB round trip', async () => { const s = await openStore(indexedDB, 'acts-predict-test'); eq(s.persistent, true); await s.set('k', [1, 2]); eq(await s.get('k'), [1, 2]); });
test('failing open falls back', async () => {
  const idb = { open() { const r = {}; setTimeout(() => r.onerror?.(), 0); return r; } };
  eq((await openStore(idb)).persistent, false);
});
test('blocked open falls back', async () => {
  const idb = { open() { const r = {}; setTimeout(() => r.onblocked?.(), 0); return r; } };
  eq((await openStore(idb)).persistent, false);
});
test('throwing open falls back', async () => { eq((await openStore({ open() { throw new Error('no'); } })).persistent, false); });
test('set rejects when the commit aborts after the request succeeded', async () => {
  const quota = new Error('quota');
  const req = {}; const t = { error: quota, objectStore: () => ({ put: () => { const r = {}; setTimeout(() => { r.onsuccess?.(); t.onabort?.(); }, 0); return r; } }) };
  const idb = { open() { setTimeout(() => { req.result = { transaction: () => t }; req.onsuccess(); }, 0); return req; } };
  const s = await openStore(idb); eq(s.persistent, true);
  let err; try { await s.set('k', 1); } catch (e) { err = e; } eq(err, quota);
});
test('withDefaults ignores junk', () => { const s = withDefaults({textSize: 'huge', suggestionCount: 'lots', bogus: 1}); eq(s.textSize, 'huge'); eq(s.suggestionCount, 3); ok(!('bogus' in s)); });
test('withDefaults rejects out-of-set choices', () => {
  eq(withDefaults({textSize: 'tiny', contrast: 'neon', font: 'comic', suggestionCount: 9}), DEFAULTS);
  eq(withDefaults({suggestionCount: 5, contrast: 'dark', font: 'hyperlegible'}).suggestionCount, 5);
});
test('withDefaults checks rate and voiceURI', () => {
  eq(withDefaults({rate: 0.4}).rate, 1); eq(withDefaults({rate: 3}).rate, 1); eq(withDefaults({rate: NaN}).rate, 1); eq(withDefaults({rate: 1.5}).rate, 1.5);
  eq(withDefaults({voiceURI: 'v1'}).voiceURI, 'v1'); eq(withDefaults({voiceURI: 7}).voiceURI, null);
});
test('withDefaults survives non-objects and inherited keys', () => { eq(withDefaults(Object.create({textSize: 'huge'})), DEFAULTS); eq(withDefaults(null), DEFAULTS); eq(withDefaults('x'), DEFAULTS); eq(withDefaults(JSON.parse('{"__proto__":{"textSize":"huge"}}')), DEFAULTS); });
test('withDefaults keeps a boolean paused', () => { eq(withDefaults({paused: true}).paused, true); eq(withDefaults({paused: 'yes'}).paused, false); });
test('withDefaults keeps showPredictions', () => eq(withDefaults({showPredictions: false}).showPredictions, false));
