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
let speakingNow = () => false; // whether the current utterance has started and not yet ended
let current = null; // Chrome can garbage-collect an utterance nobody holds, and then its end never comes
let listener = () => {};

// One listener, for messages only: called with true when one starts and false when it ends, fails or is stopped.
export function onSpeaking(fn) { listener = fn; }

// An end event can still go missing, so speech the phone isn't doing (or queueing) is settled as stopped.
export function resync() {
  const s = synth();
  if (s && speakingNow() && !s.speaking && !s.pending) settleCurrent();
}

// Cancels speech and reports false; this is never a failure.
export function stop() {
  settleCurrent();
  synth()?.cancel();
}

// Returns false only when the phone has no speech at all. A failure found later (an error,
// or no start within 2 s) calls onFail, and a start after that calls onLateStart.
// Only a message (Speak, or a quick phrase that speaks when tapped) turns Speak into Stop; a word read out doesn't.
export function speak(text, { voiceURI, rate }, onFail = () => {}, onLateStart = () => {}, { message = false } = {}) {
  const s = synth();
  if (!s) return false;
  settleCurrent();
  s.cancel();
  const u = current = new SpeechSynthesisUtterance(text);
  // An empty or late voice list, or a voice that's gone, just means the phone's default voice.
  u.voice = s.getVoices().find(v => v.voiceURI === voiceURI) ?? null;
  u.rate = rate;
  let timer, late = false, on = false, over = false;
  const tell = v => { if (message) listener(v); };
  const off = () => { if (on) { on = false; tell(false); } };
  const settle = failed => {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
    if (failed) { onFail(); tell(false); } // false too, so a Stop button never sticks on an utterance that never started
  };
  settleCurrent = () => { late = false; over = true; settle(false); off(); };
  speakingNow = () => on;
  u.addEventListener('start', () => {
    if (over) return;
    if (late) onLateStart();
    late = false;
    settle(false);
    on = true;
    tell(true);
  });
  u.addEventListener('end', () => { settle(false); off(); });
  // An error with no code says nothing, so the 2 s wait still decides. The next Speak cancelling this one isn't a failure.
  u.addEventListener('error', e => { if (e.error) { settle(e.error !== 'interrupted' && e.error !== 'canceled'); off(); } });
  timer = setTimeout(() => { late = true; settle(true); }, 2000);
  s.speak(u);
  return true;
}
