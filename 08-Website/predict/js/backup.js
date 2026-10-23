// Backup file: the memory Snapshot plus settings, as JSON the user can save and restore.

const isObject = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const isStrings = x => Array.isArray(x) && x.every(v => typeof v === 'string');

// shortcut: only top-level fields are checked, not each nested entry, tighten if a bad file ever gets past this
export function validateSnapshot(s) {
  return isObject(s) && s.version === 1
    && ['words', 'ngrams', 'phrases', 'slips', 'penalties'].every(k => isObject(s[k]))
    && ['blocked', 'recent', 'pins'].every(k => isStrings(s[k]))
    && Number.isFinite(s.committedWords) && s.committedWords >= 0;
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
