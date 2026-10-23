// Rate limiter for the AI writing function (functions/api/ai.js). A separate, private Worker, because
// Cloudflare's Rate Limiting binding works in Workers but not in Pages Functions. The Pages project
// reaches it only through the AI_RATE_LIMITER service binding (wrangler.toml); it has no public URL.
// It isn't a Pages route: it has no onRequest export. Deploy: see the header of functions/api/ai.js.
//
// Answers 204 (allowed) or 429 (over the limit) for the key in the x-limit-key header (the visitor's IP).
// The limit itself is in ./wrangler.toml ([[ratelimits]]). Counts are per Cloudflare location.
export default {
  async fetch(request, env) {
    const key = request.headers.get('x-limit-key') || 'unknown';
    const { success } = await env.LIMITER.limit({ key });
    return new Response(null, { status: success ? 204 : 429 });
  },
};
