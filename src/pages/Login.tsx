import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  LogIn,
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  Zap,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        toast.success("Login successful! Welcome back!");
      } else {
        toast.error(
          result.error || "Login failed. Please check your credentials."
        );
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(
        error?.message || "Login failed. Please check your credentials."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Forgot password handled via dedicated page at /reset-password

  // Prevent rendering login form if already authenticated
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground dark:bg-slate-950 dark:text-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen bg-gradient-to-b from-background via-[#F0F2F5] to-[#E8EBF1] text-foreground dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-50">
      {/* Left: form + chrome */}
      <div className="relative z-10 flex flex-1 flex-col justify-between px-6 py-6 sm:px-10 lg:px-16 lg:py-10">
        {/* Subtle gradient + glow */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-24 top-32 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -right-32 bottom-10 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-400/15" />
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
        </div>

        {/* Top bar */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <motion.span whileHover={{ x: -2 }} className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back home</span>
            </motion.span>
          </Link>

          <motion.div
            className="inline-flex items-center gap-2 rounded-full bg-card/80 px-3 py-1 text-xs text-muted-foreground ring-1 ring-border/60 backdrop-blur dark:bg-slate-900/80 dark:text-slate-200 dark:ring-white/10"
            whileHover={{ scale: 1.03 }}
          >
            <img
              src="/sparefinderlogo.png"
              alt="SpareFinder logo"
              className="h-7 w-auto object-contain"
            />
          </motion.div>
        </div>

        {/* Centered card */}
        <div className="flex flex-1 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="w-full max-w-md mx-auto"
          >
            {/* Headline / hero copy */}
            <div className="mb-8 space-y-3">
            <div className="inline-flex items-center rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200">
                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
                Purpose-built for Engineering spares parts teams
              </div>
              <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Sign in to{" "}
                <span className="bg-gradient-to-r from-primary via-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  SpareFinder
                </span>
              </h1>
              <p className="max-w-lg text-sm text-muted-foreground sm:text-base">
                Log in to your AI-powered spare parts workspace. Upload photos,
                identify components, and keep your catalog always in sync.
              </p>
            </div>

            {/* Auth Card */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card/90 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.65)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 sm:p-7">
              {/* Accent strip */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

              <motion.form
                onSubmit={handleLogin}
                className="space-y-5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
              >
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400"
                  >
                    Email
                  </Label>
                  <div className="group relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-primary" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@workshop.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl border border-border bg-card/80 pl-11 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-all focus:border-primary/70 focus:ring-2 focus:ring-primary/25 dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-50 dark:placeholder:text-slate-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400"
                  >
                    Password
                  </Label>
                  <div className="group relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-primary" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl border border-border bg-card/80 pl-11 pr-11 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-all focus:border-primary/70 focus:ring-2 focus:ring-primary/25 dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-50 dark:placeholder:text-slate-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground dark:text-slate-500 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    24/7 secure access
                  </span>
                  <Link
                    to="/reset-password"
                    className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-primary via-blue-500 to-cyan-400 text-sm font-semibold text-slate-950 shadow-[0_18px_45px_rgba(56,189,248,0.45)] transition-all hover:brightness-110 disabled:opacity-75"
                  >
                    <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.35)_0,transparent_50%),radial-gradient(circle_at_100%_100%,rgba(15,23,42,0.8)_0,transparent_55%)] opacity-70" />
                    <span className="relative flex items-center gap-2">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Signing in…
                        </>
                      ) : (
                        <>
                          <LogIn className="h-4 w-4" />
                          Sign in
                        </>
                      )}
                    </span>
                  </Button>
                </motion.div>
              </motion.form>

              {/* Footnote */}
              <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                <p>
                  No account?{" "}
                  <Link
                    to="/register"
                    className="font-semibold text-foreground hover:text-primary"
                  >
                    Create one in seconds
                  </Link>
                </p>
                <div className="hidden items-center gap-1 text-muted-foreground sm:flex dark:text-slate-300">
                  <Zap className="h-3.5 w-3.5 text-amber-300" />
                  <span>AI-assisted part matching</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom meta */}
        <div className="mt-8 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>© {new Date().getFullYear()} SpareFinder. All rights reserved.</span>
          <div className="hidden gap-3 text-muted-foreground sm:flex">
            <span className="hidden sm:inline">ISO-grade security</span>
            <span className="h-1 w-1 rounded-full bg-border" />
            <span>Optimized for Engineering spares teams</span>
          </div>
        </div>
      </div>

      {/* Right: product imagery */}
      <div className="relative hidden w-[60%] flex-col overflow-hidden border-l border-border/60 bg-muted/80 lg:flex xl:w-[62%] dark:border-white/5 dark:bg-slate-900/40">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/4489732/pexels-photo-4489732.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80"
            alt="Technician using an AI-powered platform to identify Engineering spares parts"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-slate-950 via-slate-950/80 to-transparent opacity-90" />
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between p-8 xl:p-10">
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
              SpareFinder ingests workshop photos, matches OEM references, and
              keeps your team aligned on the exact part every single time.
            </p>
          </div>

          <div className="mt-8 grid gap-4 text-xs text-slate-200 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Accuracy
              </p>
              <p className="mt-2 text-lg font-semibold text-emerald-300">98.4%</p>
              <p className="mt-1 text-[11px] text-slate-400">
                average visual match rate across live customers.
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Time saved
              </p>
              <p className="mt-2 text-lg font-semibold text-amber-200">6.3×</p>
              <p className="mt-1 text-[11px] text-slate-400">
                faster part identification vs. manual catalogs.
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Teams
              </p>
              <p className="mt-2 text-lg font-semibold text-sky-200">40+</p>
              <p className="mt-1 text-[11px] text-slate-400">
                workshops and distributors trust SpareFinder daily.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
