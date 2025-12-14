import React from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";
import "./styles/skeleton.css"; // Skeleton animations
import "./services/keepAlive"; // Auto-start keep-alive service

// Ensure this element exists in your index.html
const rootElement = document.getElementById("root")!;

// Vite only exposes env vars prefixed with VITE_. Keep NEXT_PUBLIC_* fallback for local dev
// if you inject it via Vite define / runtime env, but the recommended key is VITE_CLERK_PUBLISHABLE_KEY.
const clerkPublishableKey =
  (import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY ||
  (import.meta as any).env?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  console.error(
    "Missing Clerk publishable key. Set VITE_CLERK_PUBLISHABLE_KEY in your frontend .env and restart the dev server."
  );
  createRoot(rootElement).render(
    <React.StrictMode>
      <div
        style={{
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial',
          padding: 24,
          maxWidth: 720,
          margin: "40px auto",
          lineHeight: 1.5,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          Missing Clerk configuration
        </h1>
        <p style={{ marginBottom: 8 }}>
          Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> in your frontend{" "}
          <code>.env</code> file and restart <code>npm run dev</code>.
        </p>
        <p style={{ marginBottom: 0, opacity: 0.8 }}>
          Example: <code>VITE_CLERK_PUBLISHABLE_KEY=pk_live_********</code>
        </p>
      </div>
    </React.StrictMode>
  );
} else {
  createRoot(rootElement).render(
    <React.StrictMode>
      <ClerkProvider
        publishableKey={clerkPublishableKey}
        signInUrl="/login"
        signUpUrl="/register"
        afterSignInUrl="/dashboard"
        // New signups should complete post-signup profile onboarding before picking a plan.
        afterSignUpUrl="/onboarding/profile"
      >
        <App />
      </ClerkProvider>
    </React.StrictMode>
  );
}