import { fileTool } from '../../core/filetool.js';
import { withSuffix } from '../../core/files.js';
import { VIDEO_ACCEPT, WORKING_NOTE, convert, describeMedia, getVideoTrack, even } from './_media.js';

export default fileTool({
  accept: VIDEO_ACCEPT,
  dropTitle: 'Drop your video here',
  dropHint: 'MP4, MOV, WebM or MKV. You get an MP4 back.',
  action: 'Resize video',
  actionIcon: 'scaling',
  workingNote: WORKING_NOTE,
  describe: describeMedia,
  options: [
    { id: 'size', type: 'segmented', label: 'New size', default: 720, help: 'The shorter side becomes this size, so portrait videos work too.',
      choices: [{ value: 1080, label: '1080p' }, { value: 720, label: '720p' }, { value: 480, label: '480p' }, { value: 'custom', label: 'Custom width' }] },
    { id: 'width', type: 'number', label: 'Width', unit: 'px', min: 16, max: 7680, step: 2, default: 1280, showIf: (o) => o.size === 'custom',
      help: 'The height changes to match, so nothing gets stretched.' },
  ],
  validate: (_files, o) => (o.size === 'custom' && !(o.width >= 16 && o.width <= 7680) ? 'Type a width between 16 and 7680 pixels.' : null),
  async processFile(file, o, ctx) {
    let width, height;
    const { blob, note } = await convert(file, 'mp4', async (input) => {
      const track = await getVideoTrack(input);
      const [w, h] = await Promise.all([track.getDisplayWidth(), track.getDisplayHeight()]);
      const scale = o.size === 'custom' ? o.width / w : o.size / Math.min(w, h);
      [width, height] = [even(w * scale), even(h * scale)];
      return { video: { codec: 'avc', width, height, fit: 'fill' }, audio: { codec: 'aac' } };
    }, ctx);
    return { name: withSuffix(file.name, `${width}x${height}`, 'mp4'), blob, note: note || `${width} × ${height}` };
  },
});
