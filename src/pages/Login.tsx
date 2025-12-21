import React, { useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useClerk, useSignIn } from "@clerk/clerk-react";
import { Sparkles, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthShell } from "@/components/auth/auth-shell";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api";

type LoginStep =
  | "credentials"
  | "email_code"
  | "second_factor_email_code"
  | "phone_code"
  | "totp"
  | "backup_code";

type ClerkSignInResource = NonNullable<ReturnType<typeof useSignIn>["signIn"]>;
type ClerkRedirectStrategy = Parameters<
  ClerkSignInResource["authenticateWithRedirect"]
>[0]["strategy"];
type OAuthStrategy = Extract<ClerkRedirectStrategy, `oauth_${string}`>;

const Login = () => {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoaded, signIn, setActive } = useSignIn();
  const clerk = useClerk();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginStep, setLoginStep] = useState<LoginStep>("credentials");
  const [verificationCode, setVerificationCode] = useState("");
  const [emailAddressId, setEmailAddressId] = useState<string | null>(null);
  const [secondFactorEmailAddressId, setSecondFactorEmailAddressId] = useState<string | null>(null);
  const [secondFactorPhoneNumberId, setSecondFactorPhoneNumberId] = useState<string | null>(null);
  const [secondFactorSafeIdentifier, setSecondFactorSafeIdentifier] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const redirectTo = useMemo(
    () => (location.state as any)?.from?.pathname || "/dashboard",
    [location.state]
  );

    if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const oauthStrategies = useMemo(() => {
    if (!isLoaded || !signIn) return [] as OAuthStrategy[];
    const supported = ((signIn as any).supportedFirstFactors || []) as Array<{
      strategy?: string;
    }>;
    const fromSignIn = supported
      .map((f) => f?.strategy)
      .filter(
        (s): s is string => typeof s === "string" && s.startsWith("oauth_")
      );

    // Only show OAuth providers that Clerk explicitly reports as supported.
    // This keeps the UI in sync with the Clerk Dashboard (e.g. when disabling Google).
    return Array.from(new Set(fromSignIn)) as OAuthStrategy[];
  }, [isLoaded, signIn]);

  const formatStrategyLabel = (strategy: OAuthStrategy) => {
    const raw = strategy.replace(/^oauth_/, "");
    return raw
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  const completeSignIn = async ({ createdSessionId }: { createdSessionId: string | null }) => {
    if (!createdSessionId) {
      setErrorMessage("Unable to start a session. Please try again.");
      return;
    }
    await setActive({ session: createdSessionId });
    navigate(redirectTo, { replace: true });
  };

  const getClerkError = (err: any) => {
    const clerkCode = err?.errors?.[0]?.code as string | undefined;
    const clerkMsg = err?.errors?.[0]?.message as string | undefined;
    const paramName = err?.errors?.[0]?.meta?.param_name as string | undefined;
    return { clerkCode, clerkMsg, paramName };
  };

  const handleOauth = async (strategy: OAuthStrategy) => {
    if (!isLoaded || !signIn) return;
    setErrorMessage(null);
    setInfoMessage(null);
    try {
    await signIn.authenticateWithRedirect({
      strategy,
      redirectUrl: "/login/sso-callback",
      redirectUrlComplete: redirectTo,
    });
    } catch (err: any) {
      const { clerkCode, clerkMsg, paramName } = getClerkError(err);
      if (clerkCode === "form_param_value_invalid" && paramName === "strategy") {
        const providerLabel = formatStrategyLabel(strategy);
        setErrorMessage(
          `${providerLabel} sign-in is not enabled for this Clerk environment. Enable it in Clerk Dashboard → User & Authentication → Social Connections (production instance), or update your VITE_CLERK_PUBLISHABLE_KEY to the correct pk_live key.`
        );
        return;
      }
      setErrorMessage(clerkMsg || "Unable to start OAuth sign-in. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    const normalizedEmail = email.trim().toLowerCase();
    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      // Use the canonical multi-step flow so we can handle MFA / email-code states properly.
      await signIn.create({ identifier: normalizedEmail });
      const result = await signIn.attemptFirstFactor({ strategy: "password", password });

      if (result.status === "complete") {
        await completeSignIn({ createdSessionId: result.createdSessionId });
        return;
      }

      if (result.status === "needs_second_factor") {
        const supportedSecondFactors = (result as any)?.supportedSecondFactors as
          | Array<{ strategy: string }>
          | undefined;
        const totpFactor = supportedSecondFactors?.find((f) => f.strategy === "totp");
        const backupFactor = supportedSecondFactors?.find((f) => f.strategy === "backup_code");
        const phoneFactor = supportedSecondFactors?.find((f) => f.strategy === "phone_code") as
          | { strategy: "phone_code"; phoneNumberId?: string; safeIdentifier?: string }
          | undefined;
        const emailCodeFactor = supportedSecondFactors?.find((f) => f.strategy === "email_code") as
          | { strategy: "email_code"; emailAddressId?: string; safeIdentifier?: string }
          | undefined;
        const emailLinkFactor = supportedSecondFactors?.find((f) => f.strategy === "email_link") as
          | { strategy: "email_link"; emailAddressId?: string; safeIdentifier?: string }
          | undefined;

        if (totpFactor) {
          setLoginStep("totp");
          setInfoMessage("Enter the 6-digit code from your authenticator app to finish signing in.");
          return;
        }
        if (phoneFactor) {
          setSecondFactorPhoneNumberId(phoneFactor.phoneNumberId ?? null);
          setSecondFactorSafeIdentifier(phoneFactor.safeIdentifier ?? null);
          await (signIn as any).prepareSecondFactor({
            strategy: "phone_code",
            phoneNumberId: phoneFactor.phoneNumberId,
          });
          setLoginStep("phone_code");
          setInfoMessage(
            `We sent a verification code to ${phoneFactor.safeIdentifier || "your phone"}. Enter it below to finish signing in.`
          );
          return;
        }
        if (emailCodeFactor) {
          setSecondFactorEmailAddressId(emailCodeFactor.emailAddressId ?? null);
          setSecondFactorSafeIdentifier(emailCodeFactor.safeIdentifier ?? null);
          await (signIn as any).prepareSecondFactor({
            strategy: "email_code",
            emailAddressId: emailCodeFactor.emailAddressId,
          });
          setLoginStep("second_factor_email_code");
          setInfoMessage(
            `We sent a verification code to ${emailCodeFactor.safeIdentifier || "your email"}. Enter it below to finish signing in.`
          );
          return;
        }
        if (backupFactor) {
          setLoginStep("backup_code");
          setInfoMessage("Enter a backup code to finish signing in.");
          return;
        }
        if (emailLinkFactor) {
          setErrorMessage("This account requires an email-link verification step. Please use the email link to finish signing in.");
          return;
        }

        const available = supportedSecondFactors?.map((f) => f.strategy).filter(Boolean).join(", ");
        setErrorMessage(
          available
            ? `Your account requires an additional sign-in step (${available}) that isn't supported here yet.`
            : "Your account requires an additional sign-in step that isn't supported here yet."
        );
        return;
      }

      if (result.status === "needs_first_factor") {
        const supportedFirstFactors = (result as any)?.supportedFirstFactors as
          | Array<{ strategy: string; emailAddressId?: string }>
          | undefined;
        const emailCodeFactor = supportedFirstFactors?.find((f) => f.strategy === "email_code");
        const nextEmailAddressId = emailCodeFactor?.emailAddressId ?? null;

        if (emailCodeFactor) {
          setEmailAddressId(nextEmailAddressId);
          if (nextEmailAddressId) {
            await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: nextEmailAddressId });
          } else {
            // Some Clerk setups may not expose an emailAddressId here; fall back to runtime behavior.
            await (signIn.prepareFirstFactor as any)({ strategy: "email_code" });
          }
          setLoginStep("email_code");
          setInfoMessage("We sent a verification code to your email. Enter it below to finish signing in.");
          return;
        }

        setErrorMessage("Your account requires an additional verification step. Please try another sign-in method.");
        return;
      }

      if (result.status === "needs_new_password") {
        setErrorMessage("Your account requires a password update. Please use “Forgot password?” to set a new password.");
        return;
      }

      setErrorMessage("Sign-in requires additional steps. Please try again or use another sign-in option.");
    } catch (err: any) {
      const { clerkCode, clerkMsg } = getClerkError(err);

      // If Clerk can't find the account, check if the email exists in our legacy DB
      // and redirect the user into migration automatically.
      if (clerkCode === "form_identifier_not_found" || clerkMsg?.includes("Couldn't find your account")) {
        try {
          const resp = await apiClient.get("/auth/migration-status", {
            params: { email: normalizedEmail },
          });
          const needsMigration = !!(resp.data as any)?.needs_migration;
          if (needsMigration) {
            navigate(`/migrate?email=${encodeURIComponent(normalizedEmail)}`, {
              replace: true,
            });
            return;
          }
        } catch {
          // ignore and fall back to showing error
        }
      }

      setErrorMessage(
        clerkMsg ||
          (clerkCode === "form_password_incorrect"
            ? "Incorrect password."
            : "Unable to sign in. Please try again.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    const code = verificationCode.trim();
    if (!code) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      if (loginStep === "email_code") {
        const result = await signIn.attemptFirstFactor({ strategy: "email_code", code });
        if (result.status === "complete") {
          await completeSignIn({ createdSessionId: result.createdSessionId });
          return;
        }
        setErrorMessage("Invalid code. Please try again.");
        return;
      }

      if (loginStep === "second_factor_email_code") {
        const result = await (signIn as any).attemptSecondFactor({ strategy: "email_code", code });
        if (result.status === "complete") {
          await completeSignIn({ createdSessionId: result.createdSessionId });
          return;
        }
        setErrorMessage("Invalid code. Please try again.");
        return;
      }

      if (loginStep === "phone_code") {
        const result = await (signIn as any).attemptSecondFactor({ strategy: "phone_code", code });
        if (result.status === "complete") {
          await completeSignIn({ createdSessionId: result.createdSessionId });
          return;
        }
        setErrorMessage("Invalid code. Please try again.");
        return;
      }

      if (loginStep === "totp") {
        const result = await signIn.attemptSecondFactor({ strategy: "totp", code });
        if (result.status === "complete") {
          await completeSignIn({ createdSessionId: result.createdSessionId });
          return;
        }
        setErrorMessage("Invalid authenticator code. Please try again.");
        return;
      }

      if (loginStep === "backup_code") {
        const result = await signIn.attemptSecondFactor({ strategy: "backup_code", code });
        if (result.status === "complete") {
          await completeSignIn({ createdSessionId: result.createdSessionId });
          return;
        }
        setErrorMessage("Invalid backup code. Please try again.");
        return;
      }
    } catch (err: any) {
      const { clerkMsg } = getClerkError(err);
      setErrorMessage(clerkMsg || "Unable to verify. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetToCredentials = () => {
    setLoginStep("credentials");
    setVerificationCode("");
    setEmailAddressId(null);
    setSecondFactorEmailAddressId(null);
    setSecondFactorPhoneNumberId(null);
    setSecondFactorSafeIdentifier(null);
    setInfoMessage(null);
    setErrorMessage(null);
  };

  return (
    <AuthShell
      backHref="/"
      backLabel="Back home"
      logoSrc="/sparefinderlogo.png"
      badge={
        <>
                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
          Purpose-built for Engineering spares parts teams
        </>
      }
      title={
        <>
                Sign in to{" "}
                <span className="bg-gradient-to-r from-primary via-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  SpareFinder
                </span>
        </>
      }
      description="Log in to your AI-powered spare parts workspace. Upload photos, identify components, and keep your catalog always in sync."
      rightImage={{
        src: "/registerphoto.png",
        alt: "AI-powered spare parts identification visual",
      }}
      rightContent={
          <div className="space-y-4">
            <div className="inline-flex items-center rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/15 backdrop-blur">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live identification pipeline
            </div>
            <h2 className="max-w-md text-balance text-2xl font-semibold tracking-tight text-slate-50">
              See every part, every match,{" "}
              <span className="text-emerald-300">in one clean view.</span>
            </h2>
            <p className="max-w-md text-sm text-slate-300">
            SpareFinder ingests workshop photos, matches OEM references, and keeps your team aligned on the
            exact part every single time.
          </p>
        </div>
      }
    >
      <div className="space-y-4">
        {oauthStrategies.length ? (
          <div className="grid gap-2">
            {oauthStrategies.map((strategy) => (
              <Button
                key={strategy}
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => handleOauth(strategy)}
                disabled={!isLoaded || isSubmitting}
              >
                Continue with {formatStrategyLabel(strategy)}
              </Button>
            ))}
          </div>
        ) : null}

        {oauthStrategies.length ? (
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
        ) : null}

        {loginStep === "credentials" ? (
          <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Email address
            </label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              inputMode="email"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Password
            </label>
            <div className="relative">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={isPasswordVisible ? "text" : "password"}
                autoComplete="current-password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setIsPasswordVisible((v) => !v)}
                aria-label={isPasswordVisible ? "Hide password" : "Show password"}
              >
                {isPasswordVisible ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

            {infoMessage ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-200">
                {infoMessage}
              </div>
            ) : null}
          {errorMessage ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-300">
              {errorMessage}
        </div>
          ) : null}

          <Button
            type="submit"
            disabled={!isLoaded || isSubmitting || !email || !password}
            className="w-full bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 dark:from-slate-100 dark:to-white dark:text-slate-900 dark:hover:from-white dark:hover:to-slate-200"
          >
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-3">
            <div className="rounded-xl border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Signing in as <span className="font-medium text-foreground">{email.trim().toLowerCase()}</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {loginStep === "email_code"
                  ? "Email verification code"
                  : loginStep === "second_factor_email_code"
                    ? "Email verification code"
                    : loginStep === "phone_code"
                      ? "SMS verification code"
                      : loginStep === "totp"
                    ? "Authenticator code"
                    : "Backup code"}
              </label>
              <Input
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder={loginStep === "backup_code" ? "XXXX-XXXX" : "123456"}
                inputMode="numeric"
                autoComplete="one-time-code"
                disabled={isSubmitting}
              />
            </div>

            {infoMessage ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-200">
                {infoMessage}
              </div>
            ) : null}
            {errorMessage ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-300">
                {errorMessage}
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={resetToCredentials}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 dark:from-slate-100 dark:to-white dark:text-slate-900 dark:hover:from-white dark:hover:to-slate-200"
                disabled={!isLoaded || isSubmitting || !verificationCode.trim()}
              >
                Verify <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
        <Link
          to="/reset-password"
          className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
        >
          Forgot password?
        </Link>
        <p>
          No account?{" "}
          <Link to="/register" className="font-semibold text-foreground hover:text-primary">
            Create one
          </Link>
        </p>
    </div>
    </AuthShell>
  );
};

export default Login;
