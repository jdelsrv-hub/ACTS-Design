// Libraries only the image tools use. Pinned versions, loaded the first time a tool needs them.
import { loadModule, loadScript } from '../../core/vendor.js';

const JSD = 'https://cdn.jsdelivr.net/npm/';

export const IMAGE_LIBS = {
  // Smaller PNGs by reducing colours: UPNG.js (MIT), which needs pako (MIT and Zlib).
  pako: JSD + 'pako@1.0.11/dist/pako.min.js',
  upng: JSD + 'upng-js@2.1.0/UPNG.js',
  // EXIF, GPS, IPTC and XMP reader: exifr (MIT).
  exifr: JSD + 'exifr@7.1.3/dist/full.esm.mjs',
  // Charts: Chart.js (MIT).
  chartjs: JSD + 'chart.js@4.5.0/dist/chart.umd.min.js',
  // Bitmap to vector tracing: imagetracerjs (public domain, Unlicense).
  imagetracer: JSD + 'imagetracerjs@1.2.6/imagetracer_v1.2.6.js',
  // Meme font for devices without Impact: Anton (SIL Open Font Licence).
  anton: JSD + '@fontsource/anton@5.2.5/files/anton-latin-400-normal.woff2',
};

export async function getUpng() {
  await loadScript(IMAGE_LIBS.pako, 'pako');
  return loadScript(IMAGE_LIBS.upng, 'UPNG');
}
export const getExifr = () => loadModule(IMAGE_LIBS.exifr);
export const getChart = () => loadScript(IMAGE_LIBS.chartjs, 'Chart');
export const getImageTracer = () => loadScript(IMAGE_LIBS.imagetracer, 'ImageTracer');

let memeFont;
/** Loads Anton once. If it can't load (offline), drawing falls back to Impact or Arial Black. */
export function loadMemeFont() {
  memeFont ||= (async () => {
    const face = new FontFace('Anton', `url(${IMAGE_LIBS.anton})`);
    document.fonts.add(face);
    await face.load();
  })().catch(() => {});
  return memeFont;
}
