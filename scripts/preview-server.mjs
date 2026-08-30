import http from "node:http";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import serverBundle from "../dist/server/server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = path.resolve(__dirname, "../dist/client");
const PORT = Number(process.env.PORT || 8090);
const HOST = process.env.HOST || "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".exe": "application/octet-stream",
  ".apk": "application/vnd.android.package-archive",
};

async function serveStatic(pathname) {
  if (pathname === "/") return null;
  const safe = path.normalize(pathname).replace(/^([/\\])+/, "");
  const file = path.resolve(CLIENT_DIR, safe);
  if (!file.startsWith(CLIENT_DIR)) return null;
  try {
    const data = await readFile(file);
    return { body: data, type: MIME[path.extname(file).toLowerCase()] || "application/octet-stream" };
  } catch {
    return null;
  }
}

const handler = serverBundle.fetch;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || `localhost:${PORT}`}`);
  const staticRes = await serveStatic(url.pathname);
  if (staticRes) {
    res.writeHead(200, { "content-type": staticRes.type });
    res.end(staticRes.body);
    return;
  }
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const request = new Request(url, {
    method: req.method,
    headers: new Headers(req.headers),
    body: hasBody ? req : undefined,
    duplex: hasBody ? "half" : undefined,
  });
  try {
    const response = await handler(request);
    const headers = Object.fromEntries(
      [...response.headers.entries()].filter(([k]) => k.toLowerCase() !== "set-cookie"),
    );
    const setCookies = response.headers.getSetCookie();
    res.writeHead(response.status, headers);
    if (setCookies.length) res.setHeader("set-cookie", setCookies);
    if (!response.body) {
      res.end();
      return;
    }
    for await (const chunk of response.body) res.write(chunk);
    res.end();
  } catch (err) {
    console.error("render error:", err);
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("500 Internal Server Error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`SahlDZ production preview: http://localhost:${PORT}`);
});