import { test, eq, ok } from './harness.js';
import { speak, listVoices, onSpeaking, stop, resync } from '../js/speech.js';

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
const msg = { message: true }; // only a message turns Speak into Stop

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
test('speaking again before the first starts is not a failure', async () => {
  await fake([], (synth, timers, flush) => {
    let fails = 0;
    speak('one', settings, () => fails++); speak('two', settings, () => fails++); fire(synth.calls[3], 'start'); flush(); eq(fails, 0);
  });
});
test('an error with no code is not a failure, and the 2 s wait still runs', async () => {
  await fake([], (synth, timers) => {
    let fails = 0;
    speak('hi', settings, () => fails++); fire(synth.calls[1], 'error'); eq([fails, timers.size], [0, 1]);
  });
});
test('a start after the 2 s failure reports the recovery', async () => {
  await fake([], (synth, timers, flush) => {
    let fails = 0, recovered = 0;
    speak('hi', settings, () => fails++, () => recovered++);
    fire(synth.calls[1], 'start'); eq(recovered, 0);
    speak('late', settings, () => fails++, () => recovered++);
    flush(); fire(synth.calls[3], 'start'); eq([fails, recovered], [1, 1]);
  });
});
// stop() first: an earlier test's utterance may still be speaking, and superseding it would report false to this listener.
const watch = synth => { stop(); synth.calls.length = 0; const seen = []; onSpeaking(v => seen.push(v)); return seen; };
test('start then end reports true then false', async () => {
  await fake([], synth => {
    const seen = watch(synth);
    speak('hi', settings, undefined, undefined, msg); fire(synth.calls[1], 'start'); eq(seen, [true]);
    fire(synth.calls[1], 'end'); fire(synth.calls[1], 'end'); eq(seen, [true, false]);
  });
});
test('stop reports false and no failure', async () => {
  await fake([], (synth, timers) => {
    const seen = watch(synth);
    let fails = 0;
    speak('hi', settings, () => fails++, undefined, msg); fire(synth.calls[1], 'start');
    stop(); eq([synth.calls.at(-1), seen, timers.size], ['cancel', [true, false], 0]);
    fire(synth.calls[1], 'error', 'interrupted'); eq([fails, seen], [0, [true, false]]);
    stop(); eq(seen, [true, false]);
  });
});
test('a second speak while speaking reports false for the first only once, then true for the second', async () => {
  await fake([], synth => {
    const seen = watch(synth);
    speak('one', settings, undefined, undefined, msg); fire(synth.calls[1], 'start');
    speak('two', settings, undefined, undefined, msg); fire(synth.calls[1], 'error', 'interrupted'); fire(synth.calls[1], 'end');
    fire(synth.calls[3], 'start'); eq(seen, [true, false, true]);
  });
});
test('no start within 2 s reports false once, and a late start reports true then false', async () => {
  await fake([], (synth, timers, flush) => {
    const seen = watch(synth);
    speak('hi', settings, undefined, undefined, msg); flush(); fire(synth.calls[1], 'error', 'synthesis-failed'); eq(seen, [false]);
    fire(synth.calls[1], 'start'); fire(synth.calls[1], 'end'); eq(seen, [false, true, false]);
  });
});
test('a word echo, Hear it or Test voice never reports speaking, so Speak stays Speak', async () => {
  await fake([], (synth, timers, flush) => {
    const seen = watch(synth);
    speak('word', settings); fire(synth.calls[1], 'start'); fire(synth.calls[1], 'end');
    speak('late', settings); flush(); fire(synth.calls[3], 'error', 'synthesis-failed');
    eq(seen, []);
  });
});
test('a message spoken during a word echo cancels the echo and reports speaking', async () => {
  await fake([], synth => {
    const seen = watch(synth);
    speak('word', settings); fire(synth.calls[1], 'start');
    speak('the message', settings, undefined, undefined, msg);
    eq([synth.calls[2], synth.calls[3].text], ['cancel', 'the message']);
    fire(synth.calls[1], 'error', 'interrupted'); fire(synth.calls[3], 'start'); eq(seen, [true]);
  });
});
test('a word spoken over a message reports the message stopped', async () => {
  await fake([], synth => {
    const seen = watch(synth);
    speak('the message', settings, undefined, undefined, msg); fire(synth.calls[1], 'start');
    speak('word', settings); fire(synth.calls[3], 'start'); eq(seen, [true, false]);
  });
});
test('resync reports a message stopped when the phone is silent, so Stop never sticks', async () => {
  await fake([], synth => {
    const seen = watch(synth);
    speak('hi', settings, undefined, undefined, msg); fire(synth.calls[1], 'start');
    Object.assign(synth, { speaking: true, pending: false }); resync(); eq(seen, [true], 'still speaking');
    Object.assign(synth, { speaking: false, pending: true }); resync(); eq(seen, [true], 'still queued');
    Object.assign(synth, { speaking: false, pending: false }); resync(); eq(seen, [true, false], 'end was lost');
    fire(synth.calls[1], 'end'); resync(); eq(seen, [true, false]);
  });
});
test('resync does not cut short the 2 s wait of an utterance not yet started', async () => {
  await fake([], (synth, timers, flush) => {
    const seen = watch(synth);
    let fails = 0;
    speak('hi', settings, () => fails++, undefined, msg); resync(); flush(); eq([fails, seen], [1, [false]]);
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
