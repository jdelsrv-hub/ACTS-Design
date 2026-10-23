// Epoch converter: Unix timestamp to date (local time and UTC), and a date back to a timestamp.
import { h, clear, uniqueId } from '../../core/dom.js';
import { optionsForm, button, copyButton, section } from '../../core/ui.js';

const LOCAL_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const show = (d, timeZone) => new Intl.DateTimeFormat('en-AU', { dateStyle: 'full', timeStyle: 'long', timeZone }).format(d);
const pad = (n) => String(n).padStart(2, '0');
const localValue = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

/** "1792573512" in seconds, milliseconds, microseconds or nanoseconds (worked out from its size) -> dates. null if not a number. */
export function fromTimestamp(input) {
  const s = String(input ?? '').trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  const a = Math.abs(n);
  const [unit, ms] = a >= 1e17 ? ['nanoseconds', n / 1e6] : a >= 1e14 ? ['microseconds', n / 1e3] : a >= 1e11 ? ['milliseconds', n] : ['seconds', n * 1000];
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return { unit, ms, local: show(d), utc: show(d, 'UTC'), iso: d.toISOString() };
}

/** "2026-10-20T19:05:12" read as local time or UTC -> { seconds, ms }. null if empty or invalid. */
export function toTimestamp(value, zone = 'local') {
  if (!value) return null;
  const ms = new Date(zone === 'utc' ? `${value}Z` : value).getTime();
  return Number.isNaN(ms) ? null : { seconds: Math.floor(ms / 1000), ms };
}

function readout(label) {
  const id = uniqueId('epoch');
  const input = h('input', { type: 'text', id, readonly: true, class: 'mono-input' });
  return {
    el: h('div', { class: 'opt' }, h('label', { class: 'field-label', for: id }, label), h('div', { class: 'opt-row' }, input, copyButton(() => input.value))),
    set: (t) => (input.value = t),
  };
}

export default {
  mount(root) {
    const now = new Date();
    const tsForm = optionsForm([{ id: 'ts', type: 'text', label: 'Unix timestamp', mono: true, help: 'Seconds or milliseconds. We work out which.' }], { ts: String(Math.floor(now / 1000)) }, () => showDate());
    const local = readout(`Local time (${LOCAL_ZONE})`);
    const utc = readout('UTC');
    const iso = readout('ISO 8601');
    const tsNote = h('p', { class: 'opt-help' });
    const nowBtn = button('Now', { variant: 'ghost', size: 'sm', icon: 'clock', onClick: () => { tsForm.set('ts', String(Math.floor(Date.now() / 1000))); showDate(); } });

    const dateForm = optionsForm([
      { id: 'date', type: 'datetime-local', label: 'Date and time' },
      { id: 'zone', type: 'segmented', label: 'Read it as', choices: [{ value: 'local', label: 'Local time' }, { value: 'utc', label: 'UTC' }] },
    ], { date: localValue(now), zone: 'local' }, () => showStamp());
    dateForm.el.querySelector('input[type="datetime-local"]').step = '1'; // allow seconds
    const secs = readout('Seconds');
    const millis = readout('Milliseconds');

    function showDate() {
      const r = fromTimestamp(tsForm.values().ts);
      local.set(r ? r.local : '');
      utc.set(r ? r.utc : '');
      iso.set(r ? r.iso : '');
      tsNote.textContent = r ? `Read as ${r.unit}.` : 'Enter a whole number, like 1792573512.';
    }
    function showStamp() {
      const { date, zone } = dateForm.values();
      const r = toTimestamp(date, zone);
      secs.set(r ? String(r.seconds) : '');
      millis.set(r ? String(r.ms) : '');
    }

    clear(root).append(
      section('Timestamp to date', tsForm.el, h('div', { class: 'run-bar' }, nowBtn, tsNote), h('div', { class: 'opts' }, local.el, utc.el, iso.el)),
      section('Date to timestamp', dateForm.el, h('div', { class: 'opts' }, secs.el, millis.el)),
    );
    showDate();
    showStamp();
  },
};
