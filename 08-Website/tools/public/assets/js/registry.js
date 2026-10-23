// Tool catalogue. Each family owns tools/<family>/index.js, which default-exports a list of entries:
//   { slug, name, cat, icon, summary, module, preset?, keywords?, runsOn? }
// module is relative to the family folder. runsOn: 'device' (default) | 'model' | 'server'.

export const CATEGORIES = [
  { slug: 'pdf', name: 'PDF', icon: 'file-text' },
  { slug: 'image', name: 'Image', icon: 'image' },
  { slug: 'video', name: 'Video and audio', icon: 'video' },
  { slug: 'ai', name: 'AI writing', icon: 'sparkles' },
  { slug: 'convert', name: 'File converters', icon: 'convert' },
  { slug: 'other', name: 'Other', icon: 'zap' },
];

export const FAMILIES = ['pdf', 'image', 'media', 'ai-device', 'files', 'ai-writing'];

export async function loadTools() {
  const lists = await Promise.allSettled(FAMILIES.map((f) => import(`./tools/${f}/index.js`)));
  return lists.flatMap((r, i) => {
    // A broken family is skipped so it can't take the whole site down.
    if (r.status === 'rejected') {
      console.error(`[acTS tools] ${FAMILIES[i]} tools failed to load`, r.reason);
      return [];
    }
    return r.value.default.map((t) => ({ runsOn: 'device', ...t, module: `${FAMILIES[i]}/${t.module}` }));
  });
}
