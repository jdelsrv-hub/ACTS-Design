# Translate PDF

Translate the text of a PDF into English or more than 40 other languages.

- Opens at: `/translate-pdf`
- Code: `public/assets/js/tools/ai-writing/writer.js` with preset `{ template: 'translate-pdf' }`, shared by all 45 AI writing tools. Fields and task: `templates.js` in the same folder. Server: `functions/api/ai.js`.
- Runs on: our AI service (`/api/ai`, Claude Haiku 5.5). Your PDF's text is read in your browser and only that text is sent, not the file.
- Libraries: pdf.js (pdfjs-dist) 6.4.299, Apache-2.0, through `core/vendor.js`. The server calls the Claude Messages API with `fetch` (no packages).

## How to use
1. Add a PDF.
2. Choose the options you want.
3. Select **Translate my PDF**. Check the result, edit it in the box if you like, then copy it or download it as a .txt file.

## Options
- Your PDF: a PDF; its text is read in the browser (up to 5,000 characters)
- Translate to: 44 choices, such as English, Arabic, Bengali (default English)

## How it works
The browser sends only the template id and the field values to `/api/ai`. The server checks them against this template in `templates.js` (unknown tools, unknown choices and over-long text are refused), adds its own instructions and asks Claude for at most 10,000 tokens. The result comes back as plain text.

## Limits
- Needs our AI service. The local preview can't run it, so the tool says "The AI service isn't running in this preview".
- 5 requests a minute per visitor. Output is capped at 10,000 tokens; if a result hits the cap, the tool says the end may be cut off.
- AI can get facts wrong, so the tool asks people to check and edit the result.
- You get the translated text to copy or download, not a new PDF. Scanned PDFs (photos of pages) won't work, because they have no text for us to read.

## How to test
- No network: `checkFields('translate-pdf', values)` in `templates.js` returns `{ values }` or `{ error }`. `buildRequest('translate-pdf', values)` in `functions/api/ai.js` (the preview serves it at `/functions/api/ai.js`) returns the Claude request body, with `max_tokens` 10000. `handleAi(request, env, stubCallClaude)` runs the whole function; give it `env = { ANTHROPIC_API_KEY: 'test', AI_RATE_LIMITER: { limit: async () => ({ success: true }) } }`.
- UI: add a text PDF, then select **Translate my PDF**. The preview shows "The AI service isn't running in this preview". With `window.fetch` stubbed to answer `/api/ai` with `{ "text": "..." }`, the result appears in an editable box with Copy and Download.
- `readPdfText(file)` in `writer.js` returns `{ text, pages }`. A PDF with no text, a password-protected PDF or one over the limit gets a clear message, and the button stays disabled.
