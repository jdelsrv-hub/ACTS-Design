import { fileTool } from '../../core/filetool.js';
import { notice } from '../../core/ui.js';
import { loadScript } from '../../core/vendor.js';
import { renameExt } from '../../core/files.js';
import { pdfBlob } from './_pages.js';
import { layoutPdf, layoutNote } from './_layout.js';

// mammoth (BSD-2-Clause) reads .docx files into simple HTML.
const MAMMOTH = 'https://cdn.jsdelivr.net/npm/mammoth@1.13.0/mammoth.browser.min.js';
const LIMIT = "Keeps headings, paragraphs, bold and italic text, lists, simple tables and pictures. Fonts, colours, columns, headers and footers aren't kept.";
const HEADINGS = { 1: 20, 2: 16, 3: 14, 4: 12, 5: 11, 6: 11 };

/** mammoth's HTML -> layout blocks for _layout.js. */
async function htmlToBlocks(html) {
  const body = new DOMParser().parseFromString(html, 'text/html').body;
  const blocks = [];
  const runs = (node, style = {}, images = []) => {
    const out = [];
    for (const n of node.childNodes) {
      if (n.nodeType === Node.TEXT_NODE) out.push({ text: n.data, ...style });
      else if (n.nodeType !== Node.ELEMENT_NODE || /^(UL|OL)$/.test(n.tagName)) continue;
      else if (n.tagName === 'BR') out.push({ text: '\n', ...style });
      else if (n.tagName === 'IMG') images.push(n.getAttribute('src'));
      else out.push(...runs(n, { bold: style.bold || /^(STRONG|B|TH)$/.test(n.tagName), italic: style.italic || /^(EM|I)$/.test(n.tagName) }, images));
    }
    return out;
  };
  const para = async (el, opts) => {
    const images = [];
    const r = runs(el, { bold: opts.bold }, images);
    if (r.some((x) => x.text.trim())) blocks.push({ runs: r, ...opts });
    for (const src of images) {
      if (!src?.startsWith('data:')) continue;
      const blob = await (await fetch(src)).blob();
      blocks.push({ image: { bytes: new Uint8Array(await blob.arrayBuffer()), type: blob.type } });
    }
  };
  const list = async (el, depth) => {
    let i = 0;
    for (const li of el.children) {
      await para(li, { indent: 18 * (depth + 1), bullet: el.tagName === 'OL' ? `${++i}.` : '•', after: 3 });
      for (const sub of li.children) if (/^(UL|OL)$/.test(sub.tagName)) await list(sub, depth + 1);
    }
  };
  const walk = async (el) => {
    for (const n of el.children) {
      const t = n.tagName;
      if (/^H[1-6]$/.test(t)) await para(n, { size: HEADINGS[t[1]], bold: true, before: 8, after: 6 });
      else if (t === 'P') await para(n, {});
      else if (t === 'UL' || t === 'OL') await list(n, 0);
      else if (t === 'TABLE') blocks.push({ table: [...n.querySelectorAll('tr')].map((tr) => [...tr.children].map((c) => ({ text: [...c.children].map((p) => p.textContent).join('\n') || c.textContent, bold: c.tagName === 'TH' }))) });
      else await walk(n);
    }
  };
  await walk(body);
  return blocks;
}

/** A .docx (ArrayBuffer) -> A4 PDF. Returns { bytes, pages, dropped, skipped }. */
export async function docxToPdf(buffer) {
  const mammoth = await loadScript(MAMMOTH, 'mammoth');
  let html;
  try {
    ({ value: html } = await mammoth.convertToHtml({ arrayBuffer: buffer }));
  } catch {
    throw new Error("We couldn't read this Word document. It may be damaged, or it may be an older .doc file (save it as .docx and try again).");
  }
  const blocks = await htmlToBlocks(html);
  if (!blocks.length) throw new Error("We couldn't find any text or pictures in this document.");
  return layoutPdf(blocks);
}

export default fileTool({
  accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  dropTitle: 'Drop your Word document here',
  dropHint: 'A .docx file from Word, Google Docs or Pages.',
  action: 'Convert to PDF',
  actionIcon: 'file-input',
  renderEmpty: (view) => view.append(notice('info', LIMIT)),
  renderExtra: (extra) => extra.append(notice('info', LIMIT)),
  async processFile(file) {
    const r = await docxToPdf(await file.arrayBuffer());
    return { name: renameExt(file.name, 'pdf'), blob: pdfBlob(r.bytes), note: layoutNote(r) };
  },
});
