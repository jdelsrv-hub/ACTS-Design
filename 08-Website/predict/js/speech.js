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

// Returns false only when the phone has no speech at all. A failure found later (an error,
// or no start within 2 s) calls onFail.
export function speak(text, { voiceURI, rate }, onFail = () => {}) {
  const s = synth();
  if (!s) return false;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  // An empty or late voice list, or a voice that's gone, just means the phone's default voice.
  u.voice = s.getVoices().find(v => v.voiceURI === voiceURI) ?? null;
  u.rate = rate;
  let timer;
  const settle = failed => {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
    if (failed) onFail();
  };
  u.addEventListener('start', () => settle(false));
  u.addEventListener('end', () => settle(false));
  // The next Speak cancels this one, which isn't a failure.
  u.addEventListener('error', e => settle(e.error !== 'interrupted' && e.error !== 'canceled'));
  timer = setTimeout(() => settle(true), 2000);
  s.speak(u);
  return true;
}
