import { fileTool } from '../../core/filetool.js';
import { withSuffix } from '../../core/files.js';
import { VIDEO_ACCEPT, convert, describeMedia, previewPlayer, parseTime, formatTime } from './_media.js';

export default fileTool({
  accept: VIDEO_ACCEPT,
  dropTitle: 'Drop your video here',
  dropHint: 'MP4, MOV, WebM or MKV.',
  action: 'Trim video',
  actionIcon: 'scissors',
  describe: describeMedia,
  options: [
    { id: 'start', type: 'text', label: 'Start', default: '0:00', help: 'Minutes and seconds, like 0:05.5' },
    { id: 'end', type: 'text', label: 'End', default: '', help: 'Leave empty to keep everything to the end.' },
  ],
  renderExtra(extra, api) {
    const video = previewPlayer(extra, api, [['Set start', 'start'], ['Set end', 'end']]);
    video.addEventListener('loadedmetadata', () => {
      if (!api.options.end && Number.isFinite(video.duration)) api.setOption('end', formatTime(video.duration));
    });
  },
  onFilesChange(_files, api) {
    api.setOption('start', '0:00');
    api.setOption('end', '');
  },
  validate(_files, o) {
    const start = parseTime(o.start);
    const end = o.end === '' ? Infinity : parseTime(o.end);
    if (Number.isNaN(start) || Number.isNaN(end)) return 'Type the times as minutes and seconds, like 1:05.5.';
    if (end <= start) return 'The end needs to be after the start.';
    return null;
  },
  async processFile(file, o, ctx) {
    let length;
    const { blob, ext, note } = await convert(file, null, async (input) => {
      const duration = await input.computeDuration();
      const start = parseTime(o.start);
      const end = Math.min(o.end === '' ? duration : parseTime(o.end), duration);
      if (start >= end) throw new Error(`The start is after the end of the video, which is ${formatTime(duration)} long.`);
      length = end - start;
      return { trim: { start, end } };
    }, ctx);
    return { name: withSuffix(file.name, 'trimmed', ext), blob, note: note || `${formatTime(length)} long` };
  },
});
