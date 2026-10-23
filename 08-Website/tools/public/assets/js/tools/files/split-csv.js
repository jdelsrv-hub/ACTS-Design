import { fileTool } from '../../core/filetool.js';
import { readText, baseName, withSuffix, zipFiles } from '../../core/files.js';

/** Split CSV text into records, keeping each one exactly as written (quoted line breaks stay inside their record). */
export function csvRecords(text) {
  const out = [];
  let start = 0;
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 34) quoted = !quoted;
    else if (!quoted && (c === 10 || c === 13)) {
      out.push(text.slice(start, i));
      if (c === 13 && text.charCodeAt(i + 1) === 10) i++;
      start = i + 1;
    }
  }
  out.push(text.slice(start));
  return out.filter((r) => r.trim() !== '');
}

export default fileTool({
  accept: '.csv,.tsv',
  dropTitle: 'Drop your CSV file here',
  action: 'Split CSV',
  actionIcon: 'split',
  options: [{ id: 'rows', type: 'number', label: 'Rows per file', default: 1000, min: 1, step: 1, help: 'The first row is the header. We add it to the top of every file.' }],
  validate: (_files, o) => (o.rows >= 1 ? null : 'Enter how many rows you want in each file.'),
  async processFile(file, { rows }, ctx) {
    const text = await readText(file);
    const [header, ...records] = csvRecords(text);
    const size = Math.floor(rows);
    if (records.length <= size) throw new Error(`This file has ${records.length.toLocaleString('en-AU')} row${records.length === 1 ? '' : 's'}, so there's nothing to split at ${size.toLocaleString('en-AU')} per file. Try a smaller number.`);
    const eol = text.includes('\r\n') ? '\r\n' : '\n';
    const bom = /[^\x00-\x7f]/.test(text) ? '﻿' : ''; // lets Excel read accents and emoji correctly
    const parts = [];
    for (let i = 0; i < records.length; i += size) {
      parts.push({ name: withSuffix(file.name, parts.length + 1), data: bom + [header, ...records.slice(i, i + size)].join(eol) + eol });
      if (parts.length % 50 === 0) {
        ctx.progress(i / records.length);
        await ctx.tick();
      }
    }
    return { name: `${baseName(file.name)}-split.zip`, blob: await zipFiles(parts), note: `${parts.length} files of up to ${size.toLocaleString('en-AU')} rows` };
  },
});
