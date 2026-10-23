import { fileTool } from '../../core/filetool.js';
import { renameExt } from '../../core/files.js';
import { notice } from '../../core/ui.js';
import { VIDEO_ACCEPT, WORKING_NOTE, PLAYS_ANYWHERE, convert, describeMedia } from './_media.js';

const FORMATS = [{ value: 'mp4', label: 'MP4' }, { value: 'mov', label: 'MOV' }, { value: 'webm', label: 'WebM' }, { value: 'mkv', label: 'MKV' }];

// preset: { from: 'MOV', options: { to: 'mp4' } } for the "X to Y" pages.
export default fileTool((preset) => ({
  accept: VIDEO_ACCEPT,
  dropTitle: `Drop your ${preset.from ? `${preset.from} ` : ''}video here`,
  dropHint: 'MP4, MOV, WebM or MKV.',
  action: 'Convert video',
  actionIcon: 'convert',
  workingNote: WORKING_NOTE,
  describe: describeMedia,
  options: [{ id: 'to', type: 'segmented', label: 'Convert to', choices: FORMATS, default: 'mp4' }],
  renderExtra: (extra) => extra.append(notice('info', 'If the new format can hold your video as it is, we copy it across with no loss in quality. If not, we re-encode it, which takes longer and softens the picture a little. MP4 and MOV files come out in the formats that play everywhere.')),
  async processFile(file, o, ctx) {
    const { blob, note } = await convert(file, o.to, o.to === 'mp4' || o.to === 'mov' ? PLAYS_ANYWHERE : {}, ctx);
    return { name: renameExt(file.name, o.to), blob, note };
  },
}));
