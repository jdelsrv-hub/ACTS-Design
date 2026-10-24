// Spelling matcher: finds the words a partly typed (or misspelled) word could mean.
import { doubleMetaphone } from './vendor/double-metaphone.js';

// Each letter -> the letters touching it on a QWERTY keyboard (rows are staggered).
const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
export const KEY_NEIGHBOURS = {};
ROWS.forEach((row, r) => [...row].forEach((ch, c) => {
  const near = [row[c - 1], row[c + 1], ROWS[r - 1]?.[c], ROWS[r - 1]?.[c + 1], ROWS[r + 1]?.[c - 1], ROWS[r + 1]?.[c]];
  KEY_NEIGHBOURS[ch] = near.filter(Boolean).join('');
}));

// Optimal string alignment: insert, delete and transpose cost 1; substituting a neighbouring key costs 0.5.
export function editDistance(a, b) {
  const d = [];
  for (let i = 0; i <= a.length; i++) d.push([i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const sub = a[i - 1] === b[j - 1] ? 0 : KEY_NEIGHBOURS[a[i - 1]]?.includes(b[j - 1]) ? 0.5 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + sub);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

const KINDS = ['slip', 'prefix', 'sound', 'typo'];
const WEIGHT = { slip: 1, prefix: 1 };

// Dice coefficient of letter bigrams, 0 (nothing shared) to 1 (same).
function similarity(a, b) {
  const grams = s => { const g = []; for (let i = 0; i < s.length - 1; i++) g.push(s.slice(i, i + 2)); return g; };
  const ga = grams(a), gb = grams(b);
  if (!ga.length || !gb.length) return 0;
  let shared = 0;
  for (const g of ga) { const i = gb.indexOf(g); if (i >= 0) { shared++; gb.splice(i, 1); } }
  return (2 * shared) / (ga.length + grams(b).length);
}

export function createMatcher(words) {
  const codes = new Map();    // word -> primary metaphone code
  const byLetter = new Map(); // first letter -> words
  const byCode = new Map();   // first character of a metaphone code -> words
  const push = (map, key, word) => { if (!map.has(key)) map.set(key, []); map.get(key).push(word); };

  function add(word) {
    if (!word || codes.has(word)) return;
    const code = doubleMetaphone(word)[0];
    codes.set(word, code);
    push(byLetter, word.charAt(0), word);
    if (code) push(byCode, code[0], word);
  }
  for (const word of words) add(word);

  function candidates(partial, slipsFor, limit = 300) {
    if (!partial) return [];
    const best = new Map(); // word -> {word, kind, weight}
    const offer = (word, kind, weight) => {
      const old = best.get(word);
      if (!old || weight > old.weight || (weight === old.weight && KINDS.indexOf(kind) < KINDS.indexOf(old.kind))) best.set(word, { word, kind, weight });
    };
    for (const { word } of slipsFor(partial)) offer(word, 'slip', WEIGHT.slip);

    const sameLetter = byLetter.get(partial.charAt(0)) ?? [];
    for (const word of sameLetter) if (word.startsWith(partial)) offer(word, 'prefix', WEIGHT.prefix);

    // Fuzzy matches only fill spare room, so they never bury what is being typed.
    if (best.size < 3) {
      const n = partial.length;
      const code = n >= 3 ? doubleMetaphone(partial)[0] : '';
      if (code.length >= 2) {
        for (const word of byCode.get(code[0]) ?? []) {
          const c = codes.get(word);
          if (c === code || (n >= 5 && c.startsWith(code))) offer(word, 'sound', 0.4 + 0.2 * similarity(partial, word));
        }
      }

      const maxDistance = n >= 5 ? 2 : n >= 2 ? 1 : 0;
      if (maxDistance) {
        // shortcut: typos only look at words starting with the same letter, so a wrong first letter is not caught; upgrade by also scanning neighbour-key buckets.
        for (const word of sameLetter) {
          if (word.length < n - 1) continue;
          let d = Infinity;
          for (let len = n - 1; len <= n + 1; len++) d = Math.min(d, editDistance(partial, word.slice(0, len)));
          if (d <= maxDistance) offer(word, 'typo', d <= 1 ? 0.5 : 0.25);
        }
      }
    }

    return [...best.values()]
      .sort((a, b) => b.weight - a.weight || KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind))
      .slice(0, limit);
  }

  function suggestFix(word, slipsFor, rank) {
    if (codes.has(word)) return null;
    const all = candidates(word, slipsFor);
    const slips = slipsFor(word);
    if (slips.length) return slips.reduce((a, b) => (b.count > a.count ? b : a)).word;
    const fuzzy = all.filter(c => c.kind !== 'prefix' && c.weight >= 0.4);
    // A sound match is a better fix than a typo, so typos only compete when there is none.
    const pool = fuzzy.some(c => c.kind === 'sound') ? fuzzy.filter(c => c.kind === 'sound') : fuzzy;
    const maxRank = Math.max(0, ...pool.map(c => rank(c.word)));
    // Weight leads; frequency breaks near-ties.
    const score = c => c.weight * (1 + rank(c.word) / (1 + maxRank));
    let top = null;
    for (const c of pool) if (!top || score(c) > score(top)) top = c;
    return top ? top.word : null;
  }

  return { add, has: word => codes.has(word), candidates, suggestFix };
}
