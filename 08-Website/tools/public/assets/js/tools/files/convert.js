// Data converter: CSV, Excel, JSON and XML, any to any. Every input becomes a SheetJS workbook,
// then each sheet is written out in the chosen format. Preset entries fix { from, to }.
import { fileTool } from '../../core/filetool.js';
import { clear } from '../../core/dom.js';
import { notice } from '../../core/ui.js';
import { readText, extOf, baseName, renameExt, mimeFromExt } from '../../core/files.js';
import { getXLSX } from './_vendor.js';
import { readExcel, tidy, sheetsWithData } from './_sheets.js';

export const FORMATS = {
  csv: { label: 'CSV', exts: ['csv', 'tsv'] },
  xlsx: { label: 'Excel', exts: ['xlsx', 'xlsm', 'xls'] },
  json: { label: 'JSON', exts: ['json'] },
  xml: { label: 'XML', exts: ['xml'] },
};
export const formatOf = (file) => Object.keys(FORMATS).find((k) => FORMATS[k].exts.includes(extOf(file.name)));

export default fileTool((preset) => {
  const target = (opts) => preset.to || opts.to;
  const from = preset.from && FORMATS[preset.from];
  return {
    accept: (from ? from.exts : Object.values(FORMATS).flatMap((f) => f.exts)).map((e) => `.${e}`).join(','),
    multiple: true,
    dropTitle: from ? `Drop your ${from.label} files here` : 'Drop your data files here',
    dropHint: from ? 'Add one or more. Each file is converted on its own.' : 'CSV, Excel, JSON or XML. Add one or more.',
    action: preset.to ? `Convert to ${FORMATS[preset.to].label}` : 'Convert',
    actionIcon: 'convert',
    options: preset.to ? [] : [{ id: 'to', type: 'segmented', label: 'Convert to', default: 'xlsx', choices: Object.entries(FORMATS).map(([value, f]) => ({ value, label: f.label })) }],
    validate(files, opts) {
      const same = files.find((f) => formatOf(f) === target(opts));
      return same ? `${same.name} is already ${FORMATS[target(opts)].label}. Remove it or pick another format.` : null;
    },
    renderExtra: (extra, api) => showLimits(extra, api.files, target(api.options)),
    onOptionsChange: (opts, api) => showLimits(api.extra, api.files, target(opts)),
    onFilesChange(files, api) {
      // On the general converter, don't start on the format the files are already in.
      if (preset.to || !files.every((f) => formatOf(f) === api.options.to)) return;
      api.setOption('to', api.options.to === 'xlsx' ? 'csv' : 'xlsx');
      showLimits(api.extra, files, api.options.to);
    },
    async processFile(file, opts) {
      return convertFile(file, target(opts));
    },
  };
});

function showLimits(el, files, to) {
  const has = (f) => files.some((x) => formatOf(x) === f);
  const lines = [
    has('xlsx') && to !== 'xlsx' && "We copy the values from each sheet, and each sheet becomes its own file. Formulas, formatting and charts aren't kept.",
    has('json') && 'Nested data is flattened into columns, like address.city.',
    has('xml') && 'Repeated elements become rows, and the values inside them become columns.',
  ].filter(Boolean);
  clear(el);
  if (lines.length) el.append(notice('info', ...lines));
}

/** Convert one file. Returns [{ name, blob, note }] (one per sheet, or one .xlsx). */
export async function convertFile(file, to) {
  const X = await getXLSX();
  const wb = await readBook(X, file, formatOf(file));
  const sheets = sheetsWithData(wb);
  if (!sheets.length) throw new Error(`We couldn't find any rows in ${file.name}.`);
  const rowsIn = (s) => { const r = X.utils.decode_range(wb.Sheets[s]['!ref']); return r.e.r - r.s.r; };
  const note = (n) => `${n.toLocaleString('en-AU')} row${n === 1 ? '' : 's'}`;
  if (to === 'xlsx') {
    const data = X.write(wb, { bookType: 'xlsx', type: 'array', compression: true });
    return [{ name: renameExt(file.name, 'xlsx'), blob: new Blob([data], { type: mimeFromExt('xlsx') }), note: note(sheets.reduce((n, s) => n + rowsIn(s), 0)) }];
  }
  return sheets.map((s) => {
    const ws = wb.Sheets[s];
    let text;
    if (to === 'csv') {
      text = X.utils.sheet_to_csv(ws, { blankrows: false });
      if (/[^\x00-\x7f]/.test(text)) text = `﻿${text}`; // lets Excel read accents and emoji correctly
    } else if (to === 'json') {
      text = JSON.stringify(X.utils.sheet_to_json(ws, { raw: true, defval: '' }).map(datesToText), null, 2);
    } else {
      text = toXml(X.utils.sheet_to_json(ws, { raw: false, defval: '' }));
    }
    return { name: sheets.length > 1 ? `${baseName(file.name)}-${s}.${to}` : renameExt(file.name, to), blob: new Blob([text], { type: mimeFromExt(to) }), note: note(rowsIn(s)) };
  });
}

async function readBook(X, file, from) {
  if (from === 'xlsx') return (await readExcel(file)).wb;
  const text = await readText(file);
  if (from === 'csv') return tidy(X.read(text, { type: 'string', raw: true }), true);
  const rows = from === 'json' ? jsonRows(text) : xmlRows(text);
  const wb = X.utils.book_new();
  X.utils.book_append_sheet(wb, Array.isArray(rows[0]) ? X.utils.aoa_to_sheet(rows) : X.utils.json_to_sheet(rows), 'Sheet1');
  return tidy(wb, from === 'xml');
}

/** JSON text -> flat records (or rows of values). Takes a list, or the first list of records inside an object. */
export function jsonRows(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("This file isn't valid JSON. Check it for a missing comma or bracket, then try again.");
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) data = Object.values(data).find((v) => Array.isArray(v) && v[0] && typeof v[0] === 'object') || [data];
  if (!Array.isArray(data) || !data.length) throw new Error('We need a list of records, like [{"name": "Jess"}, {"name": "Sam"}].');
  if (data.every(Array.isArray)) return data;
  return data.map((r) => (r && typeof r === 'object' ? flatten(r) : { value: r }));
}

function flatten(obj, pre = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, `${pre}${k}.`, out);
    else out[pre + k] = Array.isArray(v) ? (v.some((x) => x && typeof x === 'object') ? JSON.stringify(v) : v.join(', ')) : v;
  }
  return out;
}

/** XML text -> flat records. The biggest group of same-named sibling elements becomes the rows. */
export function xmlRows(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error("This file isn't valid XML. Check it for a missing closing tag, then try again.");
  const root = doc.documentElement;
  let records = [root];
  for (const el of [root, ...root.querySelectorAll('*')]) {
    const groups = {};
    for (const c of el.children) (groups[c.localName] ||= []).push(c);
    for (const g of Object.values(groups)) if (g.length > records.length) records = g;
  }
  return records.map((el) => flattenEl(el, '', {}));
}

function flattenEl(el, pre, out) {
  const put = (k, v) => (out[k] = k in out ? `${out[k]}, ${v}` : v);
  for (const a of el.attributes) if (!a.name.startsWith('xmlns')) put(pre + a.localName, a.value);
  const kids = [...el.children];
  if (!kids.length) {
    const t = el.textContent.trim();
    if (t || !el.attributes.length) put(pre.slice(0, -1) || el.localName, t);
  }
  for (const k of kids) flattenEl(k, `${pre}${k.localName}.`, out);
  return out;
}

// SheetJS gives Excel dates as local-time Date objects, so read them back in local time
// (toISOString() would shift them to UTC and put Australian dates a day early).
const pad2 = (n) => String(n).padStart(2, '0');
function datesToText(row) {
  for (const [k, v] of Object.entries(row)) {
    if (!(v instanceof Date)) continue;
    const day = `${v.getFullYear()}-${pad2(v.getMonth() + 1)}-${pad2(v.getDate())}`;
    const time = `${pad2(v.getHours())}:${pad2(v.getMinutes())}:${pad2(v.getSeconds())}`;
    row[k] = time === '00:00:00' ? day : `${day}T${time}`;
  }
  return row;
}

const xmlName = (k) => {
  const t = String(k).trim().replace(/[^\p{L}\p{N}._-]+/gu, '_');
  return /^[\p{L}_]/u.test(t) && !/^xml/i.test(t) ? t : `_${t}`;
};
const xmlText = (v) => String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]);

function toXml(rows) {
  const body = rows.map((r) => `  <row>\n${Object.entries(r).map(([k, v]) => `    <${xmlName(k)}>${xmlText(v)}</${xmlName(k)}>`).join('\n')}\n  </row>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rows>\n${body.join('\n')}\n</rows>\n`;
}
