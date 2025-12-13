import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useClerk, useUser } from "@clerk/clerk-react";
import {
  Settings as SettingsIcon,
  Save,
  User,
  Mail,
  Phone,
  Building,
  MapPin,
  Bell,
  Shield,
  Palette,
  Zap,
  Sparkles,
  Globe,
  Lock,
  Building2,
  Briefcase,
  Menu,
  AlertCircle,
  Trash2,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import MobileSidebar from "@/components/MobileSidebar";
import { useDashboardLayout } from "@/contexts/DashboardLayoutContext";
import { PageSkeleton } from "@/components/skeletons";
import { useTheme } from "@/contexts/ThemeContext";

// Define a type for API response
interface ApiResponse {
  success?: boolean;
  data?: {
    success?: boolean;
    error?: string;
  };
  error?: string;
}

// Utility function to check if response is successful
const isSuccessResponse = (response: any): boolean => {
  // If response is null or undefined, return false
  if (!response) return false;

  // Check if response has a success property directly
  if (response.success === true) return true;

  // Check if response has a data property with success
  if (response.data && response.data.success === true) return true;

  return false;
};

// Utility function to extract error message
const getErrorMessage = (response: any): string => {
  // Check for error messages in various locations
  if (response?.error) return response.error;
  if (response?.data?.error) return response.data.error;
  if (response?.message) return response.message;
  if (response?.data?.message) return response.data.message;

  return "An unexpected error occurred";
};

const Settings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    full_name: "",
    avatar_url: "",
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    autoSave: true,
    darkMode: true,
    analytics: true,
    marketing: false,
  });

  // New state for password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmNewPassword: false,
  });

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [deleteDataPassword, setDeleteDataPassword] = useState("");
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [deleteDataError, setDeleteDataError] = useState<string | null>(null);

  const { inLayout } = useDashboardLayout();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [isLinkingProvider, setIsLinkingProvider] = useState<
    "google" | "facebook" | null
  >(null);
  const [isUnlinkingProvider, setIsUnlinkingProvider] = useState<
    "google" | "facebook" | null
  >(null);

  const { toast } = useToast();
  const { user, logout } = useAuth(); // Get Google profile data from auth context
  const { setTheme } = useTheme();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const { openSignIn } = useClerk();

  const isReverificationError = (err: any) => {
    const code = err?.errors?.[0]?.code as string | undefined;
    const msg = err?.errors?.[0]?.message as string | undefined;
    return (
      (code && code.toLowerCase().includes("reverification")) ||
      (msg && msg.toLowerCase().includes("reverification"))
    );
  };

  const isOauthStrategyDisabledError = (err: any) => {
    const code = err?.errors?.[0]?.code as string | undefined;
    const paramName = err?.errors?.[0]?.meta?.param_name as string | undefined;
    return code === "form_param_value_invalid" && paramName === "strategy";
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // First, try to use Google profile data from auth context
      if (user) {
        setFormData({
          email: user.email,
          username: "", // Username not available
          full_name: user.full_name || "",
          avatar_url: user.avatar_url || "",
        });
      } else {
        // Fallback to API if no auth context data
        const profileResponse = await api.user.getProfile();

        if (
          profileResponse &&
          profileResponse.data &&
          profileResponse.data.profile
        ) {
          const profile = profileResponse.data.profile;
          setFormData({
            email: profile.email,
            username: "", // Username not available in profile API
            full_name: profile.full_name || "",
            avatar_url: profile.avatar_url || "",
          });
        }
      }

      // Fetch settings
      try {
        const profileResponse = await api.user.getProfile();

        if (
          profileResponse &&
          profileResponse.data &&
          profileResponse.data.profile &&
          profileResponse.data.profile.preferences
        ) {
          const prefs = profileResponse.data.profile.preferences;
          setPreferences({
            emailNotifications: prefs.emailNotifications ?? true,
            smsNotifications: prefs.smsNotifications ?? false,
            autoSave: prefs.autoSave ?? true,
            darkMode: prefs.darkMode ?? true,
            analytics: prefs.analytics ?? true,
            marketing: prefs.marketing ?? false,
          });

          // Sync UI theme with stored preference when available
          if (typeof prefs.darkMode === "boolean") {
            setTheme(prefs.darkMode ? "dark" : "light");
          }
        }
      } catch (settingsError) {
        console.log("Settings not found, using defaults");
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load user profile"
      );
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load user profile. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePreferenceChange = (field: string, value: boolean) => {
    setPreferences((prev) => ({ ...prev, [field]: value }));

    // Immediately reflect dark-mode preference in the UI theme
    if (field === "darkMode") {
      setTheme(value ? "dark" : "light");
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Update profile data
      const profileResponse = await api.user.updateProfile({
        full_name: formData.full_name,
      });

      // Update preferences within the profile
      const updatedPreferences = {
        emailNotifications: preferences.emailNotifications,
        smsNotifications: preferences.smsNotifications,
        autoSave: preferences.autoSave,
        darkMode: preferences.darkMode,
        analytics: preferences.analytics,
        marketing: preferences.marketing,
      };

      const preferencesResponse = await api.user.updateProfile({
        preferences: updatedPreferences,
      });

      if (
        (profileResponse as any).success &&
        (preferencesResponse as any).success
      ) {
        toast({
          title: "Success",
          description: "Your settings have been saved successfully.",
        });
      } else {
        throw new Error("Failed to save some settings");
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      setError(err instanceof Error ? err.message : "Failed to save changes");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save changes. Please try again later.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    // Reset previous errors
    setPasswordError(null);

    // Validate inputs
    if (!passwordData.currentPassword) {
      setPasswordError("Current password is required");
      return;
    }
    if (!passwordData.newPassword) {
      setPasswordError("New password is required");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long");
      return;
    }

    try {
      setIsChangingPassword(true);

      const response = await api.user.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      // Type assertion to handle API response
      const passwordChangeResponse = response as unknown as ApiResponse;

      if (passwordChangeResponse.success) {
        toast({
          title: "Password Changed",
          description: "Your password has been updated successfully.",
          variant: "default",
        });

        // Clear password fields
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmNewPassword: "",
        });

        // Optional: Force logout to re-authenticate
        await logout();
      } else {
        // Handle specific error messages from the backend
        const errorMessage =
          passwordChangeResponse.error || "Failed to change password";

        setPasswordError(errorMessage);

        toast({
          title: "Password Change Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Password change error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";

      setPasswordError(errorMessage);

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const togglePasswordVisibility = (field: keyof typeof passwordVisibility) => {
    setPasswordVisibility((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleDeleteUserData = async () => {
    setDeleteDataError(null);

    if (!deleteDataPassword) {
      setDeleteDataError("Please enter your current password to confirm.");
      return;
    }

    try {
      setIsDeletingData(true);

      const response = await api.statistics.deleteUserData(deleteDataPassword);
      if ((response as any).success) {
        toast({
          title: "Data deleted",
          description:
            "All of your usage data has been scheduled for permanent deletion.",
        });
        setDeleteDataPassword("");
      } else {
        const message =
          (response as any).error ||
          (response as any).message ||
          "Failed to delete your data.";
        setDeleteDataError(message);
        toast({
          variant: "destructive",
          title: "Deletion failed",
          description: message,
        });
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to delete your data.";
      setDeleteDataError(message);
      toast({
        variant: "destructive",
        title: "Deletion failed",
        description: message,
      });
    } finally {
      setIsDeletingData(false);
    }
  };

  // Render the password change section
  const renderPasswordChangeSection = () => {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label
              htmlFor="currentPassword"
              className="text-gray-200 flex items-center space-x-2"
            >
              <Lock className="w-4 h-4" />
              <span>Current Password</span>
            </Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={passwordVisibility.currentPassword ? "text" : "password"}
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    currentPassword: e.target.value,
                  }))
                }
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-500/50 focus:ring-purple-500/20 h-12 pr-10"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("currentPassword")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {passwordVisibility.currentPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label
              htmlFor="newPassword"
              className="text-gray-200 flex items-center space-x-2"
            >
              <Lock className="w-4 h-4" />
              <span>New Password</span>
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={passwordVisibility.newPassword ? "text" : "password"}
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-500/50 focus:ring-purple-500/20 h-12 pr-10"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("newPassword")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {passwordVisibility.newPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="space-y-2">
            <Label
              htmlFor="confirmNewPassword"
              className="text-gray-200 flex items-center space-x-2"
            >
              <Lock className="w-4 h-4" />
              <span>Confirm New Password</span>
            </Label>
            <div className="relative">
              <Input
                id="confirmNewPassword"
                type={
                  passwordVisibility.confirmNewPassword ? "text" : "password"
                }
                value={passwordData.confirmNewPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    confirmNewPassword: e.target.value,
                  }))
                }
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-500/50 focus:ring-purple-500/20 h-12 pr-10"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("confirmNewPassword")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {passwordVisibility.confirmNewPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Password Error Message */}
          {passwordError && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span>{passwordError}</span>
            </div>
          )}
        </div>

        {/* Change Password Button */}
        <Button
          onClick={handlePasswordChange}
          disabled={isChangingPassword}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25 h-12"
        >
          {isChangingPassword ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Changing Password...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 mr-2" />
              Change Password
            </>
          )}
        </Button>
      </div>
    );
  };

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Modify the existing tabs to include the password change section
  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "appearance", label: "Appearance", icon: Palette },
  ];

  // Show loading state
  if (isLoading) {
    return (
      <PageSkeleton
        variant="settings"
        showSidebar={!inLayout}
        showHeader={false}
      />
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">{error}</p>
          <Button onClick={fetchUserProfile} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/3 -right-40 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl opacity-60"
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl opacity-40"
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Sidebar and mobile menu handled by layout when inLayout */}
      {!inLayout && (
        <>
          <DashboardSidebar
            isCollapsed={isCollapsed}
            onToggle={handleToggleSidebar}
          />
          <MobileSidebar
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          />
          <button
            onClick={handleToggleMobileMenu}
            className="fixed top-4 right-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/95 text-muted-foreground shadow-soft-elevated backdrop-blur-xl md:hidden dark:bg-black/20 dark:border-white/10 dark:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Main Content */}
      <motion.div
        initial={false}
        animate={
          inLayout
            ? { marginLeft: 0, width: "100%" }
            : {
                marginLeft: isCollapsed
                  ? "var(--collapsed-sidebar-width, 80px)"
                  : "var(--expanded-sidebar-width, 320px)",
                width: isCollapsed
                  ? "calc(100% - var(--collapsed-sidebar-width, 80px))"
                  : "calc(100% - var(--expanded-sidebar-width, 320px))",
              }
        }
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex-1 p-2 sm:p-4 lg:p-8 relative z-10 overflow-x-hidden md:overflow-x-visible"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4 sm:space-y-6 lg:space-y-8 max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#3A5AFE0A] via-[#8B5CF60A] to-transparent blur-xl opacity-80 dark:from-purple-600/10 dark:to-blue-600/10" />
            <div className="relative rounded-2xl sm:rounded-3xl border border-border bg-card shadow-soft-elevated backdrop-blur-xl p-4 sm:p-6 dark:bg-black/20 dark:border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-full border border-purple-500/30 backdrop-blur-xl mb-3 sm:mb-4"
                  >
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
                      Account Settings
                    </span>
                  </motion.div>
                  <motion.h1
                    className="mb-3 text-3xl font-bold text-foreground dark:bg-gradient-to-r dark:from-white dark:via-purple-200 dark:to-blue-200 dark:bg-clip-text dark:text-transparent lg:text-4xl"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    Settings & Preferences
                  </motion.h1>
                  <motion.p
                    className="text-lg text-muted-foreground dark:text-gray-400"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    Manage your account settings and preferences
                  </motion.p>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={handleSave}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25 h-12 px-6"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="relative"
          >
            <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#6366F11A] via-[#8B5CF61A] to-transparent blur-xl opacity-80 dark:from-indigo-600/10 dark:to-purple-600/10" />
            <div className="relative overflow-x-auto rounded-2xl border border-border bg-card/95 p-2 backdrop-blur-xl shadow-soft-elevated sm:rounded-3xl dark:bg-black/20 dark:border-white/10">
              <div className="flex flex-nowrap min-w-max sm:min-w-0 sm:flex-wrap gap-2">
                {tabs.map((tab, index) => (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center space-x-2 whitespace-nowrap rounded-2xl px-4 py-3 text-sm transition-all duration-300 sm:px-6 ${
                      activeTab === tab.id
                        ? "text-foreground dark:text-white"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                  >
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeSettingsTab"
                        className="absolute inset-0 bg-gradient-to-r from-purple-600/30 to-blue-600/20 rounded-2xl border border-purple-500/30 backdrop-blur-xl"
                        initial={false}
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.6,
                        }}
                      />
                    )}
                    <div className="relative z-10 flex items-center space-x-2">
                      <tab.icon className="w-5 h-5" />
                      <span className="font-medium">{tab.label}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Content Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="relative"
          >
            <AnimatePresence mode="wait">
              {activeTab === "profile" && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 lg:gap-8"
                >
                  {/* Personal Information */}
                  <div className="relative">
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[#3A5AFE0A] via-[#8B5CF60A] to-transparent blur-xl opacity-80 dark:from-purple-600/10 dark:to-blue-600/10" />
                    <Card className="relative h-full rounded-3xl border border-border bg-card text-foreground shadow-soft-elevated backdrop-blur-xl dark:bg-black/20 dark:border-white/10">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-foreground dark:text-white">
                          <User className="w-5 h-5 text-[#8B5CF6]" />
                          <span>Personal Information</span>
                        </CardTitle>
                        <CardDescription className="text-muted-foreground dark:text-gray-400">
                          Update your personal details
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label
                              htmlFor="username"
                              className="text-muted-foreground dark:text-gray-200"
                            >
                              Username
                            </Label>
                            <Input
                              id="username"
                              value={formData.username || ""}
                              onChange={(e) =>
                                handleInputChange("username", e.target.value)
                              }
                              className="h-12 border border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-[#C7D2FE] focus:ring-[#C7D2FE33] dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-gray-400"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label
                                htmlFor="fullName"
                                className="text-muted-foreground dark:text-gray-200"
                              >
                                Full Name
                              </Label>
                              {isClerkLoaded && clerkUser ? (
                                <div className="flex items-center gap-2">
                                  {clerkUser.externalAccounts?.some(
                                    (a) =>
                                      a.provider === "google" &&
                                      a.verification?.status === "verified"
                                  ) ? (
                                    <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30 text-xs">
                                      Google connected
                                    </Badge>
                                  ) : null}
                                  {clerkUser.externalAccounts?.some(
                                    (a) =>
                                      a.provider === "facebook" &&
                                      a.verification?.status === "verified"
                                  ) ? (
                                    <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30 text-xs">
                                      Facebook connected
                                    </Badge>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                            <Input
                              id="fullName"
                              value={formData.full_name || ""}
                              onChange={(e) =>
                                handleInputChange("full_name", e.target.value)
                              }
                              className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-500/50 focus:ring-purple-500/20 h-12"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="email"
                            className="flex items-center space-x-2 text-muted-foreground dark:text-gray-200"
                          >
                            <Mail className="w-4 h-4" />
                            <span>Email</span>
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            disabled
                            className="h-12 border border-border bg-card text-foreground opacity-70 placeholder:text-muted-foreground focus:border-[#C7D2FE] focus:ring-[#C7D2FE33] dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-gray-400"
                          />
                          <p className="text-sm text-muted-foreground dark:text-gray-400">
                            Email cannot be changed. Contact support if you need
                            to update it.
                          </p>
                        </div>

                        {/* Connected accounts (Clerk) */}
                        {isClerkLoaded && clerkUser ? (
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-medium text-foreground dark:text-white">
                                Connected accounts
                              </p>
                              <p className="text-xs text-muted-foreground dark:text-gray-400">
                                Link Google/Facebook for easier sign-in, even if
                                you originally registered with email + password.
                              </p>
                            </div>

                            {(() => {
                              const googleAccount = clerkUser.externalAccounts?.find(
                                (a) => a.provider === "google"
                              );
                              const facebookAccount = clerkUser.externalAccounts?.find(
                                (a) => a.provider === "facebook"
                              );

                              const isGoogleConnected =
                                !!googleAccount &&
                                googleAccount.verification?.status === "verified";
                              const isFacebookConnected =
                                !!facebookAccount &&
                                facebookAccount.verification?.status === "verified";

                              const startLink = async ({
                                provider,
                              }: {
                                provider: "google" | "facebook";
                              }) => {
                                setIsLinkingProvider(provider);
                                try {
                                  const strategy =
                                    provider === "google"
                                      ? ("oauth_google" as const)
                                      : ("oauth_facebook" as const);

                                  const external = await clerkUser.createExternalAccount(
                                    {
                                      strategy,
                                      redirectUrl: "/account/sso-callback",
                                    }
                                  );

                                  const redirect =
                                    external.verification?.externalVerificationRedirectURL?.toString() ||
                                    null;

                                  if (!redirect) {
                                    toast({
                                      title: "Unable to start linking",
                                      description:
                                        "No redirect URL returned by Clerk. Please try again.",
                                      variant: "destructive",
                                    });
                                    return;
                                  }

                                  window.location.href = redirect;
                                } catch (err: any) {
                                  if (isReverificationError(err)) {
                                    toast({
                                      title: "Reverification required",
                                      description:
                                        "For security, please re-authenticate, then try linking again.",
                                      variant: "destructive",
                                      action: (
                                        <ToastAction
                                          altText="Re-authenticate"
                                          onClick={() =>
                                            openSignIn?.({
                                              afterSignInUrl:
                                                "/dashboard/settings",
                                            })
                                          }
                                        >
                                          Re-authenticate
                                        </ToastAction>
                                      ),
                                    });
                                    return;
                                  }
                                  if (isOauthStrategyDisabledError(err)) {
                                    toast({
                                      title: "Provider not enabled",
                                      description:
                                        "Google/Facebook linking is disabled in this Clerk environment. Enable it in Clerk Dashboard → User & Authentication → Social Connections (production instance), or ensure your VITE_CLERK_PUBLISHABLE_KEY is the correct pk_live key.",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  toast({
                                    title: "Linking failed",
                                    description:
                                      err?.errors?.[0]?.message ||
                                      err?.message ||
                                      "Unable to link provider.",
                                    variant: "destructive",
                                  });
                                } finally {
                                  setIsLinkingProvider(null);
                                }
                              };

                              const unlink = async ({
                                provider,
                              }: {
                                provider: "google" | "facebook";
                              }) => {
                                setIsUnlinkingProvider(provider);
                                try {
                                  const account =
                                    provider === "google"
                                      ? googleAccount
                                      : facebookAccount;
                                  if (!account) return;
                                  await account.destroy();
                                  toast({
                                    title: "Disconnected",
                                    description: `${
                                      provider === "google"
                                        ? "Google"
                                        : "Facebook"
                                    } account disconnected.`,
                                  });
                                } catch (err: any) {
                                  toast({
                                    title: "Disconnect failed",
                                    description:
                                      err?.errors?.[0]?.message ||
                                      err?.message ||
                                      "Unable to disconnect provider.",
                                    variant: "destructive",
                                  });
                                } finally {
                                  setIsUnlinkingProvider(null);
                                }
                              };

                              return (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="flex items-center justify-between rounded-2xl border border-border bg-card/70 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                                    <div>
                                      <p className="text-sm font-medium text-foreground dark:text-white">
                                        Google
                                      </p>
                                      <p className="text-xs text-muted-foreground dark:text-gray-400">
                                        {isGoogleConnected
                                          ? "Connected"
                                          : "Not connected"}
                                      </p>
                                    </div>
                                    {isGoogleConnected ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        disabled={isUnlinkingProvider === "google"}
                                        onClick={() =>
                                          unlink({ provider: "google" })
                                        }
                                      >
                                        {isUnlinkingProvider === "google" ? (
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : null}
                                        Disconnect
                                      </Button>
                                    ) : (
                                      <Button
                                        type="button"
                                        disabled={isLinkingProvider === "google"}
                                        onClick={() =>
                                          startLink({ provider: "google" })
                                        }
                                      >
                                        {isLinkingProvider === "google" ? (
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : null}
                                        Connect
                                      </Button>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between rounded-2xl border border-border bg-card/70 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                                    <div>
                                      <p className="text-sm font-medium text-foreground dark:text-white">
                                        Facebook
                                      </p>
                                      <p className="text-xs text-muted-foreground dark:text-gray-400">
                                        {isFacebookConnected
                                          ? "Connected"
                                          : "Not connected"}
                                      </p>
                                    </div>
                                    {isFacebookConnected ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        disabled={
                                          isUnlinkingProvider === "facebook"
                                        }
                                        onClick={() =>
                                          unlink({ provider: "facebook" })
                                        }
                                      >
                                        {isUnlinkingProvider === "facebook" ? (
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : null}
                                        Disconnect
                                      </Button>
                                    ) : (
                                      <Button
                                        type="button"
                                        disabled={isLinkingProvider === "facebook"}
                                        onClick={() =>
                                          startLink({ provider: "facebook" })
                                        }
                                      >
                                        {isLinkingProvider === "facebook" ? (
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : null}
                                        Connect
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        ) : null}

                        <div className="space-y-2">
                          <Label
                            htmlFor="avatarUrl"
                            className="flex items-center space-x-2 text-muted-foreground dark:text-gray-200"
                          >
                            <User className="w-4 h-4" />
                            <span>Avatar URL</span>
                          </Label>
                          <Input
                            id="avatarUrl"
                            value={formData.avatar_url || ""}
                            onChange={(e) =>
                              handleInputChange("avatar_url", e.target.value)
                            }
                            className="h-12 border border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-[#C7D2FE] focus:ring-[#C7D2FE33] dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-gray-400"
                            placeholder="https://example.com/avatar.jpg"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Account Security */}
                  <div className="relative">
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[#FDBA7414] to-[#F9731614] blur-xl opacity-80 dark:from-orange-600/10 dark:to-red-600/10" />
                    <Card className="relative h-full rounded-3xl border border-border bg-card text-foreground shadow-soft-elevated backdrop-blur-xl dark:bg-black/20 dark:border-white/10">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-foreground dark:text-white">
                          <Shield className="w-5 h-5 text-orange-400" />
                          <span>Account Security</span>
                        </CardTitle>
                        <CardDescription className="text-muted-foreground dark:text-gray-400">
                          Manage your security settings
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {renderPasswordChangeSection()}
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}

              {activeTab === "notifications" && (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="relative">
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[#3A5AFE0A] via-[#8B5CF60A] to-transparent blur-xl opacity-80 dark:from-purple-600/10 dark:to-blue-600/10" />
                    <Card className="relative rounded-3xl border border-border bg-card text-foreground shadow-soft-elevated backdrop-blur-xl dark:bg-black/20 dark:border-white/10">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-foreground dark:text-white">
                          <Bell className="w-5 h-5 text-[#8B5CF6]" />
                          <span>Notification Preferences</span>
                        </CardTitle>
                        <CardDescription className="text-muted-foreground dark:text-gray-400">
                          Choose how you want to be notified
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {[
                          {
                            key: "emailNotifications",
                            title: "Email Notifications",
                            description: "Receive notifications via email",
                            icon: Mail,
                            color: "from-blue-600 to-cyan-600",
                          },
                          {
                            key: "smsNotifications",
                            title: "SMS Notifications",
                            description: "Receive notifications via SMS",
                            icon: Phone,
                            color: "from-green-600 to-emerald-600",
                          },
                          {
                            key: "autoSave",
                            title: "Auto Save",
                            description: "Automatically save your work",
                            icon: Save,
                            color: "from-purple-600 to-blue-600",
                          },
                          {
                            key: "analytics",
                            title: "Analytics Tracking",
                            description: "Help us improve with usage analytics",
                            icon: Zap,
                            color: "from-orange-600 to-red-600",
                          },
                          {
                            key: "marketing",
                            title: "Marketing Emails",
                            description: "Receive updates about new features",
                            icon: Globe,
                            color: "from-pink-600 to-purple-600",
                          },
                        ].map((setting) => (
                          <div
                            key={setting.key}
                            className="p-4 rounded-xl border border-border bg-card transition-colors hover:bg-muted/60 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                              <div className="flex items-center space-x-4">
                                <div
                                  className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r ${setting.color} shadow-sm shadow-black/10`}
                                >
                                  <setting.icon className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-foreground dark:text-white">
                                    {setting.title}
                                  </h4>
                                  <p className="text-sm text-muted-foreground dark:text-gray-400">
                                    {setting.description}
                                  </p>
                                </div>
                              </div>
                              <Switch
                                checked={
                                  preferences[
                                    setting.key as keyof typeof preferences
                                  ] as boolean
                                }
                                onCheckedChange={(checked) =>
                                  handlePreferenceChange(setting.key, checked)
                                }
                                className="data-[state=checked]:bg-purple-600"
                              />
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}

              {activeTab === "security" && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="relative">
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[#3A5AFE0A] via-[#8B5CF60A] to-transparent blur-xl opacity-80 dark:from-purple-600/10 dark:to-blue-600/10" />
                    <Card className="relative rounded-3xl border border-border bg-card text-foreground shadow-soft-elevated backdrop-blur-xl dark:bg-black/20 dark:border-white/10">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-foreground dark:text-white">
                          <Shield className="w-5 h-5 text-green-400" />
                          <span>Privacy & Security</span>
                        </CardTitle>
                        <CardDescription className="text-muted-foreground dark:text-gray-400">
                          Control how your data is used and manage privacy options.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-10">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                          <div className="space-y-4">
                            <h3 className="flex items-center space-x-2 font-semibold text-foreground dark:text-white">
                              <Shield className="w-4 h-4 text-green-400" />
                              <span>Privacy controls</span>
                            </h3>
                            <p className="text-sm text-muted-foreground dark:text-gray-400">
                              Choose what data you share with SpareFinder. These settings
                              can be changed at any time.
                            </p>
                            <div className="space-y-4">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <p className="font-medium text-foreground dark:text-white">
                                    Analytics & usage data
                                  </p>
                                  <p className="text-sm text-muted-foreground dark:text-gray-400">
                                    Allow anonymized usage data to improve accuracy and
                                    reliability of the service.
                                  </p>
                                </div>
                                <Switch
                                  checked={preferences.analytics}
                                  onCheckedChange={(checked) =>
                                    handlePreferenceChange("analytics", checked)
                                  }
                                  className="data-[state=checked]:bg-green-600"
                                />
                              </div>
                              <Separator className="bg-border/60 dark:bg-white/10" />
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <p className="font-medium text-foreground dark:text-white">
                                    Product updates & tips
                                  </p>
                                  <p className="text-gray-400 text-sm">
                                    Receive occasional emails about new features and best
                                    practices.
                                  </p>
                                </div>
                                <Switch
                                  checked={preferences.marketing}
                                  onCheckedChange={(checked) =>
                                    handlePreferenceChange("marketing", checked)
                                  }
                                  className="data-[state=checked]:bg-purple-600"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h3 className="flex items-center space-x-2 font-semibold text-foreground dark:text-white">
                              <AlertCircle className="w-4 h-4 text-red-400" />
                              <span>Danger zone</span>
                            </h3>
                            <p className="text-sm text-muted-foreground dark:text-gray-400">
                              Permanently delete your search history, statistics, and
                              analysis data from SpareFinder. This cannot be undone.
                            </p>
                            <div className="space-y-3 rounded-xl border border-red-500/40 bg-red-500/5 p-4">
                              <Label
                                htmlFor="deleteDataPassword"
                                className="text-gray-200 text-sm flex items-center space-x-2"
                              >
                                <Lock className="w-4 h-4" />
                                <span>Confirm with password</span>
                              </Label>
                              <Input
                                id="deleteDataPassword"
                                type="password"
                                value={deleteDataPassword}
                                onChange={(e) =>
                                  setDeleteDataPassword(e.target.value)
                                }
                                className="bg-black/40 border-red-500/40 text-white placeholder:text-gray-500 focus:border-red-500/70 focus:ring-red-500/30 h-11"
                                placeholder="Enter your current password"
                              />
                              {deleteDataError && (
                                <div className="flex items-center space-x-2 text-sm text-red-300">
                                  <AlertCircle className="w-4 h-4" />
                                  <span>{deleteDataError}</span>
                                </div>
                              )}
                              <Button
                                variant="destructive"
                                onClick={handleDeleteUserData}
                                disabled={isDeletingData}
                                className="w-full bg-red-600 hover:bg-red-700"
                              >
                                {isDeletingData ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Deleting data...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete all my data
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}

              {activeTab === "appearance" && (
                <motion.div
                  key="appearance"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="relative">
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[#3A5AFE0A] via-[#8B5CF60A] to-transparent blur-xl opacity-80 dark:from-purple-600/10 dark:to-blue-600/10" />
                    <Card className="relative rounded-3xl border border-border bg-card text-foreground shadow-soft-elevated backdrop-blur-xl dark:bg-black/20 dark:border-white/10">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-foreground dark:text-white">
                          <Palette className="w-5 h-5 text-pink-400" />
                          <span>Appearance</span>
                        </CardTitle>
                        <CardDescription className="text-muted-foreground dark:text-gray-400">
                          Customize the look and feel of your dashboard.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start">
                          <div className="space-y-4">
                            <h3 className="font-semibold text-foreground dark:text-white">
                              Theme preferences
                            </h3>
                            <p className="text-sm text-muted-foreground dark:text-gray-400">
                              SpareFinder is optimized for a dark interface. Your
                              preference is saved to your profile and will be used across
                              devices.
                            </p>
                            <div className="relative mt-4 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 dark:border-white/10 dark:from-slate-900 dark:via-purple-900/60 dark:to-blue-900/60">
                              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.3)_0,_transparent_45%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.25)_0,_transparent_45%)]" />
                              <div className="relative p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium uppercase tracking-wide text-purple-700 dark:text-purple-200">
                                    Preview
                                  </span>
                                  <Badge className="bg-purple-100 text-xs text-purple-700 border-purple-200 dark:bg-white/10 dark:text-purple-100 dark:border-white/20">
                                    Dark mode
                                  </Badge>
                                </div>
                                <div className="h-20 rounded-xl border border-border bg-card flex items-center justify-center text-xs text-muted-foreground dark:bg-black/30 dark:border-white/10 dark:text-gray-300">
                                  Dashboard preview
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-5">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="flex items-center space-x-2 font-medium text-foreground dark:text-white">
                                  <span>Dark mode</span>
                                </p>
                                <p className="text-sm text-muted-foreground dark:text-gray-400">
                                  When enabled, SpareFinder will use a dark theme wherever
                                  supported.
                                </p>
                              </div>
                              <Switch
                                checked={preferences.darkMode}
                                onCheckedChange={(checked) =>
                                  handlePreferenceChange("darkMode", checked)
                                }
                                className="data-[state=checked]:bg-purple-600"
                              />
                            </div>
                            <Separator className="bg-border/60 dark:bg-white/10" />
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-medium text-foreground dark:text-white">
                                  Subtle animations
                                </p>
                                <p className="text-sm text-muted-foreground dark:text-gray-400">
                                  Animations are kept light to avoid distraction. Your
                                  browser&apos;s “reduced motion” setting is also respected.
                                </p>
                              </div>
                              <Badge className="bg-muted text-muted-foreground border-border dark:bg-white/5 dark:text-gray-200 dark:border-white/10">
                                Optimized
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Settings;
