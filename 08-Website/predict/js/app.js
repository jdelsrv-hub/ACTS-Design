// Writing screen: wires the text box, suggestion buttons and long-press menu to the engine.
import { splitContext, capitalizeIfStart, applySuggestion, shouldLearn, tokenize } from './text.js';
import { loadWordList } from './wordlist.js';
import { createMemory } from './memory.js';
import { createMatcher } from './spelling.js';
import { gatherCandidates, rank } from './mixer.js';
import { openStore } from './storage.js';
import { withDefaults } from './settings.js';
import { makeBackup, readBackup } from './backup.js';
import { speak, listVoices } from './speech.js';

const NO_MEMORY = "Can't remember things right now. Make a backup in settings.";
const NO_SPEECH = "Your phone's text-to-speech is off. Turn it on in your phone's accessibility settings.";
const NO_COPY = "Couldn't copy. Long-press the text and choose Copy.";
const STARTER_PHRASES = ['I need help', 'Thank you', 'Yes', 'No', 'Please wait'];
const $ = id => document.getElementById(id);
const ta = $('text'), mirror = $('mirror'), sugg = $('suggestions'), menu = $('menu'), banner = $('banner');
const showBanner = text => { banner.textContent = text; banner.hidden = false; };

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
} catch (error) {
  showBanner("Can't load the word list. Close the app and open it again.");
  throw error;
}
memory.paused = settings.paused;
let matcher = createMatcher([...wordList.words(), ...memory.knownWords()]);

function applySettings() {
  Object.assign(document.documentElement.dataset, { size: settings.textSize, contrast: settings.contrast, font: settings.font });
  // Fetched only when chosen, so start-up never waits on Google Fonts.
  if (settings.font === 'hyperlegible' && !$('font')) {
    document.head.append(Object.assign(document.createElement('link'), { id: 'font', rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap' }));
  }
}
applySettings();
if (!store.persistent) showBanner(NO_MEMORY);
if (location.hostname === '127.0.0.1') Object.defineProperty(window, '__memory', { get: () => memory }); // memory is replaced by Restore

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

if (!saved) { // first start
  STARTER_PHRASES.forEach(p => memory.pinPhrase(p));
  saveMemory();
}
listVoices(); // Chrome only starts loading its voices when asked, and the first Speak shouldn't fail for that

let lastLearned = null; // the sentence last committed, so Speak then Copy learns it once
const undoStack = [];   // {text, cursor}, newest last, max 50
const toastBox = $('toast');
let toastTimer;

function toast(message, ms = 2000, pin) {
  clearTimeout(toastTimer);
  const nodes = [message];
  if (pin) {
    const b = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Pin it' });
    b.addEventListener('click', () => { memory.pinPhrase(pin); saveMemory(); renderPhrases(); toast(`Pinned "${pin}"`); });
    nodes.push(b);
  }
  toastBox.replaceChildren(...nodes);
  toastBox.hidePopover(); // hide then show moves it above any dialog opened since
  toastBox.showPopover();
  toastTimer = setTimeout(() => toastBox.replaceChildren(), ms);
}

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
  ta.focus();
  lastPick = lastLearned = null; // a changed text is a new message, and there is no pick or fix left to judge
  update(true);
}
function undo() {
  let s;
  while ((s = undoStack.pop()) && s.text === ta.value);
  if (s) setText(s.text, s.cursor, false);
}

// The note (e.g. "Copied") and any pin offer share one toast: a pin is offered once only, so nothing may replace it.
function learn(text, note, ms = 2000) {
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

function say(text) {
  if (!speak(text, settings)) toast(NO_SPEECH, 6000);
}

function renderPhrases() {
  $('phrases').replaceChildren(...memory.pinned().map(p => Object.assign(document.createElement('button'), { type: 'button', textContent: p })), $('add-phrase'));
}
renderPhrases();

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
  matcher.add(key);
  setText(r.text, r.cursor);
  lastPick = { prev, word: key, cursor: r.cursor, text: r.text };
  if (settings.speakEachWord) speak(memory.display(key), settings);
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
  lastPick = lastLearned = null;
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

$('hear').addEventListener('click', () => speak(memory.display(menu.dataset.word), settings));
menu.addEventListener('close', () => {
  down.clear(); // the finger that opened the menu may lift over it, out of our sight
  press = null;
  if (menu.returnValue === 'block') { memory.block(menu.dataset.word); saveMemory(); }
  update(true);
});

update();

// The buttons keep focus on the text box, and so the phone's keyboard.
for (const id of ['actions', 'phrases']) $(id).addEventListener('pointerdown', e => e.preventDefault());

$('speak').addEventListener('click', () => {
  const text = ta.value;
  if (!text.trim()) return;
  const spoke = speak(text, settings);
  learn(text, spoke ? '' : NO_SPEECH, 6000);
  if (settings.clearAfterSpeak) setText('', 0);
});
$('copy').addEventListener('click', async () => {
  const text = ta.value;
  if (!text.trim()) return;
  try { await navigator.clipboard.writeText(text); } catch { return toast(NO_COPY, 6000); }
  learn(text, 'Copied');
});
$('undo').addEventListener('click', undo);
$('clear').addEventListener('click', () => setText('', 0));

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

$('phrases').addEventListener('click', e => {
  if (e.target.closest('#add-phrase')) {
    const text = ta.value.trim();
    if (!text) return toast('Write a phrase first, then press +.');
    memory.pinPhrase(text);
    saveMemory();
    renderPhrases();
    return toast(`Pinned "${text}"`);
  }
  const phrase = e.target.closest('button')?.textContent;
  if (!phrase) return;
  if (settings.phraseSpeaks) return say(phrase);
  const { value, selectionStart: start, selectionEnd: end } = ta;
  const lead = start && !/\s$/.test(value.slice(0, start)) ? ' ' : '';
  setText(value.slice(0, start) + lead + phrase + value.slice(end), start + lead.length + phrase.length);
});

// Settings

const settingsBox = $('settings'), learnedBox = $('learned'), confirmBox = $('confirm');
for (const box of [settingsBox, learnedBox]) box.addEventListener('close', () => ta.focus());

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
  if (key === 'suggestionCount') update(true);
  renderSettings();
}

$('open-settings').addEventListener('click', () => {
  settingsBox.showModal();
  renderSettings();
  listVoices().then(voices => {
    settingsBox.querySelector('select').replaceChildren(new Option('Phone default', ''), ...voices.map(v => new Option(`${v.name} (${v.lang})`, v.voiceURI)));
    renderSettings();
  });
});
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
const pinButton = (text, pinned) => act(pinned ? 'Unpin' : 'Pin', `${pinned ? 'Unpin' : 'Pin'} "${text}"`, 'pin', text);

function renderLearned() {
  const fill = (id, items) => $(id).replaceChildren(...(items.length ? items : [li('Nothing yet.')]));
  fill('word-list', memory.words().map(w => li(span(w.display), span(`×${w.count}`, 'count'), act('Delete', `Delete ${w.display}`, 'del-word', w.key))));
  fill('phrase-list', memory.phrases().map(p => li(span(p.text), pinButton(p.text, p.pinned), act('Delete', `Delete "${p.text}"`, 'del-phrase', p.text))));
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
    if (name === 'del-word') { memory.deleteWord(id); update(true); } // shortcut: the matcher keeps the word, but rank reads memory, so it stops being suggested; rebuilt on next start
    else { memory.deletePhrase(id); renderPhrases(); }
  }
  saveMemory();
});

// Replaces the learned words and phrases: the matcher has no remove, so it is rebuilt.
function relearn() {
  matcher = createMatcher([...wordList.words(), ...memory.knownWords()]);
  lastLearned = lastPick = null;
  renderPhrases();
  renderLearned();
  update(true);
  saveMemory();
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
  relearn();
  toast('Restored');
});
$('start-fresh').addEventListener('click', async () => {
  if (!await ask('Delete everything it has learned? Your settings stay.', 'Delete')) return;
  memory.clearLearned();
  relearn();
  toast('Started fresh');
});
