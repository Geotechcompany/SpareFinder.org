/**
 * Writes dist/_redirects so Netlify proxies /api/* and /unsubscribe/* to the
 * FastAPI backend (VITE_API_URL) before the SPA fallback.
 *
 * Without this, email tracking URLs like sparefinder.org/api/track/mclk/...
 * hit index.html and show the site 404 page.
 */

import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(rootDir, "dist");

const apiBase = (
  process.env.VITE_API_URL ||
  process.env.VITE_API_BASE_URL ||
  process.env.API_PROXY_TARGET ||
  ""
)
  .trim()
  .replace(/\/$/, "");

const lines = [];

if (apiBase) {
  lines.push("# Proxy API + marketing tracking to ai-analysis-crew (Render)");
  lines.push(`/api/*  ${apiBase}/api/:splat  200!`);
  lines.push(`/health  ${apiBase}/health  200!`);
  lines.push(`/unsubscribe/*  ${apiBase}/unsubscribe/:splat  200!`);
  lines.push("");
} else {
  console.warn(
    "[netlify redirects] VITE_API_URL is unset — /api/* will not be proxied; email tracking will 404."
  );
}

lines.push("# SPA fallback (must be last)");
lines.push("/*  /index.html  200");

await writeFile(join(distDir, "_redirects"), `${lines.join("\n")}\n`, "utf8");
console.log(
  apiBase
    ? `[netlify redirects] API proxy → ${apiBase}`
    : "[netlify redirects] wrote SPA fallback only"
);
