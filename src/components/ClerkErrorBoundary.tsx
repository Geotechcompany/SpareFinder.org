import React from "react";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: unknown;
};

export class ClerkErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown) {
    // Keep details in console for debugging, but don't block the entire app with a blank screen.
    console.error("Clerk failed to initialize:", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial',
          padding: 24,
          maxWidth: 760,
          margin: "40px auto",
          lineHeight: 1.5,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          Authentication failed to load
        </h1>
        <p style={{ marginBottom: 12, opacity: 0.9 }}>
          The authentication service is taking too long to load. This is usually
          caused by a network block (VPN/firewall), browser extensions (ad
          blockers), or temporary connectivity issues.
        </p>
        <ul style={{ marginBottom: 12, paddingLeft: 18, opacity: 0.9 }}>
          <li>Disable ad blockers / privacy extensions for this site</li>
          <li>Try a different network (or disable VPN/proxy)</li>
          <li>Hard refresh the page</li>
        </ul>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: "#111827",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "10px 14px",
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}




