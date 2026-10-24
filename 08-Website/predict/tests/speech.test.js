import { test, eq, ok } from './harness.js';
import { speak, listVoices } from '../js/speech.js';

// Swaps window.speechSynthesis for a stub while fn runs.
async function withSynth(synth, fn) {
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'speechSynthesis');
  Object.defineProperty(globalThis, 'speechSynthesis', { value: synth, configurable: true });
  try { return await fn(); } finally {
    if (saved) Object.defineProperty(globalThis, 'speechSynthesis', saved); else delete globalThis.speechSynthesis;
  }
}
const stub = voices => {
  const calls = [];
  return { calls, getVoices: () => voices, cancel: () => calls.push('cancel'), speak: u => calls.push(u),
    addEventListener() {}, removeEventListener() {} };
};

test('speak returns false without speech support or voices', async () => {
  ok(!await withSynth(undefined, () => speak('hi', { voiceURI: null, rate: 1 })));
  ok(!await withSynth(stub([]), () => speak('hi', { voiceURI: null, rate: 1 })));
});
test('speak cancels, then speaks with the chosen voice and rate', async () => {
  const voice = { voiceURI: 'b' }, synth = stub([{ voiceURI: 'a' }, voice]);
  const RealUtterance = globalThis.SpeechSynthesisUtterance; // the real one refuses a fake voice
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  try { ok(await withSynth(synth, () => speak('hi there', { voiceURI: 'b', rate: 1.5 }))); }
  finally { globalThis.SpeechSynthesisUtterance = RealUtterance; }
  eq(synth.calls[0], 'cancel');
  const u = synth.calls[1];
  eq([u.text, u.rate, u.voice === voice], ['hi there', 1.5, true]);
});
test('listVoices resolves after 1 s when no voices ever load', async () => {
  const t = performance.now();
  eq(await withSynth(stub([]), () => listVoices()), []);
  ok(performance.now() - t >= 900);
});
