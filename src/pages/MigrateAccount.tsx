import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles, Loader2, ArrowRight, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const normalizeEmail = (raw: string) => raw.trim().toLowerCase();

const isValidEmail = (raw: string) => {
  const email = normalizeEmail(raw);
  // intentionally simple: just enough to prevent obvious typos
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const MigrateAccount: React.FC = () => {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialEmail = useMemo(() => searchParams.get("email") || "", [searchParams]);

  const [email, setEmail] = useState(initialEmail);
  const [isChecking, setIsChecking] = useState(false);
  const [needsMigration, setNeedsMigration] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Keep input in sync if the URL changes (e.g. user shares /migrate?email=...)
  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  const checkStatus = useCallback(
    async (rawEmail: string) => {
      const normalizedEmail = normalizeEmail(rawEmail);

      if (!isValidEmail(normalizedEmail)) {
        setNeedsMigration(null);
        setErrorMessage("Enter a valid email address to check migration status.");
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsChecking(true);
      setErrorMessage(null);
      setNeedsMigration(null);

      try {
        const resp = await apiClient.get("/auth/migration-status", {
          params: { email: normalizedEmail },
          signal: controller.signal,
        });

        const payload = resp.data as any;
        const isSuccess = payload?.success !== false;
        if (!isSuccess) {
          throw new Error(payload?.message || payload?.error || "Failed to check migration status");
        }

        const nextNeedsMigration = Boolean(
          payload?.needs_migration ?? payload?.data?.needs_migration
        );
        setNeedsMigration(nextNeedsMigration);
        setErrorMessage(null);
      } catch (err: any) {
        // Abort is expected during rapid typing or navigation.
        if (err instanceof DOMException && err.name === "AbortError") return;

        // Some axios errors still include a usable response payload.
        const fallbackNeeds = err?.response?.data?.needs_migration;
        if (typeof fallbackNeeds === "boolean") {
          setNeedsMigration(fallbackNeeds);
          setErrorMessage(null);
          return;
        }

        setErrorMessage(
          "We couldn’t confirm your migration status right now. You can still continue and we’ll link your profile after sign up."
        );
        // Fail-open UX: allow continuing to sign up even if the check fails.
        setNeedsMigration(true);
      } finally {
        setIsChecking(false);
      }
    },
    [setNeedsMigration]
  );

  // Auto-check when arriving from Login → /migrate?email=...
  useEffect(() => {
    const fromUrl = searchParams.get("email");
    if (!fromUrl) return;
    void checkStatus(fromUrl);
    return () => abortRef.current?.abort();
  }, [checkStatus, searchParams]);

  if (!authLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const normalizedEmail = normalizeEmail(email);
  const canContinue = isValidEmail(normalizedEmail) && (needsMigration ?? true);

  return (
    <AuthShell
      backHref="/login"
      backLabel="Back to sign in"
      logoSrc="/sparefinderlogo.png"
      badge={
        <>
          <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
          Account migration
        </>
      }
      title={
        <>
          Link your existing{" "}
          <span className="bg-gradient-to-r from-primary via-blue-400 to-cyan-300 bg-clip-text text-transparent">
            SpareFinder
          </span>{" "}
          profile
        </>
      }
      description="We upgraded sign-in. If you previously had a SpareFinder account, we’ll help you create a new sign-in and link your history automatically."
      rightImage={{
        src: "https://images.pexels.com/photos/4489732/pexels-photo-4489732.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80",
        alt: "Technician reviewing parts inventory",
      }}
      rightContent={
        <div className="space-y-4">
          <div className="inline-flex items-center rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/15 backdrop-blur">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Secure profile linking
          </div>
          <h2 className="max-w-md text-balance text-2xl font-semibold tracking-tight text-slate-50">
            Keep your uploads, history, and billing{" "}
            <span className="text-emerald-300">without starting over.</span>
          </h2>
          <p className="max-w-md text-sm text-slate-300">
            Use the same email address you used before. After sign up, SpareFinder links your previous
            profile data automatically.
          </p>
        </div>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const nextEmail = normalizeEmail(email);
          setSearchParams(nextEmail ? { email: nextEmail } : {});
          void checkStatus(nextEmail);
        }}
      >
        <div className="space-y-2">
          <label htmlFor="migrate-email" className="text-sm font-medium">
            Email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="migrate-email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@company.com"
              className="pl-9"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Use the email from your previous SpareFinder account.
          </p>
        </div>

        {needsMigration === true && !errorMessage ? (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-foreground">
            <p className="font-semibold">We found an existing account for this email</p>
            <p className="mt-1 text-xs text-muted-foreground">
              We recently upgraded sign-in security. Continue to create your new sign-in and we’ll link your
              existing SpareFinder profile automatically.
            </p>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-foreground">
            {errorMessage}
          </div>
        ) : null}

        {needsMigration === false ? (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-foreground">
            This email doesn’t require migration. You can sign in normally.
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <Button type="submit" variant="outline" disabled={isChecking}>
            {isChecking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking…
              </>
            ) : (
              "Check migration status"
            )}
          </Button>

          <Button
            type="button"
            disabled={!canContinue || isChecking}
            onClick={() => {
              const nextEmail = normalizeEmail(email);
              navigate(`/register?migrate=1&email=${encodeURIComponent(nextEmail)}`);
            }}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            Continue to create sign-in
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="pt-2 text-center text-xs text-muted-foreground">
          Already migrated?{" "}
          <button
            type="button"
            className="font-semibold text-foreground hover:text-primary"
            onClick={() => navigate("/login")}
          >
            Sign in
          </button>
        </div>
      </form>
    </AuthShell>
  );
};

