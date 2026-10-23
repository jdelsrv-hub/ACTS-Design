// Shared bits for tools that download an AI model: the "how big is the download" notice and download progress.
import { h } from '../../core/dom.js';
import { notice } from '../../core/ui.js';
import { formatBytes } from '../../core/files.js';
import { modelFileUrl } from './_vendor.js';

/** True when every file of these models is already in the browser's Transformers.js cache. */
export async function isModelCached(...models) {
  try {
    const cache = await caches.open('transformers-cache');
    const urls = models.flatMap((m) => m.files.map((f) => modelFileUrl(m, f)));
    const hits = await Promise.all(urls.map((u) => cache.match(u)));
    return hits.every(Boolean);
  } catch {
    return false;
  }
}

/**
 * Notice that tells people about the download before it starts.
 * firstTime: sentence shown before the model is saved. ready: sentence once it's saved.
 * cached: optional promise of a boolean (skipped when the size is all we know).
 */
export function modelNotice(firstTime, { cached, ready = 'The AI model is already saved in this browser, so it starts straight away.' } = {}) {
  const text = h('p', null, firstTime);
  const el = notice('info', text);
  Promise.resolve(cached).then((yes) => {
    if (yes) text.textContent = ready;
  }).catch(() => {});
  return el;
}

/**
 * Turns Transformers.js download events into progress: "Downloading the AI model (12 MB of 80 MB)".
 * expectedBytes: the size of all the model's files, because they start one after another.
 */
export function downloadProgress(ctx, expectedBytes = 0) {
  const files = {};
  let shown = 0;
  return (p) => {
    if (p.status !== 'progress' || !p.total) return;
    files[`${p.name}/${p.file}`] = [p.loaded, p.total];
    let loaded = 0;
    let total = 0;
    for (const [l, t] of Object.values(files)) {
      loaded += l;
      total += t;
    }
    total = Math.max(total, expectedBytes);
    shown = Math.max(shown, loaded / total); // never let the bar go backwards
    ctx.progress(shown, `Downloading the AI model (${formatBytes(loaded)} of ${formatBytes(total)})`);
  };
}
