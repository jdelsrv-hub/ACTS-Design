// Personal memory: what the user has committed, with recency-weighted scoring.
// Counts are raw; the half-life decay is applied when a count is read.
import { tokenize } from './text.js';

export const HALF_LIFE_MS = 30 * 864e5;

export function createMemory(snapshot) {
  const s = { version: 1, slips: {}, blocked: [], penalties: {}, recent: [], committedWords: 0, ...snapshot };
  // No prototype, so typed words like "constructor" or "__proto__" are plain keys.
  for (const t of ['words', 'ngrams', 'phrases']) s[t] = Object.assign(Object.create(null), snapshot?.[t]);

  let paused = false;
  let totalCache = null;
  const next = new Map(); // 'a b' or 'b' -> Set of words seen after it

  const decayed = (entry, now) => entry ? entry.count * 0.5 ** ((now - entry.lastUsed) / HALF_LIFE_MS) : 0;
  const ratio = (num, den) => den > 0 ? num / den : 0;
  const bump = (table, key, now) => {
    const e = table[key] ??= { count: 0, lastUsed: now };
    e.count++;
    e.lastUsed = now;
    return e;
  };
  const index = gram => {
    const parts = gram.split(' ');
    const word = parts.pop();
    const prefix = parts.join(' ');
    if (!next.has(prefix)) next.set(prefix, new Set());
    next.get(prefix).add(word);
  };
  const total = now => {
    if (totalCache?.now !== now) {
      totalCache = { now, sum: Object.values(s.words).reduce((sum, e) => sum + decayed(e, now), 0) };
    }
    return totalCache.sum;
  };

  Object.keys(s.ngrams).forEach(index);

  function score(context, word, now = Date.now()) {
    const b = context.at(-1), a = context.at(-2);
    const gram = key => decayed(s.ngrams[key], now);
    const tri = a === undefined ? 0 : ratio(gram(`${a} ${b} ${word}`), gram(`${a} ${b}`));
    const bi = b === undefined ? 0 : ratio(gram(`${b} ${word}`), decayed(s.words[b], now));
    return 0.6 * tri + 0.3 * bi + 0.1 * ratio(decayed(s.words[word], now), total(now));
  }

  return {
    commit(text, now = Date.now()) {
      const tokens = tokenize(text);
      if (paused || tokens.length === 0) return { offerPin: null };
      let sentence = [];
      for (const t of tokens) {
        const entry = bump(s.words, t.key, now);
        if (!t.sentenceStart) entry.display = t.word;
        if (t.sentenceStart) sentence = [];
        sentence.push(t.key);
        for (const n of [2, 3]) {
          if (sentence.length < n) continue;
          const gram = sentence.slice(-n).join(' ');
          bump(s.ngrams, gram, now);
          index(gram);
        }
      }
      totalCache = null;
      const phrase = text.trim();
      const p = s.phrases[phrase] ??= { count: 0, lastUsed: now, pinned: false, offered: false };
      p.count++;
      p.lastUsed = now;
      s.recent = [phrase, ...s.recent.filter(r => r !== phrase)].slice(0, 20);
      s.committedWords += tokens.length;
      const offer = p.count >= 3 && !p.pinned && !p.offered;
      if (offer) p.offered = true;
      return { offerPin: offer ? phrase : null };
    },

    score,

    followers(context, limit) {
      const now = Date.now();
      const candidates = new Set([...(next.get(context.slice(-2).join(' ')) ?? []), ...(next.get(context.slice(-1).join(' ')) ?? [])]);
      return [...candidates]
        .map(w => [w, score(context, w, now)])
        .sort((x, y) => y[1] - x[1])
        .slice(0, limit)
        .map(([w]) => w);
    },

    knownWords: () => Object.keys(s.words).filter(k => s.words[k].count >= 2),

    display: key => key === 'i' || key.startsWith("i'") ? 'I' + key.slice(1) : s.words[key]?.display ?? key,

    addStarterWords(words) {
      for (const w of words) {
        const t = tokenize(w)[0];
        if (!t) continue;
        const e = s.words[t.key] ??= { count: 0, lastUsed: Date.now() };
        e.count = Math.max(e.count, 3);
        e.display = t.word;
      }
      totalCache = null;
    },

    get paused() { return paused; },
    set paused(v) { paused = !!v; },
    get committedWords() { return s.committedWords; },
    recent: () => [...s.recent],
    toJSON: () => s,
  };
}
