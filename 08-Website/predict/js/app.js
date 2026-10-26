// Writing screen: wires the text box, suggestion buttons and long-press menu to the engine.
import { splitContext, capitalizeIfStart, applySuggestion, insertPhrase, shouldLearn, tokenize } from './text.js';
import { loadWordList, parseWordList } from './wordlist.js';
import { createMemory } from './memory.js';
import { createMatcher } from './spelling.js';
import { gatherCandidates, rank } from './mixer.js';
import { openStore } from './storage.js';
import { withDefaults } from './settings.js';
import { makeBackup, readBackup } from './backup.js';
import { speak, listVoices, onSpeaking, stop } from './speech.js';
import { createPagedPanel } from './panels.js';

const NO_MEMORY = "Can't remember things right now. Make a backup in What it has learned.";
const NO_SPEECH = "Your phone's text-to-speech is off. Turn it on in your phone's accessibility settings.";
const NO_COPY = "Couldn't copy. Long-press the text and choose Copy.";
const STARTER_PHRASES = ['I need help', 'Thank you', 'Yes', 'No', 'Please wait'];
const $ = id => document.getElementById(id);
const ta = $('text'), mirror = $('mirror'), sugg = $('suggestions'), menu = $('menu'), banner = $('banner');
const showBanner = text => { banner.textContent = text; banner.hidden = false; };

// iOS ignores interactive-widget and doesn't shrink 100dvh for its keyboard, so the page follows the visible area.
// Times scale, so a pinch zoom doesn't squash the layout.
const vv = window.visualViewport;
if (vv) {
  const fit = () => document.documentElement.style.setProperty('--vh', `${vv.height * vv.scale}px`);
  vv.addEventListener('resize', fit);
  fit();
}
const pagers = []; // every paged panel, re-measured whenever its space may have changed
const refreshPanels = () => pagers.forEach(p => p.refresh());
addEventListener('resize', refreshPanels);
vv?.addEventListener('resize', refreshPanels);
// A web font that arrives late changes every label's width, so pack the pages again.
document.fonts?.addEventListener('loadingdone', refreshPanels);
document.fonts?.ready.then(refreshPanels);

let store = await openStore(), memory, settings, wordList, saved;
try {
  saved = await store.get('memory');
  memory = createMemory(saved);
  settings = withDefaults(await store.get('settings'));
} catch {
  // Never start empty on the real store: the first save would overwrite what was learned.
  store = await openStore(null);
  saved = null;
  memory = createMemory();
  settings = withDefaults({});
}
try {
  wordList = await loadWordList();
} catch {
  // Speak, Copy and quick phrases must still work, so carry on with no word list.
  wordList = parseWordList('');
  showBanner("Couldn't load the word list. Suggestions will be limited. Close the app and open it again.");
}
memory.paused = settings.paused;
let matcher = createMatcher([...wordList.words(), ...memory.knownWords()]);

function applySettings() {
  Object.assign(document.documentElement.dataset, { size: settings.textSize, contrast: settings.contrast, font: settings.font });
  // Fetched only when chosen, so start-up never waits on Google Fonts.
  if (settings.font === 'hyperlegible' && !$('font')) {
    document.head.append(Object.assign(document.createElement('link'), { id: 'font', rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap' }));
  }
  refreshPanels(); // the text size sets how many buttons fit
}
applySettings();
if (!store.persistent) showBanner(NO_MEMORY);
if (location.hostname === '127.0.0.1') Object.defineProperty(window, '__memory', { get: () => memory }); // memory is replaced by Restore

let saveTimer = null;
function writeMemory() {
  clearTimeout(saveTimer);
  saveTimer = null;
  return store.set('memory', memory.toJSON()).then(() => true, () => { showBanner(NO_MEMORY); return false; });
}
function saveMemory() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(writeMemory, 1000);
}
// The phone may close a hidden page without warning, so a waiting save goes out now.
document.addEventListener('visibilitychange', () => { if (document.hidden && saveTimer) writeMemory(); });

if (!saved) { // first start
  STARTER_PHRASES.forEach(p => memory.pinPhrase(p));
  saveMemory();
}
listVoices(); // Chrome only starts loading its voices when asked, and the first Speak should find the chosen one
navigator.storage?.persist?.().catch(() => {}); // asks the browser not to clear what it has learned when space runs low

let lastLearned = null; // the sentence last committed, so Speak then Copy learns it once
const undoStack = [];   // {text, cursor}, newest last, max 50
let caret = { start: 0, end: 0 }; // where a word from another tab goes, kept while the text box is blurred
const typing = () => !$('panel-keyboard').hidden;
let lastBlock = null;  // the word just blocked, while blocking it is still the last thing done, so Undo can allow it again
const toastBox = $('toast');
let toastTimer, toastPin = null;

function hideToast() {
  clearTimeout(toastTimer);
  toastPin = null;
  toastBox.replaceChildren();
}
function toast(message, ms = 2000, pin) {
  clearTimeout(toastTimer);
  const nodes = [message];
  toastPin = pin;
  if (pin) {
    const b = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Pin it' });
    b.addEventListener('click', () => { memory.pinPhrase(pin); saveMemory(); renderPhrases(); toast(`Pinned "${pin}"`); });
    nodes.push(b);
  }
  toastBox.replaceChildren(...nodes);
  toastBox.hidePopover?.(); // hide then show moves it above any dialog opened since
  toastBox.showPopover?.();
  toastTimer = setTimeout(hideToast, ms);
}
toastBox.addEventListener('click', e => { if (!e.target.closest('button')) hideToast(); });

// Every change the app makes goes through here, so each one can be undone.
function remember() {
  if (ta.value === undoStack.at(-1)?.text) return;
  undoStack.push({ text: ta.value, cursor: ta.selectionStart });
  if (undoStack.length > 50) undoStack.shift();
}
function setText(text, cursor, undoable = true) {
  if (undoable) remember();
  ta.value = text;
  ta.setSelectionRange(cursor, cursor);
  caret = { start: cursor, end: cursor };
  if (typing()) ta.focus(); // on another tab the phone's keyboard stays closed
  else scrollToCaret(cursor);
  lastPick = lastLearned = lastBlock = null; // a changed text is a new message, and there is no pick or fix left to judge
  update(true);
}
// A text box without focus doesn't scroll to its cursor, so the text up to it is measured to show what went in.
function scrollToCaret(cursor) {
  const text = ta.value;
  ta.value = text.slice(0, cursor);
  const height = ta.scrollHeight;
  ta.value = text;
  ta.setSelectionRange(cursor, cursor);
  ta.scrollTop = height - ta.clientHeight;
}
function undo() {
  if (lastBlock) {
    memory.unblock(lastBlock);
    saveMemory();
    toast(`"${memory.display(lastBlock)}" can be suggested again`);
    lastBlock = null;
    return update(true);
  }
  let s;
  while ((s = undoStack.pop()) && s.text === ta.value);
  if (s) setText(s.text, s.cursor, false);
}

// The note (e.g. "Copied") and any pin offer share one toast: a pin is offered once only, so nothing may replace it.
function learn(text, note, ms = 2000) {
  lastBlock = null;
  refreshActions();
  let offer = null;
  if (shouldLearn(text, lastLearned)) {
    offer = memory.commit(text).offerPin;
    lastLearned = text;
    memory.knownWords().forEach(w => matcher.add(w));
    saveMemory();
  }
  if (offer) toast(`${note ? note + ' ' : ''}You say "${offer}" a lot.`, 6000, offer);
  else if (note) toast(note, ms);
}

// A failure can come after a pin offer is up, and an offer is made once only, so it is kept.
const noSpeech = () => toast(toastPin ? `${NO_SPEECH} You say "${toastPin}" a lot.` : NO_SPEECH, 6000, toastPin);
// Speech started late after all, so the failure message goes, but not a pin offer in it.
function speechStarted() {
  if (!toastBox.textContent.startsWith(NO_SPEECH)) return;
  if (toastPin) toast(`You say "${toastPin}" a lot.`, 6000, toastPin);
  else hideToast();
}
function say(text) {
  if (!speak(text, settings, noSpeech, speechStarted)) noSpeech();
}

// The empty-state button stands in for an empty list.
function renderFavourites() {
  const list = memory.favourites();
  $('add-favourites').hidden = list.length > 0;
  $('favourites').hidden = !list.length;
  favourites.set(list); // after the show and hide, so it measures the room that's left
}
function renderPhrases() {
  const list = memory.pinned();
  $('phrases-speak').hidden = !settings.phraseSpeaks;
  $('add-phrases').hidden = list.length > 0;
  $('phrases').hidden = !list.length;
  phrases.set(list);
}

let fix = null;      // {typed, word, prev, start, end}: the misspelled word just before the cursor
let lastPick = null; // {prev, word, cursor, text}: penalised if the very next input deletes it
let shown = null;    // text and cursor of the last update, to skip repeat work
let pending = null;  // suggestions held back while a finger is down (calm mode)
const down = new Set();

let suggestedKeys = new Map(), suggestedShown = null; // label to word for the Suggested words tab, and the labels it shows
const live = $('pager-live'), minPress = () => settings.tapSafety ? 300 : 0; // tap safety covers every paged list, like the strip
const suggested = createPagedPanel($('suggested'), { label: 'Suggested words', live, minPress, onPick(label) {
  const { value } = ta;
  choose(suggestedKeys.get(label), value.slice(0, caret.start) + value.slice(caret.end), caret.start);
} });
// Favourites and phrases go in whole at the remembered cursor, or over the remembered selection.
function insert(phrase) {
  const r = insertPhrase(ta.value, caret.start, caret.end, phrase);
  setText(r.text, r.cursor);
}
const favourites = createPagedPanel($('favourites'), { label: 'Favourite words', live, minPress, onPick: insert });
// One column: phrases are long, and two narrow columns wrap them over many lines.
const phrases = createPagedPanel($('phrases'), { label: 'Quick phrases', live, minPress, columns: 1, onPick: p => settings.phraseSpeaks ? say(p) : insert(p) });
pagers.push(suggested, favourites, phrases);
renderFavourites();
renderPhrases();
$('save-phrase').addEventListener('click', () => {
  const text = ta.value.trim();
  if (!text) return;
  memory.pinPhrase(text);
  saveMemory();
  renderPhrases();
  toast(`Pinned "${text}"`);
});

// After a space, a finished word the matcher doesn't know gets a fix offered.
function findFix(before) {
  const trimmed = before.trimEnd();
  if (trimmed === before) return null;
  const { context, partial: typed } = splitContext(trimmed);
  if (!typed || memory.has(typed)) return null; // a word they've spoken even once (a name, say) is theirs, not a slip
  const word = matcher.suggestFix(typed, t => memory.slipsFor(t), w => wordList.freq(w));
  if (!word || memory.isBlocked(word)) return null;
  return { typed, word, prev: context.at(-1), start: trimmed.length - typed.length, end: trimmed.length };
}

// aria-disabled, not disabled, so the buttons stay focusable and screen readers still find them.
const speakBtn = $('speak'), undoBtn = $('undo');
let speaking = false;
function refreshActions() {
  speakBtn.ariaDisabled = String(!speaking && !ta.value.trim());
  undoBtn.ariaDisabled = String(!lastBlock && !undoStack.some(s => s.text !== ta.value));
}
// Every speech path (Speak, Hear it, each word, quick phrases, Test voice) turns Speak into Stop.
onSpeaking(on => {
  speaking = on;
  speakBtn.firstElementChild.textContent = on ? '⏹︎' : '🔊';
  speakBtn.lastElementChild.textContent = on ? 'Stop' : 'Speak';
  refreshActions();
});

function update(force) {
  refreshActions();
  const { value } = ta, cur = document.activeElement === ta ? ta.selectionStart : caret.start;
  if (!force && shown === `${cur}:${value}`) return;
  shown = `${cur}:${value}`;
  const before = value.slice(0, cur);
  const { context, partial } = splitContext(before);
  // A fix is a suggestion too, so with predictions off there's no underline offering one.
  fix = partial || !settings.showPredictions ? null : findFix(before);

  if (fix) {
    const span = Object.assign(document.createElement('span'), { className: 'fix', textContent: value.slice(fix.start, fix.end) });
    mirror.replaceChildren(value.slice(0, fix.start), span, value.slice(fix.end) + ' ');
  } else {
    mirror.textContent = value + ' '; // the space keeps a trailing empty line as tall as the text box's
  }
  mirror.scrollTop = ta.scrollTop;

  // One result feeds both the strip (its first few) and the Suggested words tab (up to 30).
  let words = [];
  if (settings.showPredictions) {
    words = rank(gatherCandidates({ partial, context, matcher, memory, wordList }), { context, memory, wordList, limit: 30 });
    if (fix) words = [fix.word, ...words.filter(w => w !== fix.word)].slice(0, 30);
  }
  const base = before.slice(0, before.length - partial.length);
  const labels = words.map(w => capitalizeIfStart(w === fix?.word ? value.slice(0, fix.start) : base, memory.display(w)));
  // Screen readers can't see the outline on the best guess or the underline on the typed word.
  render(words.slice(0, settings.suggestionCount).map((w, i) =>
    [w, labels[i], labels[i] + (i ? '' : ', best guess') + (w === fix?.word ? `, fix for ${fix.typed}` : '')]));

  suggestedKeys = new Map(labels.map((label, i) => [label, words[i]]));
  $('predictions-off').hidden = settings.showPredictions;
  $('no-suggestions').hidden = !settings.showPredictions || words.length > 0;
  // Only a new result goes back to page 1, so paging isn't undone by a repeat update.
  if (labels.join('\n') !== suggestedShown) {
    suggestedShown = labels.join('\n');
    suggested.set(labels, { resetPage: true });
  }
}

function render(items) {
  if (down.size) { pending = items; return; }
  pending = null;
  sugg.replaceChildren(...items.map(([key, label, ariaLabel], i) => {
    const b = Object.assign(document.createElement('button'), { type: 'button', className: i ? 'sugg' : 'sugg best', textContent: label, ariaLabel });
    b.dataset.word = key;
    return b;
  }));
}

// The strip picks at the cursor; the Suggested words tab passes the text with the remembered selection taken out.
function choose(key, value = ta.value, cur = ta.selectionStart) {
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
  matcher.add(key);
  setText(r.text, r.cursor);
  lastPick = { prev, word: key, cursor: r.cursor, text: r.text };
  if (settings.speakEachWord) say(memory.display(key));
}

function openMenu(key) {
  menu.dataset.word = key;
  $('menu-word').textContent = memory.display(key);
  menu.returnValue = '';
  menu.showModal();
}

// A space or punctuation starts a new word, so undo steps back one word at a time.
ta.addEventListener('beforeinput', e => { if (/\s$/.test(e.data ?? '')) remember(); });
ta.addEventListener('input', e => {
  const p = lastPick;
  lastPick = lastLearned = lastBlock = null;
  if (p && e.inputType === 'deleteContentBackward') {
    const at = ta.selectionStart;
    // Removing just the space after the word (to type "." or ",") isn't a rejection; reaching the word is.
    if (at === p.cursor - 1 && /\s/.test(p.text[at])) lastPick = { ...p, cursor: at, text: ta.value };
    else { memory.penalize(p.prev, p.word); saveMemory(); }
  }
  update();
});
const keepCaret = () => { caret = { start: ta.selectionStart, end: ta.selectionEnd }; };
ta.addEventListener('blur', keepCaret);
document.addEventListener('selectionchange', () => { // cursor moved by a tap or arrow key
  if (document.activeElement === ta) keepCaret();
  if (lastPick && ta.selectionStart !== lastPick.cursor) lastPick = null;
  update();
});
ta.addEventListener('scroll', () => { mirror.scrollTop = ta.scrollTop; });

// Calm mode: suggestions never change under a finger.
addEventListener('pointerdown', e => {
  if (e.isPrimary) down.clear(); // a first finger means no other is down, even if a lift was missed
  down.add(e.pointerId);
}, true);
let press = null, holdTimer, armTimer;
const disarm = () => {
  clearTimeout(holdTimer);
  clearTimeout(armTimer);
  press?.b.classList.remove('armed');
};
for (const type of ['pointerup', 'pointercancel']) {
  addEventListener(type, e => {
    disarm();
    down.delete(e.pointerId);
    if (!down.size && pending) render(pending);
  }, true);
}

sugg.addEventListener('pointerdown', e => {
  const b = e.target.closest('.sugg');
  if (!b) return;
  e.preventDefault(); // keeps focus, and so the phone's keyboard, on the text box
  disarm();
  const p = press = { b, t: e.timeStamp, long: false, id: e.pointerId, type: e.pointerType };
  // With tap safety, the button shows when letting go will choose, and the menu waits longer so there's time to let go.
  if (settings.tapSafety) armTimer = setTimeout(() => b.classList.add('armed'), 300);
  holdTimer = setTimeout(() => { p.long = true; b.classList.remove('armed'); openMenu(b.dataset.word); }, settings.tapSafety ? 1000 : 500);
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
  // The phone's long-press comes at about 450 ms, so a finger or pen still down is left to the hold timer (1000 ms with tap safety).
  if (press && press.type !== 'mouse' && down.has(press.id)) return;
  if (!menu.open) openMenu(b.dataset.word);
});

$('hear').addEventListener('click', () => say(memory.display(menu.dataset.word)));
menu.addEventListener('close', () => {
  down.clear(); // the finger that opened the menu may lift over it, out of our sight
  press = null;
  if (menu.returnValue === 'block') { memory.block(lastBlock = menu.dataset.word); saveMemory(); }
  update(true);
});

update();

// The buttons keep focus on the text box, and so the phone's keyboard.
for (const id of ['actions', 'toast', 'tabs']) $(id).addEventListener('pointerdown', e => e.preventDefault());

// Tabs: the arrow keys, Home and End move between them, and Enter, Space or a tap selects one.
const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab) {
  for (const t of tabs) {
    t.ariaSelected = String(t === tab);
    t.tabIndex = t === tab ? 0 : -1;
    $(t.getAttribute('aria-controls')).hidden = t !== tab;
  }
  if (tab === tabs[0]) {
    ta.focus();
    ta.setSelectionRange(caret.start, caret.end);
  } else {
    ta.blur(); // closes the phone's keyboard so the panel has room; the blur keeps the caret
    refreshPanels(); // a hidden panel can't measure how many buttons fit
  }
}
$('tabs').addEventListener('click', e => { const t = e.target.closest('[role="tab"]'); if (t) selectTab(t); });
$('tabs').addEventListener('keydown', e => {
  const i = tabs.indexOf(e.target), n = tabs.length;
  const to = { ArrowRight: i + 1, ArrowLeft: i - 1 + n, Home: 0, End: n - 1 }[e.key];
  if (i < 0 || to === undefined) return;
  e.preventDefault();
  tabs[to % n].focus();
});
$('predictions-on').addEventListener('click', () => {
  changeSetting('showPredictions', true);
  suggested.focus(); // the button just went away
});

let spokeAt = -Infinity;
speakBtn.addEventListener('click', e => {
  if (e.timeStamp - spokeAt < 500) return; // a tremor's double tap mustn't stop the message it just started
  if (speaking) return stop();
  const text = ta.value;
  if (!text.trim()) return;
  const spoke = speak(text, settings, noSpeech, speechStarted);
  if (spoke) spokeAt = e.timeStamp;
  learn(text, spoke ? '' : NO_SPEECH, 6000);
  if (settings.clearAfterSpeak) setText('', 0);
});
$('copy').addEventListener('click', async () => {
  const text = ta.value;
  if (!text.trim()) return;
  try { await navigator.clipboard.writeText(text); } catch { return toast(NO_COPY, 6000); }
  learn(text, 'Copied');
});
undoBtn.addEventListener('click', undo);
$('clear').addEventListener('click', () => setText('', 0));

const moreBox = $('more-menu');
$('more').addEventListener('click', () => moreBox.showModal());
// Copy, Recent and What it has learned close the menu first, so Recent and the learned page open on their own.
moreBox.addEventListener('click', e => { if (e.target.closest('button')) moreBox.close(); }, true);
// Safari doesn't focus a tapped button, so focus goes back to More by hand, unless Recent or the learned page just opened.
moreBox.addEventListener('close', () => { if (!document.querySelector('dialog[open]')) $('more').focus(); });

const recent = $('recent');
$('open-recent').addEventListener('click', () => {
  const items = memory.recent().map(text => Object.assign(document.createElement('button'), { type: 'button', textContent: text }));
  $('recent-list').replaceChildren(...(items.length ? items : ['Nothing yet. Sentences you speak or copy show up here.']));
  recent.showModal();
});
$('recent-list').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  recent.close();
  setText(b.textContent, b.textContent.length);
});

// Settings

const settingsBox = $('settings'), learnedBox = $('learned'), confirmBox = $('confirm');
learnedBox.addEventListener('close', () => { if (typing()) ta.focus(); });
settingsBox.addEventListener('close', () => $('open-settings').focus());

function renderSettings() {
  for (const b of settingsBox.querySelectorAll('.seg button')) {
    b.setAttribute('aria-pressed', String(settings[b.closest('fieldset').dataset.key]) === b.dataset.value);
  }
  for (const i of settingsBox.querySelectorAll('input[data-key], select[data-key]')) {
    if (i.type === 'checkbox') i.checked = settings[i.dataset.key];
    else i.value = settings[i.dataset.key] ?? '';
  }
}

function changeSetting(key, value) {
  settings[key] = value;
  if (key === 'paused') memory.paused = value;
  applySettings();
  store.set('settings', settings).catch(() => showBanner(NO_MEMORY));
  if (key === 'suggestionCount' || key === 'showPredictions') update(true);
  if (key === 'phraseSpeaks') renderPhrases();
  renderSettings();
}

// From an empty panel, Settings opens at that list with its add box focused (focusing scrolls it into view).
function openSettings(focus) {
  settingsBox.showModal();
  renderSettings();
  settingsBox.querySelectorAll('[data-list]').forEach(renderList);
  focus?.focus();
  listVoices().then(voices => {
    settingsBox.querySelector('select').replaceChildren(new Option('Phone default', ''), ...voices.map(v => new Option(`${v.name} (${v.lang})`, v.voiceURI)));
    renderSettings();
  });
}
$('open-settings').addEventListener('click', () => openSettings());
$('add-favourites').addEventListener('click', () => openSettings($('favourite-input')));
$('add-phrases').addEventListener('click', () => openSettings($('phrase-input')));
settingsBox.addEventListener('click', e => {
  const b = e.target.closest('.seg button');
  if (!b) return;
  const n = Number(b.dataset.value);
  changeSetting(b.closest('fieldset').dataset.key, Number.isNaN(n) ? b.dataset.value : n);
});
settingsBox.addEventListener('change', e => {
  const { dataset: { key }, type, checked, value } = e.target;
  if (key) changeSetting(key, type === 'checkbox' ? checked : type === 'range' ? Number(value) : value || null);
});
$('test-voice').addEventListener('click', () => say('This is how I sound.'));
$('add-starters').addEventListener('click', () => {
  const box = $('starters'), tokens = tokenize(box.value);
  if (!tokens.length) return toast('Type a word first.');
  memory.addStarterWords(tokens.map(t => t.word));
  tokens.forEach(t => matcher.add(t.key));
  saveMemory();
  box.value = '';
  update(true);
  toast('Added');
});

// What it has learned

const li = (...nodes) => { const e = document.createElement('li'); e.append(...nodes); return e; };
const span = (textContent, className) => Object.assign(document.createElement('span'), { textContent, className });
const act = (textContent, ariaLabel, name, id) => {
  const b = Object.assign(document.createElement('button'), { type: 'button', textContent, ariaLabel });
  Object.assign(b.dataset, { act: name, id });
  return b;
};

// Favourite words and Quick phrases in Settings share one list editor. memory is read at call time, as Restore replaces it.
const lists = {
  favourites: { noun: 'word', items: () => memory.favourites(), name: w => w, render: () => renderFavourites(),
    add: w => memory.addFavourite(w), rename: (i, w) => memory.renameFavourite(i, w), remove: i => memory.removeFavourite(i), move: (i, d) => memory.moveFavourite(i, d) },
  phrases: { noun: 'phrase', items: () => memory.pinned(), name: p => `"${p}"`, render: () => renderPhrases(),
    add: p => !memory.pinned().includes(p) && (memory.pinPhrase(p), true), rename: (i, p) => memory.renamePin(i, p),
    remove: i => memory.unpinPhrase(memory.pinned()[i]), move: (i, d) => memory.movePin(i, d) },
};
const listOf = box => lists[box.dataset.list];
const rowButton = (box, i, name) => box.querySelectorAll('li')[i]?.querySelector(`[data-act="${name}"]`);

function renderList(box) {
  const kind = listOf(box), items = kind.items();
  box.querySelector('.list').replaceChildren(...(items.length ? items.map((text, i) => {
    const name = kind.name(text);
    // Up and Down are visible words inside the names, so speech control can say "click Up".
    const up = act('Up', `Move ${name} up`, 'up', i), down = act('Down', `Move ${name} down`, 'down', i);
    up.disabled = i === 0;
    down.disabled = i === items.length - 1;
    return li(span(text), act('Rename', `Rename ${name}`, 'rename', i), act('Remove', `Remove ${name}`, 'remove', i), up, down);
  }) : [li('Nothing yet.')]));
}

// Every change saves and redraws both this list and its panel.
function listChanged(box) {
  saveMemory();
  listOf(box).render();
  renderList(box);
}

// Rename edits in the row: a field, Save, Cancel, and a line saying why a name was refused.
function startRename(box, i) {
  renderList(box); // closes any other row being renamed
  const kind = listOf(box), text = kind.items()[i], row = box.querySelectorAll('li')[i];
  const input = Object.assign(document.createElement('input'), { type: 'text', value: text, ariaLabel: `Rename ${kind.name(text)}`, autocomplete: 'off' });
  if (kind.noun === 'word') input.maxLength = 60;
  const note = span('', 'note');
  note.setAttribute('role', 'status');
  row.replaceChildren(input, act('Save', null, 'save', i), act('Cancel', null, 'cancel', i), note);
  input.focus();
  input.select();
}

const refusal = (kind, text) => text ? `That ${kind.noun} is already there` : `Type a ${kind.noun} first`;

settingsBox.addEventListener('click', e => {
  const b = e.target.closest('[data-list] [data-act]');
  if (!b) return;
  const box = b.closest('[data-list]'), kind = listOf(box), i = Number(b.dataset.id), name = b.dataset.act;
  if (name === 'add') {
    const input = box.querySelector('label input'), text = input.value.trim(), note = box.querySelector(':scope > .note');
    if (!text || !kind.add(text)) return void (note.textContent = refusal(kind, text));
    input.value = note.textContent = '';
    listChanged(box);
  } else if (name === 'remove') {
    kind.remove(i);
    listChanged(box);
    // Focus stays in the list: the next row's Remove, else the one before, else the add box.
    (rowButton(box, i, 'remove') ?? rowButton(box, i - 1, 'remove') ?? box.querySelector('label input')).focus();
  } else if (name === 'up' || name === 'down') {
    const to = i + (name === 'up' ? -1 : 1);
    kind.move(i, to - i);
    listChanged(box);
    // The same button on the moved row, or its other move button once that row reaches the end.
    const same = rowButton(box, to, name);
    (same.disabled ? rowButton(box, to, name === 'up' ? 'down' : 'up') : same).focus();
  } else if (name === 'rename') {
    startRename(box, i);
  } else if (name === 'save') {
    const row = b.closest('li'), text = row.querySelector('input').value.trim();
    if (text !== kind.items()[i] && !kind.rename(i, text)) return void (row.querySelector('.note').textContent = refusal(kind, text));
    listChanged(box);
    rowButton(box, i, 'rename').focus();
  } else if (name === 'cancel') {
    renderList(box);
    rowButton(box, i, 'rename').focus();
  }
});
// In these boxes Enter would submit the form (closing Settings), so it adds or saves; in a rename, Escape cancels it.
settingsBox.addEventListener('keydown', e => {
  const input = e.target.closest('[data-list] input'), row = input?.closest('li');
  const name = e.key === 'Enter' ? (row ? 'save' : 'add') : e.key === 'Escape' && row ? 'cancel' : null;
  if (!input || !name) return;
  e.preventDefault();
  (row ?? input.closest('[data-list]')).querySelector(`[data-act="${name}"]`).click();
});

const pinButton = (text, pinned) => act(pinned ? 'Unpin' : 'Pin', `${pinned ? 'Unpin' : 'Pin'} "${text}"`, 'pin', text);

function renderLearned() {
  const fill = (id, items) => $(id).replaceChildren(...(items.length ? items : [li('Nothing yet.')]));
  fill('word-list', memory.words().map(w => li(span(w.display), span(`×${w.count}`, 'count'), act('Delete', `Delete ${w.display}`, 'del-word', w.key))));
  fill('phrase-list', memory.phrases().map(p => li(span(p.text), pinButton(p.text, p.pinned), act('Delete', `Delete "${p.text}"`, 'del-phrase', p.text))));
  fill('blocked-list', memory.blocked().map(w => li(span(memory.display(w)), act('Allow again', `Allow ${memory.display(w)} again`, 'unblock', w))));
}

$('open-learned').addEventListener('click', () => { renderLearned(); learnedBox.showModal(); });
learnedBox.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const { act: name, id } = b.dataset, item = b.closest('li');
  if (name === 'pin') {
    memory.pinned().includes(id) ? memory.unpinPhrase(id) : memory.pinPhrase(id);
    const next = pinButton(id, memory.pinned().includes(id));
    b.replaceWith(next);
    next.focus();
    renderPhrases();
  } else {
    // Focus moves on before the row goes, so a keyboard user isn't dropped at the top.
    ((item.nextElementSibling ?? item.previousElementSibling)?.querySelector('button') ?? learnedBox.querySelector('.close')).focus();
    item.remove();
    if (name === 'del-word') { memory.deleteWord(id); wordsDeleted = true; }
    else if (name === 'unblock') { memory.unblock(id); lastBlock = null; }
    else { memory.deletePhrase(id); renderPhrases(); }
  }
  saveMemory();
});

// The matcher has no remove, so it is rebuilt after words are deleted (when the page closes) or replaced.
let wordsDeleted = false;
const rebuildMatcher = () => { matcher = createMatcher([...wordList.words(), ...memory.knownWords()]); };
learnedBox.addEventListener('close', () => {
  if (wordsDeleted) { wordsDeleted = false; rebuildMatcher(); }
  update(true); // a word allowed again may belong in the suggestions now
});

// Replaces the learned words and phrases. Resolves true once saved.
function relearn() {
  rebuildMatcher();
  lastLearned = lastPick = null;
  renderFavourites();
  renderPhrases();
  renderLearned();
  update(true);
  return writeMemory();
}

function ask(message, yes) {
  $('confirm-text').textContent = message;
  $('confirm-yes').textContent = yes;
  confirmBox.returnValue = '';
  confirmBox.showModal();
  return new Promise(done => confirmBox.addEventListener('close', () => done(confirmBox.returnValue === 'yes'), { once: true }));
}

$('backup').addEventListener('click', () => {
  const href = URL.createObjectURL(new Blob([makeBackup(memory, settings)], { type: 'application/json' }));
  Object.assign(document.createElement('a'), { href, download: `predict-backup-${new Date().toLocaleDateString('en-CA')}.json` }).click();
  setTimeout(() => URL.revokeObjectURL(href), 10000);
});
$('restore').addEventListener('click', () => $('restore-file').click());
$('restore-file').addEventListener('change', async e => {
  const file = e.target.files[0];
  e.target.value = ''; // so the same file can be chosen again
  if (!file) return;
  const backup = readBackup(await file.text().catch(() => ''));
  if (!backup) return toast("That file isn't a backup from this app. Nothing was changed.", 6000);
  if (!await ask('Replace everything it has learned with this backup?', 'Replace')) return;
  memory = createMemory(backup.memory);
  settings = withDefaults(backup.settings);
  memory.paused = settings.paused;
  applySettings();
  store.set('settings', settings).catch(() => showBanner(NO_MEMORY));
  renderSettings();
  if (await relearn()) toast('Restored');
});
$('start-fresh').addEventListener('click', async () => {
  if (!await ask('Delete everything it has learned? Your settings stay.', 'Delete')) return;
  memory.clearLearned();
  STARTER_PHRASES.forEach(p => memory.pinPhrase(p)); // "I need help" is a safety aid
  if (await relearn()) toast('Started fresh');
});
