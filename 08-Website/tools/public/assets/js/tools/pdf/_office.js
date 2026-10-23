// Minimal Word (.docx) and Excel (.xlsx) writers. Office files are zips of XML parts;
// these write only the parts Word and Excel need, with fflate.
import { getFflate } from '../../core/vendor.js';

export const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

/** Text safe for XML: escaped, with characters XML can't hold removed. */
export const esc = (s) => String(s)
  .replace(/[^\u0009\u000A\u000D -퟿-�\u{10000}-\u{10FFFF}]/gu, '')
  .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

async function pack(parts, type) {
  const { zipSync, strToU8 } = await getFflate();
  const files = {};
  for (const [path, body] of Object.entries(parts)) files[path] = strToU8(XML + body);
  return new Blob([zipSync(files)], { type });
}

const contentTypes = (overrides) => `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${overrides.map(([part, type]) => `<Override PartName="/${part}" ContentType="application/vnd.openxmlformats-officedocument.${type}"/>`).join('')}</Types>`;
const rels = (list) => `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${list.map(([id, type, target]) => `<Relationship Id="${id}" Type="${REL}/${type}" Target="${target}"/>`).join('')}</Relationships>`;

/** paragraphs: [{ text, size (pt), bold, newPage }]. page: { width, height } in points. Returns a .docx Blob. */
export function docx(paragraphs, page = { width: 595.28, height: 841.89 }) {
  const twips = (pt) => Math.round(Math.min(31680, Math.max(2880, pt * 20)));
  const body = paragraphs.map((p) => `<w:p><w:pPr>${p.newPage ? '<w:pageBreakBefore/>' : ''}<w:spacing w:after="120"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>${p.bold ? '<w:b/>' : ''}<w:sz w:val="${Math.round(Math.min(72, Math.max(6, p.size || 11)) * 2)}"/></w:rPr><w:t xml:space="preserve">${esc(p.text)}</w:t></w:r></w:p>`).join('');
  const landscape = page.width > page.height ? ' w:orient="landscape"' : '';
  return pack({
    '[Content_Types].xml': contentTypes([['word/document.xml', 'wordprocessingml.document.main+xml']]),
    '_rels/.rels': rels([['rId1', 'officeDocument', 'word/document.xml']]),
    'word/document.xml': `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="${twips(page.width)}" w:h="${twips(page.height)}"${landscape}/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`,
  }, DOCX_TYPE);
}

const colName = (i) => {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

function cell(value, ref) {
  const t = String(value ?? '').trim();
  if (!t) return '';
  const n = t.replace(/,(?=\d{3}(?:\D|$))/g, '');
  if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(n) && n.length < 16) return `<c r="${ref}"><v>${n}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(t)}</t></is></c>`;
}

function sheetXml(rows) {
  const widths = [];
  rows.forEach((r) => r.forEach((v, i) => (widths[i] = Math.max(widths[i] || 0, String(v ?? '').length))));
  const cols = widths.length ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.min(60, Math.max(8, w + 2))}" customWidth="1"/>`).join('')}</cols>` : '';
  const data = rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => cell(v, colName(ci) + (ri + 1))).join('')}</row>`).join('');
  return `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols}<sheetData>${data}</sheetData></worksheet>`;
}

/** sheets: [{ name, rows: [[text]] }]. Plain numbers become real numbers. Returns a .xlsx Blob. */
export function xlsx(sheets) {
  const parts = {
    '[Content_Types].xml': contentTypes([['xl/workbook.xml', 'spreadsheetml.sheet.main+xml'], ...sheets.map((_, i) => [`xl/worksheets/sheet${i + 1}.xml`, 'spreadsheetml.worksheet+xml'])]),
    '_rels/.rels': rels([['rId1', 'officeDocument', 'xl/workbook.xml']]),
    'xl/workbook.xml': `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${REL}"><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': rels(sheets.map((_, i) => [`rId${i + 1}`, 'worksheet', `worksheets/sheet${i + 1}.xml`])),
  };
  sheets.forEach((s, i) => (parts[`xl/worksheets/sheet${i + 1}.xml`] = sheetXml(s.rows)));
  return pack(parts, XLSX_TYPE);
}
