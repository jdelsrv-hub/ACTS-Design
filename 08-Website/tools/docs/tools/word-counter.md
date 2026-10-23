# Word counter

Count words, characters, sentences and paragraphs, plus reading time.

- Opens at: `/word-counter`
- Code: `public/assets/js/tools/files/word-count.js` (a `textTool` with stats only)
- Runs on: your device (nothing uploaded)
- Libraries: none

## How to use
1. Paste or type your text, or select **Open file** to load a text file.
2. The counts update as you type.

## Options
None.

## How it works
`countText()` counts:
- Words: runs of letters and numbers in any language. Apostrophes, hyphens and full stops inside a word keep it as one word, so "don't", "well-known" and "3.14" each count once.
- Characters, with and without spaces. Each letter, space or simple emoji counts as one.
- Sentences: text that ends in `.`, `!`, `?` or `…` followed by a space or the end.
- Paragraphs: blocks of text separated by line breaks.
- Reading time: at 238 words a minute, an average silent reading speed for adults. Under a minute shows seconds, otherwise whole minutes.

## Limits
- Abbreviations like "Dr." or "e.g." count as the end of a sentence.
- Every line break starts a new paragraph, so a poem counts each line.
- Emoji made of several parts (like some family or flag emoji) count as more than one character.
- Languages written without spaces (like Chinese or Japanese) count a whole run of characters as one word.

## How to test
`countText("Hello world. Don't stop!\n\nA well-known fact: 3.14 is pi.")` returns 10 words, 56 characters, 46 without spaces, 3 sentences, 2 paragraphs and a reading time of "3 sec". Through the hook, `await mod.default.transform('one two three')` returns `stats` with Words "3", Characters "13" and Sentences "1".
