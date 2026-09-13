/**
 * Rhema AI — dev server localhost (Play Store parity preview).
 * Port default: 3000 · static www/ · no-cache headers
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WWW = path.resolve(__dirname, "../www");
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".wasm": "application/wasm",
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  const rel = decoded.replace(/^\/+/, "") || "index.html";
  const resolved = path.normalize(path.join(WWW, rel));
  if (!resolved.startsWith(WWW)) return null;
  return resolved;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    ...headers,
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const filePath = safePath(req.url || "/");
  if (!filePath) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.stat(filePath, (err, stat) => {
    let target = filePath;

    if (err || !stat.isFile()) {
      if ((req.url || "/").endsWith("/") || !path.extname(filePath)) {
        target = path.join(WWW, "index.html");
      } else {
        send(res, 404, "Not found");
        return;
      }
    }

    const ext = path.extname(target).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";

    fs.readFile(target, (readErr, data) => {
      if (readErr) {
        send(res, 404, "Not found");
        return;
      }
      send(res, 200, data, { "Content-Type": type });
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log("");
  console.log("  Rhema AI — dev localhost");
  console.log(`  http://localhost:${PORT}`);
  console.log(`  http://127.0.0.1:${PORT}`);
  console.log("  Ctrl+C untuk stop");
  console.log("");
});
