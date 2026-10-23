import { fileTool } from '../../core/filetool.js';
import { withSuffix } from '../../core/files.js';
import { VIDEO_ACCEPT, convert, describeMedia } from './_media.js';

export default fileTool({
  accept: VIDEO_ACCEPT,
  dropTitle: 'Drop your video here',
  dropHint: 'MP4, MOV, WebM or MKV. The picture is copied across untouched.',
  action: 'Remove sound',
  actionIcon: 'volume-x',
  describe: describeMedia,
  async processFile(file, _options, ctx) {
    const { blob, ext } = await convert(file, null, { audio: { discard: true } }, ctx);
    return { name: withSuffix(file.name, 'muted', ext), blob };
  },
});
