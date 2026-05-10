import React from "react";
import { WifiOff, RefreshCw, Home, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: unknown;
};

const tips = [
  "Pause ad blockers or strict privacy extensions for this domain.",
  "Try another network, or turn off VPN / corporate proxy temporarily.",
  "Hard refresh (Ctrl+Shift+R or Cmd+Shift+R), then try again.",
];

/**
 * Shown when Clerk cannot load (CDN/network) or when the error boundary catches a sync failure.
 * Renders outside the main app shell — keep Tailwind + assets self-contained.
 */
export function AuthLoadFailureFallback() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-b from-slate-50 via-[#eef1f6] to-slate-200/90 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl dark:bg-primary/25" />
        <div className="absolute -right-16 bottom-20 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl dark:bg-cyan-400/10" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/60 to-transparent dark:via-white/10" />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center gap-3 rounded-full border border-slate-200/80 bg-white/70 px-4 py-2 text-sm text-slate-600 shadow-sm ring-1 ring-slate-900/5 backdrop-blur dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:ring-white/10">
          <img
            src="/sparefinderlogo.png"
            alt="SpareFinder"
            className="h-8 w-auto object-contain"
          />
          <span className="font-medium text-slate-800 dark:text-slate-100">SpareFinder</span>
        </div>

        <Card className="w-full max-w-lg border-slate-200/90 bg-white/90 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/85 dark:shadow-black/40 dark:ring-white/10">
          <CardHeader className="space-y-4 pb-2 text-center sm:text-left">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-600 ring-1 ring-amber-500/25 dark:bg-amber-400/10 dark:text-amber-400 dark:ring-amber-400/20 sm:mx-0">
              <WifiOff className="h-7 w-7" strokeWidth={1.75} aria-hidden />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-balance text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                We couldn&apos;t reach sign-in
              </CardTitle>
              <CardDescription className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
                The authentication service is taking too long to respond. That often means something on
                the network path is blocking Clerk (VPN, firewall, or browser extensions).
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-0">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-slate-950/50">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
                Quick fixes
              </p>
              <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-200">
                {tips.map((tip) => (
                  <li key={tip} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                type="button"
                className="w-full gap-2 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 sm:w-auto dark:from-slate-100 dark:to-white dark:text-slate-900 dark:hover:from-white dark:hover:to-slate-100"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
                Reload page
              </Button>
              <Button type="button" variant="outline" className="w-full gap-2 sm:w-auto" asChild>
                <a href="/">
                  <Home className="h-4 w-4" aria-hidden />
                  Back to home
                </a>
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              If this keeps happening, try from a phone hotspot or contact your IT team — they may need
              to allowlist Clerk&apos;s domains.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export class ClerkErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown) {
    console.error("Clerk failed to initialize:", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return <AuthLoadFailureFallback />;
  }
}
