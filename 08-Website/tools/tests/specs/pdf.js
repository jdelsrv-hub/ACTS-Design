// Function tests for the PDF family. One entry per slug: async (mod, fx, t) => { ...checks }.
// mod: the tool's module · fx: test files (fixtures.js) · t: checks and readers (check.js)
// plus t.process(files, options) / t.transform(text, options) with the entry's preset applied.
// A string instead of a function marks a deliberate skip, e.g. 'pdf-to-png': 'same code path as pdf-to-jpg'.
//
// Extra fixtures and readers this family needs are defined below (candidates for fixtures.js / check.js):
//   picturesPdf, blankPdf, rotatedPdf, reportPdf, tablePdf, docxFile, noisyPng, exifRotated (fixtures)
//   textItems, imagesPlaced, imageStreams, pixelsAt, opacities, latin1, docxParagraphs (readers)
import { getPdfLib, getPdfjs, openPdfjs, getFflate } from '../../public/assets/js/core/vendor.js';

const TOOLS = '../../public/assets/js/tools/pdf/';
const MM = 72 / 25.4;
const X = '×'; // the × in notes like "1240 × 1754"

// "Alpha page 1" etc.: the first text on every fixtures.js PDF page, so it shows page order.
const labels = (info) => info.text.map((s) => /^\w+ page \d+/.exec(s)?.[0]);
const bytesOf = async (b) => new Uint8Array(b instanceof Blob ? await b.arrayBuffer() : b);
const latin1 = async (b) => new TextDecoder('latin1').decode(await bytesOf(b));
const pdfFile = (bytes, name) => new File([bytes], name, { type: 'application/pdf' });
const sameBytes = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// ---------- Extra fixtures (made in the page, cached) ----------

const memo = new Map();
function make(key, fn) {
  if (!memo.has(key)) memo.set(key, Promise.resolve().then(fn).catch((err) => {
    memo.delete(key);
    throw err;
  }));
  return memo.get(key);
}

/** Opaque gradient PNG with heavy grain, like a scan saved as PNG (doesn't compress well). */
const noisyPng = (w, h) => make(`noisyPng${w}x${h}`, async () => {
  const c = new OffscreenCanvas(w, h);
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#2f6fd0');
  grad.addColorStop(1, '#f2b880');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  const img = g.getImageData(0, 0, w, h);
  let seed = 11;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 16807) % 2147483647;
    const n = (seed % 41) - 20;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  return new File([await c.convertToBlob({ type: 'image/png' })], 'scan.png', { type: 'image/png' });
});

/** One landscape page: an 800 × 600 JPG, a 2400 × 1800 grainy PNG and a line of text. */
const picturesPdf = (fx) => make('picturesPdf', async () => {
  const { PDFDocument, StandardFonts } = await getPdfLib();
  const jpgFile = await fx.jpg({ width: 800, height: 600 });
  const pngFile = await noisyPng(2400, 1800);
  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]);
  const jpg = await doc.embedJpg(await bytesOf(jpgFile));
  const png = await doc.embedPng(await bytesOf(pngFile));
  page.drawImage(jpg, { x: 40, y: 200, width: 360, height: 270 });
  page.drawImage(png, { x: 440, y: 200, width: 360, height: 270 });
  page.drawText('Pictures inside, text stays sharp.', { x: 40, y: 120, size: 14, font: await doc.embedFont(StandardFonts.Helvetica) });
  return { file: pdfFile(await doc.save(), 'pictures.pdf'), jpg: jpgFile, png: pngFile };
});

/** One page with only a drawn rectangle: no text, no pictures. */
const blankPdf = () => make('blankPdf', async () => {
  const { PDFDocument, rgb } = await getPdfLib();
  const doc = await PDFDocument.create();
  doc.addPage([595, 842]).drawRectangle({ x: 100, y: 100, width: 300, height: 200, color: rgb(0.45, 0.3, 0.9) });
  return pdfFile(await doc.save(), 'shapes.pdf');
});

/** fx.pdf() pages with /Rotate 90 (they display landscape, 842 × 595). */
const rotatedPdf = (fx) => make('rotatedPdf', async () => {
  const { PDFDocument, degrees } = await getPdfLib();
  const doc = await PDFDocument.load(await bytesOf(await fx.pdf({ pages: 2, label: 'Turned' })));
  doc.getPages().forEach((p) => p.setRotation(degrees(90)));
  return pdfFile(await doc.save(), 'turned.pdf');
});

/** For PDF to Word: a 22 pt bold title, two 11 pt lines 14 pt apart, and a second page. */
const reportPdf = () => make('reportPdf', async () => {
  const { PDFDocument, StandardFonts } = await getPdfLib();
  const doc = await PDFDocument.create();
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const p1 = doc.addPage([595, 842]);
  p1.drawText('Quarterly creator report', { x: 60, y: 762, size: 22, font: bold });
  p1.drawText('Our audience grew steadily this quarter on', { x: 60, y: 712, size: 11, font: reg });
  p1.drawText('all three platforms we track.', { x: 60, y: 698, size: 11, font: reg });
  doc.addPage([595, 842]).drawText('Next steps for the new year.', { x: 60, y: 762, size: 11, font: reg });
  return pdfFile(await doc.save(), 'report.pdf');
});

const TABLE = [['Item', 'Qty', 'Price'], ['Apples', '3', '1,200.50'], ['Pears', '10', '4.00'], ['Plums', '007', '$12']];
/** For PDF to Excel: a 3-column table on page 1 (cells drawn separately), one line of text on page 2. */
const tablePdf = () => make('tablePdf', async () => {
  const { PDFDocument, StandardFonts } = await getPdfLib();
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const p1 = doc.addPage([595, 842]);
  TABLE.forEach((row, r) => row.forEach((text, c) => p1.drawText(text, { x: [60, 220, 320][c], y: 742 - r * 20, size: 12, font })));
  doc.addPage([595, 842]).drawText('Prices include GST.', { x: 60, y: 742, size: 12, font });
  return pdfFile(await doc.save(), 'prices.pdf');
});

/** A small .docx: Heading 1, a paragraph with a bold word, a 2 × 2 table and a closing paragraph. */
const docxFile = () => make('docxFile', async () => {
  const { zipSync, strToU8 } = await getFflate();
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const run = (text, bold) => `<w:r>${bold ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${text}</w:t></w:r>`;
  const para = (runs, style) => `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}${runs}</w:p>`;
  const cell = (text) => `<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>${para(run(text))}</w:tc>`;
  const body = [
    para(run('Launch checklist'), 'Heading1'),
    para(run('Film the intro, ') + run('then', true) + run(' edit the cut.')),
    `<w:tbl><w:tblGrid><w:gridCol w:w="2400"/><w:gridCol w:w="2400"/></w:tblGrid><w:tr>${cell('Platform')}${cell('Due')}</w:tr><w:tr>${cell('YouTube')}${cell('Friday')}</w:tr></w:tbl>`,
    para(run('Post when the edit is approved.')),
  ].join('');
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const parts = {
    '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
    '_rels/.rels': `<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${R}/officeDocument" Target="word/document.xml"/></Relationships>`,
    'word/_rels/document.xml.rels': `<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${R}/styles" Target="styles.xml"/></Relationships>`,
    'word/styles.xml': `<w:styles xmlns:w="${W}"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/></w:style></w:styles>`,
    'word/document.xml': `<w:document xmlns:w="${W}" xmlns:r="${R}"><w:body>${body}</w:body></w:document>`,
  };
  const zipped = zipSync(Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, strToU8(head + v)])));
  return new File([zipped], 'checklist.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
});

/** The same JPEG with an EXIF orientation tag added after its APP0 segment (6 = phone held upright, saved sideways). */
async function exifRotated(file, orientation) {
  const src = await bytesOf(file);
  const app1 = new Uint8Array([0xff, 0xe1, 0x00, 0x22, 0x45, 0x78, 0x69, 0x66, 0, 0, // APP1, length 34, "Exif\0\0"
    0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8, // big-endian TIFF header, IFD at 8
    0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, orientation, 0, 0, // 1 entry: Orientation (SHORT) = orientation
    0, 0, 0, 0]); // no next IFD
  const at = src[2] === 0xff && src[3] === 0xe0 ? 4 + ((src[4] << 8) | src[5]) : 2;
  return new File([src.slice(0, at), app1, src.slice(at)], 'sideways.jpg', { type: 'image/jpeg' });
}

// ---------- Extra readers ----------

/** Text pieces per page in PDF points (origin bottom-left, before /Rotate): [{ str, x, y, w, size, angle }]. */
async function textItems(blob) {
  const doc = await openPdfjs(await bytesOf(blob));
  try {
    const pages = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const { items } = await (await doc.getPage(n)).getTextContent();
      pages.push(items.filter((i) => i.str?.trim()).map((i) => {
        const [a, b, , , x, y] = i.transform;
        return { str: i.str, x, y, w: i.width, size: Math.hypot(a, b), angle: (Math.atan2(b, a) * 180) / Math.PI };
      }));
    }
    return pages;
  } finally {
    doc.loadingTask.destroy();
  }
}

const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];

/** Where pdf.js paints pictures, per page: [{ x, y, w, h }] in PDF points (bounding box, before /Rotate). */
async function imagesPlaced(blob) {
  const { OPS } = await getPdfjs();
  const paints = new Set([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageXObjectRepeat, OPS.paintImageMaskXObject].filter((v) => v !== undefined));
  const doc = await openPdfjs(await bytesOf(blob));
  try {
    const pages = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const ops = await (await doc.getPage(n)).getOperatorList();
      let ctm = [1, 0, 0, 1, 0, 0];
      const stack = [];
      const out = [];
      ops.fnArray.forEach((fn, i) => {
        const args = ops.argsArray[i] || [];
        if (fn === OPS.save) stack.push(ctm);
        else if (fn === OPS.restore) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
        else if (fn === OPS.transform) ctm = mul(ctm, Array.from(args.length === 1 ? args[0] : args));
        else if (fn === OPS.paintFormXObjectBegin) {
          stack.push(ctm);
          if (args[0]) ctm = mul(ctm, Array.from(args[0]));
        } else if (fn === OPS.paintFormXObjectEnd) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
        else if (paints.has(fn)) {
          const pts = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([u, v]) => [ctm[0] * u + ctm[2] * v + ctm[4], ctm[1] * u + ctm[3] * v + ctm[5]]);
          const xs = pts.map((p) => p[0]);
          const ys = pts.map((p) => p[1]);
          out.push({ x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) });
        }
      });
      pages.push(out);
    }
    return pages;
  } finally {
    doc.loadingTask.destroy();
  }
}

/** Every image XObject in the file (via pdf-lib): [{ w, h, filter, smask, size }]. */
async function imageStreams(blob, options = {}) {
  const { PDFDocument, PDFName, PDFRawStream } = await getPdfLib();
  const doc = await PDFDocument.load(await bytesOf(blob), options);
  const N = (k) => PDFName.of(k);
  const out = [];
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream) || obj.dict.lookup(N('Subtype')) !== N('Image')) continue;
    const d = obj.dict;
    out.push({ w: d.lookup(N('Width'))?.asNumber(), h: d.lookup(N('Height'))?.asNumber(), filter: String(d.lookup(N('Filter')) ?? ''), smask: d.has(N('SMask')), size: obj.contents.length, contents: obj.contents });
  }
  return out;
}

/** Fill opacities (/ca) of the graphics states each page uses. */
async function opacities(blob) {
  const { PDFDocument, PDFName, PDFDict } = await getPdfLib();
  const doc = await PDFDocument.load(await bytesOf(blob));
  return doc.getPages().map((page) => {
    const gs = page.node.Resources()?.lookup(PDFName.of('ExtGState'));
    if (!(gs instanceof PDFDict)) return [];
    return gs.entries().map(([, v]) => doc.context.lookup(v)?.lookup?.(PDFName.of('ca'))?.asNumber?.()).filter((v) => v !== undefined);
  });
}

/** RGBA of a page rendered by pdf.js (rotation applied), at points measured from the visible top-left. */
async function pixelsAt(blob, pageNo, points) {
  const { renderPage } = await import(`${TOOLS}_pages.js`);
  const doc = await openPdfjs(await bytesOf(blob));
  try {
    const page = await doc.getPage(pageNo);
    const canvas = await renderPage(page, 1);
    const g = canvas.getContext('2d');
    const out = points.map(([x, y]) => [...g.getImageData(Math.round(x), Math.round(y), 1, 1).data]);
    canvas.width = 0;
    return out;
  } finally {
    doc.loadingTask.destroy();
  }
}

/** Dark pixels (ink) inside a box of a rendered page, box in points from the visible top-left. */
async function inkIn(blob, pageNo, [x0, y0, w, h]) {
  const { renderPage } = await import(`${TOOLS}_pages.js`);
  const doc = await openPdfjs(await bytesOf(blob));
  try {
    const canvas = await renderPage(await doc.getPage(pageNo), 1);
    const px = canvas.getContext('2d').getImageData(Math.round(x0), Math.round(y0), Math.round(w), Math.round(h)).data;
    canvas.width = 0;
    let dark = 0;
    for (let i = 0; i < px.length; i += 4) if (px[i] + px[i + 1] + px[i + 2] < 200) dark++;
    return dark;
  } finally {
    doc.loadingTask.destroy();
  }
}

const isWhite = ([r, g, b]) => r > 245 && g > 245 && b > 245;
const isPurple = ([r, g, b]) => b > 180 && r < 170 && g < 130; // the fixture's rgb(0.45, 0.3, 0.9) bar

/** Paragraphs of a .docx's word/document.xml: [{ text, bold, pageBreak, size (half-points) }]. */
function docxParagraphs(xml) {
  return [...xml.matchAll(/<w:p>([\s\S]*?)<\/w:p>/g)].map(([, p]) => ({
    text: [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join(''),
    bold: p.includes('<w:b/>'),
    pageBreak: p.includes('<w:pageBreakBefore/>'),
    size: /<w:sz w:val="(\d+)"/.exec(p)?.[1],
  }));
}

const fileText = (files, name) => {
  const f = files.find((x) => x.name === name);
  if (!f) throw new Error(`${name} is missing from the zip (has ${files.map((x) => x.name).join(', ')})`);
  return new TextDecoder().decode(f.data);
};

// ---------- Shared checks for the Images to PDF module ----------

async function imagesToPdfCommon(fx, t, slug) {
  const jpg = await fx.jpg({ width: 800, height: 600 });
  const out = await t.process([jpg]);
  t.eq(out.items.length, 1, 'number of files');
  t.eq(out.items[0].name, 'photo.pdf', 'file name');
  t.eq(out.items[0].note, '1 page', 'note');
  const info = await t.pdfInfo(out.items[0].blob);
  t.eq(info.sizes, [[600, 450]], 'page size for an 800 × 600 JPG at 96 DPI');
  const streams = await imageStreams(out.items[0].blob);
  t.eq(streams.map((s) => [s.w, s.h, s.filter]), [[800, 600, '/DCTDecode']], 'embedded picture');
  t.assert(sameBytes(streams[0].contents, await bytesOf(jpg)), `${slug}: the JPG should go in unchanged (no quality lost)`);
}

// ---------- Tests ----------

export default {
  async 'merge-pdf'(mod, fx, t) {
    const a = await fx.pdf({ pages: 2, label: 'Alpha' });
    const b = await fx.pdf({ pages: 3, label: 'Bravo', size: fx.LETTER_LANDSCAPE });

    const out = await t.process([a, b]);
    t.eq(out.items.length, 1, 'number of files');
    t.match(out.items[0].name, /^alpha.*\.pdf$/, 'file name');
    const info = await t.pdfInfo(out.items[0].blob);
    t.eq(info.pages, 5, 'page count');
    t.eq(labels(info), ['Alpha page 1', 'Alpha page 2', 'Bravo page 1', 'Bravo page 2', 'Bravo page 3'], 'page order');
    t.eq(info.sizes, [fx.A4, fx.A4, fx.LETTER_LANDSCAPE, fx.LETTER_LANDSCAPE, fx.LETTER_LANDSCAPE], 'page sizes');

    const swapped = await t.pdfInfo((await t.process([b, a])).items[0].blob);
    t.eq(labels(swapped), ['Bravo page 1', 'Bravo page 2', 'Bravo page 3', 'Alpha page 1', 'Alpha page 2'], 'page order after swapping the files');

    const err = await t.rejects(t.process([await fx.lockedPdf(), a]), 'merging a password-protected PDF');
    t.match(t.friendlyError(err), /password protected/i, 'message for a password-protected PDF');
  },

  async 'split-pdf'(mod, fx, t) {
    const five = await fx.pdf({ pages: 5, label: 'Five' });
    const out = await t.process([five], { mode: 'ranges', ranges: '1-3, 5' });
    t.eq(out.items.map((i) => i.name), ['five-pages-1-3.pdf', 'five-page-5.pdf'], 'file names');
    t.eq(out.items.map((i) => i.note), ['3 pages', '1 page'], 'notes');
    const parts = await Promise.all(out.items.map(async (i) => labels(await t.pdfInfo(i.blob))));
    t.eq(parts, [['Five page 1', 'Five page 2', 'Five page 3'], ['Five page 5']], 'pages in each file');

    const each = await t.process([five], { mode: 'each' });
    t.eq(each.items.length, 5, 'files for "Every page"');
    const eachLabels = await Promise.all(each.items.map(async (i) => labels(await t.pdfInfo(i.blob))));
    t.eq(eachLabels, [1, 2, 3, 4, 5].map((n) => [`Five page ${n}`]), 'one page per file, in order');

    const open = await t.process([five], { mode: 'ranges', ranges: '5-3, 4-' });
    t.eq(open.items.map((i) => i.name), ['five-pages-3-5.pdf', 'five-pages-4-5.pdf'], 'backwards range and open-ended range');

    const err = await t.rejects(t.process([five], { mode: 'ranges', ranges: '9' }), 'an out-of-range page');
    t.eq(err.message, 'This PDF has 5 pages, so 9 is out of range.', 'out-of-range message');
  },

  async 'compress-pdf'(mod, fx, t) {
    const { file } = await picturesPdf(fx);
    const out = await t.process([file]);
    t.eq(out.items.length, 1, 'number of files');
    const item = out.items[0];
    t.eq(item.name, 'pictures-compressed.pdf', 'file name');
    t.assert(item.blob.size < file.size * 0.5, `expected at least 50% smaller, got ${file.size} to ${item.blob.size} bytes`);
    t.eq(item.note, `${Math.round((1 - item.blob.size / file.size) * 100)}% smaller`, 'note');
    t.match(out.summary, /^Saved \d+% \(.+ to .+\)$/, 'summary');

    const info = await t.pdfInfo(item.blob);
    t.eq(info.pages, 1, 'page count');
    t.match(info.text[0], /Pictures inside, text stays sharp\./, 'text still reads');
    const streams = await imageStreams(item.blob);
    t.assert(streams.some((s) => s.w === 2000 && s.h === 1500 && s.filter === '/DCTDecode'), `the 2400 × 1800 PNG should become a 2000 × 1500 JPG, images are ${JSON.stringify(streams.map((s) => [s.w, s.h, s.filter]))}`);
    const placed = await imagesPlaced(item.blob);
    t.eq(placed[0].length, 2, 'pictures still drawn on the page');

    const err = await t.rejects(t.process([await fx.pdf()]), 'compressing a text-only PDF');
    t.match(err.message, /already about as small as we can make it/, 'message for a text-only PDF');
  },

  async 'pdf-to-jpg'(mod, fx, t) {
    const out = await t.process([await fx.pdf()]);
    t.eq(out.items.map((i) => i.name), ['sample-page-1.jpg', 'sample-page-2.jpg', 'sample-page-3.jpg'], 'file names');
    for (const item of out.items) {
      t.eq(item.blob.type, 'image/jpeg', `${item.name} type`);
      const i = await t.imageInfo(item.blob);
      t.eq(i.type, 'jpg', `${item.name} format`);
      t.near(i.width, 1240, 1, `${item.name} width (A4 at 150 DPI)`);
      t.near(i.height, 1754, 1, `${item.name} height (A4 at 150 DPI)`);
      t.eq(item.note, `${i.width} ${X} ${i.height}`, `${item.name} note`);
    }
    // The page is really drawn: the purple bar under the heading, white below the text.
    const bmp = await createImageBitmap(out.items[0].blob);
    const g = new OffscreenCanvas(bmp.width, bmp.height).getContext('2d');
    g.drawImage(bmp, 0, 0);
    bmp.close();
    const at = (x, y) => [...g.getImageData(Math.round((x * 150) / 72), Math.round((y * 150) / 72), 1, 1).data];
    t.assert(isPurple(at(300, 89)), `expected the purple bar at (300, 89) pt, got rgba ${at(300, 89)}`);
    t.assert(isWhite(at(300, 600)), `expected white at (300, 600) pt, got rgba ${at(300, 600)}`);

    const png = await t.process([await fx.pdf({ pages: 1, label: 'Single' })], { format: 'png' });
    t.eq(png.items.map((i) => [i.name, i.blob.type]), [['single-page-1.png', 'image/png']], 'PNG option');
  },

  async 'pdf-to-png'(mod, fx, t) {
    t.eq(mod.default.defaults(t.preset), { format: 'png' }, 'preset default');
    const out = await t.process([await fx.pdf({ pages: 2, label: 'Shots' })]);
    t.eq(out.items.map((i) => [i.name, i.blob.type]), [['shots-page-1.png', 'image/png'], ['shots-page-2.png', 'image/png']], 'files');
    const i = await t.imageInfo(out.items[1].blob);
    t.eq(i.type, 'png', 'format');
    t.near(i.width, 1240, 1, 'width');
    t.near(i.height, 1754, 1, 'height');
  },

  async 'images-to-pdf'(mod, fx, t) {
    const jpg = await fx.jpg({ width: 800, height: 600 });
    const png = await fx.png({ width: 2400, height: 1800 });
    const webp = await fx.webp({ width: 600, height: 800 });
    const out = await t.process([jpg, png, webp], { size: 'fit' });
    t.eq(out.items.length, 1, 'number of files');
    t.eq(out.items[0].name, 'photo.pdf', 'file name (after the first image)');
    t.eq(out.items[0].note, '3 pages', 'note');
    const info = await t.pdfInfo(out.items[0].blob);
    t.eq(info.sizes, [[600, 450], [1800, 1350], [450, 600]], 'page sizes (96 DPI)');
    const placed = await imagesPlaced(out.items[0].blob);
    t.eq(placed.map((p) => p.length), [1, 1, 1], 'one picture per page');

    const a4 = await t.process([jpg, webp], { size: 'a4' });
    const a4Info = await t.pdfInfo(a4.items[0].blob);
    t.eq(a4Info.sizes, [[842, 595], [595, 842]], 'A4 pages turn to fit wide and tall pictures');
    const box = (await imagesPlaced(a4.items[0].blob))[0][0];
    t.near(box.w, 600, 1, 'picture width on A4 (not enlarged)');
    t.near(box.x, (841.89 - 600) / 2, 1, 'picture centred across');
    t.near(box.y, (595.28 - 450) / 2, 1, 'picture centred down');
  },

  async 'jpg-to-pdf'(mod, fx, t) {
    t.eq(mod.default.resolve(t.preset).dropTitle, 'Drop your JPG images here', 'drop zone wording');
    await imagesToPdfCommon(fx, t, 'jpg-to-pdf');
    // A phone photo saved sideways (EXIF orientation 6) comes out upright: 600 × 800 px -> 450 × 600 pt.
    const sideways = await exifRotated(await fx.jpg({ width: 800, height: 600 }), 6);
    const info = await t.pdfInfo((await t.process([sideways])).items[0].blob);
    t.eq(info.sizes, [[450, 600]], 'page size for a sideways phone photo');
  },

  async 'png-to-pdf'(mod, fx, t) {
    t.eq(mod.default.resolve(t.preset).dropTitle, 'Drop your PNG images here', 'drop zone wording');
    const out = await t.process([await fx.png({ width: 2400, height: 1800 })]);
    t.eq(out.items[0].name, 'logo.pdf', 'file name');
    const info = await t.pdfInfo(out.items[0].blob);
    t.eq(info.sizes, [[1800, 1350]], 'page size for a 2400 × 1800 PNG');
    const streams = await imageStreams(out.items[0].blob);
    t.assert(streams.some((s) => s.w === 2400 && s.h === 1800 && s.smask), `the PNG should keep its see-through areas (an SMask), images are ${JSON.stringify(streams.map((s) => [s.w, s.h, s.filter, s.smask]))}`);
  },

  'heic-to-pdf': "No HEIC fixture: browsers can't encode HEIC, so one can't be made in the page (and we don't download test files). The preset only changes the drop zone wording; Images to PDF, JPG to PDF and PNG to PDF cover the shared code.",

  async 'rotate-pdf'(mod, fx, t) {
    const five = await fx.pdf({ pages: 5, label: 'Five' });
    const some = await t.process([five], { angle: 90, which: 'some', pages: '2, 4' });
    t.eq(some.items[0].name, 'five-rotated.pdf', 'file name');
    const info = await t.pdfInfo(some.items[0].blob);
    t.eq(info.rotations, [0, 90, 0, 90, 0], 'rotations');
    t.eq(info.sizes[1], [842, 595], 'a turned A4 page shows landscape');
    t.eq(labels(info), [1, 2, 3, 4, 5].map((n) => `Five page ${n}`), 'page order kept');

    const all = await t.pdfInfo((await t.process([five])).items[0].blob);
    t.eq(all.rotations, [90, 90, 90, 90, 90], 'defaults turn every page 90° clockwise');

    const again = await t.pdfInfo((await t.process([pdfFile(await bytesOf(some.items[0].blob), 'five.pdf')], { angle: 180 })).items[0].blob);
    t.eq(again.rotations, [180, 270, 180, 270, 180], 'turning adds to the existing rotation');
  },

  async 'delete-pdf-pages'(mod, fx, t) {
    const five = await fx.pdf({ pages: 5, label: 'Five' });
    const out = await t.process([five], { pages: '2, 4-5' });
    t.eq(out.items[0].name, 'five-edited.pdf', 'file name');
    t.eq(out.items[0].note, '2 pages left', 'note');
    t.eq(labels(await t.pdfInfo(out.items[0].blob)), ['Five page 1', 'Five page 3'], 'pages left');
    const err = await t.rejects(t.process([five], { pages: '1-5' }), 'deleting every page');
    t.match(err.message, /^A PDF needs at least one page/, 'message for deleting every page');
  },

  async 'rearrange-pdf'(mod, fx, t) {
    const out = await t.process([await fx.pdf()], { order: '3, 1, 2' });
    t.eq(out.items[0].name, 'sample-reordered.pdf', 'file name');
    const info = await t.pdfInfo(out.items[0].blob);
    t.eq(labels(info), ['Sample page 3', 'Sample page 1', 'Sample page 2'], 'new page order');
  },

  async 'extract-pdf-text'(mod, fx, t) {
    const out = await t.process([await fx.pdf()]);
    t.eq(out.items.length, 1, 'number of results');
    t.eq(out.items[0].name, 'sample.txt', 'file name');
    // The heading sits more than 1.8 lines above the body, so a blank line follows it; pages are split by a blank line.
    const page = (n) => `Sample page ${n}\n\n${fx.TEXT}`;
    t.eq(out.items[0].text, [1, 2, 3].map(page).join('\n\n'), 'text');
    const err = await t.rejects(t.process([await blankPdf()]), 'a PDF with no text');
    t.match(err.message, /^We couldn't find any text in this PDF/, 'message for a PDF with no text');
  },

  async 'extract-pdf-images'(mod, fx, t) {
    const { file, jpg } = await picturesPdf(fx);
    const out = await t.process([file]);
    t.eq(out.items.map((i) => i.name), ['pictures-page1-1.jpg', 'pictures-page1-2.png'], 'file names');
    t.assert(sameBytes(await bytesOf(out.items[0].blob), await bytesOf(jpg)), 'the JPG should come back byte for byte');
    t.eq(out.items[0].note, `800 ${X} 600`, 'JPG note');
    t.eq(out.items[1].note, `2400 ${X} 1800`, 'PNG note');
    const i = await t.imageInfo(out.items[1].blob);
    t.eq([i.type, i.width, i.height], ['png', 2400, 1800], 'PNG picture');
    const err = await t.rejects(t.process([await blankPdf()]), 'a PDF with no pictures');
    t.match(err.message, /^We didn't find any pictures in this PDF/, 'message for a PDF with no pictures');
  },

  async 'protect-pdf'(mod, fx, t) {
    t.match(mod.default.resolve().validate([], { password: 'secret1', confirm: 'secret2' }), /don't match/, 'mismatched passwords');
    const out = await t.process([await fx.pdf({ pages: 2, label: 'Guard' })], { password: 'secret1', confirm: 'secret1' });
    const blob = out.items[0].blob;
    t.eq(out.items[0].name, 'guard-protected.pdf', 'file name');
    const raw = await latin1(blob);
    t.match(raw, /\/V 5\b/, '/Encrypt /V');
    t.match(raw, /\/R 6\b/, '/Encrypt /R');
    t.match(raw, /\/CFM\s*\/AESV3/, '/Encrypt /CFM (AES-256)');
    const noPass = await t.rejects(t.pdfInfo(blob), 'opening without the password');
    t.eq(noPass.name, 'PasswordException', 'error without the password');
    const wrong = await t.rejects(t.pdfInfo(blob, { password: 'secret2' }), 'opening with the wrong password');
    t.eq(wrong.name, 'PasswordException', 'error with the wrong password');
    const info = await t.pdfInfo(blob, { password: 'secret1' });
    t.eq(labels(info), ['Guard page 1', 'Guard page 2'], 'pages after opening with the password');

    const err = await t.rejects(t.process([await fx.lockedPdf()], { password: 'x', confirm: 'x' }), 'protecting a PDF that already has a password');
    t.match(t.friendlyError(err), /password/i, 'message for a PDF that already has a password');
  },

  async 'unlock-pdf'(mod, fx, t) {
    const locked = await fx.lockedPdf();
    const out = await t.process([locked], { password: fx.PASSWORD });
    t.eq(out.items[0].name, 'locked-locked-unlocked.pdf', 'file name');
    t.assert(!/\/Encrypt/.test(await latin1(out.items[0].blob)), 'the output still mentions /Encrypt');
    t.eq(labels(await t.pdfInfo(out.items[0].blob)), ['Locked page 1', 'Locked page 2'], 'opens without a password');

    const wrong = await t.rejects(t.process([locked], { password: 'not-it' }), 'the wrong password');
    t.match(wrong.message, /That password didn't work/, 'message for the wrong password');
    const none = await t.rejects(t.process([locked], {}), 'no password');
    t.match(none.message, /needs its password/, 'message for no password');
    const plain = await t.rejects(t.process([await fx.pdf()], {}), 'a PDF without a password');
    t.match(plain.message, /doesn't have a password/, 'message for a PDF without a password');

    // AES-256 from Protect PDF round-trips.
    const { protectPdf } = await import(`${TOOLS}protect.js`);
    const aes = await protectPdf(await bytesOf(await fx.pdf({ pages: 2, label: 'Aes' })), 'abc');
    const freed = await mod.unlockPdf(aes, 'abc');
    t.assert(!/\/Encrypt/.test(await latin1(freed)), 'AES-256 output still mentions /Encrypt');
    t.eq(labels(await t.pdfInfo(freed)), ['Aes page 1', 'Aes page 2'], 'AES-256 file opens after unlocking');

    // Owner password only (opens, but blocks printing): unlocks with an empty password.
    const { PDFDocument } = await getPdfLib();
    const doc = await PDFDocument.load(await bytesOf(await fx.pdf({ pages: 1, label: 'Owner' })));
    doc.encrypt({ userPassword: '', ownerPassword: 'x' });
    const ownerFreed = await mod.unlockPdf(await doc.save(), '');
    t.assert(!/\/Encrypt/.test(await latin1(ownerFreed)), 'owner-only output still mentions /Encrypt');
    t.eq(labels(await t.pdfInfo(ownerFreed)), ['Owner page 1'], 'owner-only file after unlocking');
  },

  async 'sign-pdf'(mod, fx, t) {
    const signature = await mod.typedSignature('Sam Lee');
    t.match(signature, /^data:image\/png;base64,/, 'typed signature');
    const sig = await t.imageInfo(await (await fetch(signature)).blob());
    t.assert(sig.width > 100 && sig.height > 40 && sig.alpha, `signature image should be a trimmed PNG with a see-through background, got ${JSON.stringify(sig)}`);

    const out = await t.process([await fx.pdf({ pages: 2, label: 'Sign' })], { signature, page: 2, x: 0.5, y: 0.8, w: 0.3 });
    t.eq(out.items[0].name, 'sign-signed.pdf', 'file name');
    const placed = await imagesPlaced(out.items[0].blob);
    t.eq(placed.map((p) => p.length), [0, 1], 'pictures per page');
    const box = placed[1][0];
    t.near(box.x, 0.5 * 595, 1, 'left edge (x = 0.5)');
    t.near(box.w, 0.3 * 595, 1, 'width (w = 0.3)');
    t.near(box.h, (box.w * sig.height) / sig.width, 1, 'height keeps the signature shape');
    t.near(842 - (box.y + box.h), 0.8 * 842, 1, 'top edge (y = 0.8)');
    t.eq(labels(await t.pdfInfo(out.items[0].blob)), ['Sign page 1', 'Sign page 2'], 'pages unchanged');

    // On a page turned 90°, the signature still lands where it was placed on the page as you see it.
    const turned = await t.process([await rotatedPdf(fx)], { signature, page: 1, x: 0.05, y: 0.05, w: 0.3 });
    const blob = turned.items[0].blob;
    const w = 0.3 * 842;
    const h = (w * sig.height) / sig.width;
    const inside = await inkIn(blob, 1, [0.05 * 842, 0.05 * 595, w, h]);
    const opposite = await inkIn(blob, 1, [842 - 0.05 * 842 - w, 595 - 0.05 * 595 - h, w, h]);
    t.assert(inside > 50 && opposite === 0, `ink on a turned page: expected it top-left (got ${inside} dark pixels there, ${opposite} in the opposite corner)`);
  },

  async 'edit-pdf'(mod, fx, t) {
    const a = await fx.pdf({ pages: 2, label: 'Edit' });
    const items = [
      { page: 1, type: 'box', x: 0.05, y: 0.05, w: 0.6, h: 0.08 },
      { page: 1, type: 'text', x: 0.1, y: 0.3, size: 14, text: 'Signed copy' },
    ];
    const out = await t.process([a], { items });
    t.eq(out.items[0].name, 'edit-edited.pdf', 'file name');
    const [before, after] = await Promise.all([t.pdfInfo(a), t.pdfInfo(out.items[0].blob)]);
    t.match(after.text[0], /Signed copy/, 'added text on page 1');
    t.match(after.text[0], /^Edit page 1/, 'text under the white box still extracts (the documented limit)');
    t.eq(after.text[1], before.text[1], 'page 2 text unchanged');
    const added = (await textItems(out.items[0].blob))[0].find((i) => i.str === 'Signed copy');
    t.assert(added, 'no "Signed copy" text piece on page 1');
    t.near(added.x, 0.1 * 595, 1, 'added text x');
    t.near(added.size, 14, 0.1, 'added text size');
    t.near(added.y, 842 - (0.3 * 842 + 14 * 0.95), 1, 'added text baseline');
    // The purple bar runs across the page at 89 pt from the top; the box covers it up to 386 pt across.
    const [orig] = await pixelsAt(a, 1, [[200, 89]]);
    t.assert(isPurple(orig), `fixture check: expected the purple bar at (200, 89), got ${orig}`);
    const [covered, outside] = await pixelsAt(out.items[0].blob, 1, [[200, 89], [450, 89]]);
    t.assert(isWhite(covered), `expected white-out at (200, 89), got rgba ${covered}`);
    t.assert(isPurple(outside), `expected the bar untouched at (450, 89), got rgba ${outside}`);
  },

  async 'add-page-numbers'(mod, fx, t) {
    const a = await fx.pdf({ pages: 3, label: 'Count' });
    const out = await t.process([a], { format: 'of', position: 'bottom-right' });
    t.eq(out.items[0].name, 'count-numbered.pdf', 'file name');
    const info = await t.pdfInfo(out.items[0].blob);
    t.eq(info.text.map((s) => / (Page \d+ of \d+)$/.exec(s)?.[1]), ['Page 1 of 3', 'Page 2 of 3', 'Page 3 of 3'], 'page text ends with the number');
    for (const [i, page] of (await textItems(out.items[0].blob)).entries()) {
      const n = page.find((it) => /^Page \d+ of 3$/.test(it.str));
      t.near(n.x + n.w, 595 - 28, 1.5, `page ${i + 1} number right edge`);
      t.near(n.y, 28, 1, `page ${i + 1} number baseline`);
      t.near(n.size, 11, 0.1, `page ${i + 1} number size`);
    }
    const top = await t.process([a], { format: 'slash', position: 'top-left', start: 0 });
    const topItems = await textItems(top.items[0].blob);
    const nums = topItems.map((p) => p.find((it) => /^\d+ \/ \d+$/.test(it.str)));
    t.eq(nums.map((n) => n?.str), ['0 / 2', '1 / 2', '2 / 2'], 'start at 0, "1 / 10" format');
    t.near(nums[0].x, 28, 1, 'top-left x');
    t.near(nums[0].y, 842 - 28 - 11 * 0.72, 1, 'top-left baseline');
  },

  async 'watermark-pdf'(mod, fx, t) {
    const a = await fx.pdf({ pages: 3, label: 'Mark' });
    const out = await t.process([a]);
    t.eq(out.items[0].name, 'mark-watermarked.pdf', 'file name');
    const pages = await textItems(out.items[0].blob);
    const stamps = pages.map((p) => p.find((it) => it.str === 'DRAFT'));
    t.assert(stamps.every(Boolean), `"DRAFT" on every page: ${stamps.map((s) => !!s)}`);
    for (const s of stamps) t.near(s.angle, (Math.atan2(842, 595) * 180) / Math.PI, 0.5, 'stamp runs corner to corner');
    t.eq((await opacities(out.items[0].blob)).map((o) => o.some((v) => Math.abs(v - 0.3) < 0.001)), [true, true, true], 'default 30% opacity on every page');
    t.eq(labels(await t.pdfInfo(out.items[0].blob)), ['Mark page 1', 'Mark page 2', 'Mark page 3'], 'page text kept');

    const img = await t.process([a], { kind: 'image', image: await fx.png(), opacity: 50 });
    const placed = await imagesPlaced(img.items[0].blob);
    t.eq(placed.map((p) => p.length), [1, 1, 1], 'one picture on every page');
    const k = Math.min((595 * 0.5) / 400, (842 * 0.5) / 300);
    t.near(placed[0][0].w, 400 * k, 1, 'image stamp width (half the page)');
    t.near(placed[0][0].x, (595 - 400 * k) / 2, 1, 'image stamp centred across');
    t.near(placed[0][0].y, (842 - 300 * k) / 2, 1, 'image stamp centred down');
    t.eq((await opacities(img.items[0].blob)).map((o) => o.some((v) => Math.abs(v - 0.5) < 0.001)), [true, true, true], '50% opacity on every page');

    const err = await t.rejects(t.process([a], { text: '\u{1F600}' }), 'an emoji-only watermark');
    t.match(err.message, /can't show those characters/, 'message for characters Helvetica lacks');
  },

  async 'crop-pdf'(mod, fx, t) {
    const a = await fx.pdf({ pages: 2, label: 'Crop' });
    const out = await t.process([a]);
    t.eq(out.items[0].name, 'crop-cropped.pdf', 'file name');
    const trimmed = [Math.round(595 - 20 * MM), Math.round(842 - 20 * MM)];
    const info = await t.pdfInfo(out.items[0].blob);
    t.eq(info.sizes, [trimmed, trimmed], 'pages 10 mm smaller on each side');
    t.eq(labels(info), ['Crop page 1', 'Crop page 2'], 'content kept');

    const left = await t.pdfInfo((await t.process([a], { top: 0, bottom: 0, left: 50, right: 0 })).items[0].blob);
    t.eq(left.sizes[0], [Math.round(595 - 50 * MM), 842], 'only the left edge trimmed');

    // Turned pages are trimmed from the edges as you see them: the visible top is the page's left side.
    const turned = (await t.process([await rotatedPdf(fx)], { top: 20, bottom: 0, left: 0, right: 0 })).items[0].blob;
    const tInfo = await t.pdfInfo(turned);
    t.eq(tInfo.sizes[0], [842, Math.round(595 - 20 * MM)], 'turned page trimmed at the visible top');
    t.eq(tInfo.rotations, [90, 90], 'rotation kept');
    const { PDFDocument } = await getPdfLib();
    const box = (await PDFDocument.load(await bytesOf(turned))).getPage(0).getCropBox();
    t.near(box.x, 20 * MM, 0.5, 'crop box starts 20 mm in from the page left');

    const err = await t.rejects(t.process([a], { left: 200, right: 200 }), 'margins bigger than the page');
    t.match(err.message, /^Those margins are bigger than the page/, 'message for margins bigger than the page');
  },

  async 'create-pdf'(mod, fx, t) {
    const r = await mod.textToPdf(`Hello world\nSecond line \u{1F600}\n${'Lorem ipsum dolor sit amet. '.repeat(400)}`);
    t.eq([r.pages, r.dropped], [3, 1], 'pages and characters left out');
    const info = await t.pdfInfo(r.bytes);
    t.eq(info.pages, 3, 'page count in the file');
    t.eq(info.sizes, [fx.A4, fx.A4, fx.A4], 'A4 pages');
    t.match(info.text[0], /^Hello world Second line Lorem ipsum/, 'start of the text, emoji left out');
    t.eq(info.text.join(' ').match(/Lorem/g)?.length, 400, 'every repeat of the text is there');
    const first = (await textItems(r.bytes))[0][0];
    t.near(first.x, 56.7, 0.5, 'left margin (2 cm)');
    t.near(first.size, 11, 0.1, 'text size');
    t.assert(first.y < 842 - 56.7 && first.y > 842 - 56.7 - 15, `first line baseline should sit just under the 2 cm top margin, got y = ${first.y}`);
  },

  async 'pdf-to-word'(mod, fx, t) {
    const out = await t.process([await reportPdf()]);
    const item = out.items[0];
    t.eq(item.name, 'report.docx', 'file name');
    t.eq(item.blob.type, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'file type');
    const xml = fileText(await t.unzip(item.blob), 'word/document.xml');
    t.eq(docxParagraphs(xml), [
      { text: 'Quarterly creator report', bold: true, pageBreak: false, size: '44' },
      { text: 'Our audience grew steadily this quarter on all three platforms we track.', bold: false, pageBreak: false, size: '22' },
      { text: 'Next steps for the new year.', bold: false, pageBreak: true, size: '22' },
    ], 'paragraphs (title bold, two lines joined, page 2 on a new page)');
    t.match(xml, /<w:pgSz w:w="11900" w:h="16840"\/>/, 'Word page size matches the PDF page');
    const err = await t.rejects(t.process([await blankPdf()]), 'a PDF with no text');
    t.match(err.message, /^We couldn't find any text in this PDF/, 'message for a PDF with no text');
  },

  async 'word-to-pdf'(mod, fx, t) {
    const out = await t.process([await docxFile()]);
    const item = out.items[0];
    t.eq(item.name, 'checklist.pdf', 'file name');
    t.eq(item.note, '1 page', 'note');
    const info = await t.pdfInfo(item.blob);
    t.eq(info.pages, 1, 'page count');
    t.eq(info.sizes, [fx.A4], 'A4 page');
    let from = -1;
    for (const part of ['Launch checklist', 'Film the intro, then edit the cut.', 'Platform', 'Due', 'YouTube', 'Friday', 'Post when the edit is approved.']) {
      const at = info.text[0].indexOf(part, from + 1);
      t.assert(at > from, `expected "${part}" after the text before it, in: ${info.text[0]}`);
      from = at;
    }
    const items = (await textItems(item.blob))[0];
    t.near(items.find((i) => i.str.includes('Launch'))?.size, 20, 0.1, 'Heading 1 size');
    t.near(items.find((i) => i.str.includes('approved'))?.size, 11, 0.1, 'body text size');

    const err = await t.rejects(t.process([new File(['not a zip'], 'old.docx')]), 'a file that is not a .docx');
    t.match(err.message, /^We couldn't read this Word document/, 'message for a damaged .docx');
  },

  async 'pdf-to-excel'(mod, fx, t) {
    const out = await t.process([await tablePdf()]);
    const item = out.items[0];
    t.eq(item.name, 'prices.xlsx', 'file name');
    t.eq(item.blob.type, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'file type');
    const sheets = await t.xlsxSheets(item.blob);
    t.eq(Object.keys(sheets), ['Page 1', 'Page 2'], 'one sheet per page');
    t.eq(sheets['Page 1'], [['Item', 'Qty', 'Price'], ['Apples', 3, 1200.5], ['Pears', 10, 4], ['Plums', '007', '$12']], 'Page 1 cells (numbers as numbers, leading zeros and $ kept as text)');
    t.eq(sheets['Page 2'], [['Prices include GST.']], 'Page 2 cells');
    const err = await t.rejects(t.process([await blankPdf()]), 'a PDF with no text');
    t.match(err.message, /^We couldn't find any text in this PDF/, 'message for a PDF with no text');
  },

  async 'pdf-to-powerpoint'(mod, fx, t) {
    const out = await t.process([await fx.pdf({ pages: 2, label: 'Slides' })]);
    const item = out.items[0];
    t.eq(item.name, 'slides.pptx', 'file name');
    t.eq(item.blob.type, 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'file type');
    const files = await t.unzip(item.blob);
    const slides = files.map((f) => f.name).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort();
    t.eq(slides, ['ppt/slides/slide1.xml', 'ppt/slides/slide2.xml'], 'slides');
    const jpegs = files.filter((f) => f.name.startsWith('ppt/media/') && f.data[0] === 0xff && f.data[1] === 0xd8);
    t.eq(jpegs.length, 2, 'JPEGs in ppt/media');
    const pic = await t.imageInfo(new Blob([jpegs[0].data], { type: 'image/jpeg' }));
    t.near(pic.width, 1240, 1, 'slide picture width (150 DPI)');
    t.near(pic.height, 1754, 1, 'slide picture height (150 DPI)');
    const pres = fileText(files, 'ppt/presentation.xml');
    const size = /<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/.exec(pres);
    t.assert(size, 'no <p:sldSz> in ppt/presentation.xml');
    t.eq(Number(size[1]), 9144000, 'slide width (10 inches)');
    t.near(Number(size[2]), (9144000 * 842) / 595, 2000, 'slide height (shaped like the page)');
  },
};
