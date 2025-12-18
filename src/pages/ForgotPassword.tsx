import React, { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useSignIn } from "@clerk/clerk-react";
import { Shield, Loader2, Mail, Lock } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

const ForgotPassword = () => {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { isLoaded, signIn, setActive } = useSignIn();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stage, setStage] = useState<"request" | "reset">("request");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const canRequest = useMemo(() => {
    const normalized = email.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
  }, [email]);

  const canReset = useMemo(() => {
    return code.trim().length >= 4 && newPassword.trim().length >= 8;
  }, [code, newPassword]);

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      // Clerk docs: reset_password_email_code custom flow
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim().toLowerCase(),
      });
      setStage("reset");
    } catch (err: any) {
      setErrorMessage(
        err?.errors?.[0]?.longMessage ||
          err?.errors?.[0]?.message ||
          err?.message ||
          "Unable to send reset code."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code.trim(),
        password: newPassword,
      } as any);

      if (result.status === "complete") {
        await setActive?.({ session: result.createdSessionId });
        navigate("/dashboard", { replace: true });
        return;
      }

      // This UI intentionally doesn't handle 2FA / other states (per Clerk docs).
      setErrorMessage(
        "Password reset requires additional verification (e.g. 2FA). Please sign in and use “Forgot password?” or contact support."
      );
    } catch (err: any) {
      setErrorMessage(
        err?.errors?.[0]?.longMessage ||
          err?.errors?.[0]?.message ||
          err?.message ||
          "Unable to reset password."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      backHref="/login"
      backLabel="Back to login"
      logoSrc="/sparefinderlogo.png"
      badge={
        <>
          <Shield className="mr-1.5 h-3.5 w-3.5 text-primary" />
          Secure access
        </>
      }
      title="Reset your access"
      description="We’ll email you a one-time code to reset your password. (Security was recently upgraded.)"
      rightImage={{
        src: "/registerphoto.png",
        alt: "AI-powered spare parts identification visual",
      }}
      rightContent={
        <div className="space-y-4">
          <div className="inline-flex items-center rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/15 backdrop-blur">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Account recovery
          </div>
          <h2 className="max-w-md text-balance text-2xl font-semibold tracking-tight text-slate-50">
            Keep your team in the system,{" "}
            <span className="text-emerald-300">even when passwords slip.</span>
          </h2>
          <p className="max-w-md text-sm text-slate-300">
            SpareFinder keeps access secure while making recovery fast for busy workshops and parts
            counters.
          </p>
        </div>
      }
    >
      {!isLoaded ? (
        <div className="rounded-2xl border bg-card p-6">
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading…
          </div>
        </div>
      ) : stage === "request" ? (
        <form className="space-y-4" onSubmit={requestReset}>
          <div className="space-y-2">
            <label htmlFor="reset-email" className="text-sm font-medium">
              Email address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reset-email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@company.com"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              We’ll send a one-time reset code to this email.
            </p>
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-foreground">
              {errorMessage}
            </div>
          ) : null}

          <Button type="submit" disabled={!canRequest || isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending code…
              </>
            ) : (
              "Send reset code"
            )}
          </Button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={completeReset}>
          <div className="space-y-2">
            <label htmlFor="reset-code" className="text-sm font-medium">
              Reset code
            </label>
            <Input
              id="reset-code"
              inputMode="numeric"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter the code we emailed to <span className="font-medium">{email.trim()}</span>.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="new-password" className="text-sm font-medium">
              New password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                placeholder="Create a strong password"
                className="pl-9"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum 8 characters.
            </p>
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-foreground">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={!canReset || isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating…
                </>
              ) : (
                "Reset password"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => {
                setStage("request");
                setCode("");
                setNewPassword("");
                setErrorMessage(null);
              }}
            >
              Use a different email
            </Button>
          </div>
        </form>
      )}
    </AuthShell>
  );
};

export default ForgotPassword;
