// Writing screen: wires the text box, suggestion buttons and long-press menu to the engine.
import { splitContext, capitalizeIfStart, applySuggestion } from './text.js';
import { loadWordList } from './wordlist.js';
import { createMemory } from './memory.js';
import { createMatcher } from './spelling.js';
import { gatherCandidates, rank } from './mixer.js';
import { openStore } from './storage.js';
import { withDefaults } from './settings.js';

const NO_MEMORY = "Can't remember things right now. Make a backup in settings.";
const $ = id => document.getElementById(id);
const ta = $('text'), mirror = $('mirror'), sugg = $('suggestions'), menu = $('menu'), banner = $('banner');
const showBanner = text => { banner.textContent = text; banner.hidden = false; };

let store = await openStore(), memory, settings, wordList;
try {
  memory = createMemory(await store.get('memory'));
  settings = withDefaults(await store.get('settings'));
} catch {
  // Never start empty on the real store: the first save would overwrite what was learned.
  store = await openStore(null);
  memory = createMemory();
  settings = withDefaults({});
}
try {
  wordList = await loadWordList();
} catch (error) {
  showBanner("Can't load the word list. Close the app and open it again.");
  throw error;
}
const matcher = createMatcher([...wordList.words(), ...memory.knownWords()]);

// Task 11 calls this again after a settings change.
function applySettings() {
  Object.assign(document.documentElement.dataset, { size: settings.textSize, contrast: settings.contrast, font: settings.font });
  // Fetched only when chosen, so start-up never waits on Google Fonts.
  if (settings.font === 'hyperlegible' && !$('font')) {
    document.head.append(Object.assign(document.createElement('link'), { id: 'font', rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap' }));
  }
}
applySettings();
if (!store.persistent) showBanner(NO_MEMORY);
if (location.hostname === '127.0.0.1') window.__memory = memory;

let saveTimer = null;
function writeMemory() {
  clearTimeout(saveTimer);
  saveTimer = null;
  store.set('memory', memory.toJSON()).catch(() => showBanner(NO_MEMORY));
}
function saveMemory() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(writeMemory, 1000);
}
// The phone may close a hidden page without warning, so a waiting save goes out now.
document.addEventListener('visibilitychange', () => { if (document.hidden && saveTimer) writeMemory(); });

// shortcut: bare Web Speech call, Task 10 replaces it with speech.js speak()
function say(text) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = speechSynthesis.getVoices().find(v => v.voiceURI === settings.voiceURI) ?? null;
  u.rate = settings.rate;
  speechSynthesis.speak(u);
}

let fix = null;      // {typed, word, prev, start, end}: the misspelled word just before the cursor
let lastPick = null; // {prev, word, cursor, text}: penalised if the very next input deletes it
let shown = null;    // text and cursor of the last update, to skip repeat work
let pending = null;  // suggestions held back while a finger is down (calm mode)
const down = new Set();

// After a space, a finished word the matcher doesn't know gets a fix offered.
function findFix(before) {
  const trimmed = before.trimEnd();
  if (trimmed === before) return null;
  const { context, partial: typed } = splitContext(trimmed);
  if (!typed) return null;
  const word = matcher.suggestFix(typed, t => memory.slipsFor(t), w => wordList.freq(w));
  if (!word || memory.isBlocked(word)) return null;
  return { typed, word, prev: context.at(-1), start: trimmed.length - typed.length, end: trimmed.length };
}

function update(force) {
  const { value } = ta, cur = ta.selectionStart;
  if (!force && shown === `${cur}:${value}`) return;
  shown = `${cur}:${value}`;
  const before = value.slice(0, cur);
  const { context, partial } = splitContext(before);
  fix = partial ? null : findFix(before);

  if (fix) {
    const span = Object.assign(document.createElement('span'), { className: 'fix', textContent: value.slice(fix.start, fix.end) });
    mirror.replaceChildren(value.slice(0, fix.start), span, value.slice(fix.end) + ' ');
  } else {
    mirror.textContent = value + ' '; // the space keeps a trailing empty line as tall as the text box's
  }
  mirror.scrollTop = ta.scrollTop;

  const limit = settings.suggestionCount;
  let words = rank(gatherCandidates({ partial, context, matcher, memory, wordList }), { context, memory, wordList, limit });
  if (fix) words = [fix.word, ...words.filter(w => w !== fix.word)].slice(0, limit);
  const base = before.slice(0, before.length - partial.length);
  render(words.map(w => [w, capitalizeIfStart(w === fix?.word ? value.slice(0, fix.start) : base, memory.display(w))]));
}

function render(items) {
  if (down.size) { pending = items; return; }
  pending = null;
  sugg.replaceChildren(...items.map(([key, label], i) => {
    const b = Object.assign(document.createElement('button'), { type: 'button', className: i ? 'sugg' : 'sugg best', textContent: label });
    b.dataset.word = key;
    return b;
  }));
}

function choose(key) {
  const { value } = ta, cur = ta.selectionStart;
  let r, prev;
  if (key === fix?.word) {
    const word = capitalizeIfStart(value.slice(0, fix.start), memory.display(key));
    r = { text: value.slice(0, fix.start) + word + value.slice(fix.end), cursor: cur + word.length - (fix.end - fix.start) };
    memory.recordSlip(fix.typed, key);
    saveMemory();
    prev = fix.prev;
  } else {
    const { context, partial } = splitContext(value.slice(0, cur));
    r = applySuggestion(value, cur, memory.display(key));
    if (!key.startsWith(partial)) { memory.recordSlip(partial, key); saveMemory(); }
    prev = context.at(-1);
  }
  lastPick = { prev, word: key, cursor: r.cursor, text: r.text };
  matcher.add(key);
  ta.value = r.text;
  ta.setSelectionRange(r.cursor, r.cursor);
  if (settings.speakEachWord) say(memory.display(key));
  update();
}

function openMenu(key) {
  menu.dataset.word = key;
  $('menu-word').textContent = memory.display(key);
  menu.returnValue = '';
  menu.showModal();
}

ta.addEventListener('input', e => {
  const p = lastPick;
  lastPick = null;
  if (p && e.inputType === 'deleteContentBackward') {
    const at = ta.selectionStart;
    // Removing just the space after the word (to type "." or ",") isn't a rejection; reaching the word is.
    if (at === p.cursor - 1 && /\s/.test(p.text[at])) lastPick = { ...p, cursor: at, text: ta.value };
    else { memory.penalize(p.prev, p.word); saveMemory(); }
  }
  update();
});
document.addEventListener('selectionchange', () => { // cursor moved by a tap or arrow key
  if (lastPick && ta.selectionStart !== lastPick.cursor) lastPick = null;
  update();
});
ta.addEventListener('scroll', () => { mirror.scrollTop = ta.scrollTop; });

// Calm mode: suggestions never change under a finger.
addEventListener('pointerdown', e => {
  if (e.isPrimary) down.clear(); // a first finger means no other is down, even if a lift was missed
  down.add(e.pointerId);
}, true);
let press = null, holdTimer;
for (const type of ['pointerup', 'pointercancel']) {
  addEventListener(type, e => {
    clearTimeout(holdTimer);
    down.delete(e.pointerId);
    if (!down.size && pending) render(pending);
  }, true);
}

sugg.addEventListener('pointerdown', e => {
  const b = e.target.closest('.sugg');
  if (!b) return;
  e.preventDefault(); // keeps focus, and so the phone's keyboard, on the text box
  const p = press = { b, t: e.timeStamp, long: false };
  clearTimeout(holdTimer);
  holdTimer = setTimeout(() => { p.long = true; openMenu(b.dataset.word); }, 500);
});
sugg.addEventListener('click', e => {
  const b = e.target.closest('.sugg');
  if (!b) return;
  const p = press;
  press = null;
  // detail 0 means a keyboard, switch or screen reader activated it, so tap safety doesn't apply.
  if (e.detail && p && (p.long || p.b !== b || (settings.tapSafety && e.timeStamp - p.t < 300))) return;
  choose(b.dataset.word);
});
sugg.addEventListener('contextmenu', e => { // the menu key, a right-click, or the phone's own long-press
  const b = e.target.closest('.sugg');
  if (!b) return;
  e.preventDefault();
  if (!menu.open) openMenu(b.dataset.word);
});

$('hear').addEventListener('click', () => say(memory.display(menu.dataset.word)));
menu.addEventListener('close', () => {
  down.clear(); // the finger that opened the menu may lift over it, out of our sight
  press = null;
  if (menu.returnValue === 'block') { memory.block(menu.dataset.word); saveMemory(); }
  update(true);
});

update();
