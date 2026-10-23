// Writes simple documents (paragraphs, headings, lists, tables, pictures) onto PDF pages with the
// standard PDF fonts. Used by Create PDF and Word to PDF.
// The standard fonts cover English and most Western European languages. Other characters
// (emoji, Chinese, Arabic and so on) are left out and counted, so the tool can say so.
import { getPdfLib } from '../../core/vendor.js';
import { decodeImage, drawToCanvas, encodeCanvas } from '../../core/image.js';

export const A4 = [595.28, 841.89];
const charSets = new WeakMap();

/** Keep only the characters a pdf-lib font can draw. Returns [text, numberLeftOut]. */
export function encodable(font, text) {
  if (!charSets.has(font)) charSets.set(font, new Set(font.getCharacterSet()));
  const ok = charSets.get(font);
  let dropped = 0;
  const kept = [...String(text).replace(/\r\n?/g, '\n').replace(/\t/g, '    ')].filter((c) => c === '\n' || ok.has(c.codePointAt(0)) || (dropped++, false));
  return [kept.join(''), dropped];
}

/**
 * blocks: { runs: [{ text, bold, italic }], size = 11, before = 0, after = 6, indent = 0, bullet }
 *       | { image: { bytes, type } } | { table: [[{ text, bold }]] }
 * Returns { bytes, pages, dropped (characters left out), skipped (pictures we couldn't add) }.
 */
export async function layoutPdf(blocks, { pageSize = A4, margin = 56.7 } = {}) {
  const { PDFDocument, StandardFonts, rgb } = await getPdfLib();
  const doc = await PDFDocument.create();
  const [reg, bold, ital, boldItal] = await Promise.all(['Helvetica', 'HelveticaBold', 'HelveticaOblique', 'HelveticaBoldOblique'].map((f) => doc.embedFont(StandardFonts[f])));
  const fontFor = (r) => (r.bold ? (r.italic ? boldItal : bold) : r.italic ? ital : reg);
  const ink = rgb(0.1, 0.1, 0.12);
  const [W, H] = pageSize;
  const textW = W - 2 * margin;
  let dropped = 0;
  let skipped = 0;
  let page;
  let y;
  const newPage = () => {
    page = doc.addPage(pageSize);
    y = H - margin;
  };
  const room = (need) => {
    if (y - need < margin && y < H - margin) newPage();
  };
  newPage();

  // Runs -> lines that fit `width`. A line is a list of [text, font, width] pieces.
  function wrap(runs, width, size) {
    const lines = [[]];
    let x = 0;
    let wrapped = false;
    const push = (t, font, w) => {
      lines.at(-1).push([t, font, w]);
      x += w;
    };
    const breakLine = (soft) => {
      lines.push([]);
      x = 0;
      wrapped = soft;
    };
    for (const r of runs) {
      const font = fontFor(r);
      const [text, d] = encodable(font, r.text);
      dropped += d;
      for (let tok of text.split(/(\n|[^\S\n]+)/)) {
        if (!tok) continue;
        if (tok === '\n') {
          breakLine(false);
          continue;
        }
        let w = font.widthOfTextAtSize(tok, size);
        if (!tok.trim()) {
          if (lines.at(-1).length || !wrapped) push(tok, font, w);
          continue;
        }
        if (x + w > width && lines.at(-1).length) breakLine(true);
        while (w > width && tok.length > 1) {
          let k = Math.max(1, Math.floor((tok.length * width) / w));
          while (k > 1 && font.widthOfTextAtSize(tok.slice(0, k), size) > width) k--;
          push(tok.slice(0, k), font, font.widthOfTextAtSize(tok.slice(0, k), size));
          breakLine(true);
          tok = tok.slice(k);
          w = font.widthOfTextAtSize(tok, size);
        }
        push(tok, font, w);
      }
    }
    return lines;
  }

  function drawLine(line, x, baseline, size) {
    let text = '';
    let font = null;
    let at = x;
    const flush = () => text.trim() && page.drawText(text, { x: at, y: baseline, size, font, color: ink });
    for (const [t, f, w] of line) {
      if (f !== font) {
        flush();
        text = '';
        font = f;
        at = x;
      }
      text += t;
      x += w;
    }
    flush();
  }

  async function image({ bytes, type }) {
    let img;
    try {
      if (type === 'image/png') img = await doc.embedPng(bytes);
      else if (type === 'image/jpeg') img = await doc.embedJpg(bytes);
      else {
        const d = await decodeImage(new Blob([bytes], { type }));
        const c = drawToCanvas(d.image, d.width, d.height);
        d.close();
        img = await doc.embedPng(await (await encodeCanvas(c, 'png')).arrayBuffer());
      }
    } catch {
      skipped++;
      return;
    }
    // 96 DPI, shrunk to fit the page if needed.
    const k = Math.min(0.75, textW / img.width, (H - 2 * margin) / img.height);
    const w = img.width * k;
    const ih = img.height * k;
    room(ih);
    page.drawImage(img, { x: margin, y: y - ih, width: w, height: ih });
    y -= ih + 8;
  }

  function table(rows) {
    const cols = Math.max(0, ...rows.map((r) => r.length));
    if (!cols) return;
    const size = 9.5;
    const lead = size * 1.3;
    const pad = 4;
    const cw = textW / cols;
    for (const row of rows) {
      const cells = row.map((c) => wrap([c], cw - 2 * pad, size));
      const rh = Math.max(1, ...cells.map((l) => l.length)) * lead + 2 * pad;
      room(rh);
      cells.forEach((lines, i) => {
        const x = margin + i * cw;
        page.drawRectangle({ x, y: y - rh, width: cw, height: rh, borderColor: rgb(0.7, 0.7, 0.75), borderWidth: 0.5 });
        lines.forEach((line, j) => drawLine(line, x + pad, y - pad - size * 0.9 - j * lead, size));
      });
      y -= rh;
    }
    y -= 10;
  }

  for (const b of blocks) {
    if (b.image) await image(b.image);
    else if (b.table) table(b.table);
    else {
      const size = b.size || 11;
      const lead = size * 1.35;
      const x = margin + (b.indent || 0);
      y -= b.before || 0;
      const lines = wrap(b.runs, textW - (b.indent || 0), size);
      room(lead);
      if (b.bullet) page.drawText(b.bullet, { x: x - 14, y: y - size, size, font: reg, color: ink });
      for (const line of lines) {
        room(lead);
        drawLine(line, x, y - size, size);
        y -= lead;
      }
      y -= b.after ?? 6;
    }
  }
  return { bytes: await doc.save(), pages: doc.getPageCount(), dropped, skipped };
}

/** One line for a result: "2 pages" plus anything we had to leave out. */
export function layoutNote({ pages, dropped, skipped }) {
  return [`${pages} page${pages === 1 ? '' : 's'}`,
    dropped && `${dropped} character${dropped === 1 ? '' : 's'} left out`,
    skipped && `${skipped} picture${skipped === 1 ? '' : 's'} left out`].filter(Boolean).join(' · ');
}
