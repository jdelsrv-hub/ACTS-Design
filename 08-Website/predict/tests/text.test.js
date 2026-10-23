import { test, eq, ok } from './harness.js';
import { tokenize, splitContext, applySuggestion, shouldLearn } from '../js/text.js';

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
test('shouldLearn ignores empty and repeats', () => {
  ok(!shouldLearn('   ', null)); ok(!shouldLearn('Hi there', 'Hi there ')); ok(shouldLearn('Hi there', 'Bye'));
});
