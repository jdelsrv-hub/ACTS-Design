import { fileTool } from '../../core/filetool.js';
import { getPdfLib } from '../../core/vendor.js';
import { withSuffix } from '../../core/files.js';
import { PDF_ACCEPT, pdfBlob } from './_pages.js';

/** Decrypt a PDF with its password and save it with no encryption left in the file. */
export async function unlockPdf(bytes, password = '') {
  const { PDFDocument, PDFDict, PDFName, PDFInvalidObject } = await getPdfLib();
  let doc;
  try {
    doc = await PDFDocument.load(bytes, { password });
  } catch (err) {
    // Our messages here avoid the word "PDF": friendlyError() swaps any message with "password" and "PDF"
    // for "Unlock it first with our Unlock PDF tool", which is wrong on this tool.
    if (/password/i.test(err?.message)) throw new Error(password ? "That password didn't work. Check it and try again." : 'This file needs its password to open. Type it in, then try again.');
    throw err;
  }
  // pdf-lib decrypts everything on load, but the encryption dictionary and the old cross-reference
  // stream (which still points to it, kept as raw bytes) stay behind as objects. pdf-lib writes a fresh
  // cross-reference, so remove them both and nothing in the file says "encrypted".
  const { context } = doc;
  let locked = !!context.trailerInfo.Encrypt;
  for (const [ref, obj] of context.enumerateIndirectObjects()) {
    if (obj instanceof PDFInvalidObject) {
      if (/\/Type\s*\/XRef/.test(new TextDecoder('latin1').decode(obj.data))) context.delete(ref);
      continue;
    }
    const d = obj instanceof PDFDict ? obj : obj.dict;
    if (!(d instanceof PDFDict)) continue;
    const security = d.has(PDFName.of('O')) && d.has(PDFName.of('U')) && d.has(PDFName.of('P'));
    if (security) locked = true;
    if (security || d.lookup(PDFName.of('Type')) === PDFName.of('XRef')) context.delete(ref);
  }
  if (!locked) throw new Error("This file doesn't have a password, so there's nothing to remove.");
  context.trailerInfo.Encrypt = undefined;
  return doc.save();
}

export default fileTool({
  accept: PDF_ACCEPT,
  dropTitle: 'Drop your PDF here',
  action: 'Unlock PDF',
  actionIcon: 'unlock',
  options: [
    { id: 'password', type: 'password', label: 'Password', help: 'The password you use to open this PDF. Leave it empty if it opens without one but blocks printing or copying.' },
  ],
  async processFile(file, { password }) {
    return { name: withSuffix(file.name, 'unlocked'), blob: pdfBlob(await unlockPdf(await file.arrayBuffer(), password)) };
  },
});
