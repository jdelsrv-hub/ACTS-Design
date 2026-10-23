// Suggestion mixer: blends personal memory with the starter word list.

// Grows with the words the user has committed, but never silences the word list entirely.
export const personalWeight = n => Math.min(0.8, n / (n + 500));

export function gatherCandidates({ partial, context, matcher, memory, wordList }) {
  if (partial === '') {
    return [...memory.followers(context, 30), ...wordList.top(30)].map(word => ({ word, kind: 'next', weight: 1 }));
  }
  return matcher.candidates(partial, t => memory.slipsFor(t));
}

export function rank(cands, { context, memory, wordList, limit, now = Date.now() }) {
  const best = new Map(); // Map keeps first-seen order, which is what makes ties stable
  for (const c of cands) {
    if (memory.isBlocked(c.word)) continue;
    const old = best.get(c.word);
    if (!old || c.weight > old.weight) best.set(c.word, c);
  }
  const rows = [...best.values()].map(c => ({ ...c, p: memory.score(context, c.word, now), l: wordList.score(c.word) }));
  const maxP = Math.max(0, ...rows.map(r => r.p));
  const maxL = Math.max(0, ...rows.map(r => r.l));
  const wp = personalWeight(memory.committedWords);
  const final = r => r.weight * (wp * (maxP > 0 ? r.p / maxP : 0) + (1 - wp) * (maxL > 0 ? r.l / maxL : 0));
  return rows
    .map(r => [r.word, final(r)])
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}
