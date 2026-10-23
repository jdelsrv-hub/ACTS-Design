// Image decode/encode helpers shared by image, PDF and AI tools.
// decodeImage() opens anything the browser can draw, plus HEIC (iPhone) and TIFF via small libraries.
import { getHeic2any, getUtif } from './vendor.js';
import { sniffType, extOf, blobFromCanvas } from './files.js';

export const IMAGE_ACCEPT = 'image/*,.heic,.heif,.tif,.tiff,.avif,.webp,.svg,.bmp,.ico';

/**
 * Decode an image file.
 * Returns { image, width, height, type, close() } where image is drawable with ctx.drawImage().
 * EXIF orientation is applied, so phone photos come out the right way up.
 */
export async function decodeImage(file, { svgSize } = {}) {
  const type = (await sniffType(file)) || extOf(file.name) || '';
  if (type === 'tiff' || type === 'tif') return decodeTiff(file);
  if (type === 'svg' || file.type === 'image/svg+xml' || /\.svg$/i.test(file.name || '')) return decodeSvg(file, svgSize);
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return wrapBitmap(bmp, type);
  } catch (err) {
    if (type === 'heic' || /\.(heic|heif)$/i.test(file.name || '')) {
      try {
        return await decodeHeic(file);
      } catch (e) {
        if (e?.url) throw e; // the decoder itself didn't load: keep the "check your connection" message
        throw new Error(`We couldn't open ${file.name || 'this photo'}. It may be damaged, or not a real HEIC photo.`);
      }
    }
    // Last try: an <img> element (handles a few formats createImageBitmap rejects).
    try {
      return await decodeWithImg(file, type);
    } catch {
      throw new Error(`We couldn't open ${file.name || 'this image'}. It may be damaged or in a format your browser can't read.`);
    }
  }
}

function wrapBitmap(bmp, type) {
  return { image: bmp, width: bmp.width, height: bmp.height, type, close: () => bmp.close?.() };
}

async function decodeHeic(file) {
  const heic2any = await getHeic2any();
  let out = await heic2any({ blob: file, toType: 'image/png' });
  if (Array.isArray(out)) out = out[0];
  const bmp = await createImageBitmap(out);
  return wrapBitmap(bmp, 'heic');
}

async function decodeTiff(file) {
  const UTIF = await getUtif();
  const buf = await file.arrayBuffer();
  const ifds = UTIF.decode(buf);
  if (!ifds.length) throw new Error('This TIFF has no images in it.');
  UTIF.decodeImage(buf, ifds[0]);
  const rgba = UTIF.toRGBA8(ifds[0]);
  const { width, height } = ifds[0];
  const canvas = makeCanvas(width, height);
  canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength), width, height), 0, 0);
  return { image: canvas, width, height, type: 'tiff', close() {} };
}

async function decodeSvg(file, svgSize) {
  const text = await file.text();
  const blob = new Blob([text], { type: 'image/svg+xml' });
  const img = await loadImg(blob);
  let width = img.naturalWidth || 0;
  let height = img.naturalHeight || 0;
  if (!width || !height) {
    const vb = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(text);
    width = vb ? parseFloat(vb[1]) : 512;
    height = vb ? parseFloat(vb[2]) : 512;
  }
  if (svgSize?.width) {
    const scale = svgSize.width / width;
    width = Math.round(svgSize.width);
    height = Math.round(height * scale);
  }
  const canvas = makeCanvas(width, height);
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);
  return { image: canvas, width, height, type: 'svg', close() {} };
}

async function decodeWithImg(file, type) {
  const img = await loadImg(file);
  const canvas = makeCanvas(img.naturalWidth, img.naturalHeight);
  canvas.getContext('2d').drawImage(img, 0, 0);
  return { image: canvas, width: canvas.width, height: canvas.height, type, close() {} };
}

function loadImg(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image failed to load'));
    };
    img.src = url;
  });
}

/** A normal <canvas> (works everywhere, can be shown on the page). */
export function makeCanvas(width, height) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(width));
  c.height = Math.max(1, Math.round(height));
  return c;
}

/**
 * Draw an image into a new canvas of the given size, with good-quality downscaling.
 * opts.background: fill colour first (needed for JPG, which has no transparency).
 */
export function drawToCanvas(image, width, height, { background, sx = 0, sy = 0, sw, sh } = {}) {
  width = Math.max(1, Math.round(width));
  height = Math.max(1, Math.round(height));
  sw ??= image.width;
  sh ??= image.height;
  let src = image;
  let srcX = sx, srcY = sy, srcW = sw, srcH = sh;
  // Step down by halves when shrinking a lot: avoids the jagged look of a single big resize.
  while (srcW / width > 2.2 && srcH / height > 2.2) {
    const step = makeCanvas(srcW / 2, srcH / 2);
    const sctx = step.getContext('2d');
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(src, srcX, srcY, srcW, srcH, 0, 0, step.width, step.height);
    src = step;
    srcX = 0;
    srcY = 0;
    srcW = step.width;
    srcH = step.height;
  }
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, srcX, srcY, srcW, srcH, 0, 0, width, height);
  return canvas;
}

/** Fit (w,h) inside (maxW,maxH) keeping the aspect ratio. Never upscales unless allowUpscale. */
export function fitWithin(w, h, maxW, maxH, allowUpscale = false) {
  const scale = Math.min(maxW ? maxW / w : Infinity, maxH ? maxH / h : Infinity, allowUpscale ? Infinity : 1);
  if (!Number.isFinite(scale)) return { width: w, height: h };
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

const encodeSupport = new Map();
/** Can this browser encode the given MIME type from a canvas? ('image/webp', 'image/avif', ...) */
export async function canEncode(mime) {
  if (mime === 'image/png' || mime === 'image/jpeg') return true;
  if (!encodeSupport.has(mime)) {
    const c = makeCanvas(2, 2);
    const p = blobFromCanvas(c, mime, 0.8).then((b) => b.type === mime).catch(() => false);
    encodeSupport.set(mime, p);
  }
  return encodeSupport.get(mime);
}

/** Encode a canvas. format: 'png' | 'jpeg' | 'jpg' | 'webp' | 'avif'. quality 0-1 (lossy formats). */
export async function encodeCanvas(canvas, format = 'png', quality = 0.9) {
  const mime = format === 'jpg' ? 'image/jpeg' : format.includes('/') ? format : `image/${format}`;
  if (!(await canEncode(mime))) throw new Error(`Your browser can't save ${format.toUpperCase()} images. Try Chrome or Edge, or pick another format.`);
  return blobFromCanvas(canvas, mime, quality);
}

/** Small preview URL for file lists (object URL of a downscaled JPEG/PNG). Caller should revoke it. */
export async function thumbnailURL(file, size = 96) {
  try {
    const img = await decodeImage(file);
    const { width, height } = fitWithin(img.width, img.height, size * 2, size * 2);
    const c = drawToCanvas(img.image, width, height);
    img.close();
    const blob = await blobFromCanvas(c, 'image/png');
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/** Read pixels: returns ImageData for a drawable at its natural size (or given size). */
export function getPixels(image, width = image.width, height = image.height) {
  const c = drawToCanvas(image, width, height);
  return c.getContext('2d').getImageData(0, 0, c.width, c.height);
}

/** ImageData -> canvas */
export function pixelsToCanvas(imageData) {
  const c = makeCanvas(imageData.width, imageData.height);
  c.getContext('2d').putImageData(imageData, 0, 0);
  return c;
}
