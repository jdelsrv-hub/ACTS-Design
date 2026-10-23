// Third-party libraries, loaded from a CDN only when a tool needs them.
// Every URL is pinned to an exact version. To self-host later, download the file into
// public/assets/vendor/ and change the URL here (nothing else needs to change).
//
// Family-specific libraries can live in a family's own _vendor.js, using loadModule()/loadScript() below.

const JSD = 'https://cdn.jsdelivr.net/npm/';

export const LIBS = {
  // PDF: Cantoo's maintained fork of pdf-lib (MIT). Adds encrypt()/password loading.
  pdfLib: JSD + '@cantoo/pdf-lib@2.11.1/dist/pdf-lib.esm.min.js',
  // PDF rendering and text extraction: Mozilla pdf.js (Apache-2.0). Legacy build = wider browser support.
  pdfjs: JSD + 'pdfjs-dist@6.4.299/legacy/build/pdf.min.mjs',
  pdfjsWorker: JSD + 'pdfjs-dist@6.4.299/legacy/build/pdf.worker.min.mjs',
  pdfjsCMaps: JSD + 'pdfjs-dist@6.4.299/cmaps/',
  pdfjsFonts: JSD + 'pdfjs-dist@6.4.299/standard_fonts/',
  // Zip read/write: fflate (MIT).
  fflate: JSD + 'fflate@0.8.3/esm/browser.js',
  // Animated GIF encoder: gifenc (MIT).
  gifenc: JSD + 'gifenc@1.0.3/dist/gifenc.esm.js',
  // HEIC/HEIF (iPhone photos) decoder: heic2any (MIT, bundles libheif LGPL).
  heic2any: JSD + 'heic2any@0.0.4/dist/heic2any.min.js',
  // TIFF decode/encode: UTIF.js (MIT).
  utif: JSD + 'utif@3.1.0/UTIF.js',
  // Video and audio (WebCodecs): Mediabunny (MPL-2.0). Imported through the page import map as "mediabunny"
  // so its extensions (e.g. @mediabunny/mp3-encoder) share one copy.
  mediabunny: JSD + 'mediabunny@1.61.6/dist/bundles/mediabunny.min.mjs',
  mediabunnyMp3: JSD + '@mediabunny/mp3-encoder@1.61.6/dist/bundles/mediabunny-mp3-encoder.min.mjs',
};

const moduleCache = new Map();
const scriptCache = new Map();

/** import() an ES module URL once and reuse it. */
export function loadModule(url) {
  if (!moduleCache.has(url)) {
    const p = import(/* @vite-ignore */ url).catch((err) => {
      moduleCache.delete(url);
      throw friendlyLoadError(url, err);
    });
    moduleCache.set(url, p);
  }
  return moduleCache.get(url);
}

/** Load a classic (UMD) script once. Resolves with window[globalName] when given. */
export function loadScript(url, globalName) {
  if (!scriptCache.has(url)) {
    const p = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.onload = () => resolve(globalName ? window[globalName] : undefined);
      s.onerror = () => {
        scriptCache.delete(url);
        s.remove();
        reject(friendlyLoadError(url));
      };
      document.head.append(s);
    });
    scriptCache.set(url, p);
  }
  return scriptCache.get(url);
}

/** Load a stylesheet once. */
export function loadStyle(url) {
  if (document.querySelector(`link[data-src="${url}"]`)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = url;
    l.dataset.src = url;
    l.onload = resolve;
    l.onerror = () => reject(friendlyLoadError(url));
    document.head.append(l);
  });
}

function friendlyLoadError(url, cause) {
  const err = new Error("We couldn't load part of this tool. Check your internet connection, then try again.");
  err.cause = cause;
  err.url = url;
  return err;
}

// ---- Shared loaders ----

export const getPdfLib = () => loadModule(LIBS.pdfLib);

let pdfjsReady;
export function getPdfjs() {
  pdfjsReady ||= loadModule(LIBS.pdfjs).then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = LIBS.pdfjsWorker;
    return pdfjs;
  });
  return pdfjsReady;
}

/** Open a PDF with pdf.js. data: ArrayBuffer/Uint8Array (copied, pdf.js transfers it). */
export async function openPdfjs(data, { password } = {}) {
  const pdfjs = await getPdfjs();
  const bytes = data instanceof Uint8Array ? data.slice() : new Uint8Array(data.slice(0));
  return pdfjs.getDocument({
    data: bytes,
    password,
    cMapUrl: LIBS.pdfjsCMaps,
    cMapPacked: true,
    standardFontDataUrl: LIBS.pdfjsFonts,
    isEvalSupported: false,
  }).promise;
}

export const getFflate = () => loadModule(LIBS.fflate);
export const getGifenc = () => loadModule(LIBS.gifenc);
export const getHeic2any = () => loadScript(LIBS.heic2any, 'heic2any');
export const getUtif = () => loadScript(LIBS.utif, 'UTIF');

/** Mediabunny via the import map entry "mediabunny" (falls back to the URL if a page has no import map). */
export function getMediabunny() {
  return import('mediabunny').catch(() => loadModule(LIBS.mediabunny));
}

let mp3Ready;
/** Registers the MP3 encoder with Mediabunny (browsers can't encode MP3 natively). */
export function enableMp3Encoding() {
  mp3Ready ||= (async () => {
    const MB = await getMediabunny();
    if (await MB.canEncodeAudio('mp3')) return;
    const ext = await import('@mediabunny/mp3-encoder').catch(() => loadModule(LIBS.mediabunnyMp3));
    ext.registerMp3Encoder();
  })();
  return mp3Ready;
}
