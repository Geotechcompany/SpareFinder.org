/**
 * Post-build static prerender for public marketing routes.
 * Captures fully rendered HTML (including meta tags from SEO.tsx) so crawlers
 * and non-JS clients receive real page content per URL.
 *
 * Requires VITE_CLERK_PUBLISHABLE_KEY (and other Vite env) to be available
 * during `vite build` so the preview bundle can load Clerk and render the app.
 *
 * Set SKIP_PRERENDER=1 to skip (e.g. local quick builds without Chromium).
 */

import { spawn } from "node:child_process";
import http from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import treeKill from "tree-kill";
import puppeteer from "puppeteer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const distDir = join(rootDir, "dist");

const PORT = Number(process.env.PRERENDER_PORT || 4173);
const BASE = `http://127.0.0.1:${PORT}`;

/** Public indexable routes → output path under dist/ */
const ROUTES = [
  { path: "/", file: "index.html" },
  { path: "/contact", file: "contact/index.html" },
  { path: "/reviews", file: "reviews/index.html" },
  { path: "/privacy-policy", file: "privacy-policy/index.html" },
  { path: "/terms-of-service", file: "terms-of-service/index.html" },
  { path: "/api-docs", file: "api-docs/index.html" },
  { path: "/help", file: "help/index.html" },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function httpPing(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode !== undefined && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const ok = await httpPing(`${BASE}/`);
    if (ok) return;
    await sleep(500);
  }
  throw new Error(`Preview server did not respond at ${BASE} within 120s`);
}

function startPreview() {
  const viteJs = join(rootDir, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [
      viteJs,
      "preview",
      "--host",
      "127.0.0.1",
      "--port",
      String(PORT),
      "--strictPort",
    ],
    {
      cwd: rootDir,
      env: { ...process.env, NODE_ENV: "production" },
      stdio: "inherit",
    }
  );
  child.on("error", (err) => {
    console.error("[prerender] preview spawn error:", err);
  });
  return child;
}

async function prerenderRoute(browser, routePath, outFile) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent(
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
    );

    // Use domcontentloaded, not networkidle2 — failed/retried API calls can prevent "idle" forever.
    await page.goto(`${BASE}${routePath === "/" ? "/" : routePath}`, {
      waitUntil: "domcontentloaded",
      timeout: 180_000,
    });

    // Clerk + React Strict Mode can briefly leave `data-prerender-ready` set while #root still
    // shows the auth spinner — wait until real app content is present.
    await page.waitForFunction(
      () => {
        const ready =
          document.documentElement.getAttribute("data-prerender-ready") === "1";
        const root = document.querySelector("#root");
        const text = root?.innerText ?? "";
        const pastClerkShell = !text.includes("Starting authentication");
        return ready && pastClerkShell && text.length > 400;
      },
      { timeout: 180_000 }
    );

    await sleep(400);

    const html = await page.content();
    const outPath = join(distDir, outFile);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, html, "utf8");
    console.log(`[prerender] wrote ${outFile}`);
  } finally {
    await page.close();
  }
}

async function main() {
  if (process.env.SKIP_PRERENDER === "1") {
    console.log("[prerender] SKIP_PRERENDER=1 — skipping static prerender.");
    return;
  }

  const preview = startPreview();
  try {
    await waitForServer();

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    try {
      for (const { path: routePath, file } of ROUTES) {
        await prerenderRoute(browser, routePath, file);
      }
    } finally {
      await browser.close();
    }
  } finally {
    if (preview.pid) {
      await new Promise((resolve) => {
        treeKill(preview.pid, "SIGTERM", (err) => {
          if (err) console.warn("[prerender] tree-kill:", err.message);
          resolve();
        });
      });
    }
  }
}

main().catch((err) => {
  console.error("[prerender] failed:", err);
  process.exit(1);
});
