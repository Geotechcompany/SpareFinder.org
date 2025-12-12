import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Mail, ArrowLeft, Loader2, Shield } from "lucide-react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase/client";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRecovery, setIsRecovery] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const { toast } = useToast();

  // Parse recovery params from URL hash: #access_token=...&refresh_token=...&type=recovery
  const recoveryParams = useMemo(() => {
    const hash = window.location.hash || "";
    const params = new URLSearchParams(
      hash.startsWith("#") ? hash.slice(1) : hash
    );
    return {
      type: params.get("type"),
      access_token: params.get("access_token"),
      refresh_token: params.get("refresh_token"),
    } as {
      type: string | null;
      access_token: string | null;
      refresh_token: string | null;
    };
  }, []);

  useEffect(() => {
    const initRecoverySession = async () => {
      const hasTokens =
        !!recoveryParams.access_token && !!recoveryParams.refresh_token;
      const isRecoveryType =
        (recoveryParams.type || "").toLowerCase() === "recovery";
      if (hasTokens && isRecoveryType) {
        setIsRecovery(true);
        try {
          const { error } = await supabase.auth.setSession({
            access_token: recoveryParams.access_token!,
            refresh_token: recoveryParams.refresh_token!,
          });
          if (error) {
            toast({
              variant: "destructive",
              title: "Session error",
              description: error.message,
            });
          } else {
            setSessionReady(true);
          }
        } catch (e: any) {
          toast({
            variant: "destructive",
            title: "Session error",
            description: e?.message || "Failed to prepare reset session",
          });
        }
      }
    };
    initRecoverySession();
  }, [recoveryParams, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast({
        variant: "destructive",
        title: "Invalid email",
        description: "Please enter a valid email address",
      });
      return;
    }
    try {
      setIsSubmitting(true);
      const resp = await api.auth.resetPassword(email);
      if ((resp as any)?.error) {
        toast({
          variant: "destructive",
          title: "Reset failed",
          description: (resp as any).message || "Unable to send reset email",
        });
      } else {
        toast({
          title: "Email sent",
          description: "Check your inbox for a password reset link.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Reset failed",
        description: err?.message || "Unable to send reset email",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Must be at least 6 characters",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords do not match",
        description: "Re-enter to confirm",
      });
      return;
    }
    try {
      setIsSubmitting(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        toast({
          variant: "destructive",
          title: "Reset failed",
          description: error.message,
        });
      } else {
        toast({
          title: "Password updated",
          description: "You can now sign in with your new password",
        });
        // Clear hash to avoid reuse
        window.location.hash = "";
        // Redirect to login
        window.location.replace("/login");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Reset failed",
        description: err?.message || "Unable to update password",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen bg-gradient-to-b from-background via-[#F0F2F5] to-[#E8EBF1] text-foreground dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-50">
      {/* Left: form + chrome */}
      <div className="relative z-10 flex flex-1 flex-col gap-3 px-5 py-4 sm:px-8 lg:px-14 lg:py-6">
        {/* Subtle gradient + glow */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-24 top-32 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -right-32 bottom-10 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-400/15" />
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
        </div>

        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            to="/login"
            className="group inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <motion.span whileHover={{ x: -2 }} className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to login</span>
            </motion.span>
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full bg-card/80 px-3 py-1 text-xs text-muted-foreground ring-1 ring-border/60 backdrop-blur dark:bg-slate-900/80 dark:text-slate-200 dark:ring-white/10">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline font-medium tracking-tight">
              Secure access
            </span>
          </div>
        </div>

        {/* Form column */}
        <div className="flex flex-1 items-start lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="mx-auto w-full max-w-md"
          >
            {/* Header */}
            <div className="mb-5 space-y-3">
              <div className="inline-flex items-center rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200">
                <Shield className="mr-1.5 h-3.5 w-3.5 text-primary" />
                {isRecovery ? "Reset complete, secure your account" : "Forgot your password?"}
              </div>
              <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                {isRecovery ? "Choose a new password" : "Reset your access"}
              </h1>
              <p className="max-w-lg text-sm text-muted-foreground sm:text-base">
                {isRecovery
                  ? "Create a fresh password to keep your SpareFinder account locked down."
                  : "Enter the email you use for SpareFinder and we'll send you a secure reset link."}
              </p>
            </div>

            {/* Card */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card/90 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.65)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 sm:p-6">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

              {isRecovery ? (
                <motion.form
                  onSubmit={handleUpdatePassword}
                  className="space-y-4"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                >
                  <div className="space-y-2">
                    <Label
                      htmlFor="new-password"
                      className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400"
                    >
                      New password
                    </Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-12 rounded-xl border border-border bg-card/80 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-all focus:border-primary/70 focus:ring-2 focus:ring-primary/25 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-50 dark:placeholder:text-slate-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="confirm-password"
                      className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400"
                    >
                      Confirm password
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-12 rounded-xl border border-border bg-card/80 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-all focus:border-primary/70 focus:ring-2 focus:ring-primary/25 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-50 dark:placeholder:text-slate-500"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || (isRecovery && !sessionReady)}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-primary via-blue-500 to-cyan-400 text-sm font-semibold text-slate-950 shadow-[0_18px_45px_rgba(56,189,248,0.45)] transition-all hover:brightness-110 disabled:opacity-75"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating password…
                      </>
                    ) : (
                      <>Update password</>
                    )}
                  </Button>
                </motion.form>
              ) : (
                <motion.form
                  onSubmit={handleSubmit}
                  className="space-y-4"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                >
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400"
                    >
                      Email address
                    </Label>
                    <div className="group relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary dark:text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 rounded-xl border border-border bg-card/80 pl-11 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-all focus:border-primary/70 focus:ring-2 focus:ring-primary/25 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-50 dark:placeholder:text-slate-500"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-primary via-blue-500 to-cyan-400 text-sm font-semibold text-slate-950 shadow-[0_18px_45px_rgba(56,189,248,0.45)] transition-all hover:brightness-110 disabled:opacity-75"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending reset link…
                      </>
                    ) : (
                      <>Send reset link</>
                    )}
                  </Button>
                </motion.form>
              )}

              <div className="mt-4 text-center text-xs text-muted-foreground">
                Remembered your password?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-primary hover:underline"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right: product imagery */}
      <div className="relative hidden w-[60%] flex-col overflow-hidden border-l border-border/60 bg-muted/80 lg:flex xl:w-[62%] dark:border-white/5 dark:bg-slate-900/40">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/4489732/pexels-photo-4489732.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80"
            alt="Technician using an AI-powered platform to verify Engineering spares parts"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-slate-950 via-slate-950/75 to-transparent" />
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between p-6 xl:p-8">
          <div className="space-y-4">
            <div className="inline-flex items-center rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/15 backdrop-blur">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Account recovery, handled by AI
            </div>
            <h2 className="max-w-md text-balance text-2xl font-semibold tracking-tight text-slate-50">
              Keep your team in the system,{" "}
              <span className="text-emerald-300">even when passwords slip.</span>
            </h2>
            <p className="max-w-md text-sm text-slate-300">
              SpareFinder keeps access secure while making recovery fast for busy
              workshops and parts counters.
            </p>
          </div>

          <div className="mt-4 grid gap-4 text-xs text-slate-200 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Recovery time
              </p>
              <p className="mt-2 text-lg font-semibold text-emerald-300">&lt; 60s</p>
              <p className="mt-1 text-[11px] text-slate-400">
                average time from email to new password.
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Security
              </p>
              <p className="mt-2 text-lg font-semibold text-amber-200">Encrypted</p>
              <p className="mt-1 text-[11px] text-slate-400">
                Password updates handled via secure Supabase auth.
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Uptime
              </p>
              <p className="mt-2 text-lg font-semibold text-sky-200">24 / 7</p>
              <p className="mt-1 text-[11px] text-slate-400">
                recovery available whenever your teams are working.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
