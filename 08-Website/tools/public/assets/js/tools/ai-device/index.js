// On-device AI family (owner: tools-ai-device agent). Entry format: see public/assets/js/registry.js.
// Each tool downloads a small AI model the first time, then runs it in the browser. Nothing is uploaded.
// Preset entries reuse a module with different defaults (preset.options).
export default [
  { slug: 'remove-background', name: 'Remove background', cat: 'image', icon: 'eraser', module: 'remove-background.js', runsOn: 'model',
    summary: 'Cut out the subject of a photo and save it as a see-through PNG.',
    keywords: ['background remover', 'remove bg', 'cut out', 'transparent', 'png', 'product photo', 'erase background'] },
  { slug: 'transparent-background', name: 'Transparent background', cat: 'image', icon: 'layers', module: 'remove-background.js', runsOn: 'model',
    preset: { options: { background: 'transparent' } },
    summary: 'Make the background of a photo see-through, ready for thumbnails and logos.',
    keywords: ['transparent png', 'see-through', 'remove background', 'cut out'] },
  { slug: 'change-background', name: 'Change background colour', cat: 'image', icon: 'palette', module: 'remove-background.js', runsOn: 'model',
    preset: { options: { background: 'colour' } },
    summary: 'Swap the background of a photo for a solid colour you pick.',
    keywords: ['background colour', 'white background', 'replace background', 'headshot', 'product photo'] },
  { slug: 'blur-background', name: 'Blur background', cat: 'image', icon: 'aperture', module: 'remove-background.js', runsOn: 'model',
    preset: { options: { background: 'blur' } },
    summary: 'Blur the background behind the subject, like portrait mode on a phone.',
    keywords: ['portrait mode', 'bokeh', 'blur behind', 'focus', 'depth'] },

  { slug: 'image-to-text', name: 'Image to text', cat: 'image', icon: 'scan-text', module: 'image-to-text.js', runsOn: 'model',
    summary: 'Pull the words out of a photo, screenshot or scan, ready to copy.',
    keywords: ['ocr', 'extract text', 'copy text from image', 'screenshot to text', 'scan', 'jpg to text'] },

  { slug: 'audio-to-text', name: 'Audio to text', cat: 'video', icon: 'audio-lines', module: 'audio-to-text.js', runsOn: 'model',
    summary: 'Turn speech in an audio or video file into a transcript and .srt captions.',
    keywords: ['transcribe', 'transcription', 'speech to text', 'whisper', 'subtitles', 'srt', 'captions', 'mp3 to text'] },
  { slug: 'video-to-text', name: 'Video to text', cat: 'video', icon: 'captions', module: 'audio-to-text.js', runsOn: 'model',
    preset: { source: 'video' },
    summary: 'Get a written transcript and .srt captions from the speech in a video.',
    keywords: ['transcribe video', 'mp4 to text', 'subtitles', 'srt', 'captions', 'youtube'] },
  { slug: 'transcribe-podcast', name: 'Transcribe podcast', cat: 'video', icon: 'mic', module: 'audio-to-text.js', runsOn: 'model',
    preset: { source: 'podcast' },
    summary: 'Turn a podcast episode into a written transcript you can edit and share.',
    keywords: ['podcast transcript', 'show notes', 'episode', 'interview', 'speech to text'] },
];
