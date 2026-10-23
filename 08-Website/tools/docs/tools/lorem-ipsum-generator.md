# Lorem ipsum generator

Make placeholder text by paragraphs, sentences or words.

- Opens at: `/lorem-ipsum-generator`
- Code: `public/assets/js/tools/files/lorem.js` (a `textTool` with no input box)
- Runs on: your device (nothing uploaded)
- Libraries: none

## How to use
1. Pick **Paragraphs**, **Sentences** or **Words**.
2. Enter how many.
3. Copy the text, or download it as `lorem-ipsum.txt`. It updates as you change the options.

## Options
- Make: Paragraphs, Sentences or Words (default Paragraphs).
- How many: default 3.

## How it works
The text always starts with "Lorem ipsum dolor sit amet". After that, words are picked at random from the classic lorem ipsum word list. Sentences have 8 to 15 words with one comma and end with a full stop. Paragraphs have 4 to 7 sentences, separated by a blank line. In Words mode you get exactly that many words as one sentence.

## Limits
- Up to 500 paragraphs, 2,000 sentences or 10,000 words. Ask for more and you get the limit, with a note saying so.
- New random text only appears when you change an option.
- Fewer than 5 words gives the start of the opening, like "Lorem ipsum dolor."

## How to test
`mod.default.transform('', { unit: 'words', count: 50 })`: the text has 50 words, starts with "Lorem ipsum dolor sit amet" and ends with ".". `{ unit: 'paragraphs', count: 3 }` gives 3 blocks split by a blank line. `{ unit: 'paragraphs', count: 1000 }` gives 500, plus a `notice` that says so. The named export `lorem(unit, count)` returns the same text as a plain string.
