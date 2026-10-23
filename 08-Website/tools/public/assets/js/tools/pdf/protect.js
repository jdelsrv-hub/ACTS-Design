import { fileTool } from '../../core/filetool.js';
import { notice } from '../../core/ui.js';
import { getPdfLib } from '../../core/vendor.js';
import { withSuffix } from '../../core/files.js';
import { PDF_ACCEPT, pdfBlob } from './_pages.js';

/** Encrypt a PDF (AES-256) so it needs the password to open. Whoever has the password gets full access. */
export async function protectPdf(bytes, password) {
  const { PDFDocument } = await getPdfLib();
  const doc = await PDFDocument.load(bytes);
  try {
    doc.encrypt({
      userPassword: password,
      ownerPassword: password,
      permissions: { printing: 'highResolution', modifying: true, copying: true, annotating: true, fillingForms: true, contentAccessibility: true, documentAssembly: true },
    });
  } catch (err) {
    // No "PDF" in this message, or friendlyError() swaps it for "This PDF is password protected".
    if (/PDF\/A/.test(err?.message)) throw new Error("This file is saved in an archive format that doesn't allow passwords.");
    throw err;
  }
  return doc.save();
}

export default fileTool({
  accept: PDF_ACCEPT,
  dropTitle: 'Drop your PDF here',
  action: 'Protect PDF',
  actionIcon: 'lock',
  options: [
    { id: 'password', type: 'password', label: 'Password' },
    { id: 'confirm', type: 'password', label: 'Type it again' },
  ],
  validate: (_files, o) => (!o.password ? 'Choose a password.' : o.password !== o.confirm ? "The two passwords don't match yet." : null),
  renderExtra: (extra) => extra.append(notice('info', "Keep your password somewhere safe. Nothing is uploaded, so we can't recover it for you.")),
  async processFile(file, { password }) {
    return { name: withSuffix(file.name, 'protected'), blob: pdfBlob(await protectPdf(await file.arrayBuffer(), password)) };
  },
});
