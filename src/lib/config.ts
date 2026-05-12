/**
 * Centralized API Configuration
 * Single source of truth for all backend API URLs
 * 
 * We have ONE backend: ai-analysis-crew (Python FastAPI)
 * All API calls go to http://localhost:8000 (dev) or production URL
 */

// Backend API Base URL — ai-analysis-crew (Python FastAPI). VITE_API_URL must match the uvicorn port (8000 by default).
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000";

// WebSocket URL for AI Crew
export const AI_CREW_WS_URL =
  import.meta.env.VITE_AI_CREW_WS_URL ||
  API_BASE_URL.replace(/^http/, "ws");

/** Public address for support and general inquiries (shown sitewide). */
export const CONTACT_EMAIL = "email@sparefinder.org";

// Upload Configuration
export const config = {
  upload: {
    maxFiles: 10, // Maximum number of files that can be uploaded at once
    maxSizePerFile: 10 * 1024 * 1024, // 10MB per file
  },
};

// Log configuration on startup (only in development)
if (import.meta.env.DEV) {
  console.log("🔧 API Configuration (Single Backend - ai-analysis-crew):", {
    API_BASE_URL,
    AI_CREW_WS_URL,
    environment: import.meta.env.MODE,
  });
}
