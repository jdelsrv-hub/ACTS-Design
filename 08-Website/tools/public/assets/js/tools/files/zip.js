import { fileTool } from '../../core/filetool.js';
import { zipFiles, formatBytes, renameExt } from '../../core/files.js';

export default fileTool({
  multiple: true,
  dropTitle: 'Drop your files here',
  dropHint: 'Any type of file. Add as many as you like.',
  action: 'Create zip',
  actionIcon: 'file-archive',
  workingLabel: 'Zipping your files',
  indeterminate: true,
  async process(files) {
    const blob = await zipFiles(files.map((f) => ({ name: f.name, blob: f })));
    const before = files.reduce((n, f) => n + f.size, 0);
    const name = files.length === 1 ? renameExt(files[0].name, 'zip') : 'files.zip';
    return {
      items: [{ name, blob, note: `${files.length} file${files.length === 1 ? '' : 's'}` }],
      summary: `${files.length} file${files.length === 1 ? '' : 's'} zipped (${formatBytes(before)} to ${formatBytes(blob.size)})`,
    };
  },
});
