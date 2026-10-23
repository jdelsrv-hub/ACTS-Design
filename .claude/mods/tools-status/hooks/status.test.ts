import { expect, test } from 'claude-code/testing'

const agent = (...slugs: string[]) =>
  ['| slug | Name |', '| --- | --- |', ...slugs.map(s => `| ${s} | x |`)].join('\n')
const index = (...slugs: string[]) => `export default [${slugs.map(s => `{ slug: '${s}' }`).join(', ')}];`

// A fake site: pdf done, image and media broken, files not started, the AI families in progress.
const files: Record<string, string> = {
  '.claude/agents/tools-pdf.md': agent('merge-pdf'),
  // A preset entry made through a helper still counts.
  '08-Website/tools/public/assets/js/tools/pdf/index.js':
    "const pair = (slug) => ({ slug });\nexport default [{ slug: 'merge-pdf' }, pair('pdf-to-png')];",
  '08-Website/tools/docs/tools/merge-pdf.md': '# Merge PDF',
  '08-Website/tools/docs/tools/pdf-to-png.md': '# PDF to PNG',
  '.claude/agents/tools-image.md': agent('compress-image', 'resize-image'),
  '08-Website/tools/public/assets/js/tools/image/index.js': index('compress-image'),
  '08-Website/tools/docs/tools/compress-image.md': '# Compress image',
  '.claude/agents/tools-media.md': agent('trim-video'),
  '08-Website/tools/public/assets/js/tools/media/index.js': index('trim-video'),
  '08-Website/tools/docs/tools/trim-video.md': '# Trim video',
  // heic-to-jpg has a slug built in code, so only the results name it.
  '08-Website/tools/tests/results.json': JSON.stringify([
    { slug: 'merge-pdf', family: 'pdf', smoke: true, func: true },
    { slug: 'trim-video', family: 'media', smoke: 'pass', func: 'fail' },
    { slug: 'heic-to-jpg', family: 'image', smoke: true, func: false },
  ]),
  '.claude/agents/tools-files.md': agent('csv-to-json'),
  '08-Website/tools/public/assets/js/tools/files/index.js': index(),
  // ai-writing: templates listed in a line, one of two built
  '.claude/agents/tools-ai-writing.md': '- **Templates**, from the list: essay-writer, story-generator. Both are text.',
  '08-Website/tools/public/assets/js/tools/ai-writing/index.js': index('essay-writer'),
  '08-Website/tools/docs/tools/essay-writer.md': '# Essay writer',
  // ai-device: code written, nothing registered yet
  '.claude/agents/tools-ai-device.md': agent('image-to-text'),
  '08-Website/tools/public/assets/js/tools/ai-device/index.js': index(),
  '08-Website/tools/public/assets/js/tools/ai-device/ocr.js': 'export default {}',
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(`labels each family from the site files (${surface})`, async ($, on) => {
    // Paths reach fs hooks resolved against the working directory, so match on the tail.
    const find = (path: string) => Object.keys(files).find(k => path.replace(/\\/g, '/').endsWith(k))
    const isDir = (path: string) => Object.keys(files).some(k => k.includes('/') && path.replace(/\\/g, '/').endsWith(k.slice(0, k.lastIndexOf('/'))))
    on('fs.exists', async (_$, e: any) => ({ value: find(e.path) !== undefined || isDir(e.path) }) as any)
    on('fs.read', async (_$, e: any) => ({ value: files[find(e.path)!] }) as any)
    on('fs.list', async (_$, e: any) => {
      const dir = Object.keys(files)
        .map(k => k.slice(0, k.lastIndexOf('/')))
        .find(d => e.path.replace(/\\/g, '/').endsWith(d))
      const names = Object.keys(files).filter(k => dir && k.startsWith(`${dir}/`)).map(k => k.slice(dir!.length + 1))
      return { value: names.map(name => ({ name, kind: 'file', size: 1, mtimeMs: 0, isLink: false })) } as any
    })
    on('ui.open', async () => ({ value: { isPlaced: true } }) as any)

    await $.command.run({ command: 'tools-status', args: '' } as any)
    const ui = await $.ui.mount({
      plugin: 'tools-status',
      surface,
      component: 'Pane',
      requestId: 'tools-status',
      props: { title: 'acTS Tools status', isFocused: false, bodyColumns: 60, placement: 'dock' } as any,
    })

    for (const line of ['pdf done', 'image broken', 'media broken', 'files not started', 'ai-writing in progress', 'ai-device in progress'])
      expect(await ui.find({ type: 'Text', text: line })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'failing: trim-video' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'failing: heic-to-jpg' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '2 tools · 1/1 planned · 2 READMEs' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '2 tools · 1/2 planned · 1 READMEs' })).toBeDefined()
  })
}
