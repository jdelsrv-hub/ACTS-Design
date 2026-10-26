# Predict redesign: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Predict's screen to the design team's layout (four tabs, coloured Speak/Stop, Undo and Clear, More menu, settings cog, favourite words, paged panels with fading dots) while keeping the phone's own keyboard and every existing feature.

**Architecture:** New pure helpers (`js/pager.js`, plus `insertPhrase` in `js/text.js`) and a small DOM component (`js/panels.js`) that renders one paged two-column panel, so `js/app.js` (520 lines today) only wires things together. Memory gains favourites and pin ordering. Speech gains start/end callbacks and `stop()`.

**Tech stack:** Unchanged. Vanilla ES modules, no build step. Tests run in the browser test page (`python dev_server.py`, then `/tests/`); there's no Node.

**Spec:** `08-Website/predict/docs/2026-10-26-redesign-design.md` (builds on `2026-10-24-text-predictor-design.md`).

## Global constraints

- All paths are relative to `08-Website/predict/`.
- Keep the phone's own keyboard. There's no on-screen keyboard.
- Settings apply instantly. There's no Save/Cancel.
- Keep every existing feature: spelling underline and fix, long-press menu, tap safety and calm mode, learning on Speak and Copy, pause learning, backup and restore, starter words, high contrast, the Hyperlegible font, voice and speed, speak each word, clear after speaking, and quick phrases speak when tapped.
- Targets of at least 48 px, action buttons at least 56 px tall, and suggestion buttons at least 56 px with gaps of 6 px or more.
- Text contrast of at least 4.5:1 in every theme, page dots at least 3:1, and a visible focus ring everywhere.
- No visible page numbers. Screen readers get "page X of Y" through dot names and a polite live region.
- Tabs follow the WAI-ARIA tabs pattern, and hidden panels use `hidden`.
- UI copy: sentence case, plain words, no "please", no exclamation marks.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Implementers don't push.

## Review focus

1. **A word or phrase chosen after switching tabs** goes in exactly at the remembered cursor, or replaces the remembered selection. That includes the middle of a word or sentence, with correct spacing. Tests in Task 1 (`insertPhrase`) and Task 5 (browser check).
2. **Removing the last item on the last page** never leaves a blank page. Test in Task 1 (`clampPage`) and Task 6.
3. **Huge text or a short screen** still shows at least one row per page, and every item stays reachable. Test in Task 1 (`packPages`).
4. **A swipe that starts on a word button** changes the page and never inserts the word. Test in Task 4 (synthetic pointer events).
5. **A backup made before favourites existed** still restores. Test in Task 2.

---

### Task 1: Pure helpers (pager and phrase insertion)

**Files:**
- Create: `js/pager.js`, `tests/pager.test.js`
- Modify: `js/text.js`, `tests/text.test.js`, `tests/run.js` (add to SPECS)

**Interfaces:**
- Produces, `js/pager.js`:
  - `perPage(panelHeight: number, rowHeight: number, columns = 2): number`. Gives `Math.max(2, Math.floor(panelHeight / rowHeight) * columns)`, and 2 when either input is ≤ 0.
  - `pageCount(n: number, size: number): number`, with a minimum of 1.
  - `clampPage(page: number, n: number, size: number): number`, in the range 0 to pageCount − 1. Pages are zero-based internally.
  - `pageSlice(items: any[], page: number, size: number): any[]`
  - `dotWindow(page: number, count: number, max = 7): number[]`. Gives the page indices to draw dots for: all of them when count ≤ max, otherwise a run of `max` that contains `page`, as centred as possible.
  - `dotLook(distance: number): {size: number, opacity: number}`. Distance 0 gives `{size: 16, opacity: 1}`. Otherwise `size = Math.max(8, 14 - 2 * distance)` and `opacity = Math.max(0.7, 1 - 0.1 * distance)`. The 0.7 floor keeps the faintest dot at least 3:1 on the normal background.
- Produces, `js/text.js`:
  - `insertPhrase(text: string, start: number, end: number, phrase: string): {text, cursor}`. Replaces `text.slice(start, end)` with the phrase. It adds one space before when the character before is not whitespace (and start > 0), and one space after unless whitespace already follows. The cursor ends after that space. It never doubles spaces.

- [ ] **Step 1: Write failing tests**

```js
test('perPage', () => { eq(perPage(400, 90), 8); eq(perPage(100, 90), 2); eq(perPage(0, 90), 2); });
test('pageCount and clampPage', () => { eq(pageCount(0, 6), 1); eq(pageCount(13, 6), 3); eq(clampPage(2, 12, 6), 1); eq(clampPage(-1, 5, 6), 0); });
test('pageSlice', () => eq(pageSlice([1, 2, 3, 4, 5], 1, 2), [3, 4]));
test('dotWindow', () => { eq(dotWindow(0, 3), [0, 1, 2]); eq(dotWindow(0, 10), [0, 1, 2, 3, 4, 5, 6]); eq(dotWindow(9, 10), [3, 4, 5, 6, 7, 8, 9]); eq(dotWindow(5, 10), [2, 3, 4, 5, 6, 7, 8]); });
test('dotLook fades with distance and keeps a floor', () => { eq(dotLook(0), {size: 16, opacity: 1}); eq(dotLook(1), {size: 12, opacity: 0.9}); eq(dotLook(5), {size: 8, opacity: 0.7}); });
test('insertPhrase at end, mid-sentence and over a selection', () => {
  eq(insertPhrase('I would like', 12, 12, 'coffee'), {text: 'I would like coffee ', cursor: 20});
  eq(insertPhrase('I want  now', 7, 7, 'tea'), {text: 'I want tea now', cursor: 11});
  eq(insertPhrase('I want milk now', 7, 11, 'tea'), {text: 'I want tea now', cursor: 11});
  eq(insertPhrase('', 0, 0, 'I need help'), {text: 'I need help ', cursor: 12});
});
```

- [ ] **Step 2: Run the test page.** Expected: the new tests fail (missing module/export).
- [ ] **Step 3: Implement the signatures above.**
- [ ] **Step 4: Run the test page.** Expected: all pass, the 107 existing included.
- [ ] **Step 5: Commit** ("Predict redesign: pager and phrase insertion helpers")

### Task 2: Favourites, pin order and the predictions setting

**Files:**
- Modify: `js/memory.js`, `js/backup.js`, `js/settings.js`
- Test: `tests/memory-controls.test.js`, `tests/backup.test.js`, `tests/storage.test.js`

**Interfaces:**
- Produces on Memory:
  - `favourites(): string[]` (a copy).
  - `addFavourite(word: string): boolean`. Trims; returns false (no change) when the word is empty, over 60 characters, or already present (case-insensitive).
  - `renameFavourite(index: number, word: string): boolean`, with the same rules.
  - `removeFavourite(index: number)`
  - `moveFavourite(index: number, delta: -1 | 1)`. Does nothing at the ends.
  - `movePin(index: number, delta: -1 | 1)`
  - `renamePin(index: number, text: string): boolean`. Trims; false when empty or already pinned. The new text replaces the old at the same index in `pins`; the old phrase entry stays in `phrases`, and the new one is created with count 0 when it's missing.
- Snapshot: gains `favourites: string[]` (default `[]`). `clearLearned()` keeps favourites. Pause learning doesn't block favourite changes.
- `validateSnapshot`: `favourites` may be missing. When present, it must be an array of strings. `createMemory` defaults it to `[]`.
- `DEFAULTS` gains `showPredictions: true` (boolean).

- [ ] **Step 1: Write failing tests**

```js
test('favourites keep order, refuse duplicates and blanks', () => { const m = createMemory(); ok(m.addFavourite(' coffee ')); ok(m.addFavourite('tea')); ok(!m.addFavourite('Coffee')); ok(!m.addFavourite('  ')); eq(m.favourites(), ['coffee', 'tea']); });
test('move, rename and remove favourites', () => { const m = createMemory(); ['a', 'b', 'c'].forEach(w => m.addFavourite(w)); m.moveFavourite(2, -1); eq(m.favourites(), ['a', 'c', 'b']); m.moveFavourite(0, -1); eq(m.favourites(), ['a', 'c', 'b']); ok(m.renameFavourite(1, 'cat')); m.removeFavourite(0); eq(m.favourites(), ['cat', 'b']); });
test('favourites survive Start fresh and work while paused', () => { const m = createMemory(); m.paused = true; ok(m.addFavourite('music')); m.clearLearned(); eq(m.favourites(), ['music']); });
test('movePin and renamePin', () => { const m = createMemory(); ['Yes', 'No', 'Wait'].forEach(p => m.pinPhrase(p)); m.movePin(2, -1); eq(m.pinned(), ['Yes', 'Wait', 'No']); ok(m.renamePin(0, 'Yes please')); eq(m.pinned(), ['Yes please', 'Wait', 'No']); ok(!m.renamePin(1, 'No')); });
test('old backups without favourites restore', () => { const s = createMemory().toJSON(); delete s.favourites; ok(validateSnapshot(s)); eq(createMemory(s).favourites(), []); });
test('favourites must be strings when present', () => { const s = createMemory().toJSON(); s.favourites = [3]; ok(!validateSnapshot(s)); });
test('withDefaults keeps showPredictions', () => eq(withDefaults({showPredictions: false}).showPredictions, false));
```

- [ ] **Step 2: Run the test page.** Expected: the new tests fail.
- [ ] **Step 3: Implement the interfaces above.**
- [ ] **Step 4: Run the test page.** Expected: all pass.
- [ ] **Step 5: Commit** ("Predict redesign: favourites, pin order, predictions setting")

### Task 3: Speech start, end and stop

**Files:**
- Modify: `js/speech.js`
- Test: `tests/speech.test.js` (fake speechSynthesis, no real waits)

**Interfaces:**
- `speak(text, opts, onFail, onLateStart)` keeps its signature and return value.
- New `onSpeaking(fn: (speaking: boolean) => void)` registers one listener. It's called with `true` when an utterance starts, and with `false` once when it ends, errors, fails the 2 s check, or is stopped.
- New `stop(): void` cancels speech and reports `false`. It never calls `onFail`.

- [ ] **Step 1: Write failing tests**
  - 'start then end reports true then false'
  - 'stop reports false and no failure'
  - 'a second speak while speaking reports false for the first only once, then true for the second'
- [ ] **Step 2: Run the test page.** Expected: the new tests fail.
- [ ] **Step 3: Implement it.** `settleCurrent` reports `false` for the superseded utterance.
- [ ] **Step 4: Run the test page.** Expected: all pass.
- [ ] **Step 5: Commit** ("Predict redesign: speech start, end and stop")

### Task 4: Paged panel component

**Files:**
- Create: `js/panels.js`, `tests/panels.test.js` (DOM tests in the browser test page)
- Modify: `styles.css` (grid, dots, nav row)

**Interfaces:**
- Consumes: `perPage`, `pageCount`, `clampPage`, `pageSlice`, `dotWindow`, `dotLook` (Task 1).
- Produces: `createPagedPanel(root: HTMLElement, {label: string, onPick: (item: string) => void, live: HTMLElement}): {set(items: string[], {resetPage = false} = {}): void, refresh(): void, page: number}`.
  - It renders into `root`: a two-column list of item buttons (labels wrap, never truncated), then a nav row with Previous, the dots and Next.
  - Page size comes from `perPage(available height for the grid, measured row height)`. `refresh()` recomputes it and clamps the page; call it on resize.
  - Previous is disabled on the first page and Next on the last. There's no wrapping.
  - Each dot is a button of at least 48 px with `aria-label="Go to page X of Y"`; the current one has `aria-current="page"`. The visible dot gets its size and opacity from `dotLook(|i − page|)`, in the theme's dot colour (CSS variable `--dot`).
  - The nav row is hidden when pageCount is 1.
  - A page change writes "<label>, page X of Y" to `live` (`aria-live="polite"`).
  - **Swipe:** on pointerdown/up within `root`, if |dx| ≥ 40 and |dx| > |dy|, change the page (left → next) and suppress the click that follows on any item button.
  - Clicking an item calls `onPick(item)`.
  - It does nothing about the empty state; the caller renders that.

- [ ] **Step 1: Write failing tests** (they create a fixed-size container in the test page)
  - 'renders items in pages with nav hidden for one page'
  - 'next, previous and dots reach the same pages and stop at the ends'
  - 'current dot is largest and others fade' (check the inline size and opacity against `dotLook`)
  - 'clamps after set() with fewer items' (on the last page, set a shorter list, and the page is still valid and non-empty)
  - 'a horizontal pointer swipe over an item changes page and does not call onPick'
  - 'a short vertical movement then click does call onPick'
  - 'announces the page in the live region'
- [ ] **Step 2: Run the test page.** Expected: the new tests fail.
- [ ] **Step 3: Implement `createPagedPanel`.**
- [ ] **Step 4: Run the test page.** Expected: all pass.
- [ ] **Step 5: Commit** ("Predict redesign: paged panel component")

### Task 5: New screen shell, actions and More menu

**Files:**
- Modify: `index.html`, `styles.css`, `js/app.js`

**Interfaces:**
- Consumes: `onSpeaking` and `stop` (Task 3).

What to build:

1. **Layout, top to bottom (spec section 2):**
   - A header: "Your message" label, then `#more` ("More") and `#open-settings` (the cog, `aria-label="Settings"`), both at the top right.
   - The composer (unchanged `#editor`).
   - `#actions` with Speak, Undo and Clear only.
   - A `#tabs` placeholder and a `#panels` placeholder for Task 6.
   - Remove the top `#phrases` row and the `#add-phrase` button from the top, and the bottom Copy, Recent, Learned and Settings buttons (their behaviour moves; keep the handlers).
2. **More dialog (`#more-menu`):** a `<dialog>` with three ≥ 56 px buttons, Copy, Recent and "What it has learned", which run the existing handlers. Close and Escape return focus to `#more`.
3. **Speak / Stop:**
   - Disabled (`aria-disabled="true"` and dimmed) when the text is empty after trimming.
   - While `onSpeaking(true)`, the label is "Stop" and a click calls `stop()`.
   - It goes back to Speak on `false`.
   - Quick-phrase speak, Hear it and speak each word also drive the label.
4. **Undo:** `aria-disabled` and dimmed while the undo stack is empty (and no pending block undo). It updates after every change.
5. **Colours (spec section 7):**
   - CSS variables per theme: `--speak-bg`, `--speak-fg`, `--undo-bg`, `--undo-fg`, `--clear-bg`, `--clear-fg` and `--dot`.
   - Normal and dark get green, yellow and red, each with text at least 4.5:1.
   - High contrast gets black buttons with yellow text and a 3 px yellow border, and `--dot` is yellow.
   - Disabled state is dimmed. The focus ring is visible on all.

- [ ] **Step 1: Build it**
- [ ] **Step 2: Browser check at mobile size**
  - A02: the header has More and the cog, there's no top phrase row, and the actions are green, yellow and red with labels.
  - Speak is disabled when the text is empty, shows Stop while speaking (stub speechSynthesis in the console if needed), and Stop returns it to Speak.
  - Undo is dimmed at start, enabled after typing a word, and dimmed again after undoing everything.
  - More opens the menu, Copy works, Recent and Learned open, and Escape returns focus to More.
  - In high contrast, the buttons are black with yellow text.
  - Check contrast of each action colour pair (compute it in the console) at ≥ 4.5:1.
  - The full test page still passes.
- [ ] **Step 3: Commit** ("Predict redesign: header, coloured actions with Stop, More menu")

### Task 6: Tabs, Keyboard and Suggested panels

**Files:**
- Modify: `index.html`, `styles.css`, `js/app.js`

**Interfaces:**
- Consumes: `createPagedPanel` (Task 4), `insertPhrase` (Task 1), `settings.showPredictions` (Task 2).

What to build:

1. **Tabs (spec section 6):**
   - `role="tablist"` labelled "Input", with tabs in order: Keyboard, Suggested words, Favourite words, Quick phrases.
   - Each tab has `aria-selected` and `aria-controls`. Arrow keys, Home and End move between tabs, and the selected tab has a thick bottom edge.
   - Four `role="tabpanel"` elements, with hidden ones using `hidden`.
   - Keyboard is selected at start.
   - One `#pager-live` visually hidden `aria-live="polite"` element serves all panels.
2. **Remembered cursor:**
   - Keep `caret = {start, end}`, updated on every `selectionchange` while the text box has focus.
   - Selecting any tab other than Keyboard blurs the text box, which closes the phone keyboard.
   - Selecting Keyboard focuses the text box and restores the selection range.
3. **Keyboard panel:** contains the existing `#suggestions` strip, with all its behaviour unchanged.
4. **Suggested panel:**
   - A paged panel fed by the same `gatherCandidates` + `rank` call as the strip, with `limit: 30`.
   - Labels use `capitalizeIfStart` and `memory.display`.
   - It calls `set(items, {resetPage: true})` only when the list differs from the last one.
   - Picking a word:
     - If `caret.start !== caret.end`, first delete the selection.
     - Then insert with the same `applySuggestion` path as the strip at `caret.start`, as one undoable step.
     - Record slips the same way the strip does.
     - Don't switch tabs or speak.
5. **Show word predictions off:**
   - The strip renders nothing.
   - The Suggested panel shows "Word predictions are off" plus a "Turn on" button that sets the setting.
   - An empty result shows "No suggestions yet".
6. **Resize:** on resize (window and `visualViewport`) and on text-size changes, call `refresh()` on every paged panel.

- [ ] **Step 1: Build it**
- [ ] **Step 2: Browser check at mobile size**
  - A01: opens on Keyboard, with the tabs in order.
  - A03: type "I need wa", choose "water" from the strip, and get "I need water ".
  - Type "I would li", switch to Suggested, and choose "like". The text is "I would like ", and focus didn't return to the text box.
  - A06: put a selection mid-text, switch tabs and page, and come back to Keyboard. The selection is restored, and Undo still undoes the earlier edit.
  - Arrow keys move between tabs, and hidden panels aren't reachable with Tab.
  - Turn predictions off and see the empty strip and the Suggested message. "Turn on" restores them.
  - The full test page still passes.
- [ ] **Step 3: Commit** ("Predict redesign: tabs, keyboard strip and suggested words")

### Task 7: Favourite words, quick phrases and their settings

**Files:**
- Modify: `index.html`, `styles.css`, `js/app.js`

**Interfaces:**
- Consumes: the memory favourites and pin API (Task 2), `createPagedPanel` (Task 4), `insertPhrase` (Task 1), and the caret from Task 6.

What to build:

1. **Favourite words panel:**
   - A paged panel of `memory.favourites()`.
   - A pick inserts with `insertPhrase(text, caret.start, caret.end, word)` as one undoable step. It doesn't speak.
   - When empty, it shows "Add favourite words", which opens Settings scrolled to the favourites section with its add box focused.
2. **Quick phrases panel:**
   - A paged panel of `memory.pinned()`.
   - A pick inserts the same way, unless `settings.phraseSpeaks` is on, in which case it speaks (as today). The panel then shows the line "Tapping speaks".
   - A "Save message as a phrase" button pins the trimmed current text, and does nothing when it's empty.
   - The existing pin-offer toast stays and re-renders the panel when pinning.
   - When empty, it shows an "Add a quick phrase" button that opens Settings at the phrases section.
3. **Settings sections (instant apply, spec section 9):**
   - A "Show word predictions" switch.
   - A "Favourite words" section: a list where each row has the word plus Rename, Remove, Move up and Move down buttons (≥ 48 px, `aria-label` such as "Move coffee up"; Move up is disabled on the first row and Move down on the last). Rename uses an inline text field with Save and Cancel buttons for that row, not `window.prompt`. There's an add box with an Add button, and a refused add shows "That word is already there" or "Type a word first".
   - A "Quick phrases" section with the same controls, using `movePin`, `renamePin`, `unpinPhrase` and `pinPhrase`.
   - Every change saves memory with the existing `saveMemory()` and re-renders the affected panel. Render with `textContent` only.
   - Closing Settings returns focus to the cog.
4. **Learned page:** keeps its pin toggle. Re-render the Quick phrases panel when it changes.

- [ ] **Step 1: Build it**
- [ ] **Step 2: Browser check at mobile size**
  - Add 13 favourites. Pages, dots and swipe all reach every page, the dots fade with distance, and there are no page numbers on screen.
  - A04: select a word mid-sentence, open Favourites and pick one. Only the selection is replaced, and nothing is spoken.
  - Remove the only item on the last page. The view moves to the previous page, with no blank page.
  - Huge text gives fewer items per page, and nothing is cut off or unreachable.
  - Reorder and rename favourites and phrases, then reload. The order persists.
  - Back up, Start fresh, then Restore. Favourites survive Start fresh, and restore correctly.
  - Turn phraseSpeaks on: "Tapping speaks" shows, and a tap speaks.
  - The full test page still passes.
- [ ] **Step 3: Commit** ("Predict redesign: favourite words, quick phrases and their settings")

### Task 8: Offline cache, README and acceptance pass

**Files:**
- Modify: `sw.js`, `README.md`

What to do:

1. **`sw.js`:** change `CACHE` to `'predict-v3'`, and add `js/pager.js` and `js/panels.js` to `SHELL`.
2. **README:**
   - Describe the new layout in a couple of sentences.
   - Device checklist additions: switching tabs closes and reopens the phone keyboard correctly; swipe paging works on a real phone; Stop cancels speech on Android and iPhone; dots are visible in all three themes.

- [ ] **Step 1: Make the changes**
- [ ] **Step 2: Acceptance pass at mobile size.** Run each spec section 13 check once more on the finished app: A01–A04, A06–A11, A13, A14, high contrast, and the More menu. Also run the full test page.
- [ ] **Step 3: Commit** ("Predict redesign: offline cache v3 and README")
