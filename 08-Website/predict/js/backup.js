// Backup file: the memory Snapshot plus settings, as JSON the user can save and restore.

const isObject = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const isStrings = x => Array.isArray(x) && x.every(v => typeof v === 'string');

const isCount = n => Number.isFinite(n) && n >= 0;
const isEntry = e => isObject(e) && isCount(e.count) && Number.isFinite(e.lastUsed);

export function validateSnapshot(s) {
  return isObject(s) && s.version === 1
    && ['words', 'ngrams', 'phrases'].every(k => isObject(s[k]) && Object.values(s[k]).every(isEntry))
    && isObject(s.penalties) && Object.values(s.penalties).every(isCount)
    && isObject(s.slips) && Object.values(s.slips).every(row => isObject(row) && Object.values(row).every(isCount))
    && ['blocked', 'recent', 'pins'].every(k => isStrings(s[k]))
    && isCount(s.committedWords);
}

export function makeBackup(memory, settings) {
  return JSON.stringify({ app: 'acts-predict', version: 1, savedAt: new Date().toISOString(), memory: memory.toJSON(), settings });
}

export function readBackup(text) {
  let b;
  try { b = JSON.parse(text); } catch { return null; }
  if (!isObject(b) || b.app !== 'acts-predict' || b.version !== 1 || !isObject(b.settings) || !validateSnapshot(b.memory)) return null;
  return { memory: b.memory, settings: b.settings };
}
