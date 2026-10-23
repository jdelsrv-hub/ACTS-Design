// Personal memory: what the user has committed, with recency-weighted scoring.
// Counts are raw; the half-life decay is applied when a count is read.
import { tokenize } from './text.js';

export const HALF_LIFE_MS = 30 * 864e5;

export function createMemory(snapshot) {
  // shortcut: no size caps, add pruning if memory ever slows start-up
  const s = { version: 1, blocked: [], recent: [], pins: [], committedWords: 0, ...snapshot };
  // No prototype, so typed words like "constructor" or "__proto__" are plain keys.
  const table = from => Object.assign(Object.create(null), from);
  for (const t of ['words', 'ngrams', 'phrases', 'penalties']) s[t] = table(snapshot?.[t]);
  s.slips = table();
  for (const typed in snapshot?.slips) s.slips[typed] = table(snapshot.slips[typed]);
  s.blocked = [...s.blocked];
  s.pins = [...s.pins];

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

  const reindex = () => {
    next.clear();
    Object.keys(s.ngrams).forEach(index);
  };

  reindex();

  function score(context, word, now = Date.now()) {
    const b = context.at(-1), a = context.at(-2);
    const gram = key => decayed(s.ngrams[key], now);
    const tri = a === undefined ? 0 : ratio(gram(`${a} ${b} ${word}`), gram(`${a} ${b}`));
    const bi = b === undefined ? 0 : ratio(gram(`${b} ${word}`), decayed(s.words[b], now));
    const penalty = 0.5 ** (s.penalties[`${b} ${word}`] ?? 0);
    return (0.6 * tri + 0.3 * bi + 0.1 * ratio(decayed(s.words[word], now), total(now))) * penalty;
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
      const p = s.phrases[phrase] ??= { count: 0, lastUsed: now, offered: false };
      p.count++;
      p.lastUsed = now;
      s.recent = [phrase, ...s.recent.filter(r => r !== phrase)].slice(0, 20);
      s.committedWords += tokens.length;
      const offer = p.count >= 3 && !s.pins.includes(phrase) && !p.offered;
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

    recordSlip(typed, chosen) {
      const row = s.slips[typed] ??= Object.create(null);
      row[chosen] = (row[chosen] ?? 0) + 1;
    },

    slipsFor: typed => Object.entries(s.slips[typed] ?? {}).map(([word, count]) => ({ word, count })).sort((x, y) => y.count - x.count),

    penalize(prev, word) {
      const key = `${prev} ${word}`;
      s.penalties[key] = (s.penalties[key] ?? 0) + 1;
    },

    block(word) {
      if (!s.blocked.includes(word)) s.blocked.push(word);
    },
    isBlocked: word => s.blocked.includes(word),
    unblock(word) {
      s.blocked = s.blocked.filter(w => w !== word);
    },

    deleteWord(key) {
      delete s.words[key];
      for (const gram of Object.keys(s.ngrams)) if (gram.split(' ').includes(key)) delete s.ngrams[gram];
      totalCache = null;
      reindex();
    },

    deletePhrase(text) {
      delete s.phrases[text];
      s.pins = s.pins.filter(p => p !== text);
      s.recent = s.recent.filter(r => r !== text);
    },

    pinPhrase(text) {
      s.phrases[text] ??= { count: 0, lastUsed: Date.now(), offered: false };
      if (!s.pins.includes(text)) s.pins.push(text);
    },
    unpinPhrase(text) {
      s.pins = s.pins.filter(p => p !== text);
    },
    pinned: () => [...s.pins],

    phrases: () => Object.entries(s.phrases).map(([text, e]) => ({ text, count: e.count, pinned: s.pins.includes(text) })).sort((x, y) => y.count - x.count),
    words: () => Object.entries(s.words).map(([key, e]) => ({ key, display: e.display ?? key, count: e.count })).sort((x, y) => y.count - x.count),

    clearLearned() {
      for (const t of ['words', 'ngrams', 'phrases', 'slips', 'penalties']) s[t] = table();
      s.blocked = [];
      s.recent = [];
      s.pins = [];
      s.committedWords = 0;
      totalCache = null;
      reindex();
    },

    get paused() { return paused; },
    set paused(v) { paused = !!v; },
    get committedWords() { return s.committedWords; },
    recent: () => [...s.recent],
    toJSON: () => s,
  };
}
