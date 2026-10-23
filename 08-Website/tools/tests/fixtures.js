// Test files made in the page, never downloaded. Each generator returns a File and caches it by its
// arguments, so specs can call them freely:  const a = await fx.pdf({ pages: 2, label: 'Alpha' });
// To add a fixture: write the generator, then add an entry to CHECKS (bottom) proving the file is valid.
import { getPdfLib, getFflate, getMediabunny } from '../public/assets/js/core/vendor.js';
import { assert, eq, near, rejects, pdfInfo, imageInfo, mediaInfo, xlsxSheets, csvRows } from './check.js';

export const PASSWORD = 'acts-test-pass';
export const A4 = [595, 842];
export const LETTER_LANDSCAPE = [792, 612];

/** The table behind the CSV, XLSX, JSON and XML fixtures (has a comma and quotes, like real exports). */
export const ROWS = [
  ['Name', 'Platform', 'Followers', 'City'],
  ['Mia Chen', 'YouTube', 12500, 'Sydney, NSW'],
  ['Leo Park', 'TikTok', 8300, 'Melbourne, VIC'],
  ['Ava "AJ" Singh', 'Instagram', 15100, 'Brisbane, QLD'],
];
export const RECORDS = ROWS.slice(1).map((r) => Object.fromEntries(ROWS[0].map((k, i) => [k.toLowerCase(), r[i]])));

/** Plain ASCII so it also works as PDF body text (standard fonts). 4 lines, 45 words. */
export const TEXT = [
  'acTS Tools helps creators sort out the tech side of their work.',
  'Most tools run in your browser, so your files stay on your device.',
  'We test every tool on real-looking files before it goes live.',
  'Colour, centre and optimise are spelt the Australian way.',
].join('\n');

const cache = new Map();
function cached(kind, args, make) {
  const key = kind + JSON.stringify(args);
  if (!cache.has(key)) cache.set(key, Promise.resolve().then(make).catch((err) => {
    cache.delete(key);
    throw err;
  }));
  return cache.get(key);
}

// ---------- PDF ----------

/** Pages start with the text "<label> page <n>" (so order can be checked), then a bar and body text. */
export function pdf({ pages = 3, label = 'Sample', size = A4, password } = {}) {
  return cached('pdf', [pages, label, size, password], async () => {
    const { PDFDocument, StandardFonts, rgb } = await getPdfLib();
    const doc = await PDFDocument.create();
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    doc.setTitle(`${label} test document`);
    doc.setAuthor('acTS Tools tests');
    const [w, h] = size;
    for (let n = 1; n <= pages; n++) {
      const page = doc.addPage(size);
      page.drawText(`${label} page ${n}`, { x: 50, y: h - 70, size: 26, font: bold, color: rgb(0.09, 0.07, 0.16) });
      page.drawRectangle({ x: 50, y: h - 92, width: w - 100, height: 6, color: rgb(0.45, 0.3, 0.9) });
      TEXT.split('\n').forEach((line, i) => page.drawText(line, { x: 50, y: h - 125 - i * 18, size: 12, font }));
    }
    if (password) doc.encrypt({ userPassword: password, ownerPassword: `${password}-owner` });
    return new File([await doc.save()], `${label.toLowerCase()}${password ? '-locked' : ''}.pdf`, { type: 'application/pdf' });
  });
}

/** 2 pages, opens only with PASSWORD. */
export const lockedPdf = () => pdf({ pages: 2, label: 'Locked', password: PASSWORD });

// ---------- Images ----------

async function canvasFile(width, height, type, name, draw, quality) {
  const canvas = new OffscreenCanvas(width, height);
  draw(canvas.getContext('2d'), width, height);
  return new File([await canvas.convertToBlob({ type, quality })], name, { type });
}

// Photo-like: sky gradient, sun, hills and a little grain (so compression has something to do).
function scene(g, w, h) {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#6fa8ff');
  sky.addColorStop(1, '#ffd9a8');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffcc33';
  g.beginPath();
  g.arc(w * 0.75, h * 0.3, h * 0.12, 0, 7);
  g.fill();
  g.fillStyle = '#2f7d4f';
  g.beginPath();
  g.moveTo(0, h);
  g.quadraticCurveTo(w * 0.3, h * 0.45, w * 0.6, h * 0.8);
  g.quadraticCurveTo(w * 0.8, h * 0.6, w, h * 0.75);
  g.lineTo(w, h);
  g.fill();
  const img = g.getImageData(0, 0, w, h);
  let seed = 7;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 16807) % 2147483647;
    const n = (seed % 25) - 12;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
}

export const jpg = ({ width = 640, height = 480 } = {}) =>
  cached('jpg', [width, height], () => canvasFile(width, height, 'image/jpeg', 'photo.jpg', scene, 0.92));

export const webp = ({ width = 640, height = 480 } = {}) =>
  cached('webp', [width, height], () => canvasFile(width, height, 'image/webp', 'photo.webp', scene, 0.92));

/** A logo-like badge on a see-through background. */
export const png = ({ width = 400, height = 300 } = {}) =>
  cached('png', [width, height], () => canvasFile(width, height, 'image/png', 'logo.png', (g, w, h) => {
    g.fillStyle = '#7c4dff';
    g.beginPath();
    g.arc(w / 2, h / 2, Math.min(w, h) * 0.35, 0, 7);
    g.fill();
    g.fillStyle = '#fff';
    g.font = `bold ${Math.round(h * 0.16)}px sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('acTS', w / 2, h / 2);
  }));

// ---------- Video and audio ----------

function tone(seconds, sampleRate, channels, hz = 440) {
  const ab = new AudioBuffer({ length: Math.round(seconds * sampleRate), numberOfChannels: channels, sampleRate });
  for (let c = 0; c < channels; c++) {
    const d = ab.getChannelData(c);
    for (let i = 0; i < d.length; i++) d[i] = Math.sin((2 * Math.PI * hz * i) / sampleRate) * 0.3;
  }
  return ab;
}

/** 30 fps video (colour changes every frame, time printed on it) with a 440 Hz stereo tone. H.264 + AAC when the browser can. */
export const mp4 = ({ seconds = 2, width = 320, height = 240 } = {}) =>
  cached('mp4', [seconds, width, height], async () => {
    const MB = await getMediabunny();
    const vcodec = await MB.getFirstEncodableVideoCodec(['avc', 'vp9', 'av1'], { width, height });
    const acodec = await MB.getFirstEncodableAudioCodec(['aac', 'opus'], { numberOfChannels: 2, sampleRate: 48000 });
    if (!vcodec || !acodec) throw new Error("This browser can't encode the test MP4.");
    const canvas = new OffscreenCanvas(width, height);
    const g = canvas.getContext('2d');
    const out = new MB.Output({ format: new MB.Mp4OutputFormat(), target: new MB.BufferTarget() });
    const video = new MB.CanvasSource(canvas, { codec: vcodec, bitrate: 1e6 });
    const audio = new MB.AudioBufferSource({ codec: acodec, bitrate: 128e3 });
    out.addVideoTrack(video, { frameRate: 30 });
    out.addAudioTrack(audio);
    await out.start();
    for (let i = 0; i < Math.round(seconds * 30); i++) {
      g.fillStyle = `hsl(${(i * 6) % 360} 70% 50%)`;
      g.fillRect(0, 0, width, height);
      g.fillStyle = '#fff';
      g.font = `bold ${Math.round(height / 6)}px sans-serif`;
      g.fillText(`${(i / 30).toFixed(1)} s`, width * 0.1, height * 0.55);
      await video.add(i / 30, 1 / 30);
    }
    await audio.add(tone(seconds, 48000, 2));
    await out.finalize();
    return new File([out.target.buffer], 'clip.mp4', { type: 'video/mp4' });
  });

/** 16-bit PCM WAV with a 440 Hz tone. */
export const wav = ({ seconds = 2, sampleRate = 44100, channels = 1 } = {}) =>
  cached('wav', [seconds, sampleRate, channels], () => {
    const n = Math.round(seconds * sampleRate);
    const size = n * channels * 2;
    const v = new DataView(new ArrayBuffer(44 + size));
    const str = (at, s) => [...s].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)));
    str(0, 'RIFF');
    v.setUint32(4, 36 + size, true);
    str(8, 'WAVE');
    str(12, 'fmt ');
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); // PCM
    v.setUint16(22, channels, true);
    v.setUint32(24, sampleRate, true);
    v.setUint32(28, sampleRate * channels * 2, true);
    v.setUint16(32, channels * 2, true);
    v.setUint16(34, 16, true);
    str(36, 'data');
    v.setUint32(40, size, true);
    for (let i = 0; i < n; i++) {
      const s = Math.round(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.3 * 32767);
      for (let c = 0; c < channels; c++) v.setInt16(44 + (i * channels + c) * 2, s, true);
    }
    return new File([v.buffer], 'tone.wav', { type: 'audio/wav' });
  });

// ---------- Data and text ----------

const textFile = (text, name, type) => new File([text], name, { type });
const csvCell = (v) => (/[",\r\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const csv = () => cached('csv', [], () => textFile(`${ROWS.map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`, 'creators.csv', 'text/csv'));

export const json = () => cached('json', [], () => textFile(`${JSON.stringify(RECORDS, null, 2)}\n`, 'creators.json', 'application/json'));

export const xml = () => cached('xml', [], () => textFile(
  `<?xml version="1.0" encoding="UTF-8"?>\n<creators>\n${RECORDS.map((r) => `  <creator>\n${Object.entries(r).map(([k, v]) => `    <${k}>${esc(v)}</${k}>`).join('\n')}\n  </creator>`).join('\n')}\n</creators>\n`,
  'creators.xml', 'application/xml'));

export const txt = () => cached('txt', [], () => textFile(TEXT, 'notes.txt', 'text/plain'));

/** Excel workbook with shared strings and real numbers. sheets: { 'Sheet name': rows }. */
export const xlsx = ({ sheets = { Creators: ROWS, Totals: [['Total followers', 35900]] } } = {}) =>
  cached('xlsx', [sheets], async () => {
    const { zipSync, strToU8 } = await getFflate();
    const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    const PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
    const CT = 'application/vnd.openxmlformats-officedocument.spreadsheetml';
    const names = Object.keys(sheets);
    const strings = [];
    const si = (s) => {
      if (!strings.includes(s)) strings.push(s);
      return strings.indexOf(s);
    };
    const cell = (v, ref) => (typeof v === 'number' ? `<c r="${ref}"><v>${v}</v></c>` : `<c r="${ref}" t="s"><v>${si(String(v))}</v></c>`);
    const sheetXml = names.map((n) => `<worksheet xmlns="${NS}"><sheetData>${sheets[n].map((r, ri) =>
      `<row r="${ri + 1}">${r.map((v, ci) => cell(v, String.fromCharCode(65 + ci) + (ri + 1))).join('')}</row>`).join('')}</sheetData></worksheet>`);
    const parts = {
      '[Content_Types].xml': `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="${CT}.sheet.main+xml"/>${names.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="${CT}.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="${CT}.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="${CT}.sharedStrings+xml"/></Types>`,
      '_rels/.rels': `<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      'xl/workbook.xml': `<workbook xmlns="${NS}" xmlns:r="${REL}"><sheets>${names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
      'xl/_rels/workbook.xml.rels': `<Relationships xmlns="${PKG}">${names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rIdS" Type="${REL}/styles" Target="styles.xml"/><Relationship Id="rIdT" Type="${REL}/sharedStrings" Target="sharedStrings.xml"/></Relationships>`,
      'xl/styles.xml': `<styleSheet xmlns="${NS}"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>`,
    };
    names.forEach((_, i) => { parts[`xl/worksheets/sheet${i + 1}.xml`] = sheetXml[i]; });
    parts['xl/sharedStrings.xml'] = `<sst xmlns="${NS}" count="${strings.length}" uniqueCount="${strings.length}">${strings.map((s) => `<si><t xml:space="preserve">${esc(s)}</t></si>`).join('')}</sst>`;
    const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
    const zipped = zipSync(Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, strToU8(head + v)])));
    return new File([zipped], 'creators.xlsx', { type: `${CT}.sheet` });
  });

// ---------- Self-checks (run.js shows these under "Fixtures") ----------

const labels = (info) => info.text.map((s) => /^\w+ page \d+/.exec(s)?.[0]);

export const CHECKS = {
  async pdf() {
    const i = await pdfInfo(await pdf());
    eq(i.pages, 3, 'pages');
    eq(labels(i), ['Sample page 1', 'Sample page 2', 'Sample page 3'], 'page labels');
    eq(i.sizes[0], A4, 'page size');
    return `opens in pdf.js: ${i.pages} pages, ${i.sizes[0].join(' x ')} pt, text "${i.text[0].slice(0, 40)}…"`;
  },
  async lockedPdf() {
    const f = await lockedPdf();
    const err = await rejects(pdfInfo(f), 'opening without the password');
    eq(err.name, 'PasswordException', 'error without the password');
    const i = await pdfInfo(f, { password: PASSWORD });
    eq(labels(i), ['Locked page 1', 'Locked page 2'], 'page labels');
    return `pdf.js asks for a password, then opens it with "${PASSWORD}" (${i.pages} pages)`;
  },
  async jpg() {
    const i = await imageInfo(await jpg());
    eq([i.type, i.width, i.height, i.alpha], ['jpg', 640, 480, false], 'type, size, alpha');
    return `JPEG 640 x 480, ${((await jpg()).size / 1024).toFixed(0)} KB`;
  },
  async png() {
    const i = await imageInfo(await png());
    eq([i.type, i.width, i.height, i.alpha], ['png', 400, 300, true], 'type, size, alpha');
    return 'PNG 400 x 300 with see-through pixels';
  },
  async webp() {
    const i = await imageInfo(await webp());
    eq([i.type, i.width, i.height], ['webp', 640, 480], 'type and size');
    return `WebP 640 x 480, ${((await webp()).size / 1024).toFixed(0)} KB`;
  },
  async mp4() {
    const i = await mediaInfo(await mp4());
    eq(i.format, 'MP4', 'container');
    assert(i.video, 'no video track');
    assert(i.audio, 'no audio track');
    near(i.duration, 2, 0.1, 'duration');
    eq([i.video.width, i.video.height], [320, 240], 'video size');
    return `${i.duration.toFixed(2)} s: ${i.video.codec} ${i.video.width} x ${i.video.height} + ${i.audio.codec} ${i.audio.channels} ch ${i.audio.sampleRate} Hz`;
  },
  async wav() {
    const f = await wav();
    const i = await mediaInfo(f);
    assert(i.audio && !i.video, 'expected one audio track and no video');
    const decoded = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(await f.arrayBuffer());
    near(decoded.duration, 2, 0.01, 'decoded duration');
    return `${i.format} ${decoded.duration.toFixed(2)} s, ${i.audio.channels} ch ${i.audio.sampleRate} Hz, the browser decodes it`;
  },
  async csv() {
    eq(csvRows(await (await csv()).text()), ROWS.map((r) => r.map(String)), 'parsed rows');
    return `${ROWS.length} rows, quoted comma and quotes round-trip`;
  },
  async xlsx() {
    const s = await xlsxSheets(await xlsx());
    eq(Object.keys(s), ['Creators', 'Totals'], 'sheet names');
    eq(s.Creators, ROWS, 'Creators rows');
    eq(s.Totals, [['Total followers', 35900]], 'Totals rows');
    return 'SheetJS reads 2 sheets; strings and numbers come back as written';
  },
  async json() {
    eq(JSON.parse(await (await json()).text()), RECORDS, 'parsed records');
    return `${RECORDS.length} records`;
  },
  async xml() {
    const d = new DOMParser().parseFromString(await (await xml()).text(), 'application/xml');
    assert(!d.querySelector('parsererror'), 'XML parse error');
    eq([...d.querySelectorAll('creator > name')].map((n) => n.textContent), RECORDS.map((r) => r.name), 'names');
    return `${RECORDS.length} <creator> records parse`;
  },
  async txt() {
    const t = await (await txt()).text();
    eq(t, TEXT, 'text');
    eq([t.split('\n').length, t.split(/\s+/).length], [4, 45], 'lines and words');
    return '4 lines, 45 words';
  },
};
