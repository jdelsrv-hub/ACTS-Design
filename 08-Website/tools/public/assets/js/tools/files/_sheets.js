// SheetJS helpers shared by the data converter and Excel to PDF.
import { getXLSX } from './_vendor.js';

export const EXCEL_ACCEPT = '.xlsx,.xlsm,.xls';

// Text that is safely a number: no leading zeros (so phone numbers and postcodes stay text), 15 digits at most.
const NUM = /^-?(0|[1-9]\d{0,14})(\.\d{1,15})?$/;

/**
 * Tidy a workbook in place.
 * - typeText: turn number-like text into real numbers (for CSV and XML, which have no types), keeping the original text.
 * - Plain numbers get their full value as text, so 123456789012345 doesn't become "1.23457E+14".
 */
export function tidy(wb, typeText = false) {
  for (const ws of Object.values(wb.Sheets)) {
    for (const [ref, c] of Object.entries(ws)) {
      if (ref[0] === '!') continue;
      if (typeText && c.t === 's' && NUM.test(c.v)) Object.assign(c, { t: 'n', w: c.v, v: Number(c.v) });
      else if (c.t === 'n' && (!c.z || c.z === 'General')) {
        c.v = Number(c.v.toPrecision(15));
        c.w = String(c.v);
      }
    }
  }
  return wb;
}

/** Open an Excel file for reading values. Dates in the default format come out as 2026-10-20. */
export async function readExcel(file) {
  const X = await getXLSX();
  const wb = X.read(await file.arrayBuffer(), { cellDates: true, cellNF: true, dateNF: 'yyyy-mm-dd' });
  return { X, wb: tidy(wb) };
}

/** Sheets that have at least one cell. */
export const sheetsWithData = (wb) => wb.SheetNames.filter((n) => wb.Sheets[n]?.['!ref']);
