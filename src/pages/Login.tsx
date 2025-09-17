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
    } catch (error: unknown) {
      console.error("Login error:", error);
      const errorMessage = error instanceof Error ? error.message : "Login failed. Please check your credentials.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Forgot password handled via dedicated page at /reset-password

  // Prevent rendering login form if already authenticated
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
        <Loader2 className="w-10 h-10 animate-spin text-purple-600 relative z-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="absolute top-6 left-6 z-10">
        <Link
          to="/"
          className="flex items-center gap-3 text-gray-400 hover:text-white transition-all duration-300 group"
        >
          <motion.div
            whileHover={{ x: -2 }}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </motion.div>
        </Link>
      </div>

      {/* Logo Header */}
      <div className="absolute top-6 right-6 z-10">
        <div className="flex items-center gap-3">
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ duration: 0.3 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-60" />
            <div className="relative w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              >
                <Zap className="w-5 h-5 text-white" />
              </motion.div>
            </div>
          </motion.div>
          <span className="text-xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
            SpareFinder
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center min-h-screen p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Glassmorphism Card */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.07] via-white/[0.02] to-transparent backdrop-blur-3xl rounded-3xl border border-white/10" />
            <div className="relative bg-gray-900/20 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl shadow-purple-500/10 p-8">
              {/* Animated Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex justify-center mb-8"
              >
                <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-full border border-purple-500/30 backdrop-blur-xl">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="mr-2"
                  >
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </motion.div>
                  <span className="text-purple-300 text-sm font-semibold">
                    Welcome Back
                  </span>
                </div>
              </motion.div>

              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-center mb-8"
              >
                <h1 className="text-4xl font-bold text-white mb-3">Sign In</h1>
                <p className="text-gray-300 text-lg">
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
                  <Label htmlFor="email" className="text-gray-200 font-medium">
                    Email Address
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-4 h-5 w-5 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 rounded-xl backdrop-blur-xl transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-gray-200 font-medium"
                  >
                    Password
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-4 h-5 w-5 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-12 pr-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 rounded-xl backdrop-blur-xl transition-all duration-300"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-4 text-gray-400 hover:text-purple-400 transition-colors"
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
                    className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 transition-all duration-300"
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
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-gray-400">
                    Don't have an account?{" "}
                    <Link
                      to="/register"
                      className="text-purple-400 hover:text-purple-300 font-semibold transition-colors duration-300"
                    >
                      Sign up
                    </Link>
                  </p>
                  <Link
                    to="/reset-password"
                    className="text-sm text-gray-300 hover:text-white underline underline-offset-4"
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
