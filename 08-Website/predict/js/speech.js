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

export function speak(text, { voiceURI, rate }) {
  const voices = synth()?.getVoices() ?? [];
  if (!voices.length) return false;
  synth().cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voices.find(v => v.voiceURI === voiceURI) ?? null;
  u.rate = rate;
  synth().speak(u);
  return true;
}
