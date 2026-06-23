/**
 * Centralized API Configuration
 * Single source of truth for all backend API URLs
 *
 * We have ONE backend: ai-analysis-crew (Python FastAPI)
 * Dev: http://localhost:8000 (or PORT from .env)
 * Production: same-origin /api proxy on sparefinder.org (Netlify _redirects)
 */

/** Direct Render/backend URL from env (used for WebSockets and server-side proxy target). */
export const DIRECT_BACKEND_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  ""
).replace(/\/$/, "");

function shouldUseSameOriginApiProxy(): boolean {
  if (typeof window === "undefined" || !import.meta.env.PROD) return false;
  const host = window.location.hostname;
  return (
    host === "sparefinder.org" ||
    host === "www.sparefinder.org" ||
    host.endsWith(".netlify.app")
  );
}

function resolveApiBaseUrl(): string {
  if (shouldUseSameOriginApiProxy()) {
    // Netlify proxies /api/* → Render (see scripts/generate-netlify-redirects.mjs)
    return window.location.origin;
  }
  return DIRECT_BACKEND_URL || "http://localhost:8000";
}

export const API_BASE_URL = resolveApiBaseUrl();

// WebSockets are not proxied by Netlify — always use the direct Render URL in production.
export const AI_CREW_WS_URL =
  import.meta.env.VITE_AI_CREW_WS_URL ||
  (DIRECT_BACKEND_URL
    ? DIRECT_BACKEND_URL.replace(/^http/, "ws")
    : API_BASE_URL.replace(/^http/, "ws"));

/** Public address for support and general inquiries (shown sitewide). */
export const CONTACT_EMAIL = "email@sparefinder.org";

// Upload Configuration
export const config = {
  upload: {
    maxFiles: 10,
    maxSizePerFile: 10 * 1024 * 1024,
  },
};

if (import.meta.env.DEV) {
  console.log("🔧 API Configuration (Single Backend - ai-analysis-crew):", {
    API_BASE_URL,
    DIRECT_BACKEND_URL: DIRECT_BACKEND_URL || "(unset)",
    AI_CREW_WS_URL,
    environment: import.meta.env.MODE,
  });
}
