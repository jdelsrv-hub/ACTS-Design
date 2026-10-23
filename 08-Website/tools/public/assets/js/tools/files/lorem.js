import { textTool } from '../../core/texttool.js';

const WORDS = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(' ');
const OPENING = ['lorem', 'ipsum', 'dolor', 'sit', 'amet'];
const MAX = { paragraphs: 500, sentences: 2000, words: 10000 };
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = () => WORDS[rand(0, WORDS.length - 1)];
const cap = (s) => s[0].toUpperCase() + s.slice(1);

function sentence(first) {
  const words = first ? [...OPENING] : [];
  const n = rand(8, 15);
  while (words.length < n) words.push(pick());
  words[first ? 4 : rand(3, n - 4)] += ','; // "Lorem ipsum dolor sit amet, ..."
  return `${cap(words.join(' '))}.`;
}
const paragraph = (first) => Array.from({ length: rand(4, 7) }, (_, i) => sentence(first && i === 0)).join(' ');

/** Placeholder text. Always starts with "Lorem ipsum dolor sit amet". unit: paragraphs | sentences | words */
export function lorem(unit, count) {
  const n = Math.max(1, Math.min(MAX[unit] || 500, Math.floor(count) || 1));
  if (unit === 'words') {
    const words = OPENING.slice(0, n);
    while (words.length < n) words.push(pick());
    return `${cap(words.join(' '))}.`;
  }
  if (unit === 'sentences') return Array.from({ length: n }, (_, i) => sentence(i === 0)).join(' ');
  return Array.from({ length: n }, (_, i) => paragraph(i === 0)).join('\n\n');
}

export default textTool({
  input: false,
  options: [
    { id: 'unit', type: 'segmented', label: 'Make', default: 'paragraphs', choices: [{ value: 'paragraphs', label: 'Paragraphs' }, { value: 'sentences', label: 'Sentences' }, { value: 'words', label: 'Words' }] },
    { id: 'count', type: 'number', label: 'How many', default: 3, min: 1, max: 10000, step: 1 },
  ],
  transform(_text, o) {
    const text = lorem(o.unit, o.count);
    const max = MAX[o.unit];
    return o.count > max ? { text, notice: { kind: 'info', text: `That's more than we make at once, so here are ${max.toLocaleString('en-AU')} ${o.unit}.` } } : text;
  },
  output: { label: 'Your placeholder text', filename: 'lorem-ipsum.txt' },
});
