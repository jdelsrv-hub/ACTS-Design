import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { FamilyStatus } from '../types'

const PANE = 'tools-status'
const SITE = '08-Website/tools'
const FAMILIES = ['pdf', 'image', 'media', 'ai-device', 'files', 'ai-writing']
const families = atom({ plugin: 'tools-status', key: 'families' } as const, [])

function slugs(text: string, re: RegExp) {
  return [...text.matchAll(re)].map(m => m[1])
}

async function readText($: EngineInterface, path: string) {
  return (await $.fs.exists(path)) ? await $.fs.read(path) : ''
}

// Planned slugs come from each builder agent's table. Registered ones are the family's rows in
// tests/results.json (the tester's window.__results, the site's own list) plus what index.js
// spells out, so tools added since the last test run still count. Failures come from the results.
async function scan($: EngineInterface) {
  // tests/run.js writes 'pass' / 'fail' / 'skip'; older saves wrote true / false.
  let results: { slug: string; family?: string; smoke?: boolean | string; func?: boolean | string }[] = []
  try {
    results = JSON.parse((await readText($, `${SITE}/tests/results.json`)) || '[]')
  } catch {}
  const list: FamilyStatus[] = []
  for (const family of FAMILIES) {
    const brief = await readText($, `.claude/agents/tools-${family}.md`)
    // A slug table, or (ai-writing) a "**Templates**, ...: a, b, c" line.
    let planned = slugs(brief, /^\|\s*([a-z0-9]+(?:-[a-z0-9]+)+)\s*\|/gm)
    if (planned.length === 0)
      planned = (brief.match(/\*\*Templates\*\*[^:]*:([^\n]+)/)?.[1] ?? '')
        .split(/[,.]\s*/)
        .map(s => s.trim())
        .filter(s => /^[a-z0-9]+(-[a-z0-9]+)+$/.test(s))
    const dir = `${SITE}/public/assets/js/tools/${family}`
    // `slug: 'x'`, or a helper's first argument (`pair('x', ...)`). Slugs built in code
    // (`${from}-to-svg`) only show up through the results.
    const written = slugs(
      await readText($, `${dir}/index.js`),
      /(?:slug:\s*|\b\w+\(\s*)['"]([a-z0-9]+(?:-[a-z0-9]+)+)['"]/g,
    )
    const registered = [...new Set([...written, ...results.filter(r => r.family === family).map(r => r.slug)])]
    // Code files beside index.js mean the builder has started, even before it registers a tool.
    const code = (await $.fs.exists(dir))
      ? (await $.fs.list(dir)).filter(f => f.kind === 'file' && f.name !== 'index.js').length
      : 0
    let readmes = 0
    for (const slug of registered) if (await $.fs.exists(`${SITE}/docs/tools/${slug}.md`)) readmes++
    const failing = results
      .filter(r => registered.includes(r.slug) && [r.smoke, r.func].some(v => v === false || v === 'fail'))
      .map(r => r.slug)
    const missing = planned.filter(s => !registered.includes(s)).length
    const status: FamilyStatus['status'] = failing.length
      ? 'broken'
      : registered.length === 0 && code === 0
        ? 'not started'
        : missing === 0 && readmes === registered.length
          ? 'done'
          : 'in progress'
    list.push({
      family,
      status,
      planned: planned.length,
      plannedDone: planned.length - missing,
      registered: registered.length,
      readmes,
      failing,
    })
  }
  await update($, families, () => list)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // Only in the ACTS folder, where the tools site lives.
    if (!(await $.fs.exists(SITE))) return next(e)
    await $.command.register({ name: 'tools-status', description: 'Show acTS Tools family status in a pane' })
    await scan($)
    $.clock.every(15000, () => void scan($))
    void $.ui.open({ id: PANE, title: 'acTS Tools status' })
    return next(e)
  })

  on('command.run', { command: 'tools-status' }, async $ => {
    await scan($)
    await $.ui.open({ id: PANE, title: 'acTS Tools status' })
    return { text: 'acTS Tools status pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = await read($, families)
    const color = { done: 'green', 'in progress': 'yellow', broken: 'red', 'not started': 'gray' } as const

    return (
      <Box flexDirection="column">
        {list.length === 0 && <Text dimColor>Reading the site…</Text>}
        {list.map(f => (
          <Box flexDirection="column">
            <Text>
              <Text bold>{f.family}</Text> <Text color={color[f.status]}>{f.status}</Text>
            </Text>
            <Text dimColor>
              {f.registered} tools · {f.plannedDone}/{f.planned} planned · {f.readmes} READMEs
              {f.failing.length ? ` · failing: ${f.failing.join(', ')}` : ''}
            </Text>
          </Box>
        ))}
      </Box>
    )
  })
}
