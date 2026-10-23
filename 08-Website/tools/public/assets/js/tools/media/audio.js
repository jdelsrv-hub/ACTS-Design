import { fileTool } from '../../core/filetool.js';
import { renameExt } from '../../core/files.js';
import { VIDEO_ACCEPT, AUDIO_ACCEPT, convert, describeMedia } from './_media.js';

const LABELS = { mp3: 'MP3', wav: 'WAV', m4a: 'M4A', ogg: 'OGG' };
// The sound format inside each file type (MP3 and WAV only hold one kind, so Mediabunny picks).
const CODEC = { m4a: 'aac', ogg: 'opus' };

// One module for both Extract audio (preset.source: 'video') and Audio converter.
// preset: { source?: 'video', from?: 'M4A', options?: { to: 'mp3' } }
export default fileTool((preset) => {
  const fromVideo = preset.source === 'video';
  const outs = fromVideo ? ['mp3', 'wav', 'm4a'] : ['mp3', 'wav', 'm4a', 'ogg'];
  return {
    accept: fromVideo ? VIDEO_ACCEPT : AUDIO_ACCEPT,
    multiple: true,
    dropTitle: `Drop your ${preset.from ? `${preset.from} ` : ''}${fromVideo ? 'videos' : 'audio files'} here`,
    dropHint: fromVideo ? 'MP4, MOV, WebM or MKV. Add one or several.' : 'MP3, WAV, M4A, AAC, OGG or FLAC. Add one or several.',
    action: fromVideo ? 'Extract audio' : 'Convert audio',
    actionIcon: fromVideo ? 'music' : 'convert',
    describe: describeMedia,
    options: [{ id: 'to', type: 'segmented', label: 'Save as', default: 'mp3', choices: outs.map((value) => ({ value, label: LABELS[value] })) }],
    async processFile(file, o, ctx) {
      const { blob, note } = await convert(file, o.to, { video: { discard: true }, audio: { codec: CODEC[o.to] } }, ctx);
      return { name: renameExt(file.name, o.to), blob, note };
    },
  };
});
