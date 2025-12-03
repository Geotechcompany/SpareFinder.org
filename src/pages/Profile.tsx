import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Skeleton,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonText,
  SkeletonButton,
} from "@/components/ui/skeleton";
import {
  CardSkeleton,
  ListSkeleton,
  FormSkeleton,
} from "@/components/skeletons";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileData } from "@/hooks/useProfileData";
import { Loader2 } from "lucide-react";
import {
  User,
  Mail,
  Phone,
  Building,
  MapPin,
  Calendar,
  Trophy,
  Target,
  Clock,
  TrendingUp,
  Sparkles,
  Award,
  Zap,
  Activity,
  Edit,
  Camera,
  Menu,
  AlertCircle,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import MobileSidebar from "@/components/MobileSidebar";
import { useDashboardLayout } from "@/contexts/DashboardLayoutContext";
import { PageSkeleton } from "@/components/skeletons";

interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  full_name: string;
  avatar_url: string | null;
  created_at?: string;
}

const Profile = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { inLayout } = useDashboardLayout();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userStats, setUserStats] = useState({
    totalUploads: 0,
    successRate: 0,
    avgConfidence: 0,
    memberSince: "N/A",
    streak: 0,
    totalSaved: "$0",
    achievements: 0,
  });

  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth(); // Get Google profile data from auth context
  const {
    achievements,
    activities,
    totalEarned,
    totalAvailable,
    loading: profileDataLoading,
    error: profileDataError,
  } = useProfileData();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      fetchUserStats();
    }
  }, [profile]);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // First, try to use profile data from auth context
      if (user) {
        setProfile({
          id: user.id,
          email: user.email,
          username: null,
          full_name: user.full_name || "",
          avatar_url: user.avatar_url || null,
          created_at: user.created_at,
        });
        setIsLoading(false);
        return;
      }

      // Fallback to API if no auth context data
      const response = await api.profile.getProfile();

      if (response.success && response.data) {
        const profileData = (response.data as any).profile;
        setProfile({
          id: profileData.id,
          email: profileData.email,
          username: null, // Username not available in current API
          full_name: profileData.full_name || "",
          avatar_url: profileData.avatar_url,
          created_at: profileData.created_at,
        });
      } else {
        throw new Error("Failed to fetch profile data");
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

  const fetchUserStats = async () => {
    try {
      // Fetch dashboard stats which includes comprehensive user data
      const response = await api.dashboard.getStats();

      if (response.success && response.data) {
        const stats = response.data as {
          totalUploads?: number;
          successfulUploads?: number;
          avgConfidence?: number;
          currentStreak?: number;
          totalSaved?: number;
          totalAchievements?: number;
        };
        setUserStats({
          totalUploads: stats.totalUploads || 0,
          successRate:
            stats.successfulUploads && stats.totalUploads
              ? Math.round(
                  (stats.successfulUploads / stats.totalUploads) * 100 * 100
                ) / 100
              : 0,
          avgConfidence: stats.avgConfidence || 0,
          memberSince: profile?.created_at
            ? new Date(profile.created_at).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })
            : "N/A",
          streak: stats.currentStreak || 0,
          totalSaved: `$${stats.totalSaved || 0}`,
          achievements: stats.totalAchievements || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching user stats:", error);
      // Keep default values on error
    }
  };

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleEditProfile = () => {
    navigate("/dashboard/settings");
  };

  // Show loading state
  if (isLoading) {
    return (
      <PageSkeleton
        variant="profile"
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

  // Icon mapping for achievements
  const getAchievementIcon = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
      Trophy,
      Zap,
      Target,
      Award,
      Activity,
      TrendingUp,
    };
    return iconMap[iconName] || Trophy;
  };

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 -right-40 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl opacity-60"
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
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[#3A5AFE0A] via-[#8B5CF60A] to-transparent blur-xl opacity-80 dark:from-purple-600/10 dark:to-blue-600/10" />
          <div className="relative rounded-3xl border border-border bg-card shadow-soft-elevated backdrop-blur-xl dark:bg-black/30 dark:border-white/10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                  <div className="relative">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={profile?.avatar_url || ""} />
                      <AvatarFallback className="bg-gradient-to-r from-purple-600 to-blue-600">
                        <User className="w-12 h-12 text-white" />
                      </AvatarFallback>
                    </Avatar>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center border-2 border-gray-900"
                      onClick={handleEditProfile}
                    >
                      <Camera className="w-4 h-4 text-white" />
                    </motion.button>
                  </div>
                  <div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="inline-flex items-center px-3 py-1 rounded-full border border-border bg-gradient-to-r from-[#E0E7FF] via-[#EEF2FF] to-[#F5F3FF] text-xs font-semibold text-[#4C1D95] shadow-soft-elevated dark:border-purple-500/30 dark:from-purple-600/20 dark:to-blue-600/20 dark:text-purple-200 backdrop-blur-xl mb-2"
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
                        <Sparkles className="w-3 h-3 text-[#8B5CF6]" />
                      </motion.div>
                      <span>Pro Member</span>
                    </motion.div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-3xl lg:text-4xl font-bold text-foreground dark:bg-gradient-to-r dark:from-white dark:via-purple-200 dark:to-blue-200 dark:bg-clip-text dark:text-transparent">
                        {profile?.full_name || "Anonymous User"}
                      </h1>
                      {user?.avatar_url && (
                        <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30 text-xs">
                          <svg
                            className="w-3 h-3 mr-1"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              fill="#4285F4"
                            />
                            <path
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              fill="#34A853"
                            />
                            <path
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              fill="#FBBC05"
                            />
                            <path
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              fill="#EA4335"
                            />
                          </svg>
                          Google
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-lg text-muted-foreground dark:text-gray-400">
                      @{profile?.username || "username"}
                    </p>
                    <div className="flex items-center space-x-4 mt-3">
                      <div className="flex items-center space-x-1 text-muted-foreground dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">
                          Member since {userStats.memberSince}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-muted-foreground dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">
                          {userStats.streak} day streak
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={handleEditProfile}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25 h-12 px-6"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {[
              {
                title: "Total Uploads",
                value: userStats.totalUploads.toLocaleString(),
                icon: TrendingUp,
                color: "from-purple-600 to-blue-600",
                change: "+15%",
              },
              {
                title: "Success Rate",
                value: `${userStats.successRate}%`,
                icon: Target,
                color: "from-green-600 to-emerald-600",
                change: "+2.1%",
              },
              {
                title: "Avg Confidence",
                value: `${userStats.avgConfidence}%`,
                icon: Trophy,
                color: "from-blue-600 to-cyan-600",
                change: "+1.8%",
              },
              {
                title: "Total Saved",
                value: userStats.totalSaved,
                icon: Zap,
                color: "from-orange-600 to-red-600",
                change: "+$340",
              },
            ].map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.5 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="relative group"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-10 rounded-2xl blur-xl group-hover:opacity-20 transition-opacity`}
                />
                <Card className="relative border border-border bg-card text-foreground shadow-soft-elevated backdrop-blur-xl transition-all duration-300 hover:border-[#C7D2FE] dark:bg-black/40 dark:border-white/10 dark:hover:border-white/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-gray-400">
                          {stat.title}
                        </p>
                        <p className="mt-1 text-2xl font-bold text-foreground dark:text-white">
                          {stat.value}
                        </p>
                        <p
                          className={`text-sm mt-1 ${
                            stat.change.startsWith("+")
                              ? "text-emerald-500 dark:text-green-400"
                              : "text-red-500 dark:text-red-400"
                          }`}
                        >
                          {stat.change} this month
                        </p>
                      </div>
                      <div
                        className={`p-3 rounded-xl bg-gradient-to-r ${stat.color} shadow-lg shadow-purple-500/20`}
                      >
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {/* Achievements */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="relative"
            >
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[#3A5AFE0D] via-[#8B5CF60D] to-transparent blur-xl opacity-80 dark:from-purple-600/10 dark:to-blue-600/10" />
              <Card className="relative h-full border border-border bg-card text-foreground shadow-soft-elevated backdrop-blur-xl dark:bg-black/20 dark:border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-foreground dark:text-white">
                    <Award className="w-5 h-5 text-yellow-500" />
                    <span>Achievements</span>
                    <Badge
                      variant="secondary"
                      className="bg-amber-100 text-amber-700 border border-amber-200 dark:bg-yellow-600/20 dark:text-yellow-400 dark:border-yellow-500/30"
                    >
                      {profileDataLoading
                        ? "..."
                        : `${totalEarned}/${totalAvailable}`}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-muted-foreground dark:text-gray-400">
                    Your milestones and accomplishments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {profileDataLoading ? (
                      // Loading skeletons
                      <ListSkeleton
                        variant="activity"
                        items={4}
                        showHeader={false}
                        className="space-y-4"
                      />
                    ) : profileDataError ? (
                      <div className="py-8 text-center">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                        <p className="text-muted-foreground dark:text-gray-400">
                          Failed to load achievements
                        </p>
                      </div>
                    ) : achievements.length > 0 ? (
                      achievements.map((achievement, index) => {
                        const IconComponent = getAchievementIcon(
                          achievement.icon
                        );
                        return (
                          <motion.div
                            key={achievement.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.7 + index * 0.1 }}
                            className={`p-4 rounded-xl border transition-all duration-300 ${
                              achievement.earned
                                ? "bg-card border-border hover:border-[#C7D2FE] hover:bg-[#F9FAFB] dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10"
                                : "bg-muted/60 border-border/60 opacity-80 dark:bg-gray-500/5 dark:border-gray-500/10"
                            }`}
                          >
                            <div className="flex items-center space-x-4">
                              <div
                                className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                                  achievement.earned
                                    ? `bg-gradient-to-r ${achievement.color} shadow-md shadow-purple-500/20`
                                    : "bg-muted dark:bg-gray-600/30"
                                }`}
                              >
                                <IconComponent className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-foreground dark:text-white">
                                  {achievement.title}
                                </h4>
                                <p className="text-sm text-muted-foreground dark:text-gray-400">
                                  {achievement.description}
                                </p>
                              </div>
                              {achievement.earned && (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-semibold text-white shadow-sm shadow-emerald-500/40">
                                  ✓
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center">
                        <Award className="w-8 h-8 mx-auto mb-2 text-muted-foreground dark:text-gray-400" />
                        <p className="text-muted-foreground dark:text-gray-400">
                          No achievements yet
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="relative"
            >
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[#22C55E14] via-[#06B6D414] to-transparent blur-xl opacity-80 dark:from-blue-600/10 dark:to-green-600/10" />
              <Card className="relative h-full border border-border bg-card text-foreground shadow-soft-elevated backdrop-blur-xl dark:bg-black/20 dark:border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-foreground dark:text-white">
                    <Activity className="w-5 h-5 text-[#06B6D4]" />
                    <span>Recent Activity</span>
                  </CardTitle>
                  <CardDescription className="text-muted-foreground dark:text-gray-400">
                    Your latest part identification activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {profileDataLoading ? (
                      // Loading skeletons
                      Array.from({ length: 4 }).map((_, index) => (
                        <div
                          key={index}
                          className="rounded-xl border border-border bg-muted/60 p-4 dark:bg-gray-500/5 dark:border-gray-500/10"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Skeleton className="h-4 w-40 bg-muted-foreground/20 dark:bg-gray-600/30" />
                            <Skeleton className="h-5 w-12 rounded-full bg-muted-foreground/20 dark:bg-gray-600/30" />
                          </div>
                          <div className="flex items-center justify-between">
                            <Skeleton className="h-3 w-24 bg-muted-foreground/20 dark:bg-gray-600/30" />
                            <Skeleton className="h-3 w-16 bg-muted-foreground/20 dark:bg-gray-600/30" />
                          </div>
                        </div>
                      ))
                    ) : profileDataError ? (
                      <div className="py-8 text-center">
                        <Activity className="w-8 h-8 mx-auto mb-2 text-red-500" />
                        <p className="text-muted-foreground dark:text-gray-400">
                          Failed to load recent activity
                        </p>
                      </div>
                    ) : activities.length > 0 ? (
                      activities.map((activity, index) => (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.8 + index * 0.1 }}
                          className="rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:border-[#C7D2FE] hover:bg-[#F9FAFB] dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-foreground dark:text-white">
                              {activity.action}
                            </h4>
                            {activity.details.confidence && (
                              <Badge
                                variant="secondary"
                                className="border border-emerald-200 bg-emerald-100 text-xs text-emerald-700 dark:bg-green-600/20 dark:text-green-400 dark:border-green-500/30"
                              >
                                {Math.round(activity.details.confidence)}%
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-sm text-muted-foreground dark:text-gray-400">
                              {activity.details.description}
                            </span>
                            <span className="text-xs text-muted-foreground/70 dark:text-gray-500">
                              {new Date(
                                activity.created_at
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="py-8 text-center">
                        <Activity className="w-8 h-8 mx-auto mb-2 text-muted-foreground dark:text-gray-400" />
                        <p className="text-muted-foreground dark:text-gray-400">
                          No recent activity
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="relative"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[#3B82F614] via-[#8B5CF614] to-transparent blur-xl opacity-80 dark:from-indigo-600/10 dark:to-purple-600/10" />
            <Card className="relative border border-border bg-card text-foreground shadow-soft-elevated backdrop-blur-xl dark:bg-black/20 dark:border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-foreground dark:text-white">
                  <User className="w-5 h-5 text-[#8B5CF6]" />
                  <span>Contact Information</span>
                </CardTitle>
                <CardDescription className="text-muted-foreground dark:text-gray-400">
                  Your profile and contact details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-gradient-to-r from-[#EFF6FF] to-[#E0F2FE] dark:border-white/10 dark:from-blue-600/20 dark:to-cyan-600/20">
                        <Mail className="w-5 h-5 text-[#0EA5E9]" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground dark:text-gray-400">
                          Email
                        </p>
                        <p className="text-sm font-medium text-foreground dark:text-white">
                          {profile?.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-gradient-to-r from-[#F5F3FF] to-[#E9D5FF] dark:border-white/10 dark:from-purple-600/20 dark:to-pink-600/20">
                        <User className="w-5 h-5 text-[#8B5CF6]" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground dark:text-gray-400">
                          Username
                        </p>
                        <p className="text-sm font-medium text-foreground dark:text-white">
                          @{profile?.username || "username"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-gradient-to-r from-[#EEF2FF] to-[#E0F2FE] dark:border-white/10 dark:from-purple-600/20 dark:to-pink-600/20">
                        <Building className="w-5 h-5 text-[#6366F1]" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground dark:text-gray-400">
                          Company
                        </p>
                        <p className="text-sm font-medium text-foreground dark:text-white">
                          Auto Parts Inc.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-gradient-to-r from-[#FEF3C7] to-[#FFE4E6] dark:border-white/10 dark:from-orange-600/20 dark:to-red-600/20">
                        <MapPin className="w-5 h-5 text-[#F97316]" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground dark:text-gray-400">
                          Location
                        </p>
                        <p className="text-sm font-medium text-foreground dark:text-white">
                          New York, NY
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Profile;
