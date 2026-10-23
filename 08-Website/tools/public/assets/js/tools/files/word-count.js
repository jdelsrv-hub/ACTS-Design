import { textTool } from '../../core/texttool.js';

const WPM = 238; // average silent reading speed for adults
const HAS_TEXT = /[\p{L}\p{N}]/u;

/** Counts for a piece of text. Words keep apostrophes and hyphens ("don't", "well-known" are one word each). */
export function countText(text = '') {
  const words = (text.match(/[\p{L}\p{M}\p{N}]+(?:['’.\-][\p{L}\p{M}\p{N}]+)*/gu) || []).length;
  const secs = Math.round((words / WPM) * 60);
  return {
    words,
    characters: [...text].length,
    charactersNoSpaces: [...text.replace(/\s/g, '')].length,
    sentences: text.split(/[.!?…]+(?=\s|$)/u).filter((s) => HAS_TEXT.test(s)).length,
    paragraphs: text.split(/\n+/).filter((p) => HAS_TEXT.test(p)).length,
    readingTime: secs < 60 ? `${secs} sec` : `${Math.round(secs / 60)} min`,
  };
}

const n = (v) => v.toLocaleString('en-AU');

export default textTool({
  input: { label: 'Your text', placeholder: 'Paste or type your text here' },
  output: false,
  statsFirst: true,
  debounce: 60,
  transform(text) {
    const c = countText(text);
    return {
      stats: [
        { label: 'Words', value: n(c.words) },
        { label: 'Characters', value: n(c.characters) },
        { label: 'Characters (no spaces)', value: n(c.charactersNoSpaces) },
        { label: 'Sentences', value: n(c.sentences) },
        { label: 'Paragraphs', value: n(c.paragraphs) },
        { label: 'Reading time', value: c.readingTime },
      ],
    };
  },
});
