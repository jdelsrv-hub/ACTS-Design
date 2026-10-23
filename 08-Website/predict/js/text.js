// Text helpers: splitting typed text into words, finding the word being typed,
// and inserting a chosen suggestion. Pure functions, no DOM.

const WORD = /[A-Za-z]+(?:'[A-Za-z]+)?/g;
const SENTENCE_END = /[.!?]/;
const WORD_CHAR = /[A-Za-z']/;

export function tokenize(text) {
  const tokens = [];
  let prevEnd = 0;
  for (const m of text.matchAll(WORD)) {
    const gap = text.slice(prevEnd, m.index);
    tokens.push({
      word: m[0],
      key: m[0].toLowerCase(),
      sentenceStart: tokens.length === 0 || SENTENCE_END.test(gap),
    });
    prevEnd = m.index + m[0].length;
  }
  return tokens;
}

export function splitContext(before) {
  const partial = (before.match(/[A-Za-z]+(?:'[A-Za-z]*)?$/) || [''])[0];
  const rest = before.slice(0, before.length - partial.length);
  const sentence = rest.slice(rest.search(/[.!?][^.!?]*$/) + 1);
  return {
    context: tokenize(sentence).slice(-2).map(t => t.key),
    partial: partial.toLowerCase(),
  };
}

export function capitalizeIfStart(before, word) {
  const trimmed = before.trimEnd();
  const atStart = trimmed === '' || SENTENCE_END.test(trimmed[trimmed.length - 1]);
  return atStart ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

export function applySuggestion(text, cursor, word) {
  let start = cursor;
  while (start > 0 && WORD_CHAR.test(text[start - 1])) start--;
  while (text[start] === "'" && start < cursor) start++;
  let end = cursor;
  while (end < text.length && WORD_CHAR.test(text[end])) end++;

  const inserted = capitalizeIfStart(text.slice(0, start), word);
  const spaceFollows = /\s/.test(text[end] ?? '');
  const after = spaceFollows ? text.slice(end) : ' ' + text.slice(end);
  return {
    text: text.slice(0, start) + inserted + after,
    cursor: start + inserted.length + 1,
  };
}

export function shouldLearn(text, lastLearned) {
  const trimmed = text.trim();
  return trimmed !== '' && trimmed !== lastLearned?.trim();
}
