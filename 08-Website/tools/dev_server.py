"""Local preview server for the acTS tools site.

Serves this folder (so /public/ is the site and /tests/ is the test runner) with
correct MIME types for ES modules and WebAssembly, and with caching turned off
so every reload picks up fresh files.

    python dev_server.py            # http://127.0.0.1:8787/public/
    python dev_server.py 9000       # pick another port
"""
import functools
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8787


class Handler(http.server.SimpleHTTPRequestHandler):
    # Windows can map .js to text/plain through the registry, which breaks
    # ES modules, so the important types are pinned here.
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".mjs": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".wasm": "application/wasm",
        ".svg": "image/svg+xml",
        ".xml": "application/xml; charset=utf-8",
        ".txt": "text/plain; charset=utf-8",
        ".md": "text/markdown; charset=utf-8",
        ".webmanifest": "application/manifest+json",
    }

    def translate_path(self, path):
        # Like Cloudflare Pages: a page path that isn't a file (say /public/merge-pdf) gets the site's
        # index.html, and app.js opens the tool. Missing files with an extension still 404.
        full = super().translate_path(path)
        site = os.path.join(ROOT, "public")
        if full.startswith(site) and not os.path.exists(full) and not os.path.splitext(full)[1]:
            return os.path.join(site, "index.html")
        return full

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        if args and str(args[1]).startswith(("4", "5")):
            sys.stderr.write("%s %s\n" % (args[1], args[0]))


if __name__ == "__main__":
    handler = functools.partial(Handler, directory=ROOT)
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler) as httpd:
        print(f"acTS tools preview: http://127.0.0.1:{PORT}/public/", flush=True)
        httpd.serve_forever()
