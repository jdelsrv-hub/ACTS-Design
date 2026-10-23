// Key-value store on IndexedDB. Falls back to memory so the app still works (without saving) when
// storage is missing, blocked or refused, e.g. some private windows.
const memoryStore = () => {
  const m = new Map();
  return { get: async k => m.get(k), set: async (k, v) => { m.set(k, v); }, persistent: false };
};

export function openStore(idb = globalThis.indexedDB, name = 'acts-predict') {
  if (!idb) return Promise.resolve(memoryStore());
  return new Promise(resolve => {
    const fallback = () => resolve(memoryStore());
    let req;
    try { req = idb.open(name, 1); } catch { return fallback(); }
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onerror = req.onblocked = fallback;
    req.onsuccess = () => {
      const db = req.result;
      const run = (mode, op) => new Promise((ok, fail) => {
        // Settle on the transaction, not the request: a write can still fail at commit (e.g. quota).
        const t = db.transaction('kv', mode);
        const r = op(t.objectStore('kv'));
        t.oncomplete = () => ok(r.result);
        t.onabort = () => fail(t.error || r.error);
      });
      resolve({
        get: key => run('readonly', s => s.get(key)),
        set: (key, value) => run('readwrite', s => s.put(value, key)).then(() => {}),
        persistent: true,
      });
    };
  });
}
