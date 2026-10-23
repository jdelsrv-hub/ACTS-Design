// Video and audio family (owner: tools-media agent). Entry format: see public/assets/js/registry.js.
// Shared code lives in _media.js. Preset entries reuse a module with different defaults.
export default [
  { slug: 'compress-video', name: 'Compress video', cat: 'video', icon: 'shrink', module: 'compress.js', summary: "Make a video file smaller, so it's easier to send, share or upload.", keywords: ['reduce', 'smaller', 'shrink', 'file size', 'mp4'] },
  { slug: 'trim-video', name: 'Trim video', cat: 'video', icon: 'scissors', module: 'trim.js', summary: 'Cut a video down to the part you want, with a preview to pick the start and end.', keywords: ['cut', 'clip', 'shorten'] },
  { slug: 'mute-video', name: 'Mute video', cat: 'video', icon: 'volume-x', module: 'mute.js', summary: 'Remove the sound from a video, with no loss in picture quality.', keywords: ['remove audio', 'silent', 'no sound'] },
  { slug: 'resize-video', name: 'Resize video', cat: 'video', icon: 'scaling', module: 'resize.js', summary: 'Change a video to 1080p, 720p, 480p or a width you choose.', keywords: ['scale', 'resolution', 'dimensions'] },

  { slug: 'video-converter', name: 'Video converter', cat: 'video', icon: 'convert', module: 'convert.js', summary: 'Convert videos between MP4, MOV, WebM and MKV.', keywords: ['mp4', 'mov', 'webm', 'mkv', 'format'] },
  { slug: 'mov-to-mp4', name: 'MOV to MP4', cat: 'video', icon: 'convert', module: 'convert.js', preset: { from: 'MOV', options: { to: 'mp4' } }, summary: 'Turn iPhone and Mac MOV videos into MP4 files that play anywhere.', keywords: ['iphone', 'quicktime'] },
  { slug: 'mkv-to-mp4', name: 'MKV to MP4', cat: 'video', icon: 'convert', module: 'convert.js', preset: { from: 'MKV', options: { to: 'mp4' } }, summary: 'Turn MKV videos into MP4 files that play on phones, TVs and social apps.', keywords: ['obs', 'matroska'] },
  { slug: 'webm-to-mp4', name: 'WebM to MP4', cat: 'video', icon: 'convert', module: 'convert.js', preset: { from: 'WebM', options: { to: 'mp4' } }, summary: 'Turn WebM videos and screen recordings into MP4 files that play anywhere.' },
  { slug: 'mp4-to-webm', name: 'MP4 to WebM', cat: 'video', icon: 'convert', module: 'convert.js', preset: { from: 'MP4', options: { to: 'webm' } }, summary: 'Turn MP4 videos into WebM, an open format made for websites.' },
  { slug: 'mp4-to-mov', name: 'MP4 to MOV', cat: 'video', icon: 'convert', module: 'convert.js', preset: { from: 'MP4', options: { to: 'mov' } }, summary: 'Turn MP4 videos into MOV files for QuickTime and other Apple apps.', keywords: ['quicktime', 'imovie'] },

  { slug: 'video-to-gif', name: 'Video to GIF', cat: 'video', icon: 'film', module: 'gif.js', summary: 'Turn a short moment from a video into an animated GIF.', keywords: ['animated', 'meme', 'reaction'] },
  { slug: 'mp4-to-gif', name: 'MP4 to GIF', cat: 'video', icon: 'film', module: 'gif.js', preset: { from: 'MP4' }, summary: 'Turn a short moment from an MP4 video into an animated GIF.', keywords: ['animated'] },
  { slug: 'mov-to-gif', name: 'MOV to GIF', cat: 'video', icon: 'film', module: 'gif.js', preset: { from: 'MOV' }, summary: 'Turn a short moment from a MOV or iPhone video into an animated GIF.', keywords: ['animated', 'iphone'] },
  { slug: 'gif-to-mp4', name: 'GIF to MP4', cat: 'video', icon: 'play-box', module: 'gif-to-video.js', summary: 'Turn an animated GIF into an MP4 or WebM video, usually a much smaller file.', keywords: ['animated', 'webm'] },

  { slug: 'extract-audio', name: 'Extract audio', cat: 'video', icon: 'music', module: 'audio.js', preset: { source: 'video' }, summary: 'Save the sound from a video as an MP3, WAV or M4A file.', keywords: ['audio from video', 'sound', 'mp3'] },
  { slug: 'mp4-to-mp3', name: 'MP4 to MP3', cat: 'video', icon: 'music', module: 'audio.js', preset: { source: 'video', from: 'MP4', options: { to: 'mp3' } }, summary: 'Save the sound from an MP4 video as an MP3.', keywords: ['audio from video'] },
  { slug: 'mov-to-mp3', name: 'MOV to MP3', cat: 'video', icon: 'music', module: 'audio.js', preset: { source: 'video', from: 'MOV', options: { to: 'mp3' } }, summary: 'Save the sound from a MOV or iPhone video as an MP3.', keywords: ['audio from video', 'iphone'] },
  { slug: 'mp4-to-wav', name: 'MP4 to WAV', cat: 'video', icon: 'music', module: 'audio.js', preset: { source: 'video', from: 'MP4', options: { to: 'wav' } }, summary: 'Save the sound from an MP4 video as a WAV file, ready for editing.', keywords: ['audio from video'] },

  { slug: 'audio-converter', name: 'Audio converter', cat: 'video', icon: 'audio-lines', module: 'audio.js', summary: 'Convert audio between MP3, WAV, M4A and OGG. FLAC files open too.', keywords: ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'] },
  { slug: 'm4a-to-mp3', name: 'M4A to MP3', cat: 'video', icon: 'audio-lines', module: 'audio.js', preset: { from: 'M4A', options: { to: 'mp3' } }, summary: 'Turn M4A audio, like iPhone voice memos, into MP3 files.', keywords: ['voice memo'] },
  { slug: 'wav-to-mp3', name: 'WAV to MP3', cat: 'video', icon: 'audio-lines', module: 'audio.js', preset: { from: 'WAV', options: { to: 'mp3' } }, summary: 'Turn big WAV files into much smaller MP3s.' },
  { slug: 'ogg-to-mp3', name: 'OGG to MP3', cat: 'video', icon: 'audio-lines', module: 'audio.js', preset: { from: 'OGG', options: { to: 'mp3' } }, summary: 'Turn OGG audio into MP3 files that play on any device.' },
  { slug: 'aac-to-mp3', name: 'AAC to MP3', cat: 'video', icon: 'audio-lines', module: 'audio.js', preset: { from: 'AAC', options: { to: 'mp3' } }, summary: 'Turn AAC audio into MP3 files that play on any device.' },
  { slug: 'm4a-to-wav', name: 'M4A to WAV', cat: 'video', icon: 'audio-lines', module: 'audio.js', preset: { from: 'M4A', options: { to: 'wav' } }, summary: 'Turn M4A audio into WAV files, ready for editing.', keywords: ['voice memo'] },

  { slug: 'add-subtitles', name: 'Add subtitles', cat: 'video', icon: 'captions', module: 'subtitles.js', summary: 'Burn an .srt subtitle file into your video, so the captions always show.', keywords: ['captions', 'srt', 'burn in', 'hardcode'] },
];
