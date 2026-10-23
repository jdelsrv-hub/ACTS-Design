import { fileTool } from '../../core/filetool.js';
import { getGifenc, getMediabunny } from '../../core/vendor.js';
import { renameExt } from '../../core/files.js';
import { VIDEO_ACCEPT, WORKING_NOTE, CANT_READ, openInput, getVideoTrack, describeMedia, previewPlayer, parseTime, formatTime } from './_media.js';

// preset: { from: 'MP4' } for the "X to GIF" pages.
export default fileTool((preset) => ({
  accept: VIDEO_ACCEPT,
  dropTitle: `Drop your ${preset.from ? `${preset.from} ` : ''}video here`,
  dropHint: 'GIFs get big fast, so pick a short moment (up to 30 seconds).',
  action: 'Make GIF',
  actionIcon: 'film',
  workingNote: WORKING_NOTE,
  describe: describeMedia,
  options: [
    { id: 'start', type: 'text', label: 'Start', default: '0:00', help: 'Minutes and seconds, like 0:05.5' },
    { id: 'length', type: 'number', label: 'Length', unit: 'sec', min: 0.5, max: 30, step: 0.5, default: 5 },
    { id: 'fps', type: 'select', label: 'Frame rate', default: 10, help: 'More frames look smoother but make a bigger file.',
      choices: [5, 10, 15, 20, 25].map((v) => ({ value: v, label: `${v} frames a second` })) },
    { id: 'width', type: 'select', label: 'Width', default: 480, choices: [320, 480, 640, 800].map((v) => ({ value: v, label: `${v} px` })) },
  ],
  renderExtra: (extra, api) => previewPlayer(extra, api, [['Start here', 'start']]),
  onFilesChange: (_files, api) => api.setOption('start', '0:00'),
  validate(_files, o) {
    if (Number.isNaN(parseTime(o.start))) return 'Type the start as minutes and seconds, like 0:05.';
    if (!(o.length >= 0.5 && o.length <= 30)) return 'Pick a length between 0.5 and 30 seconds.';
    return null;
  },
  async processFile(file, o, ctx) {
    const [{ GIFEncoder, quantize, applyPalette }, MB, input] = await Promise.all([getGifenc(), getMediabunny(), openInput(file)]);
    try {
      const track = await getVideoTrack(input);
      if (!(await track.canDecode())) throw new Error(CANT_READ);
      const [w, h, duration] = await Promise.all([track.getDisplayWidth(), track.getDisplayHeight(), input.computeDuration()]);
      const start = parseTime(o.start);
      if (start >= duration) throw new Error(`The start is after the end of the video, which is ${formatTime(duration)} long.`);
      const width = Math.min(o.width, w);
      const height = Math.max(1, Math.round((width * h) / w));
      const count = Math.max(1, Math.round(Math.min(o.length, duration - start) * o.fps));
      const times = Array.from({ length: count }, (_, i) => start + i / o.fps);
      const sink = new MB.CanvasSink(track, { width, height, fit: 'fill', poolSize: 1 });
      const gif = GIFEncoder();
      let done = 0;
      for await (const frame of sink.canvasesAtTimestamps(times)) {
        if (frame) {
          const { data } = frame.canvas.getContext('2d').getImageData(0, 0, width, height);
          const palette = quantize(data, 256);
          gif.writeFrame(applyPalette(data, palette), width, height, { palette, delay: 1000 / o.fps });
        }
        ctx.progress(++done / count, `Frame ${done} of ${count}`);
        await ctx.tick();
      }
      gif.finish();
      return { name: renameExt(file.name, 'gif'), blob: new Blob([gif.bytes()], { type: 'image/gif' }), note: `${width} × ${height} · ${count} frames` };
    } finally {
      input.dispose();
    }
  },
}));
