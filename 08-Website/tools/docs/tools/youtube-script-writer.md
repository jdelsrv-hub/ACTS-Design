# YouTube script writer

Plan a YouTube video script with a hook, sections and a call to action.

- Opens at: `/youtube-script-writer`
- Code: `public/assets/js/tools/ai-writing/writer.js` with preset `{ template: 'youtube-script-writer' }`, shared by all 45 AI writing tools. Fields and task: `templates.js` in the same folder. Server: `functions/api/ai.js`.
- Runs on: our AI service (`/api/ai`, Claude Haiku 5.5). What you type is sent there.
- Libraries: none in the browser. The server calls the Claude Messages API with `fetch` (no packages).

## How to use
1. Fill in **Video topic**.
2. Choose the options you want.
3. Select **Write my script**. Check the result, edit it in the box if you like, then copy it or download it as a .txt file.

## Options
- Video topic (required): up to 600 characters
- Audience (optional): up to 150 characters
- Tone: Friendly, Professional, Casual, Confident, Playful, Inspiring, Formal (default Friendly)
- Video length: 2 minutes, 5 minutes, 10 minutes (default 5 minutes)

## How it works
The browser sends only the template id and the field values to `/api/ai`. The server checks them against this template in `templates.js` (unknown tools, unknown choices and over-long text are refused), adds its own instructions and asks Claude for at most 6,000 tokens. The result comes back as plain text.

## Limits
- Needs our AI service. The local preview can't run it, so the tool says "The AI service isn't running in this preview".
- 5 requests a minute per visitor. Output is capped at 6,000 tokens; if a result hits the cap, the tool says the end may be cut off.
- AI can get facts wrong, so the tool asks people to check and edit the result.

## How to test
- No network: `checkFields('youtube-script-writer', values)` in `templates.js` returns `{ values }` or `{ error }`. `buildRequest('youtube-script-writer', values)` in `functions/api/ai.js` (the preview serves it at `/functions/api/ai.js`) returns the Claude request body, with `max_tokens` 6000. `handleAi(request, env, stubCallClaude)` runs the whole function; give it `env = { ANTHROPIC_API_KEY: 'test', AI_RATE_LIMITER: { limit: async () => ({ success: true }) } }`.
- UI: fill in **Video topic**, then select **Write my script**. The preview shows "The AI service isn't running in this preview". With `window.fetch` stubbed to answer `/api/ai` with `{ "text": "..." }`, the result appears in an editable box with Copy and Download.
