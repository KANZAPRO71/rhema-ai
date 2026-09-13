/**
 * Download the live localhost preview into _extract_localhost.
 * Starts at / (same as http://127.0.0.1:3000/#home).
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "_extract_localhost");
const BASE = process.env.EXTRACT_BASE || "http://127.0.0.1:3000";
const WWW = path.join(ROOT, "www");

const IMPORT_RE =
  /(?:from|import)\s*["'](\.\/[^"']+|\/[^"']+)["']|href=["']([^"'#?]+)["']|src=["']([^"'#?]+)["']|url\(["']?([^"')]+)["']?\)/g;

function toLocal(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  const rel = clean.replace(/^\/+/, "") || "index.html";
  return path.normalize(rel).replace(/^(\.\.[/\\])+/, "");
}

function fetchBuf(urlPath) {
  const url = `${BASE}${urlPath.startsWith("/") ? urlPath : `/${urlPath}`}`;
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks), type: res.headers["content-type"] || "" });
        });
      })
      .on("error", reject);
  });
}

function collectRefs(text, fromPath) {
  const out = new Set();
  const dir = path.posix.dirname(fromPath.replace(/\\/g, "/"));
  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(text))) {
    const raw = m[1] || m[2] || m[3] || m[4];
    if (!raw || raw.startsWith("http") || raw.startsWith("data:") || raw.startsWith("blob:")) continue;
    let next = raw.split("?")[0].split("#")[0];
    if (next.startsWith("./") || next.startsWith("../")) {
      next = path.posix.normalize(`${dir}/${next}`);
    }
    if (!next.startsWith("/")) next = `/${next}`;
    out.add(next);
  }
  return out;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const queue = ["/", "/index.html", "/main.js", "/manifest.webmanifest"];
  const seen = new Set();
  let saved = 0;
  let failed = 0;

  while (queue.length) {
    const item = queue.shift();
    const key = item.split("?")[0];
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      const { status, body, type } = await fetchBuf(key === "/" ? "/" : key);
      if (status !== 200 || !body.length) {
        failed += 1;
        continue;
      }
      let rel = toLocal(key === "/" ? "/index.html" : key);
      if (rel.endsWith(path.sep) || rel === ".") rel = "index.html";
      const dest = path.join(OUT, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, body);
      saved += 1;
      const textish = /html|javascript|css|json|svg|xml|text/i.test(type) || /\.(js|css|html|svg|json|webmanifest)$/i.test(rel);
      if (textish) {
        const from = `/${rel.replace(/\\/g, "/")}`;
        for (const ref of collectRefs(body.toString("utf8"), from)) queue.push(ref);
      }
    } catch {
      failed += 1;
    }
  }

  // Also copy offline data packs the home screen loads dynamically (not all linked in HTML).
  const extraDirs = ["data", "icons", "vendor"];
  let copied = 0;
  for (const dir of extraDirs) {
    const src = path.join(WWW, dir);
    if (!fs.existsSync(src)) continue;
    const walk = (d, prefix) => {
      for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
        const s = path.join(d, ent.name);
        const rel = path.join(prefix, ent.name);
        if (ent.isDirectory()) walk(s, rel);
        else {
          const dest = path.join(OUT, rel);
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.copyFileSync(s, dest);
          copied += 1;
        }
      }
    };
    walk(src, dir);
  }

  const total = (fs.readdirSync(OUT, { recursive: true, withFileTypes: true }) || []).filter((e) => e.isFile?.() || e.isFile === undefined).length;
  console.log(`extract ${BASE} -> ${OUT}`);
  console.log(`http saved=${saved} http missed=${failed} data copied=${copied}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
