import { fileTool } from '../../core/filetool.js';
import { withSuffix, formatBytes, sizeChange } from '../../core/files.js';
import { VIDEO_ACCEPT, WORKING_NOTE, convert, describeMedia, getVideoTrack, even } from './_media.js';

// Target video bitrate: a share of the original, capped at a good-looking rate for the size (bits/s at 1080p).
const LEVELS = { light: [0.7, 6e6], balanced: [0.5, 3e6], strong: [0.3, 1.5e6] };

export default fileTool({
  accept: VIDEO_ACCEPT,
  dropTitle: 'Drop your video here',
  dropHint: 'MP4, MOV, WebM or MKV. You get an MP4 back.',
  action: 'Compress video',
  actionIcon: 'shrink',
  workingNote: WORKING_NOTE,
  describe: describeMedia,
  options: [
    { id: 'level', type: 'segmented', label: 'Compression', default: 'balanced', help: 'Stronger gives a smaller file, with less detail.',
      choices: [{ value: 'light', label: 'Light' }, { value: 'balanced', label: 'Balanced' }, { value: 'strong', label: 'Strong' }] },
    { id: 'size', type: 'select', label: 'Video size', default: 0,
      choices: [{ value: 0, label: 'Keep the same size' }, { value: 1080, label: '1080p' }, { value: 720, label: '720p' }, { value: 480, label: '480p' }] },
  ],
  async processFile(file, o, ctx) {
    const { blob, note } = await convert(file, 'mp4', async (input, MB) => {
      const track = await getVideoTrack(input);
      const [w, h, duration, audio] = await Promise.all([track.getDisplayWidth(), track.getDisplayHeight(), input.computeDuration(), input.getPrimaryAudioTrack()]);
      if (!(duration > 0)) throw new Error("We couldn't work out how long this video is, so we can't compress it.");
      const scale = o.size ? Math.min(1, o.size / Math.min(w, h)) : 1;
      const [width, height] = [even(w * scale), even(h * scale)];
      const [share, cap] = LEVELS[o.level] || LEVELS.balanced;
      const original = (file.size * 8) / duration - (audio ? 128e3 : 0);
      const bitrate = Math.max(1e5, Math.min(original * share, cap * ((width * height) / (1920 * 1080)) ** 0.95));
      return { video: { codec: 'avc', width, height, fit: 'fill', quality: new MB.Quality({ bitrate: Math.round(bitrate) }) }, audio: { codec: 'aac' } };
    }, ctx);
    if (blob.size >= file.size) {
      const tips = [o.level !== 'strong' && 'Strong', o.size !== 480 && 'a smaller video size'].filter(Boolean);
      throw new Error(`This video is already well compressed, so we couldn't make it smaller.${tips.length ? ` Try ${tips.join(', or ')}.` : ''}`);
    }
    return { name: withSuffix(file.name, 'compressed', 'mp4'), blob, note };
  },
  summarize: ([file], [item]) => item && `${sizeChange(file.size, item.blob.size)}: ${formatBytes(file.size)} down to ${formatBytes(item.blob.size)}`,
});
