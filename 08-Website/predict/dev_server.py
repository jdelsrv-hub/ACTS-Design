"""Local preview server for the acTS text predictor.

Serves this folder (so /index.html is the app and /tests/ is the test runner) with
correct MIME types for ES modules and WebAssembly, and with caching turned off
so every reload picks up fresh files.

    python dev_server.py            # http://127.0.0.1:8790/  (tests: /tests/)
    python dev_server.py 9000       # pick another port
"""
import functools
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8790


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

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        if args and str(args[1]).startswith(("4", "5")):
            sys.stderr.write("%s %s\n" % (args[1], args[0]))


if __name__ == "__main__":
    handler = functools.partial(Handler, directory=ROOT)
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler) as httpd:
        print(f"acTS predictor preview: http://127.0.0.1:{PORT}/  (tests: /tests/)", flush=True)
        httpd.serve_forever()
