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
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-background via-[#F0F2F5] to-[#E8EBF1] text-foreground dark:bg-black">
        <div className="absolute inset-0 bg-gradient-to-br from-[#3A5AFE0F] via-transparent to-[#06B6D40F] dark:from-purple-900/20 dark:via-black dark:to-blue-900/20" />
        <Loader2 className="relative z-10 h-10 w-10 animate-spin text-primary dark:text-purple-600" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-[#F0F2F5] to-[#E8EBF1] text-foreground dark:bg-black dark:text-white">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#3A5AFE0F] via-transparent to-[#06B6D40F] dark:from-purple-900/20 dark:via-black dark:to-blue-900/20" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-[#3A5AFE14] blur-3xl animate-pulse dark:bg-purple-500/10" />
        <div
          className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-[#06B6D414] blur-3xl animate-pulse dark:bg-blue-500/10"
          style={{ animationDelay: "2s" }}
        />
        <div className="absolute top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#3A5AFE0A] to-[#06B6D40A] blur-3xl dark:from-purple-500/5 dark:to-blue-500/5" />
      </div>

      {/* Header */}
      <div className="absolute left-6 top-6 z-10">
        <Link
          to="/"
          className="group flex items-center gap-3 text-muted-foreground transition-all duration-300 hover:text-foreground dark:text-gray-400 dark:hover:text-white"
        >
          <motion.div
            whileHover={{ x: -2 }}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Home</span>
          </motion.div>
        </Link>
      </div>

      {/* Logo Header */}
      <div className="absolute right-6 top-6 z-10">
        <motion.div
          className="relative"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.3 }}
        >
          <img 
            src="/sparefinderlogo.png" 
            alt="SpareFinder Logo" 
            className="h-10 w-auto object-contain"
          />
        </motion.div>
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Auth Card */}
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl border border-border/70 bg-gradient-to-br from-white/[0.65] via-white/[0.35] to-transparent backdrop-blur-3xl shadow-soft-elevated dark:border-white/10 dark:from-white/[0.07] dark:via-white/[0.02]" />
            <div className="relative rounded-3xl border border-border bg-card/95 p-8 text-foreground shadow-soft-elevated backdrop-blur-3xl dark:border-white/10 dark:bg-gray-900/20 dark:text-white dark:shadow-purple-500/10">
              {/* Animated Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mb-8 flex justify-center"
              >
                <div className="inline-flex items-center rounded-full border border-border bg-gradient-to-r from-[#3A5AFE14] via-[#06B6D414] to-transparent px-4 py-2 text-xs font-medium text-primary shadow-soft-elevated backdrop-blur-xl dark:border-purple-500/30 dark:from-purple-600/20 dark:to-blue-600/20">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="mr-2"
                  >
                    <Sparkles className="h-4 w-4 text-primary dark:text-purple-400" />
                  </motion.div>
                  <span className="text-sm font-semibold">
                    Welcome Back
                  </span>
                </div>
              </motion.div>

              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mb-8 text-center"
              >
                <h1 className="mb-3 text-4xl font-bold text-foreground dark:text-white">
                  Sign In
                </h1>
                <p className="text-lg text-muted-foreground dark:text-gray-300">
                  Access your automotive part identification dashboard
                </p>
              </motion.div>

              {/* Form */}
              <motion.form
                onSubmit={handleLogin}
                className="space-y-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-foreground dark:text-gray-200"
                  >
                    Email Address
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-4 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary dark:text-gray-400 dark:group-focus-within:text-purple-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-14 rounded-xl border border-border bg-card pl-12 text-foreground placeholder:text-muted-foreground shadow-sm transition-all duration-300 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-purple-500/50 dark:focus:ring-purple-500/20"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-sm font-medium text-foreground dark:text-gray-200"
                  >
                    Password
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-4 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary dark:text-gray-400 dark:group-focus-within:text-purple-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-14 rounded-xl border border-border bg-card pl-12 pr-12 text-foreground placeholder:text-muted-foreground shadow-sm transition-all duration-300 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-purple-500/50 dark:focus:ring-purple-500/20"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-primary dark:text-gray-400 dark:hover:text-purple-400"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-14 w-full rounded-xl bg-gradient-to-r from-[#3A5AFE] via-[#4C5DFF] to-[#06B6D4] font-semibold text-white shadow-lg shadow-slate-500/25 transition-all duration-300 hover:from-[#324EDC] hover:via-[#3A5AFE] hover:to-[#0891B2] disabled:opacity-70 dark:from-purple-600 dark:to-blue-600 dark:hover:from-purple-700 dark:hover:to-blue-700 dark:shadow-purple-500/25"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-5 h-5 mr-2" />
                        Sign In
                      </>
                    )}
                  </Button>
                </motion.div>
              </motion.form>

              {/* Sign Up Link */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="mt-8 text-center"
              >
                <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <p className="text-sm text-muted-foreground dark:text-gray-400">
                    Don't have an account?{" "}
                    <Link
                      to="/register"
                      className="font-semibold text-primary transition-colors duration-300 hover:text-primary/80 dark:text-purple-400 dark:hover:text-purple-300"
                    >
                      Sign up
                    </Link>
                  </p>
                  <Link
                    to="/reset-password"
                    className="text-sm text-muted-foreground underline underline-offset-4 transition-colors duration-300 hover:text-foreground dark:text-gray-300 dark:hover:text-white"
                  >
                    Forgot password?
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
