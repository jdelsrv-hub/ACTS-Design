import { fileTool } from '../../core/filetool.js';
import { getMediabunny } from '../../core/vendor.js';
import { renameExt, mimeFromExt } from '../../core/files.js';
import { notice } from '../../core/ui.js';
import { even, formatTime } from './_media.js';

export default fileTool({
  accept: '.gif,image/gif',
  dropTitle: 'Drop your GIF here',
  dropHint: 'An animated GIF. You get a video that plays the animation once.',
  action: 'Convert GIF',
  actionIcon: 'convert',
  options: [{ id: 'to', type: 'segmented', label: 'Convert to', default: 'mp4', choices: [{ value: 'mp4', label: 'MP4' }, { value: 'webm', label: 'WebM' }] }],
  renderExtra: (extra) => extra.append(notice('info', 'Videos have no see-through areas, so any transparent parts of your GIF turn white.')),
  async processFile(file, o, ctx) {
    if (typeof ImageDecoder === 'undefined') throw new Error("Your browser can't read GIF frames yet. Try the latest Chrome or Edge.");
    const MB = await getMediabunny();
    const decoder = new ImageDecoder({ data: await file.arrayBuffer(), type: 'image/gif' });
    let output;
    try {
      await decoder.completed;
      await decoder.tracks.ready; // completed can resolve first, leaving selectedTrack null
      const count = decoder.tracks.selectedTrack.frameCount;
      let { image } = await decoder.decode({ frameIndex: 0 });
      const [width, height] = [even(image.displayWidth), even(image.displayHeight)];
      const canvas = new OffscreenCanvas(width, height);
      const g = canvas.getContext('2d');
      output = new MB.Output({ format: new MB[o.to === 'webm' ? 'WebMOutputFormat' : 'Mp4OutputFormat'](), target: new MB.BufferTarget() });
      const source = new MB.CanvasSource(canvas, { codec: o.to === 'webm' ? 'vp9' : 'avc', quality: new MB.Quality('high') });
      output.addVideoTrack(source);
      await output.start();
      let time = 0;
      for (let i = 0; i < count; i++) {
        if (i) ({ image } = await decoder.decode({ frameIndex: i }));
        // Browsers show GIF delays of 10 ms or less as 100 ms, so we do too.
        const delay = image.duration > 10_000 ? image.duration / 1e6 : 0.1;
        g.fillStyle = '#fff';
        g.fillRect(0, 0, width, height);
        g.drawImage(image, 0, 0, width, height);
        image.close();
        await source.add(time, delay);
        time += delay;
        ctx.progress((i + 1) / count, `Frame ${i + 1} of ${count}`);
        await ctx.tick();
      }
      await output.finalize();
      return { name: renameExt(file.name, o.to), blob: new Blob([output.target.buffer], { type: mimeFromExt(o.to) }), note: `${count} frames · ${formatTime(time)}` };
    } catch (err) {
      if (output?.state === 'started') await output.cancel();
      if (err?.name === 'EncodingError' || /decode|track metadata/i.test(err?.message)) throw new Error("We couldn't read this GIF. It may be damaged, or not a GIF at all.");
      throw err;
    } finally {
      decoder.close();
    }
  },
});
