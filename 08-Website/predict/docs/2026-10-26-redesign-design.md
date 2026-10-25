# Predict redesign: design

Date: 2026-10-26
Status: waiting for review
Source: the design team's handoff, "Mobile communication app development brief" v1.0 (26 October 2026), adapted by Jess's decisions below.
Builds on: `2026-10-24-text-predictor-design.md`. Everything there still applies unless this document changes it.

## 1. Decisions

- **Adopt from the brief:**
  - the four tabs: Keyboard, Suggested words, Favourite words, Quick phrases
  - green Speak, yellow Undo, red Clear, all with visible labels
  - Speak becomes Stop while speaking
  - Undo dimmed when there's nothing to undo
  - a settings cog at the top right
  - favourite words
  - paged panels with Previous, Next and green dots. There are no visible page numbers (Jess's change, see section 5)
- **Keep the phone's own keyboard.** There is no on-screen keyboard and no comma/space keys.
- **Settings apply instantly**, as now. There is no Save/Cancel.
- **Copy, Recent and "What it has learned"** move behind a **More** button beside the cog.
- **Everything already built stays:**
  - spelling underline and one-tap fix
  - long-press menu ("Hear it", "Don't suggest this")
  - tap safety and calm mode
  - learning on Speak and Copy, pause learning
  - backup and restore, starter words
  - high contrast, the Hyperlegible font, voice and speed, "speak each word", "clear after speaking", "quick phrases speak when tapped"
- **Not doing:** the on-screen keyboard, switch/scanning access, custom keyboard layouts, and the brief's "My Voice heading" (the app never had one).

## 2. Screen layout (top to bottom)

1. **Header:** the label "Your message" on the left, then **More** and the **Settings** cog on the right. Both are at least 48 px with accessible names.
2. **Composer:** the existing text box with its spelling mirror. It scrolls when the text is long.
3. **Actions:** three equal buttons, Speak, Undo and Clear, each at least 56 px tall.
4. **Tabs:** Keyboard, Suggested words, Favourite words, Quick phrases, in that order. Keyboard is selected when the app opens.
5. **Panel:** the content of the selected tab fills the remaining height.

The old top quick-phrase row and the old bottom action row (Copy, Recent, Learned, Settings) are removed.

## 3. The four panels

- **Keyboard:**
  - The suggestion strip shows the current 3–5 suggestions (the existing "number of suggestions" setting, default 3) in one row.
  - Selecting this tab puts focus in the text box, so the phone's keyboard opens below the strip.
  - Everything the strip does today stays: the fix button, long-press menu, tap safety and calm mode.
- **Suggested words:**
  - The same prediction result as the strip, from the same `gatherCandidates` and `rank` call, but up to 30 words, paged.
  - Its page resets to 1 whenever the result changes.
- **Favourite words:**
  - The person's own saved words, in their own order.
  - When there are none, an "Add favourite words" button opens Settings at the favourites section.
- **Quick phrases:**
  - The pinned phrases, in pin order and never reordered by use. There is no frequency sorting.
  - A "Save message as a phrase" button pins the current text, replacing the old "+".
  - The existing pin offer after 3 uses stays.

**Leaving the Keyboard tab:**
- Selecting any other tab takes focus out of the text box, so the phone keyboard closes and the panel has room.
- The cursor position and any selection are remembered first.

**Selecting a word or phrase:**
- A word from Suggested or Favourites, or a phrase from Quick phrases, goes in at the remembered cursor position, or replaces the remembered selection.
- It's one undoable step.
- It does not speak and does not switch tabs.
- Suggested words follow the same insertion rules as the strip (replace the partial word, capitalise at a sentence start, one space after).
- Favourites and phrases are inserted with a space before them when needed, and one space after.
- **Exception:** with "Quick phrases speak when tapped" switched on, a phrase speaks instead. That's the existing behaviour, and the Quick phrases panel shows "Tapping speaks" while it's on.

## 4. Actions

- **Speak:**
  - Disabled when the text is empty.
  - While speaking, the button reads **Stop**, and tapping it cancels speech straight away.
  - It goes back to Speak when speech ends, is cancelled or fails.
  - The text is never changed by speaking.
  - Learning on Speak and the speech-failure message are unchanged.
- **Undo:** disabled (dimmed, `aria-disabled`, not removed) when the undo stack is empty. Otherwise unchanged.
- **Clear:** unchanged. No confirmation, and Undo brings the text back.

## 5. Paging (Suggested, Favourite words, Quick phrases)

- **Layout:** two columns of large buttons. Labels wrap and are never cut off.
- **How many fit:** each collection's page size is however many rows fit the panel's height at the current text size, times 2. It's recalculated when the window resizes, text size changes or the phone rotates. There's always at least 2 per page.
- **Independent pages:** each collection remembers its own page while the app is open.
  - After a delete or a resize, the page is clamped so it's never past the last page.
  - Suggested resets to page 1 on new results.
- **Controls:** a row below the buttons with Previous, the dots, and Next. There's no "Page X of Y" text and no numbers on screen.
  - Previous is disabled on page 1 and Next on the last page. There's no wrapping.
  - **Dots that fade:**
    - The current page's dot is solid, larger and full strength.
    - Every other dot is smaller and lighter the further it is from the current page: one away is lighter, two away lighter again, and so on.
    - The faintest dot still keeps at least 3:1 contrast against the background, so it stays visible and tappable.
    - As the person pages forward, the fade moves with them.
  - Each dot is a button with a hit area of at least 48 px and the name "Go to page X of Y". The current one has `aria-current="page"`.
  - Show as many dots as fit on one line between Previous and Next, at most 7 and at least 3, centred on the current page. The row never wraps. Previous and Next still reach every page.
  - The whole row is hidden when there's only one page.
  - The page number stays available to screen readers through the dots' names and the announcement below; it just isn't shown.
- **Swipe:**
  - A horizontal swipe of at least 40 px that's more sideways than up-and-down changes one page: left goes forward, right goes back.
  - A swipe never selects the button it started on. Vertical or cancelled gestures select nothing.
- **Announcements:** page changes are announced politely ("Favourite words, page 2 of 3") through a visually hidden `aria-live="polite"` region. Prediction updates are not announced.
- **Motion:** there's no animation, which already holds under calm mode.

## 6. Tabs (accessibility)

- **Structure:** the WAI-ARIA tabs pattern, with `role="tablist"` labelled "Input", four `role="tab"` buttons with `aria-selected` and `aria-controls`, and four `role="tabpanel"` regions. Hidden panels use `hidden`, so they're skipped by focus and screen readers.
- **Keyboard:** the arrow keys move between tabs, and Home/End go to the first and last.
- **Look:** the selected tab has a filled style and a thick bottom edge, so it doesn't rely on colour alone.

## 7. Colours

Each theme defines its own action colours. Text contrast is at least 4.5:1 in every theme, and the focus ring stays visible on every button.

| Theme | Speak | Undo | Clear |
|---|---|---|---|
| Normal | green background, white text | yellow background, dark text | red background, white text |
| Dark | green, white text | yellow, black text | red, white text |
| High contrast (black on yellow) | black, yellow text, 3 px yellow border | black, yellow text, 3 px yellow border | black, yellow text, 3 px yellow border |

- **High contrast** drops the colour coding, because yellow-on-yellow can't work. The labels and fixed positions carry the meaning.
- **Disabled** buttons use reduced contrast plus `aria-disabled`, which is allowed for inactive controls.
- **Page dots** use the theme's green, or yellow in high contrast.

## 8. More menu

- **What it is:** a small modal `<dialog>` opened by the More button, with three large buttons:
  - **Copy:** the existing Copy behaviour, including learning and the toast.
  - **Recent:** opens the existing Recent list.
  - **What it has learned:** opens the existing page.
- **Closing:** Close and Escape shut it, and focus returns to More.

## 9. Settings changes

All existing settings stay and still apply instantly. Additions:

- **Show word predictions** (on/off, default on). When off, the strip and the Suggested words tab show nothing; the tab stays, saying "Word predictions are off" with a "Turn on" button.
- **Favourite words section:**
  - a list in the person's order, each with Rename, Remove, Move up and Move down buttons
  - an add box with an Add button
  - all buttons at least 48 px and named per item ("Move coffee up")
- **Quick phrases section:** the same controls for the pinned phrases. This replaces pin and unpin on the learned page, but the learned page keeps its pin toggle too.
- **Closing** Settings returns focus to the cog.

## 10. Data

- **Favourites in memory:** the memory snapshot gains `favourites: string[]`, in the person's order, with no duplicates (case-insensitive) and each entry trimmed and 1–60 characters long.
  - `memory.addFavourite`, `renameFavourite`, `removeFavourite`, `moveFavourite(index, delta)` and `favourites()` manage it.
  - Favourites are vocabulary, not learning: pause learning doesn't block them, and Start fresh keeps them.
- **Backups:** `validateSnapshot` accepts a missing `favourites` (older backups), treating it as `[]`. When it's present, it must be an array of strings.
- **Quick phrases:** they stay as the existing pins (`pins` in the snapshot). Rename means unpin the old text and pin the new text in the same position. A new `movePin(index, delta)` reorders them.
- **Settings:** `DEFAULTS` gains `showPredictions: true`.
- **Transient state:** the active tab, page positions, speaking state and remembered cursor are not saved. The app always opens on Keyboard, page 1.

## 11. Code structure

- **New `js/pager.js`:** pure paging logic, with no DOM.
  - `pageCount(n, perPage)`
  - `clampPage(page, n, perPage)`
  - `pageSlice(items, page, perPage)`
  - `dotWindow(page, count, max = 7)`
  - All unit-tested.
- **`js/memory.js` and `js/backup.js`:** favourites, `movePin`, and validation, with unit tests.
- **`js/speech.js`:** reports when speaking starts and ends (callbacks), so Speak can switch to Stop and back. It gets a `stop()` export.
- **`js/app.js`, `index.html` and `styles.css`:** the new layout, tabs, panels, More menu and settings sections.
- **`sw.js`:** the cache name goes to `predict-v3`, and `js/pager.js` is added to the precache list.

## 12. Error handling

- **No suggestions** (empty result, predictions off or the word list failed): the strip is empty, and Suggested shows a short status ("No suggestions yet", or "Word predictions are off").
- **Saving:** saving favourites or phrases uses the existing save path and banner.
- **Speech failure:** the existing message, and Speak returns from Stop.

## 13. Testing

- **Unit tests:** `pager.js`, favourites and `movePin` in memory, backup validation with and without `favourites`, `showPredictions` in `withDefaults`, and the speech start/end callbacks.
- **Browser checks** at mobile size, following the brief's acceptance checks that apply:
  - A01: opens on Keyboard, with the tabs in order.
  - A02: header and coloured actions, with no top phrase row.
  - A03: "I need wa" plus "water" gives "I need water ".
  - A04: a favourite or phrase replaces only the selection and doesn't speak.
  - A06: tabs and pages keep the draft, selection and undo.
  - A07–A09: swipe, dots and buttons all reach the same pages; no wrapping; a swipe never inserts.
  - A10: Clear, then Undo.
  - A11: Speak, Stop, and the text survives.
  - A13: huge text gives fewer per page and nothing unreachable.
  - A14: tab semantics and focus.
  - Plus: high-contrast colours, and the More menu.
- **Device checklist** in the README gains: switching tabs closes and reopens the phone keyboard correctly, swipe paging works on a real phone, and Stop cancels speech on Android and iPhone.
