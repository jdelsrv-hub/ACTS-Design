// Text-to-speech through the phone's own voices.
const synth = () => globalThis.speechSynthesis;

// Chrome loads its voices late, so wait for them, but never longer than 1 s.
export function listVoices() {
  if (!synth()) return Promise.resolve([]);
  if (synth().getVoices().length) return Promise.resolve(synth().getVoices());
  return new Promise(resolve => {
    const done = () => {
      clearTimeout(timer);
      synth().removeEventListener('voiceschanged', done);
      resolve(synth().getVoices());
    };
    const timer = setTimeout(done, 1000);
    synth().addEventListener('voiceschanged', done);
  });
}

let settleCurrent = () => {}; // the utterance now speaking, settled before it is cancelled so its 2 s wait can't report a failure
let listener = () => {};

// One listener: called with true when speech starts and false when it ends, fails or is stopped.
export function onSpeaking(fn) { listener = fn; }

// Cancels speech and reports false; this is never a failure.
export function stop() {
  settleCurrent();
  synth()?.cancel();
}

// Returns false only when the phone has no speech at all. A failure found later (an error,
// or no start within 2 s) calls onFail, and a start after that calls onLateStart.
export function speak(text, { voiceURI, rate }, onFail = () => {}, onLateStart = () => {}) {
  const s = synth();
  if (!s) return false;
  settleCurrent();
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  // An empty or late voice list, or a voice that's gone, just means the phone's default voice.
  u.voice = s.getVoices().find(v => v.voiceURI === voiceURI) ?? null;
  u.rate = rate;
  let timer, late = false, on = false, over = false;
  const off = () => { if (on) { on = false; listener(false); } };
  const settle = failed => {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
    if (failed) { onFail(); listener(false); } // false too, so a Stop button never sticks on an utterance that never started
  };
  settleCurrent = () => { late = false; over = true; settle(false); off(); };
  u.addEventListener('start', () => {
    if (over) return;
    if (late) onLateStart();
    late = false;
    settle(false);
    on = true;
    listener(true);
  });
  u.addEventListener('end', () => { settle(false); off(); });
  // An error with no code says nothing, so the 2 s wait still decides. The next Speak cancelling this one isn't a failure.
  u.addEventListener('error', e => { if (e.error) { settle(e.error !== 'interrupted' && e.error !== 'canceled'); off(); } });
  timer = setTimeout(() => { late = true; settle(true); }, 2000);
  s.speak(u);
  return true;
}
