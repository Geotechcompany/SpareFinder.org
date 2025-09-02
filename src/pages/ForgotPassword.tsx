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
    <div className="min-h-screen relative bg-gradient-to-br from-gray-950 via-black to-gray-950 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="absolute top-6 left-6 z-10">
        <Link
          to="/login"
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>
      </div>

      <div className="flex items-center justify-center min-h-screen p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.07] via-white/[0.02] to-transparent backdrop-blur-3xl rounded-3xl border border-white/10" />
            <div className="relative bg-gray-900/20 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl shadow-purple-500/10 p-8">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-center mb-8"
              >
                <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full border border-purple-500/30 backdrop-blur-xl mb-4">
                  <Shield className="w-4 h-4 text-purple-400 mr-2" />
                  <span className="text-purple-300 text-sm font-semibold">
                    {isRecovery ? "Set New Password" : "Account Security"}
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {isRecovery ? "Choose a new password" : "Reset Password"}
                </h1>
                <p className="text-gray-300">
                  {isRecovery
                    ? "Enter and confirm your new password"
                    : "Enter your email and we'll send you a reset link"}
                </p>
              </motion.div>

              {isRecovery ? (
                <motion.form
                  onSubmit={handleUpdatePassword}
                  className="space-y-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <div className="space-y-2">
                    <Label
                      htmlFor="new-password"
                      className="text-gray-200 font-medium"
                    >
                      New Password
                    </Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 rounded-xl backdrop-blur-xl transition-all duration-300"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="confirm-password"
                      className="text-gray-200 font-medium"
                    >
                      Confirm Password
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 rounded-xl backdrop-blur-xl transition-all duration-300"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || (isRecovery && !sessionReady)}
                    className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 transition-all duration-300"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Updating password...
                      </>
                    ) : (
                      <>Update password</>
                    )}
                  </Button>
                </motion.form>
              ) : (
                <motion.form
                  onSubmit={handleSubmit}
                  className="space-y-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-gray-200 font-medium"
                    >
                      Email Address
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-4 h-5 w-5 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 rounded-xl backdrop-blur-xl transition-all duration-300"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 transition-all duration-300"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Sending reset link...
                      </>
                    ) : (
                      <>Send reset link</>
                    )}
                  </Button>
                </motion.form>
              )}

              <div className="mt-6 text-center text-gray-400 text-sm">
                Remembered your password?{" "}
                <Link
                  to="/login"
                  className="text-purple-300 hover:text-purple-200"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;
