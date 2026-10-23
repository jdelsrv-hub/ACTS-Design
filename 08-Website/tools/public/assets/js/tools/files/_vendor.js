// Libraries for the files family, pinned to exact versions (see core/vendor.js for the shared ones).
import { loadModule } from '../../core/vendor.js';

// SheetJS Community Edition 0.20.3 (Apache-2.0). From the SheetJS CDN, because the npm "xlsx" package is out of date.
export const getXLSX = () => loadModule('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');

// uqr 0.1.2 (MIT): small QR code encoder.
export const getUqr = () => loadModule('https://cdn.jsdelivr.net/npm/uqr@0.1.2/dist/index.mjs');
