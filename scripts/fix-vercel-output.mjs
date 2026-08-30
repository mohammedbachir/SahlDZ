import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, ".vercel", "output");
const clientDir = path.join(root, "dist", "client");
const staticDir = path.join(out, "static");

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

if (!fs.existsSync(clientDir)) {
  console.error("[vercel-output] dist/client missing — run vite build first");
  process.exit(1);
}

copyDir(clientDir, staticDir);

const configPath = path.join(out, "config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
for (const route of config.routes ?? []) {
  if (route.dest === "/__server") route.dest = "/__sahldz";
}
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

console.log("[vercel-output] static copied, config routes patched");