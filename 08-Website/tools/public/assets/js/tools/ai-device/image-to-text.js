// Image to text (OCR) with Tesseract.js, which runs in a background worker in the browser.
// Named export for tests: imageToText(file, { lang }, ctx) -> text.
import { fileTool } from '../../core/filetool.js';
import { IMAGE_ACCEPT, decodeImage, drawToCanvas, fitWithin } from '../../core/image.js';
import { renameExt } from '../../core/files.js';
import { AI_LIBS, getTesseract } from './_vendor.js';
import { modelNotice } from './_model.js';

// Tesseract language codes. Each has its own data download (0.6 to 3.8 MB).
export const LANGUAGES = [
  { value: 'eng', label: 'English' },
  { value: 'spa', label: 'Spanish' },
  { value: 'fra', label: 'French' },
  { value: 'deu', label: 'German' },
  { value: 'ita', label: 'Italian' },
  { value: 'por', label: 'Portuguese' },
  { value: 'nld', label: 'Dutch' },
  { value: 'swe', label: 'Swedish' },
  { value: 'dan', label: 'Danish' },
  { value: 'nor', label: 'Norwegian' },
  { value: 'fin', label: 'Finnish' },
  { value: 'pol', label: 'Polish' },
  { value: 'tur', label: 'Turkish' },
  { value: 'ell', label: 'Greek' },
  { value: 'rus', label: 'Russian' },
  { value: 'ukr', label: 'Ukrainian' },
  { value: 'ara', label: 'Arabic' },
  { value: 'heb', label: 'Hebrew' },
  { value: 'hin', label: 'Hindi' },
  { value: 'tha', label: 'Thai' },
  { value: 'vie', label: 'Vietnamese' },
  { value: 'ind', label: 'Indonesian' },
  { value: 'msa', label: 'Malay' },
  { value: 'chi_sim', label: 'Chinese (simplified)' },
  { value: 'chi_tra', label: 'Chinese (traditional)' },
  { value: 'jpn', label: 'Japanese' },
  { value: 'kor', label: 'Korean' },
];

let current = null; // { lang, ready: Promise<worker> }, kept so the next image starts fast
let report = () => {};

function getWorker(lang) {
  if (current?.lang === lang) return current.ready;
  stopWorker();
  const ready = getTesseract()
    .then(({ createWorker, OEM }) => createWorker(lang, OEM.LSTM_ONLY, {
      workerPath: AI_LIBS.tesseractWorker,
      corePath: AI_LIBS.tesseractCore,
      langPath: AI_LIBS.tesseractLang(lang),
      logger: (m) => report(m),
    }))
    .catch((err) => {
      if (current?.ready === ready) current = null;
      const e = new Error("We couldn't load the text reader. Check your internet connection, then try again.");
      e.cause = err;
      throw e;
    });
  current = { lang, ready };
  return ready;
}

function stopWorker() {
  const old = current;
  current = null;
  old?.ready.then((w) => w.terminate()).catch(() => {});
}

/** Read the text in one image. lang: a Tesseract code from LANGUAGES. */
export async function imageToText(file, { lang = 'eng' } = {}, ctx = {}) {
  const progress = ctx.progress || (() => {});
  const img = await decodeImage(file);
  let canvas;
  try {
    // Small screenshots read better at twice the size. White behind see-through areas keeps dark text readable.
    const scale = Math.max(img.width, img.height) < 1000 ? 2 : 1;
    const { width, height } = fitWithin(img.width * scale, img.height * scale, 5000, 5000, true);
    canvas = drawToCanvas(img.image, width, height, { background: '#FFFFFF' });
  } finally {
    img.close();
  }
  report = (m) => {
    if (m.status === 'recognizing text') progress(0.2 + 0.8 * (m.progress || 0), 'Reading the text');
    else progress(0.1, 'Loading the text reader');
  };
  progress(0.05, 'Loading the text reader');
  const ready = getWorker(lang);
  let job = null;
  // Cancel: stop waiting straight away. The worker finishes its job in the background and then closes
  // (stopping it mid-job makes Tesseract throw an error nobody can catch). The next image gets a fresh worker.
  let stop;
  const cancelled = new Promise((_, reject) => {
    stop = () => {
      if (current?.ready === ready) current = null;
      ready.then((w) => Promise.resolve(job).catch(() => {}).then(() => w.terminate())).catch(() => {});
      reject(Object.assign(new Error('Cancelled'), { name: 'AbortError' }));
    };
  });
  cancelled.catch(() => {});
  ctx.signal?.addEventListener('abort', stop);
  try {
    const worker = await Promise.race([ready, cancelled]);
    job = worker.recognize(canvas);
    const { data } = await Promise.race([job, cancelled]);
    return (data.text || '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  } finally {
    ctx.signal?.removeEventListener('abort', stop);
    report = () => {};
  }
}

const downloadNotice = () => modelNotice('The first time you use a language, we download the text reader and that language (about 4 MB for English, 1 to 5 MB for others). After that your browser keeps them.');

export default fileTool({
  accept: IMAGE_ACCEPT,
  multiple: true,
  maxFiles: 50,
  dropTitle: 'Drop an image with text in it',
  dropHint: 'Photos, screenshots and scans. Printed text works best.',
  action: 'Get the text',
  actionIcon: 'scan-text',
  workingLabel: 'Reading the text',
  resultTitle: (items) => (items.length > 1 ? `Text from ${items.length} images` : "Here's the text we found"),
  options: [{ id: 'lang', type: 'select', label: 'Language of the text', default: 'eng', choices: LANGUAGES }],
  renderEmpty: (view) => view.append(downloadNotice()),
  renderExtra: (extra) => extra.append(downloadNotice()),
  async processFile(file, options, ctx) {
    const text = await imageToText(file, options, ctx);
    if (!text) throw new Error("We couldn't find any text in this image. Try a sharper, well-lit photo, or check the language.");
    return { name: renameExt(file.name, 'txt'), label: `Text from ${file.name}`, text };
  },
});
