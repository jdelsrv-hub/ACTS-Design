import { test, eq, ok } from './harness.js';
import { tokenize, splitContext, applySuggestion, shouldLearn, insertPhrase } from '../js/text.js';

test('tokenize keeps apostrophes, drops numbers and emoji', () => {
  eq(tokenize("I don't have 2 cats 🐱, ok?").map(t => t.key), ['i', "don't", 'have', 'cats', 'ok']);
});
test('tokenize marks sentence starts', () => {
  eq(tokenize('Hi there. How are you').map(t => t.sentenceStart), [true, false, true, false, false]);
});
test('splitContext mid-word', () => eq(splitContext('pick me up from the cl'), {context: ['from', 'the'], partial: 'cl'}));
test('splitContext after space', () => eq(splitContext('see you '), {context: ['see', 'you'], partial: ''}));
test('splitContext resets at sentence end', () => eq(splitContext('Thanks. I'), {context: [], partial: 'i'}));
test('applySuggestion at end', () => eq(applySuggestion('from the cl', 11, 'clinic'), {text: 'from the clinic ', cursor: 16}));
test('applySuggestion capitalises sentence start', () => eq(applySuggestion('ok. th', 6, 'the'), {text: 'ok. The ', cursor: 8}));
test('applySuggestion in the middle replaces the word at the cursor', () => {
  eq(applySuggestion('go to the stor today', 13, 'store'), {text: 'go to the store today', cursor: 16});
});
test('applySuggestion at the left edge of a word inserts instead of replacing', () => {
  eq(applySuggestion('see you tomorrow', 8, 'soon'), {text: 'see you soon tomorrow', cursor: 13});
});
test('applySuggestion separates an inserted word from a preceding non-space', () => {
  eq(applySuggestion('I have 2', 8, 'cats'), {text: 'I have 2 cats ', cursor: 14});
  eq(applySuggestion('yes,', 4, 'please'), {text: 'yes, please ', cursor: 12});
});
test('tokenize handles curly apostrophes and accented letters', () => {
  eq(tokenize('I don’t like café').map(t => t.key), ['i', "don't", 'like', 'café']);
});
test('splitContext handles accented letters', () => {
  eq(splitContext('José and I'), {context: ['josé', 'and'], partial: 'i'});
});
test('shouldLearn ignores empty and repeats', () => {
  ok(!shouldLearn('   ', null)); ok(!shouldLearn('Hi there', 'Hi there ')); ok(shouldLearn('Hi there', 'Bye'));
});
test('insertPhrase at end, mid-sentence and over a selection', () => {
  eq(insertPhrase('I would like', 12, 12, 'coffee'), {text: 'I would like coffee ', cursor: 20});
  eq(insertPhrase('I want  now', 7, 7, 'tea'), {text: 'I want tea now', cursor: 11});
  eq(insertPhrase('I want milk now', 7, 11, 'tea'), {text: 'I want tea now', cursor: 11});
  eq(insertPhrase('', 0, 0, 'I need help'), {text: 'I need help ', cursor: 12});
});
