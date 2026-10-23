# Blog post rewriter

Refresh an old blog post with clearer wording and structure.

- Opens at: `/blog-post-rewriter`
- Code: `public/assets/js/tools/ai-writing/writer.js` with preset `{ template: 'blog-post-rewriter' }`, shared by all 45 AI writing tools. Fields and task: `templates.js` in the same folder. Server: `functions/api/ai.js`.
- Runs on: our AI service (`/api/ai`, Claude Haiku 5.5). What you type is sent there.
- Libraries: none in the browser. The server calls the Claude Messages API with `fetch` (no packages).

## How to use
1. Fill in **Your blog post**.
2. Choose the options you want.
3. Select **Rewrite my post**. Check the result, edit it in the box if you like, then copy it or download it as a .txt file.

## Options
- Your blog post (required): up to 10,000 characters
- Goal: Refresh, Simplify, More engaging, Better structure (default Refresh)
- Keywords (optional): up to 200 characters

## How it works
The browser sends only the template id and the field values to `/api/ai`. The server checks them against this template in `templates.js` (unknown tools, unknown choices and over-long text are refused), adds its own instructions and asks Claude for at most 10,000 tokens. The result comes back as plain text.

## Limits
- Needs our AI service. The local preview can't run it, so the tool says "The AI service isn't running in this preview".
- 5 requests a minute per visitor. Output is capped at 10,000 tokens; if a result hits the cap, the tool says the end may be cut off.
- AI can get facts wrong, so the tool asks people to check and edit the result.
- Only rewrite writing that you own or have permission to reuse.

## How to test
- No network: `checkFields('blog-post-rewriter', values)` in `templates.js` returns `{ values }` or `{ error }`. `buildRequest('blog-post-rewriter', values)` in `functions/api/ai.js` (the preview serves it at `/functions/api/ai.js`) returns the Claude request body, with `max_tokens` 10000. `handleAi(request, env, stubCallClaude)` runs the whole function; give it `env = { ANTHROPIC_API_KEY: 'test', AI_RATE_LIMITER: { limit: async () => ({ success: true }) } }`.
- UI: fill in **Your blog post**, then select **Rewrite my post**. The preview shows "The AI service isn't running in this preview". With `window.fetch` stubbed to answer `/api/ai` with `{ "text": "..." }`, the result appears in an editable box with Copy and Download.
