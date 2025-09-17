import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  Server,
  Crown,
  Loader2,
} from "lucide-react";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      console.log("🔐 Checking existing admin session...");

      // Check if we have a token
      const token = localStorage.getItem("auth_token");
      if (!token) {
        console.log("🔐 No auth token found");
        setIsCheckingSession(false);
        return;
      }

      // Check if we have admin session info
      const adminSessionStr = localStorage.getItem("admin_session");
      const adminSession = adminSessionStr ? JSON.parse(adminSessionStr) : null;

      console.log("🔐 Admin Session Check:", {
        exists: !!adminSession,
        isAdminLogin: adminSession?.isAdminLogin,
        role: adminSession?.role,
      });

      if (!adminSession || !adminSession.isAdminLogin) {
        console.log("🔐 No valid admin session found");
        setIsCheckingSession(false);
        return;
      }

      // Verify the token is still valid by calling the API
      console.log("🔐 Verifying user profile...");
      const response = await api.auth.getCurrentUser();

      console.log("🔐 Profile Response:", {
        success: response.success,
        data: response.data,
      });

      if (response.success && response.data) {
        const user = response.data && typeof response.data === 'object' && 'user' in response.data 
          ? (response.data as { user: { id: string; email: string; role: string; full_name?: string } }).user 
          : null;
        console.log("🔐 User Profile:", {
          id: user.id,
          email: user.email,
          role: user.role,
        });

        // Check if user has admin role
        const hasAdminRole = ["admin", "super_admin"].includes(user.role);

        if (hasAdminRole) {
          console.log("🔐 Valid admin session found, redirecting");
          navigate("/admin/dashboard", { replace: true });
          return;
        } else {
          console.log("🔐 User does not have admin role");
          // Clear invalid session
          localStorage.removeItem("admin_session");
          localStorage.removeItem("auth_token");
          localStorage.removeItem("auth_refresh_token");
        }
      } else {
        console.log("🔐 Invalid token or profile");
        // Clear invalid session
        localStorage.removeItem("admin_session");
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_refresh_token");
      }
    } catch (err) {
      console.error("🔐 Session check error:", err);
      // Clear invalid session
      localStorage.removeItem("admin_session");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_refresh_token");
    } finally {
      setIsCheckingSession(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      console.log("🔐 Admin login attempt for:", email);
      const response = await api.auth.login({ email, password });

      if (response.success && response.user) {
        console.log("✅ Admin login successful:", response.user);

        // Verify admin role
        if (
          response.user.role !== "admin" &&
          response.user.role !== "super_admin"
        ) {
          setError("Access denied. Admin privileges required.");
          return;
        }

        // Set admin session after successful login
        const adminSession = {
          isAdminLogin: true,
          role: response.user.role,
          timestamp: Date.now(),
        };
        localStorage.setItem("admin_session", JSON.stringify(adminSession));

        toast({
          title: "Login Successful",
          description: `Welcome back, ${response.user.full_name || "Admin"}!`,
        });
        navigate("/admin/dashboard", { replace: true });
      } else {
        console.error(
          "❌ Admin login failed:",
          response.error || response.message
        );
        const backendCode = response && typeof response === 'object' && 'code' in response ? (response as { code: string }).code : undefined;
        const backendMessage =
          response && typeof response === 'object' && ('message' in response || 'error' in response)
            ? (response as { message?: string; error?: string }).message || (response as { message?: string; error?: string }).error || ""
            : "";
        const isInvalidCredentials =
          backendCode === "invalid_credentials" ||
          (/invalid/i.test(backendMessage) &&
            /(credential|password|email|login)/i.test(backendMessage));
        const message = isInvalidCredentials
          ? "Invalid email or password"
          : backendMessage || "Login failed";
        setError(message);
        toast({
          title: isInvalidCredentials ? "Invalid credentials" : "Login failed",
          description: message,
          variant: "destructive",
        });
      }
    } catch (err: unknown) {
      console.error("❌ Admin Login Error:", err);
      
      // Type guard to safely access error properties
      const isAxiosError = (error: unknown): error is { response?: { status?: number; data?: { code?: string; message?: string } }; message?: string } => {
        return typeof error === 'object' && error !== null;
      };
      
      const axiosErr = isAxiosError(err) ? err : null;
      const status = axiosErr?.response?.status;
      const backendCode = axiosErr?.response?.data?.code;
      const backendMessage = axiosErr?.response?.data?.message || axiosErr?.message || "";
      const isInvalidCredentials =
        status === 401 ||
        backendCode === "invalid_credentials" ||
        (/invalid/i.test(backendMessage) &&
          /(credential|password|email|login)/i.test(backendMessage));
      const errorMessage = isInvalidCredentials
        ? "Invalid email or password"
        : backendMessage || "An unexpected error occurred";
      setError(errorMessage);
      toast({
        title: isInvalidCredentials ? "Invalid credentials" : "Login error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking session
  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-400">Checking admin session...</p>
        </div>
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
                <Shield className="w-5 h-5 text-white" />
              </motion.div>
            </div>
          </motion.div>
          <span className="text-xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
            Admin Portal
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
                    <Shield className="w-4 h-4 text-purple-400" />
                  </motion.div>
                  <span className="text-purple-300 text-sm font-semibold">
                    Admin Access
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
                <h1 className="text-4xl font-bold text-white mb-3">
                  Admin Console
                </h1>
                <p className="text-gray-300 text-lg">
                  Restricted access for administrators only
                </p>
              </motion.div>

              {/* Error Messages */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6"
                >
                  <Alert className="bg-red-500/10 border-red-500/30 text-red-300">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}

              {/* Form */}
              <motion.form
                onSubmit={handleSubmit}
                className="space-y-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-200 font-medium">
                    Admin Email
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-4 h-5 w-5 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter admin email"
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
                    Admin Password
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-4 h-5 w-5 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter admin password"
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
                    disabled={isLoading}
                    className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 transition-all duration-300"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5 mr-2" />
                        Access Admin Console
                      </>
                    )}
                  </Button>
                </motion.div>
              </motion.form>

              {/* Security Notice */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="mt-8 p-4 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-xl border border-purple-500/20"
              >
                <div className="flex items-start space-x-3">
                  <Crown className="w-5 h-5 text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-purple-300 font-medium text-sm">
                      Security Notice
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      This is a restricted admin portal. All access attempts are
                      logged and monitored.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Footer Link */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="mt-8 text-center"
              >
                <p className="text-gray-400">
                  Need regular user access?{" "}
                  <Link
                    to="/login"
                    className="text-purple-400 hover:text-purple-300 font-semibold transition-colors duration-300"
                  >
                    User Login
                  </Link>
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminLogin;
