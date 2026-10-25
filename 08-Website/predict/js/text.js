// Text helpers: splitting typed text into words, finding the word being typed,
// and inserting a chosen suggestion. Pure functions, no DOM.

const WORD = /\p{L}+(?:['’]\p{L}+)?/gu;
const SENTENCE_END = /[.!?]/;
const WORD_CHAR = /[\p{L}'’]/u;
const APOSTROPHE = /['’]/;

// Lowercase, with the curly apostrophe turned into a straight one.
const toKey = word => word.toLowerCase().replace(/’/g, "'");

export function tokenize(text) {
  const tokens = [];
  let prevEnd = 0;
  for (const m of text.matchAll(WORD)) {
    const gap = text.slice(prevEnd, m.index);
    tokens.push({
      word: m[0],
      key: toKey(m[0]),
      sentenceStart: tokens.length === 0 || SENTENCE_END.test(gap),
    });
    prevEnd = m.index + m[0].length;
  }
  return tokens;
}

export function splitContext(before) {
  const partial = (before.match(/\p{L}+(?:['’]\p{L}*)?$/u) || [''])[0];
  const rest = before.slice(0, before.length - partial.length);
  const sentence = rest.slice(rest.search(/[.!?][^.!?]*$/) + 1);
  return {
    context: tokenize(sentence).slice(-2).map(t => t.key),
    partial: toKey(partial),
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
  while (APOSTROPHE.test(text[start]) && start < cursor) start++;
  let end = cursor;
  // Only a word being typed (start < cursor) is replaced; at its left edge we insert.
  if (start < cursor) while (end < text.length && WORD_CHAR.test(text[end])) end++;

  const inserted = capitalizeIfStart(text.slice(0, start), word);
  const spaceFollows = /\s/.test(text[end] ?? '');
  const after = spaceFollows ? text.slice(end) : ' ' + text.slice(end);
  const needsLeadingSpace = start === cursor && cursor > 0 && !/\s/.test(text[cursor - 1]);
  const lead = needsLeadingSpace ? ' ' : '';
  return {
    text: text.slice(0, start) + lead + inserted + after,
    cursor: start + lead.length + inserted.length + 1,
  };
}

// Put a whole phrase in place of text[start, end), spaced so it never doubles a space.
export function insertPhrase(text, start, end, phrase) {
  const lead = start > 0 && !/\s/.test(text[start - 1]) ? ' ' : '';
  const trail = /\s/.test(text[end] ?? '') ? '' : ' ';
  return {
    text: text.slice(0, start) + lead + phrase + trail + text.slice(end),
    cursor: start + lead.length + phrase.length + 1,
  };
}

export function shouldLearn(text, lastLearned) {
  const trimmed = text.trim();
  return trimmed !== '' && trimmed !== lastLearned?.trim();
}
