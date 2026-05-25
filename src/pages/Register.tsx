import React, { useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { SignUp } from "@clerk/clerk-react";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthShell } from "@/components/auth/auth-shell";
import { authClerkAppearance } from "@/components/auth/clerk-appearance";
import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { PLAN_CONFIG } from "@/lib/plans";
import {
  buildProfileThenTrialPath,
  getPendingPlan,
  planParamToTier,
  profileLocationWithTrialNext,
  savePendingPlan,
  trialLocationForTier,
} from "@/lib/pending-plan";

const PENDING_REFERRAL_KEY = "sparefinder_pending_referral";

const Register = () => {
  const { isLoading, isAuthenticated, user } = useAuth();
  const [searchParams] = useSearchParams();
  const isMigrate = searchParams.get("migrate") === "1";
  const migrateEmail = searchParams.get("email");
  const nextPath = searchParams.get("next");
  const planParam = searchParams.get("plan");

  const selectedTier = useMemo(
    () => planParamToTier(planParam) ?? getPendingPlan()?.tier ?? null,
    [planParam]
  );

  useEffect(() => {
    const tier = planParamToTier(planParam);
    if (!tier) return;
    savePendingPlan({
      tier,
      planName: PLAN_CONFIG[tier].name,
    });
  }, [planParam]);

  const postSignupUrl = useMemo(() => {
    if (nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")) {
      return nextPath;
    }
    if (selectedTier) {
      return buildProfileThenTrialPath(selectedTier);
    }
    return "/onboarding/profile";
  }, [nextPath, selectedTier]);

  const selectedPlanLabel = selectedTier ? PLAN_CONFIG[selectedTier].name : null;

  // Capture invite ref from URL so we can apply after signup
  const ref = searchParams.get("ref");
  if (ref && typeof ref === "string" && ref.trim()) {
    try {
      sessionStorage.setItem(PENDING_REFERRAL_KEY, ref.trim());
    } catch {
      /* ignore */
    }
  }

  // Already signed in (e.g. returned from landing): skip Clerk UI, continue onboarding chain.
  if (!isLoading && isAuthenticated) {
    const profileIncomplete = !user?.company?.trim();
    if (profileIncomplete && selectedTier) {
      return (
        <Navigate
          to={profileLocationWithTrialNext(selectedTier)}
          replace
        />
      );
    }
    if (profileIncomplete) {
      return <Navigate to={postSignupUrl} replace />;
    }
    if (selectedTier) {
      return <Navigate to={trialLocationForTier(selectedTier)} replace />;
    }
    return <Navigate to={postSignupUrl} replace />;
  }

  return (
    <AuthShell
      backHref="/"
      backLabel="Back home"
      logoSrc="/sparefinderlogo.png"
      badge={
        <>
          <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
          Designed for Engineering spares parts teams
        </>
      }
      title={
        <>
          Create your{" "}
          <span className="bg-gradient-to-r from-primary via-blue-400 to-cyan-300 bg-clip-text text-transparent">
            SpareFinder
          </span>{" "}
          account
        </>
      }
      description="Start identifying parts with AI, invite your team, and keep every spare in one searchable workspace."
      rightImage={{
        src: "/registerphoto.png",
        alt: "AI-powered spare parts identification visual",
      }}
      rightContent={
        <div className="space-y-4">
          <div className="inline-flex items-center rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/15 backdrop-blur">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Guided onboarding
          </div>
          <h2 className="max-w-md text-balance text-2xl font-semibold tracking-tight text-slate-50">
            Turn every parts photo{" "}
            <span className="text-emerald-300">into the exact match.</span>
          </h2>
          <p className="max-w-md text-sm text-slate-300">
            SpareFinder analyses workshop images, recognises key features, and suggests the right OEM or
            aftermarket spare so your team stops guessing.
          </p>
        </div>
      }
    >
      {selectedPlanLabel ? (
        <div className="mb-4 rounded-2xl border border-brand/25 bg-gradient-to-r from-brand/10 via-violet-500/5 to-cyan-500/5 p-4 text-sm text-foreground">
          <p className="font-semibold text-brand dark:text-brand-light">Plan selected</p>
          <p className="mt-1 text-muted-foreground">
            After you create your account, we&apos;ll take you to activate{" "}
            <span className="font-semibold text-foreground">{selectedPlanLabel}</span>.
          </p>
        </div>
      ) : null}
      {isMigrate ? (
        <div className="mb-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-foreground">
          <p className="font-semibold">Linking your existing account</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sign up using <span className="font-semibold text-foreground">{migrateEmail || "your existing email"}</span>.
            After sign up, SpareFinder will automatically link your previous profile and history.
          </p>
        </div>
      ) : null}
      <SignUp
        routing="path"
        path="/register"
        signInUrl="/login"
        forceRedirectUrl={postSignupUrl}
        appearance={authClerkAppearance as any}
      />
      <div className="mt-5 text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link
          to={
            nextPath
              ? `/login?next=${encodeURIComponent(nextPath)}${migrateEmail ? `&email=${encodeURIComponent(migrateEmail)}` : ""}`
              : "/login"
          }
          className="font-semibold text-foreground hover:text-primary"
        >
          Sign in
        </Link>
      </div>
    </AuthShell>
  );
};

export default Register;
