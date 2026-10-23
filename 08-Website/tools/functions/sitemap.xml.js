// GET /sitemap.xml: the home page and one URL per tool, built from the tool catalogue so it never goes stale.
// The domain comes from the request, so it works on any domain. Submit it in Google Search Console.
import pdf from '../public/assets/js/tools/pdf/index.js';
import image from '../public/assets/js/tools/image/index.js';
import media from '../public/assets/js/tools/media/index.js';
import aiDevice from '../public/assets/js/tools/ai-device/index.js';
import files from '../public/assets/js/tools/files/index.js';
import aiWriting from '../public/assets/js/tools/ai-writing/index.js';

const SLUGS = [pdf, image, media, aiDevice, files, aiWriting].flat().map((t) => t.slug);

export function onRequestGet({ request }) {
  const origin = new URL(request.url).origin;
  const urls = ['', ...SLUGS].map((slug) => `  <url><loc>${origin}/${slug}</loc></url>`);
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
