# Paragraph completer

Finish a paragraph you've started, in the same voice.

- Opens at: `/paragraph-completer`
- Code: `public/assets/js/tools/ai-writing/writer.js` with preset `{ template: 'paragraph-completer' }`, shared by all 45 AI writing tools. Fields and task: `templates.js` in the same folder. Server: `functions/api/ai.js`.
- Runs on: our AI service (`/api/ai`, Claude Haiku 5.5). What you type is sent there.
- Libraries: none in the browser. The server calls the Claude Messages API with `fetch` (no packages).

## How to use
1. Fill in **Your paragraph so far**.
2. Choose the options you want.
3. Select **Finish my paragraph**. Check the result, edit it in the box if you like, then copy it or download it as a .txt file.

## Options
- Your paragraph so far (required): up to 3,000 characters
- How much to add: A sentence or two, A few sentences, A lot (default A few sentences)

## How it works
The browser sends only the template id and the field values to `/api/ai`. The server checks them against this template in `templates.js` (unknown tools, unknown choices and over-long text are refused), adds its own instructions and asks Claude for at most 3,000 tokens. The result comes back as plain text.

## Limits
- Needs our AI service. The local preview can't run it, so the tool says "The AI service isn't running in this preview".
- 5 requests a minute per visitor. Output is capped at 3,000 tokens; if a result hits the cap, the tool says the end may be cut off.
- AI can get facts wrong, so the tool asks people to check and edit the result.

## How to test
- No network: `checkFields('paragraph-completer', values)` in `templates.js` returns `{ values }` or `{ error }`. `buildRequest('paragraph-completer', values)` in `functions/api/ai.js` (the preview serves it at `/functions/api/ai.js`) returns the Claude request body, with `max_tokens` 3000. `handleAi(request, env, stubCallClaude)` runs the whole function; give it `env = { ANTHROPIC_API_KEY: 'test', AI_RATE_LIMITER: { limit: async () => ({ success: true }) } }`.
- UI: fill in **Your paragraph so far**, then select **Finish my paragraph**. The preview shows "The AI service isn't running in this preview". With `window.fetch` stubbed to answer `/api/ai` with `{ "text": "..." }`, the result appears in an editable box with Copy and Download.
