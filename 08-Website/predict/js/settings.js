export const DEFAULTS = { textSize: 'large', contrast: 'normal', font: 'system', suggestionCount: 3,
  tapSafety: false, speakEachWord: false, clearAfterSpeak: false, phraseSpeaks: false, voiceURI: null, rate: 1 };

const CHOICES = {
  textSize: ['large', 'extra-large', 'huge'],
  contrast: ['normal', 'high', 'dark'],
  font: ['system', 'hyperlegible'],
  suggestionCount: [3, 4, 5],
};

// Saved settings can come from a user-chosen backup file, so every value is checked.
const valid = (key, v) =>
  key in CHOICES ? CHOICES[key].includes(v)
  : key === 'voiceURI' ? v === null || typeof v === 'string'
  : key === 'rate' ? Number.isFinite(v) && v >= 0.5 && v <= 2
  : typeof v === typeof DEFAULTS[key];

export function withDefaults(saved) {
  const out = { ...DEFAULTS };
  if (saved && typeof saved === 'object') {
    for (const key in DEFAULTS) {
      if (Object.hasOwn(saved, key) && valid(key, saved[key])) out[key] = saved[key];
    }
  }
  return out;
}
