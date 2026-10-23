# Learning text predictor: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An installable, offline web app that suggests the next word for one person on a touchscreen, learns their words, phrases and spelling slips and speaks text aloud.

**Architecture:** Vanilla ES modules with no build step. Pure engine modules (`text`, `wordlist`, `memory`, `spelling`, `mixer`, `backup`) hold all the logic and are unit-tested in the browser. `app.js` wires them to the DOM. A service worker gives offline use.

**Tech stack:** HTML, CSS, JavaScript (ES2022 modules); double-metaphone 2.0.1 (vendored, MIT); IndexedDB; Web Speech and Clipboard APIs; Python 3 dev server (as in `08-Website/tools`). No Node on this machine: tests run in the browser.

**Spec:** `08-Website/predict/docs/2026-10-24-text-predictor-design.md`

## Global constraints

- All paths below are relative to `08-Website/predict/`. Run commands from there unless they say otherwise.
- No framework, no bundler, no npm. Third-party code is vendored into `js/vendor/` at a pinned version, with its licence beside it.
- Nothing the person types leaves the device. The only network fetches are the app files and the Atkinson Hyperlegible font from Google Fonts.
- Suggestions within 50 ms of a keystroke.
- Learning happens only on Speak or Copy, and never while learning is paused.
- Recency half-life of 30 days. Personal weight = min(0.8, n / (n + 500)).
- 20 recent sentences. No other size caps in v1.
- Targets of at least 48 px (suggestion buttons at least 56 px tall with gaps of 6 px or more). Contrast WCAG AA normally and AAA in high contrast. Every control has an accessible name.
- UI copy: sentence case, plain words, no "please", no exclamation marks. Errors say what happened, then what to do.
- Commits: end each message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Implementers commit only; the controller pushes.

## Review focus

1. **Capitalisation:** "i" must show as "I". A name learned as "Maria" shows as "Maria". A word at the start of a sentence is capitalised when inserted, and that doesn't teach a capitalised form for ordinary words like "The". Tests are in Task 1 (`applySuggestion`) and Task 3 (`display`).
2. **Punctuation, apostrophes, numbers and emoji:** "don't" and "it's" are single words. Numbers, emoji and punctuation are never learned as words and never break suggestions. Tests are in Task 1 (`tokenize`).
3. **Cursor in the middle of the text:** choosing a suggestion replaces the word at the cursor, not the last word. Test in Task 1 (`applySuggestion`).
4. **Speak, then Copy the same sentence, or Speak it three times:** it's learned once. Test in Task 1 (`shouldLearn`).
5. **Empty or whitespace-only Speak or Copy:** nothing is learned, nothing breaks. Tests in Task 1 (`shouldLearn`) and Task 3 (`commit`).

---

### Task 1: Project skeleton, test harness and text helpers

**Files:**
- Create: `dev_server.py` (copy of `../tools/dev_server.py` with `ROOT` = this folder, default port 8790, and the usage lines updated)
- Create: `tests/index.html`, `tests/harness.js`, `tests/run.js`
- Create: `js/text.js`
- Test: `tests/text.test.js`

**Interfaces:**
- Produces, `tests/harness.js`: `test(name: string, fn: () => void | Promise<void>)`, `eq(actual, expected, msg?)` (deep equality via JSON), `ok(value, msg?)`, `near(a, b, eps = 1e-6)`.
- Produces, `tests/run.js`: imports every `tests/*.test.js` listed in its `SPECS` array, runs every test, renders a pass/fail row per test, and sets `window.__results = [{name, pass, error}]` and `window.__done = true`. The status line reads `N passed, M failed`.
- Produces, `js/text.js`:
  - `tokenize(text: string): Array<{word: string, key: string, sentenceStart: boolean}>`. Words match `/[A-Za-z]+(?:'[A-Za-z]+)?/g`. `key` is lowercase. `sentenceStart` is true for the first word of the text and the first after `.`, `!` or `?`.
  - `splitContext(before: string): {context: string[], partial: string}`. `partial` is the lowercase letter-and-apostrophe run touching the end (`''` after a space or punctuation). `context` is the last two keys before it, within the current sentence only.
  - `applySuggestion(text: string, cursor: number, word: string): {text: string, cursor: number}`. Replaces the whole word around the cursor (or inserts at the cursor). Capitalises it if it starts a sentence. Adds one space unless a space already follows. The cursor ends after that space.
  - `capitalizeIfStart(before: string, word: string): string`
  - `shouldLearn(text: string, lastLearned: string | null): boolean`. False when `text.trim()` is empty or equals `lastLearned?.trim()`.

- [ ] **Step 1: Create the dev server and the harness**

`tests/index.html` loads `run.js` as a module and has `<p id="status">` and `<table id="results">`. `run.js` has `const SPECS = ['./text.test.js'];`, and later tasks append to it.

- [ ] **Step 2: Write the failing tests in `tests/text.test.js`**

```js
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
```

- [ ] **Step 3: Check that they fail**

Run: `python dev_server.py`, then open `http://127.0.0.1:8790/tests/` in the built-in browser.
Expected: the import of `../js/text.js` fails, or the tests fail.

- [ ] **Step 4: Implement `js/text.js` with the signatures above**

- [ ] **Step 5: Reload the test page**

Expected: `9 passed, 0 failed`.

- [ ] **Step 6: Commit**

```bash
git add . && git commit -m "Predictor: skeleton, test harness and text helpers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git push
```

### Task 2: Starter word list

**Files:**
- Create: `data/words.txt`, `data/LICENSE-words.txt`
- Create: `js/wordlist.js`
- Test: `tests/wordlist.test.js` (add to `SPECS`)

**Interfaces:**
- Produces: `parseWordList(text: string): WordList`, where WordList is `{freq(word): number, score(word): number, top(n): string[], words(): Iterable<string>}`. `freq` is the raw count (0 when unknown). `score` is `log(1 + freq) / log(1 + maxFreq)`, in [0, 1]. `top(n)` returns words by descending frequency. Lookups are by lowercase key.
- Produces: `loadWordList(url = 'data/words.txt'): Promise<WordList>`.

- [ ] **Step 1: Build `data/words.txt`**

Download `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt` into a scratch folder. With Python, keep lines whose word matches `^[a-z]+('[a-z]+)?$`, keep the first 20,000, and write `word count` per line. `data/LICENSE-words.txt` names the source URL, the filter, and the licence (CC BY-SA 4.0, data from OpenSubtitles via hermitdave/FrequencyWords).

- [ ] **Step 2: Write the failing tests**

```js
const wl = parseWordList('the 1000\nclinic 10\ncat 100\n');
test('freq and unknown', () => { eq(wl.freq('cat'), 100); eq(wl.freq('dog'), 0); });
test('score normalised', () => { near(wl.score('the'), 1); ok(wl.score('clinic') < wl.score('cat')); eq(wl.score('dog'), 0); });
test('top', () => eq(wl.top(2), ['the', 'cat']));
test('real list loads', async () => { const real = await loadWordList('../data/words.txt'); ok(real.freq('because') > 0); eq([...real.words()].length, 20000); });
```

- [ ] **Step 3: Check that they fail, then implement `js/wordlist.js`, then reload**

Expected after implementing: all tests pass.

- [ ] **Step 4: Commit** (same form as Task 1, message "Predictor: starter word list")

### Task 3: Personal memory, learning and scoring

**Files:**
- Create: `js/memory.js`
- Test: `tests/memory.test.js` (add to `SPECS`)

**Interfaces:**
- Consumes: `tokenize` (Task 1).
- Produces: `HALF_LIFE_MS = 30 * 864e5` and `createMemory(snapshot?: Snapshot): Memory`. The Memory methods for this task are:
  - `commit(text: string, now = Date.now()): {offerPin: string | null}`. When `paused` is set, or `text.trim()` is empty, it does nothing and returns `{offerPin: null}`. Otherwise it updates `words`, the 2- and 3-grams within each sentence, the phrase (keyed by `text.trim()`), `recent` (newest first, max 20, no duplicates), and `committedWords`. `offerPin` is the phrase text the first time its count reaches 3 and it isn't pinned.
  - `score(context: string[], word: string, now = Date.now()): number`, equal to `0.6·P(w|a,b) + 0.3·P(w|b) + 0.1·P(w)`, with each count weighted by `0.5 ** ((now - lastUsed) / HALF_LIFE_MS)`. Denominators are the decayed counts of the context n-gram, or the total for unigrams. A missing denominator makes that term 0.
  - `followers(context: string[], limit: number): string[]`. Words seen after the context, best first. It uses an index from the previous key (or keys) to the next words, rebuilt on load and updated on commit, never a scan.
  - `knownWords(): string[]`, the keys with count ≥ 2.
  - `display(key: string): string`. "i" gives "I". Otherwise it's the last casing seen at a position that isn't a sentence start. A word only ever seen at a sentence start gives the lowercase key.
  - `addStarterWords(words: string[])`, which sets count to max(count, 3) and keeps the casing as typed.
  - `paused: boolean` (get and set), `committedWords: number` (get), `recent(): string[]`.
- Snapshot (this task defines its shape; Task 4 adds validation):
  `{version: 1, words: {[key]: {count, lastUsed, display?}}, ngrams: {['a b' | 'a b c']: {count, lastUsed}}, phrases: {[text]: {count, lastUsed, pinned, offered}}, slips: {[typed]: {[word]: count}}, blocked: string[], penalties: {['prev word']: count}, recent: string[], committedWords: number}`. `memory.toJSON()` returns it.

- [ ] **Step 1: Write the failing tests**

```js
const T = 1_700_000_000_000;
test('learns on commit only', () => { const m = createMemory(); eq(m.knownWords(), []); m.commit('see you soon', T); m.commit('see you later', T); eq(m.knownWords().sort(), ['see', 'you']); });
test('empty commit is ignored', () => { const m = createMemory(); m.commit('   ', T); eq(m.committedWords, 0); });
test('paused learns nothing, not even recent', () => { const m = createMemory(); m.paused = true; m.commit('secret words', T); eq(m.committedWords, 0); eq(m.recent(), []); });
test('context beats plain frequency', () => {
  const m = createMemory(); for (let i = 0; i < 5; i++) m.commit('the store', T); m.commit('from the clinic', T);
  ok(m.score(['from', 'the'], 'clinic', T) > m.score(['from', 'the'], 'store', T));
});
test('recency decay halves at 30 days', () => {
  const m = createMemory(); m.commit('physio', T); m.commit('walk', T + HALF_LIFE_MS);
  ok(m.score([], 'walk', T + HALF_LIFE_MS) > m.score([], 'physio', T + HALF_LIFE_MS));
});
test('followers', () => { const m = createMemory(); m.commit('see you soon', T); eq(m.followers(['see', 'you'], 5), ['soon']); });
test('pin offered once at third use', () => {
  const m = createMemory(); m.commit('I need help', T); m.commit('I need help', T);
  eq(m.commit('I need help', T).offerPin, 'I need help'); eq(m.commit('I need help', T).offerPin, null);
});
test('display casing', () => {
  const m = createMemory(); m.commit('The bus. I saw Maria and maria', T); m.commit('ok Maria', T);
  eq(m.display('i'), 'I'); eq(m.display('maria'), 'Maria'); eq(m.display('the'), 'the');
});
test('recent keeps 20, newest first, no duplicates', () => {
  const m = createMemory(); for (let i = 0; i < 25; i++) m.commit('line ' + 'abcdefghijklmnopqrstuvwxy'[i], T); m.commit('line y', T);
  eq(m.recent().length, 20); eq(m.recent()[0], 'line y');
});
```

The display-casing test reflects the decided rule: the last non-sentence-start casing wins, so "ok Maria" is the last one seen.

- [ ] **Step 2: Check that they fail, then implement `js/memory.js`, then reload. Expected: all pass**

- [ ] **Step 3: Commit** ("Predictor: personal memory learning and scoring")

### Task 4: Memory controls, slips and backup

**Files:**
- Modify: `js/memory.js`
- Create: `js/backup.js`
- Test: `tests/memory-controls.test.js`, `tests/backup.test.js` (add both to `SPECS`)

**Interfaces:**
- Adds to Memory:
  - `recordSlip(typed: string, chosen: string)` and `slipsFor(typed: string): Array<{word, count}>` (count descending).
  - `penalize(prev: string, word: string)`. `score()` for a context whose last key is `prev` is multiplied by `0.5 ** penaltyCount`.
  - `block(word)`, `isBlocked(word)`, `unblock(word)`.
  - `deleteWord(key)`, which also removes its n-grams, and `deletePhrase(text)`.
  - `pinPhrase(text)`, `unpinPhrase(text)`, and `pinned(): string[]` (in pin order).
  - `phrases(): Array<{text, count, pinned}>` and `words(): Array<{key, display, count}>`, for the "What it has learned" page.
  - `clearLearned()`, which empties everything except `paused`.
  - No size caps in v1. Leave one comment: `// shortcut: no size caps, add pruning if memory ever slows start-up`.
- Produces, `js/backup.js`:
  - `makeBackup(memory: Memory, settings: object): string`, giving JSON `{app: 'acts-predict', version: 1, savedAt, memory: memory.toJSON(), settings}`.
  - `readBackup(text: string): {memory: Snapshot, settings: object} | null`, which returns null for bad JSON, the wrong `app` or `version`, or a snapshot that fails validation.
  - `validateSnapshot(s): boolean`, which checks `version === 1` and the type of each top-level field.

- [ ] **Step 1: Write the failing tests**

```js
test('slips ranked', () => { const m = createMemory(); m.recordSlip('becuz', 'because'); m.recordSlip('becuz', 'because'); m.recordSlip('becuz', 'became'); eq(m.slipsFor('becuz')[0], {word: 'because', count: 2}); });
test('penalty lowers score', () => { const m = createMemory(); m.commit('the cat', T); const before = m.score(['the'], 'cat', T); m.penalize('the', 'cat'); near(m.score(['the'], 'cat', T), before / 2); });
test('blocked', () => { const m = createMemory(); m.block('darn'); ok(m.isBlocked('darn')); m.unblock('darn'); ok(!m.isBlocked('darn')); });
test('deleteWord removes its ngrams', () => { const m = createMemory(); m.commit('see you', T); m.commit('see you', T); m.deleteWord('you'); eq(m.followers(['see'], 5), []); });
test('backup round trip', () => { const m = createMemory(); m.commit('hi Maria', T); const r = readBackup(makeBackup(m, {textSize: 'huge'})); eq(r.settings.textSize, 'huge'); eq(createMemory(r.memory).display('maria'), 'Maria'); });
test('corrupt backup refused', () => { eq(readBackup('{oops'), null); eq(readBackup('{"app":"other","version":1}'), null); eq(readBackup(JSON.stringify({app: 'acts-predict', version: 1, memory: {version: 1, words: []}})), null); });
```

- [ ] **Step 2: Check that they fail, then implement, then reload. Expected: all pass, including Tasks 1–3**

- [ ] **Step 3: Commit** ("Predictor: memory controls and backup")

### Task 5: Spelling matcher

**Files:**
- Create: `js/vendor/double-metaphone.js` (from `https://cdn.jsdelivr.net/npm/double-metaphone@2.0.1/index.js`) and `js/vendor/LICENSE-double-metaphone.txt` (MIT)
- Create: `js/spelling.js`
- Test: `tests/spelling.test.js` (add to `SPECS`)

**Interfaces:**
- Consumes: `doubleMetaphone(word): [string, string]` from the vendored file.
- Produces:
  - `editDistance(a: string, b: string): number`. Optimal-string-alignment Damerau–Levenshtein. Insert, delete and transpose cost 1. Substitution costs 1, or 0.5 between QWERTY neighbours (`KEY_NEIGHBOURS`, a map of each letter to the letters touching it).
  - `createMatcher(words: Iterable<string>): Matcher`, which indexes by first letter and by the first character of each metaphone code.
  - `matcher.add(word: string)`
  - `matcher.has(word: string): boolean`
  - `matcher.candidates(partial: string, slipsFor: (typed) => Array<{word, count}>, limit = 300): Array<{word, kind: 'slip' | 'prefix' | 'sound' | 'typo', weight: number}>`. Weights: slip 1, prefix 1, sound 0.6, typo at distance ≤ 1 gives 0.5, typo at distance ≤ 2 gives 0.25. Typo matching allows distance ≤ 1 when `partial.length` is 2–4 and ≤ 2 when it's 5 or more; sound matching needs `partial.length >= 3`. A sound match is when a word's primary or secondary code starts with the partial's primary code. A typo match uses distance to the word's prefix of length `partial.length` (and ±1). Each word appears once, with its best kind. Order: weight descending, then kind order slip > prefix > sound > typo.
  - `matcher.suggestFix(word: string, slipsFor, rank: (w) => number): string | null`. Returns null if `has(word)`. Otherwise it returns the top slip, or the best non-prefix candidate with weight ≥ 0.5 (ties broken by `rank`), or null.

- [ ] **Step 1: Write the failing tests**

```js
const m = createMatcher(['phone', 'night', 'hello', 'help', 'because', 'wednesday', 'clinic']);
const none = () => [];
const kinds = (p) => Object.fromEntries(m.candidates(p, none).map(c => [c.word, c.kind]));
test('prefix', () => eq(kinds('hel'), {hello: 'prefix', help: 'prefix'}));
test('sounds like', () => { eq(kinds('fone').phone, 'sound'); eq(kinds('nite').night, 'sound'); });
test('neighbour-key typo', () => eq(kinds('hrllo').hello, 'typo'));
test('neighbour substitution is cheaper', () => ok(editDistance('hwllo', 'hello') < editDistance('hzllo', 'hello')));
test('learned slip wins', () => { const c = m.candidates('becuz', () => [{word: 'because', count: 1}]); eq(c[0], {word: 'because', kind: 'slip', weight: 1}); });
test('ordered by weight, then kind', () => {
  const order = ['slip', 'prefix', 'sound', 'typo'];
  for (const c of [m.candidates('hel', () => [{word: 'hello', count: 1}]), m.candidates('fone', none)])
    for (let i = 1; i < c.length; i++) ok(c[i - 1].weight > c[i].weight || (c[i - 1].weight === c[i].weight && order.indexOf(c[i - 1].kind) <= order.indexOf(c[i].kind)));
  eq(m.candidates('hel', () => [{word: 'hello', count: 1}])[0].word, 'hello');
});
test('suggestFix', () => { eq(m.suggestFix('fone', none, () => 0), 'phone'); eq(m.suggestFix('phone', none, () => 0), null); });
test('fast enough on 20k words', async () => {
  const big = createMatcher((await loadWordList('../data/words.txt')).words()); const t = performance.now();
  for (const p of ['becau', 'fone', 'tomoro', 'th', 'wensday']) big.candidates(p, none);
  ok((performance.now() - t) / 5 < 20, 'average under 20 ms');
});
```

- [ ] **Step 2: Check that they fail, then implement, then reload. Expected: all pass**

- [ ] **Step 3: Commit** ("Predictor: spelling matcher")

### Task 6: Suggestion mixer

**Files:**
- Create: `js/mixer.js`
- Test: `tests/mixer.test.js` (add to `SPECS`)

**Interfaces:**
- Consumes: Memory (Tasks 3–4), WordList (Task 2), Matcher (Task 5).
- Produces:
  - `personalWeight(n: number): number`, equal to `Math.min(0.8, n / (n + 500))`.
  - `gatherCandidates({partial, context, matcher, memory, wordList}): Array<{word, kind, weight}>`. When `partial === ''`, it returns `memory.followers(context, 30)` plus `wordList.top(30)`, with kind `'next'` and weight 1. Otherwise it returns `matcher.candidates(partial, memory.slipsFor)`.
  - `rank(cands, {context, memory, wordList, limit, now = Date.now()}): string[]`. It drops blocked words and duplicates (keeping the higher weight). Each source (personal `memory.score`, `wordList.score`) is normalised over the candidate set by dividing by its max (when max > 0). `blend = wp·P + (1 - wp)·L`, where `wp = personalWeight(memory.committedWords)`. Final score is `weight × blend`. Ties keep the input order (kind order from the matcher). It returns the top `limit` keys.

- [ ] **Step 1: Write the failing tests**

```js
test('personalWeight', () => { eq(personalWeight(0), 0); near(personalWeight(500), 0.5); eq(personalWeight(1e6), 0.8); });
test('new user follows the word list', () => { /* empty memory, wordList 'the 1000\nthey 10' , candidates for 'the' prefix → ['the', 'they'] */ });
test('personal habits win once learned', () => { /* commit 'from the clinic' 600 times (n ≥ 1800); context ['from','the'], partial 'cl' with wordList 'class 1000\nclinic 1'; expect rank(...)[0] === 'clinic' */ });
test('blocked never shown', () => { /* block 'class'; expect not in output */ });
test('limit respected', () => { /* limit 3 → length ≤ 3 */ });
```

Each test body builds the stated memory and word list with `createMemory`, `parseWordList` and `createMatcher`, and asserts the stated outcome.

- [ ] **Step 2: Check that they fail, then implement, then reload. Expected: all pass**

- [ ] **Step 3: Commit** ("Predictor: suggestion mixer")

### Task 7: Storage and settings

**Files:**
- Create: `js/storage.js`, `js/settings.js`
- Test: `tests/storage.test.js` (add to `SPECS`)

**Interfaces:**
- Produces, `js/storage.js`: `openStore(idb = globalThis.indexedDB, name = 'acts-predict'): Promise<{get(key): Promise<any>, set(key, value): Promise<void>, persistent: boolean}>`. It uses a single object store `kv`. If `idb` is missing, or opening it fails or is blocked, it returns an in-memory Map store with `persistent: false`. Keys used by the app are `'memory'` (Snapshot) and `'settings'`.
- Produces, `js/settings.js`: `DEFAULTS` (below), and `withDefaults(saved): object`, which merges saved values over the defaults and ignores unknown keys and values of the wrong type.

```js
export const DEFAULTS = { textSize: 'large', contrast: 'normal', font: 'system', suggestionCount: 3,
  tapSafety: false, speakEachWord: false, clearAfterSpeak: false, phraseSpeaks: false, voiceURI: null, rate: 1 };
```

- [ ] **Step 1: Write the failing tests**

```js
test('memory fallback without IndexedDB', async () => { const s = await openStore(undefined); eq(s.persistent, false); await s.set('k', {a: 1}); eq(await s.get('k'), {a: 1}); });
test('real IndexedDB round trip', async () => { const s = await openStore(indexedDB, 'acts-predict-test'); eq(s.persistent, true); await s.set('k', [1, 2]); eq(await s.get('k'), [1, 2]); });
test('withDefaults ignores junk', () => { const s = withDefaults({textSize: 'huge', suggestionCount: 'lots', bogus: 1}); eq(s.textSize, 'huge'); eq(s.suggestionCount, 3); ok(!('bogus' in s)); });
```

- [ ] **Step 2: Check that they fail, then implement, then reload. Expected: all pass**

- [ ] **Step 3: Commit** ("Predictor: storage and settings")

### Task 8: Removed

The AI model was cut from v1 on 2026-10-24. Nothing to build.

### Task 9: Writing screen and live suggestions

**Files:**
- Create: `index.html`, `styles.css`, `js/app.js`

**Interfaces:**
- Consumes: everything from Tasks 1–7.
- DOM, from top to bottom: `#phrases` (sideways-scrolling quick-phrase buttons plus a `+` button labelled "Save as quick phrase"), `#editor` (wrapping `#mirror` behind a transparent `<textarea id="text" aria-label="Your message">`, with the same font, padding and wrapping), `#suggestions` (3–5 `<button class="sugg">`), `#actions` (Task 10), `#menu` (a `<dialog>` with "Hear it" and "Don't suggest this"), `#toast`, and `#banner`.
- `styles.css`: custom properties for the three text sizes (large 28px, extra large 34px, huge 42px, on `<html data-size>`), the three contrasts (`data-contrast="normal" | "high" | "dark"`, high = black on yellow at AAA), and `data-font="hyperlegible"` (Atkinson Hyperlegible from Google Fonts, cached by the service worker). Suggestions are at least 56 px tall with gaps of at least 6 px, and the best one has a 3 px outline. No transitions or animations at all.

Behaviour in `js/app.js`:
1. **Start-up:** `openStore()`, then `createMemory(saved memory)`, `withDefaults(saved settings)`, `loadWordList()`, and `createMatcher([...wordList.words(), ...memory.knownWords()])`. Apply the settings to `<html>` data attributes. When `store.persistent` is false, show the banner "Can't remember things right now. Make a backup in settings."
2. **`update()` on each `input` event:** run `splitContext(text before cursor)`, `gatherCandidates`, and `rank` (limit = `suggestionCount`), then render the buttons with `capitalizeIfStart` and `memory.display`.
3. **Calm mode (always on):** while any pointer is down on the page, renders are held, and the latest one is applied on `pointerup`.
4. **Choosing a suggestion:** `applySuggestion`. If the partial wasn't a prefix of the chosen word, call `memory.recordSlip(partial, word)`. Remember `{prev, word}` as the last pick. If the very next input is `deleteContentBackward`, call `memory.penalize(prev, word)`. Call `matcher.add(word)`. When `speakEachWord` is on, speak the word.
5. **Tap safety:** when `tapSafety` is false, a tap chooses. When true, a press shorter than 300 ms is ignored. Either way, a 500 ms hold opens `#menu` instead of choosing.
6. **Spelling underline:** after a space, if the finished word gives `matcher.suggestFix(...)` a value, wrap that word in `<span class="fix">` in `#mirror` (dotted underline, no red), and put the fix first in the suggestions. Tapping it replaces the word and records the slip.

- [ ] **Step 1: Build the page and the `update()` loop (points 1–2)**

- [ ] **Step 2: Check in the built-in browser at mobile size (`resize_window` preset mobile)**

Open `http://127.0.0.1:8790/`. Type `bec`. Expected: `because` is among the suggestions. Type `fone`, then a space. Expected: "fone" has a dotted underline and the first suggestion is `phone`. Tap it. Expected: the text reads `phone `.

- [ ] **Step 3: Add calm mode, tap safety, the long-press menu, slips and penalties (points 3–6)**

- [ ] **Step 4: Check in the browser**

1. Hold a suggestion for 500 ms. Expected: the menu opens. "Don't suggest this" removes the word, and it doesn't come back for the same input.
2. Put the cursor in the middle of `go to the stor today`, after `stor`, and tap `store`. Expected: `go to the store today`.
3. Run the page console with no errors.

- [ ] **Step 5: Commit** ("Predictor: writing screen and live suggestions")

### Task 10: Actions, speech and quick phrases

**Files:**
- Create: `js/speech.js`
- Modify: `index.html`, `styles.css`, `js/app.js`

**Interfaces:**
- Produces, `js/speech.js`:
  - `listVoices(): Promise<SpeechSynthesisVoice[]>`, which waits for `voiceschanged` up to 1 s.
  - `speak(text: string, {voiceURI, rate}): boolean`. It cancels any current speech, then speaks, and returns false when `speechSynthesis` or voices are missing.
- `#actions` buttons, each with an icon and a text label: Speak (primary), Copy, Undo, Clear, Recent.

Behaviour:
1. **Commit:** Speak and Copy call `learn(text)`. If `shouldLearn(text, lastLearned)`: `memory.commit`, set `lastLearned`, add the new known words to the matcher, and save the memory to the store (debounced 1 s). If it returns `offerPin`, show a toast with a "Pin it" button.
2. **Speak:** when `speak()` returns false, show "Your phone's text-to-speech is off. Turn it on in your phone's accessibility settings." When `clearAfterSpeak` is on, clear afterwards (undoable).
3. **Copy:** `navigator.clipboard.writeText`, then a large toast "Copied" for 2 s. If it's denied: "Couldn't copy. Long-press the text and choose Copy."
4. **Undo:** a stack (max 50) of `{text, cursor}`, pushed before every app-made change (suggestion, phrase, fix, clear, recent) and at each word boundary while typing. Undo pops it and restores.
5. **Recent:** a `<dialog>` listing `memory.recent()`. A tap restores that sentence into the text box (undoable).
6. **Quick phrases:** `#phrases` shows `memory.pinned()`. A tap inserts the phrase, or speaks it when `phraseSpeaks` is on. `+` pins the current text (when it's not empty). On the very first start (no saved memory), pin "I need help", "Thank you", "Yes", "No" and "Please wait".

- [ ] **Step 1: Implement `speech.js` and the actions (points 1–6)**

- [ ] **Step 2: Check in the built-in browser**

1. Type `see you soon` and press Speak, then Copy. Expected: one commit only (in the console, `memory.toJSON().phrases['see you soon'].count === 1`, with a `window.__memory` handle exposed only when `location.hostname` is `127.0.0.1`).
2. Press Speak three times on three separate edits of `I need help` (clear it and retype it each time). Expected: the "Pin it" toast appears on the third. Pin it, and `#phrases` shows it.
3. Press Clear, then Undo. Expected: the text comes back.
4. Run the console with no errors.

- [ ] **Step 3: Commit** ("Predictor: actions, speech and quick phrases")

### Task 11: Settings and "What it has learned"

**Files:**
- Modify: `index.html`, `styles.css`, `js/app.js`

Behaviour:
1. **Settings `<dialog id="settings">`** (opened by a gear button labelled "Settings") has one large control per `DEFAULTS` key except `voiceURI`: segmented buttons for the choices and big switches for the on/off options. Voice is a `<select>` from `listVoices()`, with a speed slider and a Test button that speaks "This is how I sound." A "Pause learning" switch (`memory.paused`, saved with settings). A "Starter words" box ("Names, places, pets and other words you use", comma or newline separated) with an Add button → `memory.addStarterWords`, then add them to the matcher. Every change applies straight away and is saved.
2. **"What it has learned" `<dialog id="learned">`** shows the words list (display form, count, delete button) and the phrases list (text, pin toggle, delete). Buttons: Backup (downloads `predict-backup-YYYY-MM-DD.json` via a Blob link), Restore (file input → `readBackup` → a confirm dialog "Replace everything it has learned with this backup?" → replace the memory and settings, then rebuild the matcher; a null result shows "That file isn't a backup from this app. Nothing was changed."), and Start fresh (confirm "Delete everything it has learned? Your settings stay." → `memory.clearLearned()`).

- [ ] **Step 1: Implement both dialogs**

- [ ] **Step 2: Check in the built-in browser**

1. Set huge text and high contrast, then reload. Expected: both are kept.
2. Add the starter word `Maria`, then type `ma`. Expected: `Maria` is among the suggestions.
3. Back up, Start fresh, then Restore that file. Expected: the learned words come back.
4. Restore `tests/fixtures/not-a-backup.json` (create it as `{"hello": 1}`). Expected: the refusal message, with nothing changed.
5. Check that every control is reachable with the Tab key and has an accessible name (`read_page` filter interactive shows no unnamed buttons).

- [ ] **Step 3: Commit** ("Predictor: settings and learned-words page")

### Task 12: Removed

The first-run setup wizard was cut on 2026-10-24. Starter words and quick phrases live in settings (Tasks 10–11). Nothing to build.

### Task 13: Offline and install

**Files:**
- Create: `sw.js`, `manifest.webmanifest`, `icons/icon.svg`, `icons/icon-192.png`, `icons/icon-512.png`, `icons/apple-touch-icon.png` (180 px)
- Modify: `index.html` (manifest link, theme colour, apple-touch-icon, service worker registration)

**Interfaces:**
- `sw.js`: `const CACHE = 'predict-v1'`. On install, it precaches the app shell (every file in `index.html`, `styles.css`, `js/**`, `data/words.txt`, `manifest.webmanifest` and `icons/*`, listed explicitly). Fetch handling: cache-first for same-origin requests and for `fonts.gstatic.com` / `fonts.googleapis.com` (cached on first use). On activate, it deletes old caches. Bump `CACHE` on every release.
- Manifest: `name` "Predict", `short_name` "Predict", `display` standalone, `start_url` "./", `background_color` and `theme_color` matching the normal theme, with icons 192, 512 and the SVG (`sizes: "any"`, `purpose: "any maskable"` on the 512).
- Icons: a simple speech-bubble glyph, made as an SVG first. The PNGs are rendered from it with Python and Pillow (`pip install pillow` if it's missing) or the browser's canvas.

- [ ] **Step 1: Implement the service worker, manifest and icons**

- [ ] **Step 2: Check in the built-in browser**

1. Load the page, then use `javascript_tool` to check that `navigator.serviceWorker.controller` isn't null after a reload.
2. Stop `dev_server.py` and reload. Expected: the app loads and suggestions work.
3. Run the tests page once more. Expected: all pass.

- [ ] **Step 3: Commit** ("Predictor: offline and install")

### Task 14: Deploy notes and device checklist

**Files:**
- Create: `README.md`

Contents:
1. What it is (one paragraph).
2. Running it locally: `python dev_server.py`, then `/` for the app and `/tests/` for the tests.
3. **Putting it online (Jess's one-time step):** in the Cloudflare dashboard, go to Workers & Pages → Create → Pages → Connect to Git → `jdelsrv-hub/ACTS-Design` → production branch `main`, framework preset None, build command empty, build output directory `08-Website/predict`. Note that `dev_server.py`, `tests/` and `docs/` get published too, which is harmless. Optionally, add a Cloudflare Pages `_headers` rule later if needed.
4. **Releasing an update:** bump `CACHE` in `sw.js`, commit, and push.
5. **Device checklist** (from spec section 9), as checkboxes: mid-range Android and iPhone; suggestion speed; install and offline use; Speak; VoiceOver and TalkBack; a few days' trial with the person.

- [ ] **Step 1: Write the README**

- [ ] **Step 2: Run the whole test page one last time. Expected: all pass, with no console errors on the app page**

- [ ] **Step 3: Commit** ("Predictor: README with deploy steps and device checklist")
