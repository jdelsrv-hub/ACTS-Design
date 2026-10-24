import { test, eq, ok } from './harness.js';
import { speak, listVoices } from '../js/speech.js';

// Swaps in a fake speechSynthesis, utterance and timers while fn runs, so nothing really speaks or waits.
// fn gets the fake synth, the pending timers ({fn, ms} by id) and a flush that runs them all.
async function fake(voices, fn) {
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'speechSynthesis');
  const real = { U: globalThis.SpeechSynthesisUtterance, set: globalThis.setTimeout, clear: globalThis.clearTimeout };
  const synth = voices && { calls: [], getVoices: () => voices, cancel() { this.calls.push('cancel'); }, speak(u) { this.calls.push(u); },
    addEventListener() {}, removeEventListener() {} };
  const timers = new Map();
  let id = 0;
  Object.defineProperty(globalThis, 'speechSynthesis', { value: synth, configurable: true });
  globalThis.SpeechSynthesisUtterance = class extends EventTarget { constructor(text) { super(); this.text = text; } }; // the real one refuses a fake voice
  globalThis.setTimeout = (f, ms) => { timers.set(++id, { fn: f, ms }); return id; };
  globalThis.clearTimeout = t => timers.delete(t);
  const flush = () => { for (const [t, { fn: f }] of [...timers]) { timers.delete(t); f(); } };
  try { return await fn(synth, timers, flush); } finally {
    if (saved) Object.defineProperty(globalThis, 'speechSynthesis', saved); else delete globalThis.speechSynthesis;
    Object.assign(globalThis, { SpeechSynthesisUtterance: real.U, setTimeout: real.set, clearTimeout: real.clear });
  }
}
const fire = (u, type, error) => u.dispatchEvent(Object.assign(new Event(type), { error }));
const settings = { voiceURI: null, rate: 1 };

test('speak returns false only without speech support', async () => {
  ok(!await fake(undefined, () => speak('hi', settings)));
  await fake([], synth => { ok(speak('hi', settings)); eq(synth.calls[1].voice, null); });
});
test('speak cancels, then speaks with the chosen voice and rate', async () => {
  const voice = { voiceURI: 'b' };
  await fake([{ voiceURI: 'a' }, voice], synth => {
    ok(speak('hi there', { voiceURI: 'b', rate: 1.5 }));
    eq(synth.calls[0], 'cancel');
    const u = synth.calls[1];
    eq([u.text, u.rate, u.voice === voice], ['hi there', 1.5, true]);
  });
});
test('a chosen voice that is gone speaks with the phone default', async () => {
  await fake([{ voiceURI: 'a' }], synth => { speak('hi', { voiceURI: 'gone', rate: 1 }); eq(synth.calls[1].voice, null); });
});
test('a speech error reports a failure, being interrupted does not', async () => {
  await fake([], (synth, timers, flush) => {
    let fails = 0;
    speak('one', settings, () => fails++); fire(synth.calls[1], 'error', 'synthesis-failed'); eq(fails, 1);
    speak('two', settings, () => fails++); fire(synth.calls[3], 'error', 'interrupted');
    speak('three', settings, () => fails++); fire(synth.calls[5], 'error', 'canceled');
    flush(); eq(fails, 1);
  });
});
test('no start within 2 s reports a failure once', async () => {
  await fake([], (synth, timers, flush) => {
    let fails = 0;
    speak('hi', settings, () => fails++);
    eq([...timers.values()].map(t => t.ms), [2000]);
    flush(); fire(synth.calls[1], 'error', 'synthesis-failed'); eq(fails, 1);
  });
});
test('starting to speak is not a failure', async () => {
  await fake([], (synth, timers, flush) => {
    let fails = 0;
    speak('hi', settings, () => fails++); fire(synth.calls[1], 'start'); flush(); eq(fails, 0);
  });
});
test('listVoices gives up after 1 s when no voices ever load', async () => {
  await fake([], async (synth, timers, flush) => {
    const voices = listVoices();
    eq([...timers.values()].map(t => t.ms), [1000]);
    flush();
    eq(await voices, []);
  });
});
