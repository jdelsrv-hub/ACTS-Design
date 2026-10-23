// Image splitter: cut an image into rows × columns of tiles (for Instagram grids), downloaded as a zip.
import { fileTool } from '../../core/filetool.js';
import { decodeImage, drawToCanvas, IMAGE_ACCEPT } from '../../core/image.js';
import { notice } from '../../core/ui.js';
import { withPreview, copyCanvas, saveCanvas, keepFormat } from './_shared.js';

const count = (n) => Math.min(10, Math.max(1, Math.round(n) || 1));
/** Where the cuts go: n tiles across size px, as close to equal as whole pixels allow. */
const cuts = (n, size) => Array.from({ length: n + 1 }, (_, i) => Math.round((i * size) / n));

// Preview: the image with the cut lines and tile numbers drawn on.
function gridPreview(img, o) {
  const c = copyCanvas(img);
  const g = c.getContext('2d');
  const [rows, cols] = [count(o.rows), count(o.cols)];
  const xs = cuts(cols, c.width);
  const ys = cuts(rows, c.height);
  Object.assign(g, { strokeStyle: '#FFFFFF', lineWidth: Math.max(2, c.width / 300), shadowColor: 'rgba(0, 0, 0, .7)', shadowBlur: 6 });
  g.beginPath();
  xs.slice(1, -1).forEach((x) => { g.moveTo(x, 0); g.lineTo(x, c.height); });
  ys.slice(1, -1).forEach((y) => { g.moveTo(0, y); g.lineTo(c.width, y); });
  g.stroke();
  Object.assign(g, { font: `700 ${Math.round(Math.min(c.width / cols, c.height / rows) / 4)}px Inter, Arial, sans-serif`, textAlign: 'center', textBaseline: 'middle', fillStyle: '#FFFFFF' });
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) g.fillText(String(r * cols + k + 1), (xs[k] + xs[k + 1]) / 2, (ys[r] + ys[r + 1]) / 2);
  return c;
}

export default fileTool(withPreview({
  accept: IMAGE_ACCEPT,
  dropTitle: 'Drop your image here',
  action: 'Split image',
  actionIcon: 'grid',
  zipName: 'tiles.zip',
  options: [
    { id: 'rows', type: 'number', label: 'Rows', min: 1, max: 10, step: 1, default: 3 },
    { id: 'cols', type: 'number', label: 'Columns', min: 1, max: 10, step: 1, default: 3 },
  ],
  validate(_, o) {
    const ok = (n) => Number.isInteger(n) && n >= 1 && n <= 10;
    if (!ok(o.rows) || !ok(o.cols)) return 'Rows and columns can each be 1 to 10.';
    return o.rows * o.cols < 2 ? 'Pick at least 2 tiles.' : null;
  },
  renderExtra: (extra) => extra.append(notice('info', 'Posting a grid on Instagram? Post the highest number first, so tile 1 ends up top left.')),
  async processFile(file, o, ctx) {
    const img = await decodeImage(file);
    const format = keepFormat(file);
    const xs = cuts(o.cols, img.width);
    const ys = cuts(o.rows, img.height);
    const tiles = [];
    try {
      for (let r = 0; r < o.rows; r++) {
        for (let k = 0; k < o.cols; k++) {
          const [sw, sh] = [xs[k + 1] - xs[k], ys[r + 1] - ys[r]];
          tiles.push(await saveCanvas(drawToCanvas(img.image, sw, sh, { sx: xs[k], sy: ys[r], sw, sh }), file, String(tiles.length + 1), format));
          ctx.progress(tiles.length / (o.rows * o.cols));
          await ctx.tick();
        }
      }
    } finally {
      img.close();
    }
    return tiles;
  },
}, ([p], o) => gridPreview(p.image, o)));
