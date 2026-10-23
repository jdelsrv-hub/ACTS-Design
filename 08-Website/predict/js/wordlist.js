// Starter word list: "word count" lines, looked up by lowercase key.

export function parseWordList(text) {
  const counts = new Map();
  for (const line of text.split('\n')) {
    const [word, count] = line.trim().split(/\s+/);
    const n = Number(count);
    if (word && n > 0) counts.set(word.toLowerCase(), n);
  }
  const ranked = [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a));
  const maxLog = Math.log(1 + (counts.get(ranked[0]) ?? 0));
  const freq = word => counts.get(word) ?? 0;
  return {
    freq,
    score: word => (maxLog ? Math.log(1 + freq(word)) / maxLog : 0),
    top: n => ranked.slice(0, n),
    words: () => counts.keys(),
  };
}

export async function loadWordList(url = 'data/words.txt') {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load the word list (${res.status}). Reload the page.`);
  return parseWordList(await res.text());
}
