// Function tests for the files family: data converters, splitters, Excel to PDF, zip, QR codes,
// lorem ipsum, epoch converter and word counter. Entry format: see specs/pdf.js and the header of run.js.
//
// Extra test helpers defined here (candidates for fixtures.js / check.js):
//   workbook(name, sheets, { cols })  a real-looking .xlsx built by hand: shared strings, number formats
//                                     (built-in ids 9 and 14, custom ids from 164), formulas with saved
//                                     results, column widths. Cells are values or { v, z, f }.
//   zipDirectory(bytes)               reads a zip's central directory: name, method (0 stored, 8 deflated), sizes
//   decodeQr(blob)                    reads a QR code back from a PNG or SVG with jsQR 1.4.0
import { getFflate, loadModule } from '../../public/assets/js/core/vendor.js';

const SHEETJS = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs'; // the copy check.js reads with (not the tools' 0.20.3)
const JSQR = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/+esm';
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const PORTRAIT = [595, 842];
const LANDSCAPE = [842, 595];

// ---------- Small files ----------

const csvFile = (text, name = 'data.csv') => new File([text], name, { type: 'text/csv' });
const jsonFile = (v, name = 'data.json') => new File([typeof v === 'string' ? v : JSON.stringify(v)], name, { type: 'application/json' });
const xmlFile = (text, name = 'data.xml') => new File([text], name, { type: 'application/xml' });

const bytesOf = async (blob) => new Uint8Array(await blob.arrayBuffer());
const hasBom = async (blob) => {
  const b = await bytesOf(blob);
  return b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf;
};
const textOf = async (blob) => new TextDecoder().decode(await blob.arrayBuffer()); // drops a byte order mark
const names = (out) => out.items.map((i) => i.name);
const notes = (out) => out.items.map((i) => i.note);

/** The one output item, after checking there is exactly one. */
function only(t, out) {
  t.eq(names(out).length, 1, `number of output files (got ${names(out).join(', ')})`);
  return out.items[0];
}

/** fixtures ROWS -> records keyed by the header as written ('Name', 'Followers', ...). */
const recordsOf = (rows) => rows.slice(1).map((r) => Object.fromEntries(rows[0].map((k, i) => [k, r[i]])));
const asText = (rows) => rows.map((r) => r.map(String));
const lowerHeader = (rows) => [rows[0].map((k) => k.toLowerCase()), ...rows.slice(1)];

function xmlDoc(t, text, label = 'XML') {
  const d = new DOMParser().parseFromString(text, 'application/xml');
  const err = d.querySelector('parsererror');
  t.assert(!err, `${label} doesn't parse: ${err?.textContent.slice(0, 160)}`);
  return d;
}
/** <rows><row><a>1</a></row></rows> -> [{ a: '1' }], after checking the root and row element names. */
function xmlRecords(t, doc) {
  t.eq(doc.documentElement.localName, 'rows', 'XML root element');
  const rows = [...doc.documentElement.children];
  t.assert(rows.every((r) => r.localName === 'row'), 'every record should be a <row>');
  return rows.map((r) => Object.fromEntries([...r.children].map((c) => [c.localName, c.textContent])));
}

// ---------- Excel workbooks ----------

const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const colName = (i) => {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};
const BUILTIN_FORMATS = { '0%': 9, 'm/d/yy': 14 }; // 14 is Excel's default short date

async function workbook(name, sheets, { cols = {} } = {}) {
  const { zipSync, strToU8 } = await getFflate();
  const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const CT = 'application/vnd.openxmlformats-officedocument.spreadsheetml';
  const strings = [];
  const custom = [];
  const xfs = [0];
  const sharedString = (s) => (strings.includes(s) ? strings.indexOf(s) : strings.push(s) - 1);
  const style = (z) => {
    if (!z) return 0;
    const id = BUILTIN_FORMATS[z] ?? 164 + (custom.includes(z) ? custom.indexOf(z) : custom.push(z) - 1);
    return xfs.includes(id) ? xfs.indexOf(id) : xfs.push(id) - 1;
  };
  const cellXml = (raw, ref) => {
    const c = raw !== null && typeof raw === 'object' ? raw : { v: raw };
    if (c.v === '' || c.v == null) return '';
    const s = style(c.z);
    const sAttr = s ? ` s="${s}"` : '';
    if (typeof c.v === 'number') return `<c r="${ref}"${sAttr}>${c.f ? `<f>${esc(c.f)}</f>` : ''}<v>${c.v}</v></c>`;
    return `<c r="${ref}" t="s"${sAttr}><v>${sharedString(String(c.v))}</v></c>`;
  };
  const list = Object.keys(sheets);
  const sheetXml = list.map((n) => {
    const rows = sheets[n];
    const width = Math.max(...rows.map((r) => r.length));
    const colsXml = cols[n] ? `<cols>${cols[n].map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
    const data = rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => cellXml(v, colName(ci) + (ri + 1))).join('')}</row>`).join('');
    return `<worksheet xmlns="${NS}"><dimension ref="A1:${colName(width - 1)}${rows.length}"/>${colsXml}<sheetData>${data}</sheetData></worksheet>`;
  });
  const numFmts = custom.length ? `<numFmts count="${custom.length}">${custom.map((z, i) => `<numFmt numFmtId="${164 + i}" formatCode="${esc(z)}"/>`).join('')}</numFmts>` : '';
  const parts = {
    '[Content_Types].xml': `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="${CT}.sheet.main+xml"/>${list.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="${CT}.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="${CT}.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="${CT}.sharedStrings+xml"/></Types>`,
    '_rels/.rels': `<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<workbook xmlns="${NS}" xmlns:r="${REL}"><sheets>${list.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<Relationships xmlns="${PKG}">${list.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rIdS" Type="${REL}/styles" Target="styles.xml"/><Relationship Id="rIdT" Type="${REL}/sharedStrings" Target="sharedStrings.xml"/></Relationships>`,
    'xl/styles.xml': `<styleSheet xmlns="${NS}">${numFmts}<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.map((id) => `<xf numFmtId="${id}" fontId="0" fillId="0" borderId="0" xfId="0"${id ? ' applyNumberFormat="1"' : ''}/>`).join('')}</cellXfs></styleSheet>`,
    'xl/sharedStrings.xml': `<sst xmlns="${NS}" count="${strings.length}" uniqueCount="${strings.length}">${strings.map((s) => `<si><t xml:space="preserve">${esc(s)}</t></si>`).join('')}</sst>`,
  };
  list.forEach((_, i) => { parts[`xl/worksheets/sheet${i + 1}.xml`] = sheetXml[i]; });
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const zipped = zipSync(Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, strToU8(head + v)])));
  return new File([zipped], name, { type: XLSX_TYPE });
}

// book.xlsx: Sheet1 has percentages, a custom date format and Excel's default date format (plus accents);
// Sheet2 has a 15-digit number that must not turn into 1.23457E+14.
const BOOK = {
  Sheet1: [
    ['Name', 'Share', 'Joined'],
    ['Mia Chen', { v: 0.25, z: '0%' }, { v: 46315, z: 'dd mmm yyyy' }], // serial 46315 is 20 Oct 2026
    ['Zoë Café', { v: 0.5, z: '0%' }, { v: 46316, z: 'm/d/yy' }], // 21 Oct 2026 in the default date format
  ],
  Sheet2: [['Views'], [1200], [900], [123456789012345]],
};
const BOOK_CSV = [
  [['Name', 'Share', 'Joined'], ['Mia Chen', '25%', '20 Oct 2026'], ['Zoë Café', '50%', '2026-10-21']],
  [['Views'], ['1200'], ['900'], ['123456789012345']],
];
const BOOK_JSON = [
  [{ Name: 'Mia Chen', Share: 0.25, Joined: '2026-10-20' }, { Name: 'Zoë Café', Share: 0.5, Joined: '2026-10-21' }],
  [{ Views: 1200 }, { Views: 900 }, { Views: 123456789012345 }],
];

const readXlsx = async (data, opts = {}) => (await loadModule(SHEETJS)).read(data instanceof Uint8Array ? data : await bytesOf(data), { type: 'array', ...opts });
const formulasIn = (ws) => Object.keys(ws).filter((k) => k[0] !== '!' && ws[k].f);

// ---------- Zip and QR readers ----------

function zipDirectory(u) {
  const v = new DataView(u.buffer, u.byteOffset, u.byteLength);
  let end = u.length - 22;
  while (end >= 0 && v.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0) throw new Error('not a zip: no end-of-central-directory record');
  const out = [];
  let o = v.getUint32(end + 16, true);
  for (let i = v.getUint16(end + 10, true); i > 0; i--) {
    if (v.getUint32(o, true) !== 0x02014b50) throw new Error('broken zip central directory');
    const n = v.getUint16(o + 28, true);
    out.push({ name: new TextDecoder().decode(u.subarray(o + 46, o + 46 + n)), method: v.getUint16(o + 10, true), packed: v.getUint32(o + 20, true), size: v.getUint32(o + 24, true) });
    o += 46 + n + v.getUint16(o + 30, true) + v.getUint16(o + 32, true);
  }
  return out;
}

async function decodeQr(blob) {
  const m = await loadModule(JSQR);
  const jsQR = [m.jsQR, m.default, m.default?.default].find((f) => typeof f === 'function');
  let src;
  let url;
  if (blob.type === 'image/svg+xml') {
    url = URL.createObjectURL(blob);
    src = new Image();
    src.src = url;
    await src.decode();
  } else src = await createImageBitmap(blob);
  try {
    const w = src.naturalWidth || src.width;
    const h = src.naturalHeight || src.height;
    const g = new OffscreenCanvas(w, h).getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, w, h);
    g.drawImage(src, 0, 0, w, h);
    const found = jsQR(g.getImageData(0, 0, w, h).data, w, h);
    if (!found) throw new Error(`jsQR found no QR code in the ${w} x ${h} image`);
    return found.data;
  } finally {
    if (url) URL.revokeObjectURL(url);
    src.close?.();
  }
}

// ---------- Tests ----------

export default {
  async 'data-converter'(mod, fx, t) {
    t.eq(mod.default.defaults({}).to, 'xlsx', 'default "Convert to"');

    // README example: postcodes keep their leading zero, amounts become numbers.
    const jess = csvFile('name,postcode,amount\nJess,0800,12.50', 'jess.csv');
    const json = only(t, await t.process([jess], { to: 'json' }));
    t.eq([json.name, json.note], ['jess.json', '1 row'], 'JSON name and note');
    t.eq(JSON.parse(await json.blob.text()), [{ name: 'Jess', postcode: '0800', amount: 12.5 }], 'JSON records');

    // Round trip CSV -> Excel -> JSON -> CSV keeps the table (quotes, commas, numbers).
    const xlsx = only(t, await t.process([await fx.csv()]));
    t.eq([xlsx.name, xlsx.blob.type, xlsx.note], ['creators.xlsx', XLSX_TYPE, '3 rows'], 'default output: Excel');
    t.eq(await t.xlsxSheets(xlsx.blob), { Sheet1: fx.ROWS }, 'CSV fixture -> Excel, read back with SheetJS');
    const back = only(t, await t.process([new File([xlsx.blob], 'creators.xlsx')], { to: 'json' }));
    t.eq(JSON.parse(await back.blob.text()), recordsOf(fx.ROWS), 'Excel -> JSON records');
    const csv = only(t, await t.process([new File([back.blob], 'creators.json')], { to: 'csv' }));
    t.eq(t.csvRows(await textOf(csv.blob)), asText(fx.ROWS), 'JSON -> CSV rows (full round trip)');

    // Excel dates: serial 46315 ("dd mmm yyyy") must come out as 2026-10-20, not a day early.
    const sheets = await t.process([await workbook('book.xlsx', BOOK)], { to: 'json' });
    t.eq(names(sheets), ['book-Sheet1.json', 'book-Sheet2.json'], 'one JSON per sheet');
    t.eq(JSON.parse(await sheets.items[0].blob.text()), BOOK_JSON[0], 'Sheet1 JSON (percent as a number, dates as yyyy-mm-dd)');
    t.eq(JSON.parse(await sheets.items[1].blob.text()), BOOK_JSON[1], 'Sheet2 JSON (15-digit number kept)');

    // Named exports with no UI.
    t.eq(mod.xmlRows('<r><i id="7"><a>x</a><a>y</a></i><i id="8"><a>z</a></i></r>'), [{ id: '7', a: 'x, y' }, { id: '8', a: 'z' }], 'xmlRows(): attributes and repeated children');
    t.eq(mod.jsonRows('[["a","b"],[1,2]]'), [['a', 'b'], [1, 2]], 'jsonRows(): a list of rows');
    t.eq(mod.jsonRows('[{"n":"a","links":[{"u":1}],"tags":["x","y"]}]'), [{ n: 'a', links: '[{"u":1}]', tags: 'x, y' }], 'jsonRows(): lists of objects stay JSON, plain lists are joined');
    const direct = await mod.convertFile(jess, 'xml');
    t.eq(xmlRecords(t, xmlDoc(t, await direct[0].blob.text())), [{ name: 'Jess', postcode: '0800', amount: '12.50' }], 'convertFile(file, "xml")');

    // One broken file among good ones is reported; the rest still convert.
    const mixed = await t.process([jess, jsonFile('{"name": "Jess",', 'broken.json')], { to: 'xml' });
    t.eq(names(mixed), ['jess.xml'], 'files converted when one is broken');
    t.eq(mixed.errors.map((e) => [e.file.name, /^This file isn't valid JSON/.test(e.error.message)]), [['broken.json', true]], 'error for the broken JSON');
    const err = await t.rejects(t.process([xmlFile('<rows><row>1</rows>', 'bad.xml')], { to: 'csv' }), 'converting broken XML');
    t.match(t.friendlyError(err), /^This file isn't valid XML/, 'message for broken XML');
  },

  async 'csv-to-excel'(mod, fx, t) {
    // The preset fixes the output, so a "to" option is ignored.
    const out = only(t, await t.process([csvFile('name,postcode,amount\nJess,0800,12.50', 'jess.csv')], { to: 'json' }));
    t.eq([out.name, out.blob.type, out.note], ['jess.xlsx', XLSX_TYPE, '1 row'], 'name, type and note');
    t.eq(await t.xlsxSheets(out.blob), { Sheet1: [['name', 'postcode', 'amount'], ['Jess', '0800', 12.5]] }, 'B2 is the text 0800, C2 the number 12.5');

    const semi = only(t, await t.process([csvFile('name;postcode;amount\r\nJess;0800;12.5\r\nSam;2000;7\r\n', 'semi.csv')]));
    t.eq(await t.xlsxSheets(semi.blob), { Sheet1: [['name', 'postcode', 'amount'], ['Jess', '0800', 12.5], ['Sam', 2000, 7]] }, 'semicolon-separated CSV');
    const tsv = only(t, await t.process([new File(['title\tviews\nMy vlog, part 2\t0042\n'], 'stats.tsv', { type: 'text/tab-separated-values' })]));
    t.eq(tsv.name, 'stats.xlsx', 'TSV output name');
    t.eq(await t.xlsxSheets(tsv.blob), { Sheet1: [['title', 'views'], ['My vlog, part 2', '0042']] }, 'tab-separated file');
  },

  async 'excel-to-csv'(mod, fx, t) {
    const out = await t.process([await workbook('book.xlsx', BOOK)]);
    t.eq(names(out), ['book-Sheet1.csv', 'book-Sheet2.csv'], 'one CSV per sheet');
    t.eq(notes(out), ['2 rows', '3 rows'], 'notes');
    t.eq(t.csvRows(await textOf(out.items[0].blob)), BOOK_CSV[0], 'Sheet1 as Excel shows it (25%, 20 Oct 2026, default date as 2026-10-21)');
    t.eq(t.csvRows(await textOf(out.items[1].blob)), BOOK_CSV[1], 'Sheet2 (15-digit number in full)');
    t.assert(await hasBom(out.items[0].blob), 'Sheet1 has accents, so its CSV should start with a byte order mark');
    t.assert(!(await hasBom(out.items[1].blob)), 'Sheet2 is plain ASCII, so its CSV should have no byte order mark');

    const fixture = await t.process([await fx.xlsx()]);
    t.eq(names(fixture), ['creators-Creators.csv', 'creators-Totals.csv'], 'fixture workbook file names');
    t.eq(t.csvRows(await textOf(fixture.items[0].blob)), asText(fx.ROWS), 'Creators sheet (quotes and commas survive)');
    t.eq(t.csvRows(await textOf(fixture.items[1].blob)), [['Total followers', '35900']], 'Totals sheet');
  },

  async 'csv-to-json'(mod, fx, t) {
    const out = only(t, await t.process([csvFile('name,postcode,amount\nJess,0800,12.50', 'jess.csv')]));
    t.eq([out.name, out.note], ['jess.json', '1 row'], 'name and note');
    const text = await out.blob.text();
    t.eq(JSON.parse(text), [{ name: 'Jess', postcode: '0800', amount: 12.5 }], 'records');
    t.match(text, /^\[\n {2}\{\n {4}"name": "Jess",/, 'indented with 2 spaces');

    const fixture = only(t, await t.process([await fx.csv()]));
    t.eq(fixture.note, '3 rows', 'fixture note');
    t.eq(JSON.parse(await fixture.blob.text()), recordsOf(fx.ROWS), 'fixture records');

    const odd = only(t, await t.process([csvFile('a,a,,c\n1,2,3,\n\n4,,6,7\n', 'odd.csv')]));
    t.eq(JSON.parse(await odd.blob.text()), [{ a: 1, a_1: 2, __EMPTY: 3, c: '' }, { a: 4, a_1: '', __EMPTY: 6, c: 7 }], 'duplicate and blank headers, empty cells and an empty row');
  },

  async 'json-to-csv'(mod, fx, t) {
    const out = only(t, await t.process([jsonFile('{"data":[{"name":"Jess","address":{"city":"Sydney"},"tags":["a","b"]}]}', 'nested.json')]));
    t.eq([out.name, out.note], ['nested.csv', '1 row'], 'name and note');
    t.eq((await textOf(out.blob)).split(/\r?\n/).filter(Boolean), ['name,address.city,tags', 'Jess,Sydney,"a, b"'], 'CSV lines');

    const sparse = only(t, await t.process([jsonFile([{ a: 1 }, { b: 'x', a: 2 }, { c: 'z' }], 'sparse.json')]));
    t.eq(t.csvRows(await textOf(sparse.blob)), [['a', 'b', 'c'], ['1', '', ''], ['2', 'x', ''], ['', '', 'z']], 'columns from every record');

    const fixture = only(t, await t.process([await fx.json()]));
    t.eq(t.csvRows(await textOf(fixture.blob)), asText(lowerHeader(fx.ROWS)), 'fixture rows');

    const err = await t.rejects(t.process([jsonFile('{"name": "Jess",', 'broken.json')]), 'converting broken JSON');
    t.match(t.friendlyError(err), /^This file isn't valid JSON/, 'message for broken JSON');
  },

  async 'xml-to-json'(mod, fx, t) {
    const shop = '<shop><name>Gear</name><items><item id="1"><title>Mic</title><price cur="AUD">99.5</price></item><item id="2"><title>Cam</title></item></items></shop>';
    const out = only(t, await t.process([xmlFile(shop, 'shop.xml')]));
    t.eq([out.name, out.note], ['shop.json', '2 rows'], 'name and note');
    const recs = JSON.parse(await out.blob.text());
    const pick = (r) => [r.id, r.title, r.price, r['price.cur']];
    t.eq(recs.map(pick), [[1, 'Mic', 99.5, 'AUD'], [2, 'Cam', '', '']], 'records: id, title, price, price.cur');

    const fixture = only(t, await t.process([await fx.xml()]));
    t.eq(JSON.parse(await fixture.blob.text()), fx.RECORDS, 'fixture records');

    const err = await t.rejects(t.process([xmlFile('<shop><item></shop>', 'broken.xml')]), 'converting broken XML');
    t.match(t.friendlyError(err), /^This file isn't valid XML/, 'message for broken XML');
  },

  async 'json-to-xml'(mod, fx, t) {
    const out = only(t, await t.process([jsonFile('[{"1st col":"a&b","name":"Jess","xml id":"<7>"}]', 'odd.json')]));
    t.eq(out.name, 'odd.xml', 'name');
    const text = await out.blob.text();
    t.match(text, /<_1st_col>a&amp;b<\/_1st_col>/, 'escaped & and cleaned-up name');
    t.eq(xmlRecords(t, xmlDoc(t, text)), [{ _1st_col: 'a&b', name: 'Jess', _xml_id: '<7>' }], 'records');

    // JSON -> XML -> JSON gives the fixture records back.
    const fixture = only(t, await t.process([await fx.json()]));
    const back = await mod.convertFile(new File([fixture.blob], 'creators.xml'), 'json');
    t.eq(JSON.parse(await back[0].blob.text()), fx.RECORDS, 'round trip through XML');
  },

  async 'xml-to-csv'(mod, fx, t) {
    const out = only(t, await t.process([xmlFile('<r><i><a>1</a><b>x</b></i><i><a>2</a><b>y &lt; z</b></i></r>', 'r.xml')]));
    t.eq([out.name, out.note], ['r.csv', '2 rows'], 'name and note');
    t.eq(t.csvRows(await textOf(out.blob)), [['a', 'b'], ['1', 'x'], ['2', 'y < z']], 'rows');

    const fixture = only(t, await t.process([await fx.xml()]));
    t.eq(t.csvRows(await textOf(fixture.blob)), asText(lowerHeader(fx.ROWS)), 'fixture rows');

    const gaps = only(t, await t.process([xmlFile('<list><p><n>Zoë</n><c>Perth</c></p><p><n>Sam</n></p></list>', 'gaps.xml')]));
    t.eq(t.csvRows(await textOf(gaps.blob)), [['n', 'c'], ['Zoë', 'Perth'], ['Sam', '']], 'missing field gives an empty cell');
    t.assert(await hasBom(gaps.blob), 'accented CSV should start with a byte order mark');
  },

  async 'csv-to-xml'(mod, fx, t) {
    const out = only(t, await t.process([csvFile('name,postcode\nJess,0800', 'jess.csv')]));
    t.eq([out.name, out.note], ['jess.xml', '1 row'], 'name and note');
    t.eq(xmlRecords(t, xmlDoc(t, await out.blob.text())), [{ name: 'Jess', postcode: '0800' }], 'records');

    const fixture = only(t, await t.process([await fx.csv()]));
    t.eq(xmlRecords(t, xmlDoc(t, await fixture.blob.text())), recordsOf(asText(fx.ROWS)), 'fixture records, values as written');

    const odd = only(t, await t.process([csvFile('Full name,2024 total,Note\nA & B,"1,200",<b>hi</b>\n', 'odd.csv')]));
    t.eq(xmlRecords(t, xmlDoc(t, await odd.blob.text())), [{ Full_name: 'A & B', _2024_total: '1,200', Note: '<b>hi</b>' }], 'escaping and element names');
  },

  async 'xml-to-excel'(mod, fx, t) {
    const out = only(t, await t.process([xmlFile('<r><i><a>1</a></i><i><a>02</a></i></r>', 'r.xml')]));
    t.eq([out.name, out.blob.type, out.note], ['r.xlsx', XLSX_TYPE, '2 rows'], 'name, type and note');
    t.eq(await t.xlsxSheets(out.blob), { Sheet1: [['a'], [1], ['02']] }, 'one sheet: A2 the number 1, A3 the text 02');

    const fixture = only(t, await t.process([await fx.xml()]));
    t.eq(await t.xlsxSheets(fixture.blob), { Sheet1: lowerHeader(fx.ROWS) }, 'fixture rows with numbers as numbers');
  },

  async 'excel-to-xml'(mod, fx, t) {
    const out = await t.process([await workbook('book.xlsx', BOOK)]);
    t.eq(names(out), ['book-Sheet1.xml', 'book-Sheet2.xml'], 'one XML per sheet');
    t.eq(notes(out), ['2 rows', '3 rows'], 'notes');
    const text = await out.items[0].blob.text();
    t.match(text, /<Share>25%<\/Share>/, 'percentage as Excel shows it');
    t.eq(xmlRecords(t, xmlDoc(t, text, 'book-Sheet1.xml')), [{ Name: 'Mia Chen', Share: '25%', Joined: '20 Oct 2026' }, { Name: 'Zoë Café', Share: '50%', Joined: '2026-10-21' }], 'Sheet1 records');
    t.eq(xmlRecords(t, xmlDoc(t, await out.items[1].blob.text(), 'book-Sheet2.xml')), [{ Views: '1200' }, { Views: '900' }, { Views: '123456789012345' }], 'Sheet2 records');

    // Excel -> XML -> JSON gives the fixture records back.
    const fixture = await t.process([await fx.xlsx()]);
    t.eq(names(fixture), ['creators-Creators.xml', 'creators-Totals.xml'], 'fixture workbook file names');
    const back = await mod.convertFile(new File([fixture.items[0].blob], 'creators.xml'), 'json');
    t.eq(JSON.parse(await back[0].blob.text()), recordsOf(fx.ROWS), 'round trip through XML');
  },

  async 'split-csv'(mod, fx, t) {
    const lines = ['id,text', ...Array.from({ length: 25 }, (_, i) => `${i + 1},${i === 2 ? '"two\nlines"' : `row ${i + 1}`}`)];
    const text = `${lines.join('\r\n')}\r\n`;
    const big = csvFile(text, 'big.csv');
    t.eq(mod.csvRecords(text).length, 26, 'csvRecords(): header + 25 rows (the quoted line break stays in its row)');

    const out = only(t, await t.process([big], { rows: 10 }));
    t.eq([out.name, out.note], ['big-split.zip', '3 files of up to 10 rows'], 'name and note');
    const parts = await t.unzip(out.blob);
    t.eq(parts.map((p) => p.name), ['big-1.csv', 'big-2.csv', 'big-3.csv'], 'files in the zip');
    const texts = parts.map((p) => new TextDecoder().decode(p.data));
    t.eq(texts.map((s) => mod.csvRecords(s).length), [11, 11, 6], 'records per part (csvRecords)');
    const rows = texts.map((s) => t.csvRows(s));
    t.eq(rows.map((r) => r.length), [11, 11, 6], 'rows per part (independent CSV reader)');
    t.assert(texts.every((s) => s.startsWith('id,text\r\n') && s.endsWith('\r\n')), 'every part starts with the header and keeps CRLF line endings');
    t.eq(rows[0][3], ['3', 'two\nlines'], 'quoted line break kept inside its row');
    t.eq(rows.flatMap((r) => r.slice(1)), t.csvRows(text).slice(1), 'all rows, in order');

    const err = await t.rejects(t.process([big], { rows: 25 }), 'splitting 25 rows at 25 per file');
    t.match(err.message, /nothing to split/, 'message when there is nothing to split');
  },

  async 'split-excel'(mod, fx, t) {
    // Data: header + 25 rows, dd/mm/yyyy dates, formulas with saved results, column widths. Two: 1 row.
    const data = [['Date', 'Views'], ...Array.from({ length: 25 }, (_, i) => [{ v: 46315 + i, z: 'dd/mm/yyyy' }, { v: (i + 2) * 10, f: 'ROW()*10' }])];
    const wb = () => workbook('wb.xlsx', { Data: data, Two: [['Name', 'Count'], ['Mia', 3]] }, { cols: { Data: [14, 9] } });

    const out = only(t, await t.process([await wb()], { by: 'rows', rows: 10 }));
    t.eq([out.name, out.note], ['wb-split.zip', '4 files'], 'name and note');
    const parts = await t.unzip(out.blob);
    t.eq(parts.map((p) => p.name), ['wb-Data-1.xlsx', 'wb-Data-2.xlsx', 'wb-Data-3.xlsx', 'wb-Two-1.xlsx'], 'files in the zip');
    const books = await Promise.all(parts.map((p) => readXlsx(p.data, { cellStyles: true, cellNF: true })));
    t.eq(books.map((b) => b.SheetNames), [['Data'], ['Data'], ['Data'], ['Two']], 'sheet names');
    const pieces = books.slice(0, 3).map((b) => b.Sheets.Data);
    t.eq(pieces.map((ws) => ws['!ref']), ['A1:B11', 'A1:B11', 'A1:B6'], 'ranges');
    pieces.forEach((ws, k) => {
      const at = `wb-Data-${k + 1}.xlsx`;
      t.eq([ws.A1?.v, ws.B1?.v], ['Date', 'Views'], `${at}: header in row 1`);
      t.eq(formulasIn(ws), [], `${at}: formulas left`);
      t.eq(ws.A2?.z, 'dd/mm/yyyy', `${at}: date format of A2`);
      t.near(ws['!cols']?.[0]?.width, 14, 1, `${at}: width of column A`);
      t.near(ws['!cols']?.[1]?.width, 9, 1, `${at}: width of column B`);
    });
    t.eq([pieces[1].A2.v, pieces[1].B2.v, pieces[2].A6.v, pieces[2].B6.v], [46325, 120, 46339, 260], 'values carried over (formulas swapped for saved results)');
    t.eq((await loadModule(SHEETJS)).utils.sheet_to_json(books[3].Sheets.Two, { header: 1 }), [['Name', 'Count'], ['Mia', 3]], 'wb-Two-1.xlsx rows');

    const bySheet = only(t, await t.process([await wb()], { by: 'sheet' }));
    t.eq([bySheet.name, bySheet.note], ['wb-split.zip', '2 files'], 'by sheet: name and note');
    const sheetParts = await t.unzip(bySheet.blob);
    t.eq(sheetParts.map((p) => p.name), ['wb-Data.xlsx', 'wb-Two.xlsx'], 'by sheet: files in the zip');
    const whole = (await readXlsx(sheetParts[0].data)).Sheets.Data;
    t.eq([whole['!ref'], formulasIn(whole).length, whole.B26?.v], ['A1:B26', 0, 260], 'by sheet: Data range, formulas, last value');

    const err = await t.rejects(t.process([await workbook('one.xlsx', { Only: data })], { by: 'sheet' }), 'splitting a 1-sheet workbook by sheet');
    t.match(err.message, /only one sheet/, 'message for a 1-sheet workbook');
  },

  async 'excel-to-pdf'(mod, fx, t) {
    // Sales: 2 columns, 120 rows (one with characters the PDF font lacks). Wide: 30 columns, 2 rows.
    const sales = [['Item', 'Amount'], ['Café ✓', 1.5], ...Array.from({ length: 119 }, (_, i) => [`Item ${i + 2}`, (i + 2) * 1.5])];
    const two = (n) => String(n).padStart(2, '0');
    const wide = [
      Array.from({ length: 30 }, (_, c) => `Column ${two(c + 1)} heading`),
      ...[1, 2].map((r) => Array.from({ length: 30 }, (_, c) => `Value ${two(c + 1)} row ${r}`)),
    ];
    const out = only(t, await t.process([await workbook('report.xlsx', { Sales: sales, Wide: wide })]));
    t.eq([out.name, out.blob.type], ['report.pdf', 'application/pdf'], 'name and type');
    const info = await t.pdfInfo(out.blob);
    t.eq(out.note, `${info.pages} pages`, 'note matches the page count');

    const salesPages = info.text.map((s, i) => [s, i]).filter(([s]) => s.startsWith('Sales'));
    t.eq(salesPages.map(([, i]) => info.sizes[i]), [PORTRAIT, PORTRAIT, PORTRAIT, PORTRAIT], 'Sales: 4 portrait A4 pages');
    t.assert(salesPages.every(([s]) => /^Sales Item Amount/.test(s)), 'Sales: header repeated on every page');
    t.match(salesPages[0][0], /Café \? 1\.5 Item 2 3/, 'Sales page 1: first rows, unsupported character shown as ?');
    t.match(salesPages[3][0], /Item 120 180$/, 'Sales: last row on the last page');

    const widePages = info.text.map((s, i) => [s, i]).filter(([s]) => s.startsWith('Wide'));
    t.eq(salesPages.length + widePages.length, info.pages, 'every page belongs to a sheet');
    t.assert(widePages.length >= 2, `Wide: expected the table to carry over several pages, got ${widePages.length}`);
    widePages.forEach(([, i]) => t.eq(info.sizes[i], LANDSCAPE, `Wide: size of page ${i + 1}`));
    const spans = widePages.map(([s]) => /columns ([A-Z]+) to ([A-Z]+)/.exec(s)?.slice(1));
    t.assert(spans.every(Boolean), `Wide: every page labelled "columns X to Y" (got ${JSON.stringify(widePages.map(([s]) => s.slice(0, 40)))})`);
    t.eq([spans[0][0], spans.at(-1)[1]], ['A', 'AD'], 'Wide: pages cover columns A to AD');
    const all = widePages.map(([s]) => s).join(' ');
    const missing = wide[0].filter((h) => all.split(h).length !== 2);
    t.eq(missing, [], 'Wide: headers that are not on exactly one page');
  },

  async 'create-zip'(mod, fx, t) {
    const files = [new File(['hello'], 'a.txt', { type: 'text/plain' }), new File(['hi'], 'a.txt', { type: 'text/plain' }), new File([new Uint8Array(1000)], 'b.bin')];
    const out = await t.process(files);
    const zip = only(t, out);
    t.eq([zip.name, zip.note, zip.blob.type], ['files.zip', '3 files', 'application/zip'], 'name, note and type');
    const m = /^3 files zipped \(1007 B to (\d+) B\)$/.exec(out.summary || '');
    t.assert(m, `summary: expected "3 files zipped (1007 B to N B)", got ${JSON.stringify(out.summary)}`);
    t.eq(Number(m[1]), zip.blob.size, 'size in the summary');
    t.assert(zip.blob.size < 1007, `zip should be smaller than 1007 B, got ${zip.blob.size} B`);
    const entries = await t.unzip(zip.blob);
    t.eq(entries.map((e) => [e.name, e.data.length]), [['a.txt', 5], ['a-2.txt', 2], ['b.bin', 1000]], 'entries and sizes');
    t.eq(entries.slice(0, 2).map((e) => new TextDecoder().decode(e.data)), ['hello', 'hi'], 'text contents');
    t.assert(entries[2].data.every((b) => b === 0), 'b.bin is still 1,000 zero bytes');

    const single = only(t, await t.process([await fx.txt()]));
    t.eq([single.name, single.note], ['notes.zip', '1 file'], 'one file: name and note');
    const [n] = await t.unzip(single.blob);
    t.eq([n.name, new TextDecoder().decode(n.data)], ['notes.txt', fx.TEXT], 'one file: contents');

    // Already-compressed files are stored, text is deflated.
    const jpg = await fx.jpg();
    const mixed = only(t, await t.process([jpg, await fx.txt()]));
    const dir = zipDirectory(await bytesOf(mixed.blob));
    t.eq(dir.map((e) => [e.name, e.method, e.size]), [['photo.jpg', 0, jpg.size], ['notes.txt', 8, fx.TEXT.length]], 'zip methods: JPG stored (0), text deflated (8)');
  },

  async 'qr-code-generator'(mod, fx, t) {
    // Custom tool: no process(), so the named exports from the README.
    const wifi = mod.qrPayload({ type: 'wifi', ssid: 'Home;Net', security: 'WPA', password: 'p:ss' });
    t.eq(wifi, 'WIFI:T:WPA;S:Home\\;Net;P:p\\:ss;;', 'Wi-Fi payload with escapes');
    t.eq(mod.qrPayload({ type: 'wifi', ssid: 'Cafe', security: 'nopass', password: 'unused' }), 'WIFI:T:nopass;S:Cafe;;', 'open Wi-Fi payload');
    t.eq(mod.qrPayload({ type: 'link', link: ' example.com ' }), 'https://example.com', 'link without a scheme');
    t.eq(mod.qrPayload({ type: 'link', link: 'mailto:hi@example.com' }), 'mailto:hi@example.com', 'link with a scheme');
    t.eq(mod.qrPayload({ type: 'text', text: 'Hello' }), 'Hello', 'text payload');

    const m = await mod.qrMatrix('https://example.com');
    t.eq([m.length, ...new Set(m.map((r) => r.length))], [33, 33], 'matrix size');
    t.eq([m[0][0], m[4][4], m[32][32]], [false, true, false], 'quiet border and finder pattern');

    const png = await mod.qrPng(m, 512, '#000000', '#ffffff');
    t.eq(png.type, 'image/png', 'PNG type');
    const info = await t.imageInfo(png);
    t.eq([info.type, info.width, info.height, info.alpha], ['png', 512, 512, false], 'PNG type, size, alpha');
    t.eq(await decodeQr(png), 'https://example.com', 'PNG decodes');

    const svg = mod.qrSvg(m, 512, '#000000', '#ffffff');
    t.match(svg, /^<svg [^>]*viewBox="0 0 33 33"[^>]* width="512" height="512"/, 'SVG header');
    t.eq(await decodeQr(new Blob([svg], { type: 'image/svg+xml' })), 'https://example.com', 'SVG decodes');

    t.eq(await decodeQr(await mod.qrPng(await mod.qrMatrix(wifi), 256, '#1a1033', '#fff8e7')), wifi, 'coloured Wi-Fi code decodes');
    const accents = 'Café ☕ in Brisbane, QLD: acTS';
    t.eq(await decodeQr(await mod.qrPng(await mod.qrMatrix(accents), 384, '#000000', '#ffffff')), accents, 'text with accents and emoji decodes');

    t.eq((await mod.qrMatrix('a'.repeat(2331))).length, 185, '2,331 bytes fit (version 40 + border)');
    await t.rejects(mod.qrMatrix('a'.repeat(2332)), 'encoding 2,332 bytes');
  },

  async 'lorem-ipsum-generator'(mod, fx, t) {
    const words = (s) => s.split(/\s+/).filter(Boolean);
    const sentences = (p) => p.split(/(?<=\.) /);
    const latin = (s) => words(s).every((w) => /^[a-z]+$/.test(w.toLowerCase().replace(/[.,]$/, '')));

    const w50 = await t.transform('', { unit: 'words', count: 50 });
    t.eq(words(w50.text).length, 50, 'words in "50 words"');
    t.assert(w50.text.startsWith('Lorem ipsum dolor sit amet'), `should start with "Lorem ipsum dolor sit amet", got ${w50.text.slice(0, 40)}`);
    t.match(w50.text, /[a-z]\.$/, 'ends with a full stop');
    t.assert(latin(w50.text), 'only lorem ipsum words');
    t.eq(w50.notice, undefined, 'no notice under the limit');
    t.eq((await t.transform('', { unit: 'words', count: 3 })).text, 'Lorem ipsum dolor.', '3 words');

    const p3 = (await t.transform('', { unit: 'paragraphs', count: 3 })).text;
    const paras = p3.split('\n\n');
    t.eq(paras.length, 3, 'paragraphs in "3 paragraphs"');
    t.assert(p3.startsWith('Lorem ipsum dolor sit amet, '), 'paragraphs start with "Lorem ipsum dolor sit amet, "');
    paras.forEach((p, i) => {
      const s = sentences(p);
      t.assert(s.length >= 4 && s.length <= 7, `paragraph ${i + 1}: expected 4 to 7 sentences, got ${s.length}`);
      s.forEach((x) => {
        const n = words(x).length;
        t.assert(n >= 8 && n <= 15 && /^[A-Z][^.]*\.$/.test(x) && x.split(',').length === 2, `sentence should have 8-15 words, a capital, one comma and a full stop: ${x}`);
      });
    });
    t.assert(latin(p3), 'only lorem ipsum words');
    t.eq(sentences((await t.transform('', { unit: 'sentences', count: 5 })).text).length, 5, 'sentences in "5 sentences"');
    t.eq((await t.transform('')).text.split('\n\n').length, 3, 'default: 3 paragraphs');

    const capped = [['paragraphs', 1000, (s) => s.split('\n\n').length, 500, /500 paragraphs/], ['sentences', 2500, (s) => sentences(s).length, 2000, /2,000 sentences/], ['words', 20000, (s) => words(s).length, 10000, /10,000 words/]];
    for (const [unit, count, measure, max, note] of capped) {
      const r = await t.transform('', { unit, count });
      t.eq(measure(r.text), max, `${count} ${unit} is capped`);
      t.match(r.notice?.text, note, `notice for ${count} ${unit}`);
    }

    const plain = mod.lorem('words', 10);
    t.eq([typeof plain, words(plain).length], ['string', 10], 'lorem("words", 10)');
  },

  async 'epoch-converter'(mod, fx, t) {
    // Custom tool: no process(), so the named exports from the README.
    const zero = mod.fromTimestamp('0');
    t.eq([zero.unit, zero.iso], ['seconds', '1970-01-01T00:00:00.000Z'], 'fromTimestamp("0")');
    for (const [ts, unit] of [['1792573512', 'seconds'], ['1792573512000', 'milliseconds'], ['1792573512000000', 'microseconds'], ['1792573512000000000', 'nanoseconds']]) {
      const r = mod.fromTimestamp(ts);
      t.eq([r?.unit, r?.iso, r?.ms], [unit, '2026-10-21T09:05:12.000Z', 1792573512000], `fromTimestamp("${ts}")`);
    }
    const r = mod.fromTimestamp(' 1792573512 ');
    t.match(r.utc, /21 October 2026/, 'UTC date');
    t.match(r.utc, /9:05:12\s?am/i, 'UTC time');
    t.match(r.utc, /UTC/, 'UTC zone');
    const d = new Date(1792573512000);
    t.match(r.local, new RegExp(`\\b${d.getDate()} October 2026\\b`), 'local date');
    t.match(r.local, new RegExp(`\\b${d.getHours() % 12 || 12}:05:12`), 'local time');
    t.eq(mod.fromTimestamp('-86400')?.iso, '1969-12-31T00:00:00.000Z', 'negative timestamp');
    t.eq([mod.fromTimestamp('99999999999')?.unit, mod.fromTimestamp('100000000000')?.unit], ['seconds', 'milliseconds'], 'seconds/milliseconds boundary');
    t.eq([mod.fromTimestamp('abc'), mod.fromTimestamp(''), mod.fromTimestamp('12a')], [null, null, null], 'not a number');

    t.eq(mod.toTimestamp('1970-01-02T00:00:00', 'utc'), { seconds: 86400, ms: 86400000 }, 'toTimestamp(…, "utc")');
    t.eq(mod.toTimestamp('2026-10-21T09:05:12', 'utc'), { seconds: 1792573512, ms: 1792573512000 }, 'toTimestamp of a known date');
    t.eq(mod.toTimestamp('1970-01-01T00:00:01.900', 'utc'), { seconds: 1, ms: 1900 }, 'rounds down to whole seconds');
    const local = mod.toTimestamp('1970-01-02T00:00:00');
    t.eq(local?.ms, 86400000 + new Date(1970, 0, 2).getTimezoneOffset() * 60000, 'local time shifts by the zone offset');
    t.eq([mod.toTimestamp(''), mod.toTimestamp('not a date', 'utc')], [null, null], 'empty or invalid date');
  },

  async 'word-counter'(mod, fx, t) {
    t.eq(mod.countText("Hello world. Don't stop!\n\nA well-known fact: 3.14 is pi."), { words: 10, characters: 56, charactersNoSpaces: 46, sentences: 3, paragraphs: 2, readingTime: '3 sec' }, 'README example');
    const text = fx.TEXT;
    t.eq(mod.countText(text), { words: 45, characters: text.length, charactersNoSpaces: text.replace(/\s/g, '').length, sentences: 4, paragraphs: 4, readingTime: '11 sec' }, 'fixture text');
    t.eq(mod.countText('Zoë’s café 👋'), { words: 2, characters: 12, charactersNoSpaces: 10, sentences: 1, paragraphs: 1, readingTime: '1 sec' }, 'accents, curly apostrophe and emoji');
    t.eq(mod.countText(''), { words: 0, characters: 0, charactersNoSpaces: 0, sentences: 0, paragraphs: 0, readingTime: '0 sec' }, 'empty text');

    const stats = (r) => Object.fromEntries((r.stats || []).map((s) => [s.label, s.value]));
    t.eq(stats(await t.transform('one two three')), { Words: '3', Characters: '13', 'Characters (no spaces)': '11', Sentences: '1', Paragraphs: '1', 'Reading time': '1 sec' }, 'transform() stats');
    const long = stats(await t.transform('word '.repeat(1500)));
    t.eq([long.Words, long['Reading time']], ['1,500', '6 min'], '1,500 words: thousands separator and minutes');
  },
};
