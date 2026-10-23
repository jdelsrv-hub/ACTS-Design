import { fileTool } from '../../core/filetool.js';
import { withSuffix, readText } from '../../core/files.js';
import { VIDEO_ACCEPT, WORKING_NOTE, convert, describeMedia } from './_media.js';

export default fileTool({
  accept: VIDEO_ACCEPT,
  dropTitle: 'Drop your video here',
  dropHint: 'MP4, MOV, WebM or MKV. Then add your .srt file. You get an MP4 back.',
  action: 'Add subtitles',
  actionIcon: 'captions',
  workingNote: WORKING_NOTE,
  describe: describeMedia,
  options: [{ id: 'srt', type: 'file', label: 'Subtitle file (.srt)', accept: '.srt', buttonLabel: 'Choose .srt file', wide: true }],
  validate: (_files, o) => (o.srt ? null : 'Add your .srt subtitle file.'),
  async processFile(file, o, ctx) {
    const cues = parseSrt(await readText(o.srt));
    if (!cues.length) throw new Error("We couldn't find any subtitles in that file. Check it has lines like 00:00:01,000 --> 00:00:04,000.");
    let canvas, g;
    const { blob, note } = await convert(file, 'mp4', {
      video: {
        codec: 'avc',
        allowTransformationMetadata: false, // bake any rotation in first, so the text is drawn upright
        process(sample) {
          canvas ||= new OffscreenCanvas(sample.displayWidth, sample.displayHeight);
          g ||= canvas.getContext('2d');
          sample.draw(g, 0, 0, canvas.width, canvas.height);
          const cue = cues.find((c) => sample.timestamp >= c.start && sample.timestamp < c.end);
          if (cue) drawCaption(g, cue.lines, canvas.width, canvas.height);
          return canvas;
        },
      },
      audio: { codec: 'aac' },
    }, ctx);
    return { name: withSuffix(file.name, 'subtitled', 'mp4'), blob, note: note || `${cues.length} subtitles` };
  },
});

/** SRT text -> [{ start, end, lines }] in seconds. Formatting tags like <i> are dropped. */
export function parseSrt(text) {
  const seconds = (t) => t.replace(',', '.').split(':').reduce((sum, p) => sum * 60 + Number(p), 0);
  return text.replace(/\r/g, '').split(/\n\s*\n/).map((block) => {
    const lines = block.trim().split('\n');
    const i = lines.findIndex((l) => l.includes('-->'));
    const m = i < 0 ? null : /(\d+:\d{2}:\d{2}[,.]\d+)\s*-->\s*(\d+:\d{2}:\d{2}[,.]\d+)/.exec(lines[i]);
    if (!m) return null;
    const words = lines.slice(i + 1).map((l) => l.replace(/<[^>]*>|\{\\[^}]*\}/g, '').trim()).filter(Boolean);
    return words.length ? { start: seconds(m[1]), end: seconds(m[2]), lines: words } : null;
  }).filter(Boolean);
}

/** White text with a dark outline, centred near the bottom, wrapped to fit. */
function drawCaption(g, lines, width, height) {
  const size = Math.max(14, Math.round(Math.min(width, height) * 0.055));
  g.font = `bold ${size}px Arial, Helvetica, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'bottom';
  g.lineJoin = 'round';
  g.lineWidth = size * 0.18;
  g.strokeStyle = 'rgba(0, 0, 0, 0.85)';
  g.fillStyle = '#fff';
  const rows = lines.flatMap((line) => wrap(g, line, width * 0.9));
  rows.forEach((row, i) => {
    const y = height * 0.94 - (rows.length - 1 - i) * size * 1.25;
    g.strokeText(row, width / 2, y);
    g.fillText(row, width / 2, y);
  });
}

function wrap(g, line, max) {
  const rows = [];
  let row = '';
  for (const word of line.split(/\s+/)) {
    const next = row ? `${row} ${word}` : word;
    if (row && g.measureText(next).width > max) {
      rows.push(row);
      row = word;
    } else row = next;
  }
  return row ? [...rows, row] : rows;
}
