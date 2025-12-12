import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Zap,
  ArrowLeft,
  Sparkles,
  Building,
  Loader,
  AlertCircle,
  CheckCircle,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PLAN_CONFIG } from "@/lib/plans";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Register = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    password: "",
    confirmPassword: "",
  });

  // Password validation requirements
  const passwordRequirements = [
    { test: (pwd: string) => pwd.length >= 8, text: "At least 8 characters" },
    { test: (pwd: string) => /[A-Z]/.test(pwd), text: "One uppercase letter" },
    { test: (pwd: string) => /[a-z]/.test(pwd), text: "One lowercase letter" },
    { test: (pwd: string) => /\d/.test(pwd), text: "One number" },
    {
      test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
      text: "One special character (!@#$%^&*)",
    },
  ];

  const validatePassword = (password: string) => {
    return passwordRequirements.every((req) => req.test(password));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setErrors([]);

    // Form validation
    const newErrors: string[] = [];

    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.push("Please enter your full name (at least 2 characters)");
    }

    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.push("Please enter a valid email address");
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.push("Passwords do not match");
    }

    if (!validatePassword(formData.password)) {
      newErrors.push("Password does not meet security requirements");
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      const result = await signup({
        email: formData.email,
        password: formData.password,
        full_name: formData.name.trim(),
        company: formData.company.trim() || undefined,
      });

      if (result.success) {
        // Clear form data
        setFormData({
          name: "",
          email: "",
          company: "",
          password: "",
          confirmPassword: "",
        });

        // Show success message
        toast.success("Registration successful! Welcome to SpareFinder!");

        // Redirect to trial onboarding page before dashboard access
        navigate("/onboarding/trial", { replace: true });
      } else {
        setErrors([result.error || "Registration failed. Please try again."]);
      }
    } catch (error: any) {
      console.error("❌ Unexpected registration error:", error);
      setErrors(["An unexpected error occurred. Please try again."]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  return (
    <div className="relative flex min-h-screen bg-gradient-to-b from-background via-[#F0F2F5] to-[#E8EBF1] text-foreground dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-50">
      {/* Left: form + chrome */}
      <div className="relative z-10 flex flex-1 flex-col gap-3 px-5 py-2 sm:px-7 sm:py-2 lg:px-12 lg:py-4">
        {/* Subtle gradient + glow */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-24 top-32 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -right-32 bottom-10 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-400/15" />
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
        </div>

        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between">
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

        {/* Form column */}
        <div className="flex flex-1 items-start lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="mx-auto w-full max-w-md"
          >
            {/* Headline / hero copy */}
            <div className="mb-4 space-y-3">
              <div className="inline-flex items-center rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200">
                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
                Designed for Manufacturing parts teams
              </div>
              <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Create your{" "}
                <span className="bg-gradient-to-r from-primary via-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  SpareFinder
                </span>{" "}
                account
              </h1>
              <p className="max-w-lg text-sm text-muted-foreground sm:text-base">
                Start identifying parts with AI, invite your team, and keep every spare
                in one searchable workspace.
              </p>
            </div>

            {/* Auth Card */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card/90 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.6)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 sm:p-5">
              {/* Accent strip */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

              {/* Error Messages */}
              {errors.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4"
                >
                  <Alert className="border-red-500/40 bg-red-500/10 text-red-100">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-inside list-disc space-y-1 text-xs">
                        {errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}

              {/* Form */}
              <motion.form
                onSubmit={handleRegister}
                className="space-y-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
              >
                {/* Full name */}
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400"
                  >
                    Full name
                  </Label>
                  <div className="group relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary dark:text-gray-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Alex at Workshop Ltd."
                      value={formData.name}
                      onChange={(e) => updateFormData("name", e.target.value)}
                      className="h-12 rounded-xl border border-border bg-card/80 pl-11 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-all focus:border-primary/70 focus:ring-2 focus:ring-primary/25 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-50 dark:placeholder:text-slate-500"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400"
                  >
                    Work email
                  </Label>
                  <div className="group relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary dark:text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={formData.email}
                      onChange={(e) => updateFormData("email", e.target.value)}
                      className="h-12 rounded-xl border border-border bg-card/80 pl-11 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-all focus:border-primary/70 focus:ring-2 focus:ring-primary/25 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-50 dark:placeholder:text-slate-500"
                      required
                    />
                  </div>
                </div>

                {/* Company */}
                <div className="space-y-2">
                  <Label
                    htmlFor="company"
                    className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400"
                  >
                    Company (optional)
                  </Label>
                  <div className="group relative">
                    <Building className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary dark:text-gray-400" />
                    <Input
                      id="company"
                      type="text"
                      placeholder="Your garage, workshop or distributor"
                      value={formData.company}
                      onChange={(e) => updateFormData("company", e.target.value)}
                      className="h-12 rounded-xl border border-border bg-card/80 pl-11 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-all focus:border-primary/70 focus:ring-2 focus:ring-primary/25 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-50 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400"
                  >
                    Password
                  </Label>
                  <div className="group relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary dark:text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={(e) => updateFormData("password", e.target.value)}
                      className="h-12 rounded-xl border border-border bg-card/80 pl-11 pr-12 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-all focus:border-primary/70 focus:ring-2 focus:ring-primary/25 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-50 dark:placeholder:text-slate-500"
                      required
                    />
                    <motion.button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground dark:text-gray-400 dark:hover:text-white"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </motion.button>
                  </div>

                  {/* Password Requirements */}
                  {formData.password && (
                    <div className="mt-2 rounded-lg border border-border bg-muted/60 p-2.5 text-xs text-muted-foreground dark:border-white/10 dark:bg-slate-900/80">
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                        Password requirements
                      </p>
                      <div className="space-y-1">
                        {passwordRequirements.map((req, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            {req.test(formData.password) ? (
                              <CheckCircle className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <X className="h-4 w-4 text-red-400" />
                            )}
                            <span
                              className={`text-xs ${
                                req.test(formData.password)
                                  ? "text-emerald-300"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {req.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400"
                  >
                    Confirm password
                  </Label>
                  <div className="group relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary dark:text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        updateFormData("confirmPassword", e.target.value)
                      }
                      className="h-12 rounded-xl border border-border bg-card/80 pl-11 pr-12 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-all focus:border-primary/70 focus:ring-2 focus:ring-primary/25 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-50 dark:placeholder:text-slate-500"
                      required
                    />
                    <motion.button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground dark:text-gray-400 dark:hover:text-white"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </motion.button>
                  </div>

                  {/* Password Match Indicator */}
                  {formData.confirmPassword && (
                    <div className="mt-2 flex items-center space-x-2 text-xs">
                      {formData.password === formData.confirmPassword ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-emerald-400" />
                          <span className="text-emerald-300">
                            Passwords match
                          </span>
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4 text-red-400" />
                          <span className="text-red-300">
                            Passwords do not match
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Legal */}
                <div className="text-xs text-muted-foreground">
                  By creating an account, you agree to our{" "}
                  <Link
                    to="/terms-of-service"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/privacy-policy"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Privacy Policy
                  </Link>
                  .
                </div>

                {/* Submit */}
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-primary via-blue-500 to-cyan-400 text-sm font-semibold text-slate-950 shadow-[0_18px_45px_rgba(56,189,248,0.45)] transition-all hover:brightness-110 disabled:opacity-75"
                  >
                    <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.35)_0,transparent_50%),radial-gradient(circle_at_100%_100%,rgba(15,23,42,0.8)_0,transparent_55%)] opacity-70" />
                    <span className="relative flex items-center gap-2">
                      {isLoading ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin" />
                          Creating account…
                        </>
                      ) : (
                        <>Create account</>
                      )}
                    </span>
                  </Button>
                </motion.div>
              </motion.form>

              {/* Sign in link */}
              <div className="mt-4 text-center text-xs text-muted-foreground">
                Already have an account?{" "}
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

        {/* Bottom meta - hidden on smaller heights to keep page compact */}
        <div className="mt-2 hidden items-center justify-between text-[11px] text-muted-foreground xl:flex">
          <span>© {new Date().getFullYear()} SpareFinder. All rights reserved.</span>
          <div className="hidden gap-3 text-muted-foreground sm:flex">
            <span className="hidden sm:inline">Predictive AI identification</span>
            <span className="h-1 w-1 rounded-full bg-border" />
            <span>Onboard your team in minutes</span>
          </div>
        </div>
      </div>

      {/* Right: product imagery */}
      <div className="relative hidden w-[60%] flex-col overflow-hidden border-l border-border/60 bg-muted/80 lg:flex xl:w-[62%] dark:border-white/5 dark:bg-slate-900/40">
        <div className="absolute inset-0">
          <img
            src="/registerphoto.png"
            alt="AI-powered spare parts identification visual"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-slate-950/80 via-slate-950/30 to-transparent opacity-75" />
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between p-6 xl:p-8">
          <div className="space-y-4">
            <div className="inline-flex items-center rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/15 backdrop-blur">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Guided AI onboarding
            </div>
            <h2 className="max-w-md text-balance text-2xl font-semibold tracking-tight text-slate-50">
              Turn every parts photo{" "}
              <span className="text-emerald-300">into the exact match.</span>
            </h2>
            <p className="max-w-md text-sm text-slate-300">
              SpareFinder analyses workshop images, recognises key features, and
              suggests the right OEM or aftermarket spare so your team stops guessing.
            </p>
          </div>

          <div className="mt-4 grid gap-4 text-xs text-slate-200 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Setup time
              </p>
              <p className="mt-2 text-lg font-semibold text-emerald-300">&lt; 10 min</p>
              <p className="mt-1 text-[11px] text-slate-400">
                average time from first login to first identified part.
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Teams
              </p>
              <p className="mt-2 text-lg font-semibold text-sky-200">3–50+</p>
              <p className="mt-1 text-[11px] text-slate-400">
                built for growing workshops and parts distributors.
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Trial
              </p>
              <p className="mt-2 text-lg font-semibold text-amber-200">30 days</p>
              <p className="mt-1 text-[11px] text-slate-400">
                explore SpareFinder with full Starter features before you commit.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trial Modal */}
      <Dialog
        open={showTrialModal}
        onOpenChange={(open) => {
          setShowTrialModal(open);
          if (!open) {
            // If user closes modal without starting trial, send them to billing page with decline flag
            navigate("/dashboard/billing?trial_declined=true", {
              replace: true,
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-lg border-white/10 bg-gradient-to-b from-gray-900 to-black text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Start your 30-day free trial
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Enjoy full access to SpareFinder Starter for 30 days. No charge today.
              £{PLAN_CONFIG.free.price}/month after trial. Cancel anytime.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <div className="relative overflow-hidden rounded-xl border border-white/10">
              <img
                src="/favicon.svg"
                alt="Starter Trial"
                className="h-40 w-full bg-gradient-to-r from-purple-600/10 to-blue-600/10 object-contain"
              />
            </div>
            <ul className="mt-4 space-y-2 text-sm text-gray-300">
              <li>• 30-day free trial, then £{PLAN_CONFIG.free.price}/month</li>
              <li>
                • {PLAN_CONFIG.free.limits.searches} AI identifications/month
              </li>
              <li>• {PLAN_CONFIG.free.features.join(", ")}</li>
            </ul>
          </div>
          <DialogFooter className="mt-4 flex gap-3">
            <Button
              variant="secondary"
              className="bg-white/10 hover:bg-white/20"
              onClick={() => {
                setShowTrialModal(false);
                navigate("/dashboard/billing?trial_declined=true", {
                  replace: true,
                });
              }}
            >
              Maybe later
            </Button>
            <Button
              disabled={isStartingTrial}
              onClick={async () => {
                try {
                  setIsStartingTrial(true);
                  const starterPlan = PLAN_CONFIG.free;
                  const resp = (await api.billing.createCheckoutSession({
                    plan: starterPlan.name,
                    amount: starterPlan.price,
                    currency: starterPlan.currency.toUpperCase(),
                    billing_cycle: "monthly",
                    trial_days: starterPlan.trial?.days || 30,
                    success_url: `${window.location.origin}/dashboard/billing?payment_success=true`,
                    cancel_url: `${window.location.origin}/dashboard/billing?payment_cancelled=true`,
                  })) as {
                    success: boolean;
                    data?: { checkout_url?: string };
                    error?: string;
                  };
                  if (resp.success && resp.data?.checkout_url) {
                    window.location.href = resp.data.checkout_url;
                  } else {
                    setShowTrialModal(false);
                    navigate("/dashboard");
                  }
                } catch (e) {
                  setShowTrialModal(false);
                  navigate("/dashboard");
                } finally {
                  setIsStartingTrial(false);
                }
              }}
            >
              {isStartingTrial ? "Starting trial..." : "Start 30-day Free Trial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Register;
