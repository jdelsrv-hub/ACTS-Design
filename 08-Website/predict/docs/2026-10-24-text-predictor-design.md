# Learning text predictor: design

Date: 2026-10-24
Status: approved in conversation, waiting for spec review

## 1. Purpose

A web app that predicts the next word as one particular person types, learns their own words and habits as they use it, and is comfortable for someone who:

- finds typing physically hard (needs fewer taps and big, forgiving targets),
- finds spelling or reading hard (needs forgiving matching and calm, clear suggestions),
- sometimes needs the device to speak for them,
- needs large, high-contrast text.

It is built first for one person Jess knows. They use a **touchscreen** phone or tablet, type in **English**, and use the text equally to **speak out loud** face to face and to **send** in messages.

### Success criteria

- A typical sentence of theirs takes clearly fewer taps than the plain phone keyboard. Target: at least 40% fewer keystrokes on their usual sentences after two weeks of use.
- Suggestions from the personal memory appear within 50 ms of a keystroke. The AI's refinement arrives within 400 ms of a pause on a mid-range Android phone, or is skipped.
- After a week or two, the suggestions noticeably match their own words, names and phrases.
- It works fully offline once it's installed and the model has downloaded.
- Nothing they type leaves the device.

### Out of scope for v1

Syncing between devices, multiple users, languages other than English, switch, scanning or eye-gaze control, accounts, analytics, and being listed on the acTS Tools site.

## 2. Architecture

The approach chosen is **approach B**: a personal learning engine plus a small AI language model running inside the browser.

Vanilla HTML, CSS and JavaScript (ES modules), with no framework and no build step, in line with the existing acTS sites. It's an installable web app (PWA) with a service worker for offline use.

| Unit | File | Job |
|---|---|---|
| Writing screen | `index.html`, `styles.css`, `app.js` | Layout, buttons, wiring between parts |
| Storage | `js/storage.js` | Reads and writes IndexedDB. Falls back to memory-only storage when it's blocked |
| Word list | `js/wordlist.js`, `data/words.txt` | About 20,000 common English words with frequencies (permissively licensed source; the licence is recorded in `data/LICENSE-words.txt`) |
| Personal memory | `js/memory.js` | Learns words, word pairs and triples, phrases and spelling slips. Recency decay |
| Spelling matcher | `js/spelling.js` | Sounds-like, slip-of-the-finger and learned-slip matching |
| AI model | `js/ai.js` (main thread), `js/ai-worker.js` (Web Worker) | Runs the model off the main thread and returns scores for candidate words |
| Mixer | `js/mixer.js` | Blends personal, word-list and AI scores into the top N suggestions |
| Speech | `js/speech.js` | Built-in phone voices through the Web Speech API |
| Settings | `js/settings.js` | Comfort settings, saved in storage |
| Offline and install | `sw.js`, `manifest.webmanifest`, `icons/` | Caches the app shell and makes it installable |

Each engine unit (`memory`, `spelling`, `mixer`, `wordlist`) is pure logic with no DOM access, so it can be tested in Node.

### Data flow per keystroke

1. `app.js` reads the text before the cursor and splits it into the context (previous words) and the current partial word.
2. **Fast path (always):** `spelling.js` finds candidate words for the partial word using the word list plus personal memory. `memory.js` scores them given the context. `mixer.js` returns the top N, and they're shown at once.
3. **Slow path (after a 250 ms pause, only if the model is loaded):** the context and the top roughly 50 candidates are sent to `ai-worker.js`. The worker runs one forward pass, scores each candidate by the probability of its first token or tokens, and posts the scores back. The mixer re-ranks the candidates. Stale replies, those where the text has changed since they were asked for, are thrown away.
4. Under **calm mode**, the suggestion buttons don't update while a finger is touching the screen. The update is applied when the finger lifts.

### AI model

- A small English causal language model, roughly 100–150 MB once quantised, in ONNX format, run with Transformers.js (WebGPU where available, WASM otherwise). First candidate: SmolLM2-135M. The final pick is confirmed during the build by size and speed on the test phone.
- The model **only ranks candidate words**. It never writes text of its own.
- The model files are too big for the static host's per-file limit, so they're downloaded once from the Hugging Face CDN and kept in the browser's Cache Storage. Only the model files are fetched; none of the person's text is sent.
- The download only starts automatically on Wi-Fi (where the browser exposes the connection type; otherwise after asking). A progress bar shows in setup and settings.
- **Speed guard:** the worker times each run. If the median run goes over 400 ms, the slow path is turned off for that device and a note appears in settings ("AI suggestions are off because this device is slow"). They can turn it back on there.
- It only runs while they're writing. Nothing runs in the background.
- The Transformers.js library file is stored with the app (not loaded from a CDN at runtime) so offline use works.

## 3. Screen layout and comfort

From top to bottom on a phone:

1. **Quick phrases bar:** saved phrases (for example "I need help", "Thank you", "Yes"). Tapping one adds it to the text, and a setting can make it speak straight away instead. **+** saves the current text as a phrase. It scrolls sideways when the list is long.
2. **Text box:** large text by default (about twice normal size), several lines tall.
3. **Suggestion buttons:** 3 by default (3, 4 or 5 in settings). Each is at least 56 px tall with gaps of 6 px or more. The best guess has a thicker outline. Tapping one replaces the current partial word and adds a space.
4. **Action row:** Speak (primary), Copy, Send, Undo, Clear, and Recent. Undo reverses the last action of any kind.
5. **The phone's own keyboard**, unchanged.

### Comfort settings

- **Text size:** large, extra large or huge.
- **Contrast:** normal, high contrast (black and yellow), or dark.
- **Font:** system font or Atkinson Hyperlegible. Optional extra letter and line spacing.
- **Number of suggestions:** 3, 4 or 5.
- **Calm mode:** no live updates under a finger, and no animations. It's on by default.
- **Tap safety:** off, short delay (a 300 ms hold before a tap counts), or hold to choose.
- **Speak each word:** off by default.
- **Clear after speaking:** off by default.
- **Auto-fix known slips:** off by default (see section 5).
- **Pause learning.**
- **Voice, speed and pitch, with a Test button.**
- **AI suggestions:** on or off, with model status and download progress.

### Accessibility

- Every control has a spoken label and works with VoiceOver and TalkBack.
- Contrast meets WCAG AA in normal mode and AAA in high-contrast mode.
- Every target is at least 48 px.
- The layout respects the phone's own text-size and reduced-motion settings.

## 4. Learning

**When it learns:** only when they press **Speak**, **Copy** or **Send**, and only when learning isn't paused. Half-typed and deleted text is never learned.

### What it stores (IndexedDB, on the device only)

- `words`: word → { count, lastUsed }. A new word is added on its first commit and is suggested from its second use onwards.
- `ngrams`: two-word and three-word sequences → { count, lastUsed }.
- `phrases`: whole committed sentences → { count, lastUsed, pinned }. At 3 uses the app offers to pin a phrase as a quick phrase. It offers once per phrase.
- `slips`: typed form → chosen word → count. A slip is recorded when they type a partial or misspelled word and then pick a suggestion different from what they typed.
- `blocked`: words they've chosen "Don't suggest this" for.
- `recent`: the last 20 committed sentences. Not saved while learning is paused.
- `settings`.

### Scoring

- Personal score is a simple interpolated trigram, bigram and unigram score, where each count is weighted by recency with a half-life of 30 days.
- **Mixer weight:** personal weight = min(0.8, n / (n + 500)), where n is the total number of committed words. Word list and AI share the rest. When the AI is off or not loaded, its share goes to the word list.
- A suggestion picked and then deleted straight away (within the next action) gets a small penalty on that context.
- Blocked words never appear.

### Their control

- **"What it has learned" page:** a searchable list of words and phrases, each with a delete button.
- **Pause learning** switch.
- **Backup:** downloads one JSON file with everything learned plus their settings.
- **Restore:** loads a backup file and replaces what's there, after asking to confirm.
- **Start fresh:** wipes everything learned, after asking to confirm. Settings are kept.

### Limits

Words, n-grams and phrases are capped (50,000, 200,000 and 2,000 entries). When a cap is reached, the entries with the lowest recency-weighted counts are removed first.

## 5. Spelling

Candidates for the partial word come from three matchers, all feeding the same buttons:

1. **Sounds-like:** Double Metaphone codes of the partial word compared with codes of known words ("fone" → phone, "nite" → night).
2. **Slip of the finger:** Damerau–Levenshtein distance up to 2 against word prefixes, with substitutions between neighbouring QWERTY keys costing less ("hwllo" → hello).
3. **Learned slips:** an exact match in `slips` scores highest.

Exact prefix matches always rank above fuzzy ones of the same strength.

### Showing corrections

- No silent autocorrect.
- When a finished word (followed by a space) isn't a known word and has a confident match, it gets a soft dotted underline, and the top suggestion becomes the fix. One tap replaces it.
- **Auto-fix known slips** (setting, off by default): once the same slip has been fixed to the same word 3 times, it's replaced automatically when they type a space. Undo reverts it.

### Reading help

- **Long-press a suggestion** to hear it spoken. The same long-press opens a small menu with "Don't suggest this".
- Atkinson Hyperlegible font and spacing options (section 3).

## 6. Speaking, copying and sending

- **Speak:** the Web Speech API with the phone's installed voices. Voice, speed and pitch come from settings. Speaking again while it's already speaking restarts from the beginning.
- **Speak each word** (setting): speaks each word as it's chosen.
- **Recent:** the last 20 sentences. Tapping one puts it back in the text box.
- **Copy:** the Clipboard API, followed by a large "Copied" message for 2 seconds.
- **Send:** the Web Share API, which opens the phone's share menu. When it isn't available, the button falls back to Copy.

## 7. Install and first-time setup

- Hosted on **Cloudflare Pages** (free) from the private GitHub repo, serving `08-Website/predict/` as-is (no build command). Jess needs a Cloudflare account to connect it. This is a one-time step Jess does.
- **Install:** open the link, then "Add to Home Screen". The app opens full screen with its own icon.
- **First-run setup** (done together with Jess, and can be skipped):
  1. text size and contrast,
  2. voice and speed (with a test),
  3. quick phrases,
  4. starter words: family names, places, pets and other words they use, added to `words` with a starting count of 3,
  5. AI model download, with progress shown. The app is usable while it downloads.

## 8. Error handling

| Problem | Behaviour |
|---|---|
| Model fails to download or load | The slow path stays off. Settings shows the reason and a Retry button. Suggestions carry on from memory and the word list |
| Model too slow | The speed guard turns the slow path off (section 2) |
| No speech voices | The Speak button shows how to turn on the phone's text-to-speech. Copy and Send still work |
| IndexedDB blocked or full | Memory-only storage, plus a gentle banner: "Can't remember things right now. Make a backup in settings." |
| Clipboard denied | A message asks them to long-press the text box and choose Copy |
| Corrupt backup file | Restore is refused with a plain message, and nothing is changed |

## 9. Testing

- **Unit tests** (Node's built-in test runner, `node --test`) for `memory`, `spelling`, `mixer` and `wordlist`: learning on commit only, recency decay, caps, blocked words, sounds-like and slip matching, learned slips, mixer weights, and backup round trip.
- **Browser check** in the built-in browser, at phone size: layout, settings, offline reload, and storage fallback.
- **Device check** on a mid-range Android phone and an iPhone: suggestion speed, AI speed guard, offline use after install, Speak, and VoiceOver and TalkBack.
- **Trial with the person** for at least a few days before calling v1 done. Keystroke savings are measured by comparing the taps used with the characters in the committed text (counted on the device and shown on the "What it has learned" page, never sent anywhere).
