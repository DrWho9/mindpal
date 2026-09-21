import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".webmanifest": "application/manifest+json",
};

export function startMindpalServer(root, port = 0) {
  const base = resolve(root);
  const server = createServer((req, res) => {
    const host = req.headers.host || "127.0.0.1";
    const url = new URL(req.url || "/", `http://${host}`);
    let rel = decodeURIComponent(url.pathname);
    if (rel.startsWith("/mindpal")) rel = rel.slice("/mindpal".length) || "/";
    if (rel === "/") rel = "/index.html";
    const file = normalize(join(base, rel));
    if (!file.startsWith(base + sep) && file !== base) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    if (!existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolveServer) => {
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      resolveServer({
        server,
        port: address.port,
        origin: `http://127.0.0.1:${address.port}/mindpal/`,
        close: () =>
          new Promise((resolveClose, reject) => {
            server.close((err) => (err ? reject(err) : resolveClose()));
          }),
      });
    });
  });
}