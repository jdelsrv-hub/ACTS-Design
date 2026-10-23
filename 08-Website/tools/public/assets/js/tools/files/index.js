// File converters and other tools (owner: tools-files agent). Entry format: see public/assets/js/registry.js.
// The format pairs share convert.js; preset fixes the input and output formats.
const pair = (slug, name, from, to, icon, summary) => ({ slug, name, cat: 'convert', icon, module: 'convert.js', preset: { from, to }, summary });

export default [
  { slug: 'data-converter', name: 'Data converter', cat: 'convert', icon: 'convert', module: 'convert.js', summary: 'Convert between CSV, Excel, JSON and XML, in any direction.', keywords: ['spreadsheet', 'xlsx', 'table'] },
  pair('csv-to-excel', 'CSV to Excel', 'csv', 'xlsx', 'file-spreadsheet', 'Turn a CSV file into an Excel spreadsheet (.xlsx).'),
  pair('excel-to-csv', 'Excel to CSV', 'xlsx', 'csv', 'sheet', 'Save each sheet of an Excel file as a CSV.'),
  pair('csv-to-json', 'CSV to JSON', 'csv', 'json', 'braces', 'Turn CSV rows into a JSON list of records.'),
  pair('json-to-csv', 'JSON to CSV', 'json', 'csv', 'sheet', 'Turn a JSON list of records into a CSV file.'),
  pair('xml-to-json', 'XML to JSON', 'xml', 'json', 'braces', 'Turn repeated XML records into a JSON list.'),
  pair('json-to-xml', 'JSON to XML', 'json', 'xml', 'file-code', 'Turn a JSON list of records into an XML file.'),
  pair('xml-to-csv', 'XML to CSV', 'xml', 'csv', 'sheet', 'Turn repeated XML records into CSV rows.'),
  pair('csv-to-xml', 'CSV to XML', 'csv', 'xml', 'file-code', 'Turn CSV rows into an XML file.'),
  pair('xml-to-excel', 'XML to Excel', 'xml', 'xlsx', 'file-spreadsheet', 'Turn repeated XML records into an Excel spreadsheet.'),
  pair('excel-to-xml', 'Excel to XML', 'xlsx', 'xml', 'file-code', 'Save each sheet of an Excel file as XML.'),
  { slug: 'split-csv', name: 'Split CSV', cat: 'convert', icon: 'split', module: 'split-csv.js', summary: 'Split a big CSV into smaller files, with the header row on each.', keywords: ['divide', 'chunk', 'rows'] },
  { slug: 'split-excel', name: 'Split Excel', cat: 'convert', icon: 'split', module: 'split-excel.js', summary: 'Split a spreadsheet by rows, or into one file per sheet.', keywords: ['divide', 'xlsx', 'sheets', 'rows'] },
  { slug: 'excel-to-pdf', name: 'Excel to PDF', cat: 'convert', icon: 'file-text', module: 'excel-pdf.js', summary: 'Turn each sheet of an Excel file into a readable table in a PDF.', keywords: ['xlsx', 'spreadsheet', 'print'] },
  { slug: 'create-zip', name: 'Create zip', cat: 'other', icon: 'file-archive', module: 'zip.js', summary: 'Put several files into one .zip, ready to send or store.', keywords: ['compress', 'archive', 'zip files'] },
  { slug: 'qr-code-generator', name: 'QR code generator', cat: 'other', icon: 'qr-code', module: 'qr.js', summary: 'Make a QR code for a link, some text or your Wi-Fi. PNG or SVG.', keywords: ['qr', 'barcode', 'wifi', 'link'] },
  { slug: 'lorem-ipsum-generator', name: 'Lorem ipsum generator', cat: 'other', icon: 'text', module: 'lorem.js', summary: 'Make placeholder text by paragraphs, sentences or words.', keywords: ['placeholder', 'dummy text', 'filler'] },
  { slug: 'epoch-converter', name: 'Epoch converter', cat: 'other', icon: 'clock', module: 'epoch.js', summary: 'Convert a Unix timestamp to a date and back, in local time or UTC.', keywords: ['unix', 'timestamp', 'time', 'date'] },
  { slug: 'word-counter', name: 'Word counter', cat: 'other', icon: 'whole-word', module: 'word-count.js', summary: 'Count words, characters, sentences and paragraphs, plus reading time.', keywords: ['count', 'characters', 'reading time'] },
];
