import React from "react";
import { motion } from "framer-motion";
import {
  Skeleton,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonText,
  SkeletonButton,
} from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  CardSkeleton,
  TableSkeleton,
  ListSkeleton,
  ChartSkeleton,
} from "@/components/skeletons";

interface DashboardSkeletonProps {
  variant?: "admin" | "user";
  showSidebar?: boolean;
  showHeader?: boolean;
  showStats?: boolean;
  showCharts?: boolean;
  showTable?: boolean;
  showActivity?: boolean;
  className?: string;
}

const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({
  variant = "user",
  showSidebar = true,
  showHeader = true,
  showStats = true,
  showCharts = true,
  showTable = true,
  showActivity = true,
  className = "",
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  const StatCardSkeleton = () => (
    <Card className="relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
          <Skeleton className="h-8 w-8 rounded-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-pulse-glow" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
        <Skeleton className="h-3 w-20 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
      </CardContent>
    </Card>
  );

  const ChartCardSkeleton = () => (
    <Card className="relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1200 ease-out" />
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
          <Skeleton className="h-8 w-20 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-pulse-glow" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
          <Skeleton className="h-4 w-3/4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
          <Skeleton className="h-4 w-1/2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
          <div className="flex space-x-2 mt-4">
            <Skeleton className="h-2 w-8 rounded-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-wave" />
            <Skeleton className="h-2 w-12 rounded-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-wave" />
            <Skeleton className="h-2 w-6 rounded-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-wave" />
            <Skeleton className="h-2 w-10 rounded-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-wave" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const TableSkeleton = () => (
    <Card className="relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1400 ease-out" />
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
          <Skeleton className="h-8 w-24 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-pulse-glow" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Table header */}
          <div className="flex space-x-4 py-2 border-b border-gray-200/50 dark:border-gray-700/50">
            <Skeleton className="h-4 w-20 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
            <Skeleton className="h-4 w-32 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
            <Skeleton className="h-4 w-24 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
            <Skeleton className="h-4 w-16 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
          </div>
          {/* Table rows */}
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex space-x-4 py-2 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors duration-200"
            >
              <Skeleton className="h-4 w-20 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
              <Skeleton className="h-4 w-32 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
              <Skeleton className="h-4 w-24 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
              <Skeleton className="h-4 w-16 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const ActivitySkeleton = () => (
    <Card className="relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1600 ease-out" />
      <CardHeader>
        <Skeleton className="h-5 w-32 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="relative flex items-start gap-3 pl-5 py-2 rounded-lg hover:bg-gray-50/60 dark:hover:bg-gray-800/60 transition-colors duration-200"
            >
              {i !== 3 && (
                <div className="pointer-events-none absolute left-4 top-7 bottom-0 w-px bg-gray-200/70 dark:bg-gray-700/70" />
              )}
              <div className="absolute left-0 top-3 flex h-3 w-3 -translate-x-1/2 items-center justify-center rounded-full bg-white dark:bg-gray-900 ring-4 ring-gray-100 dark:ring-gray-800">
                <span className="block h-2 w-2 rounded-full bg-indigo-400" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-pulse-glow" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
                <Skeleton className="h-3 w-1/2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
              </div>
              <Skeleton className="h-3 w-16 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const QuickActionsSkeleton = () => (
    <Card className="relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent -translate-y-full group-hover:translate-y-0 transition-transform duration-1600 ease-out" />
      <CardHeader>
        <Skeleton className="h-5 w-32 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
        <Skeleton className="h-3 w-40 mt-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-2xl border border-gray-200/70 dark:border-gray-700/70 bg-gray-50/70 dark:bg-gray-900/40 px-3 py-2.5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full bg-gradient-to-r from-indigo-300 via-blue-300 to-sky-300 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-pulse-glow" />
                <Skeleton className="h-4 w-28 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
              </div>
              <Skeleton className="h-3 w-10 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const SidebarSkeleton = () => (
    <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 lg:bg-white dark:lg:bg-gray-900">
      <div className="flex flex-col flex-grow bg-white dark:bg-gray-900 pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <Skeleton className="h-8 w-32 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
        </div>
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex items-center px-2 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
            >
              <Skeleton className="h-4 w-4 mr-3 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-pulse-glow" />
              <Skeleton className="h-4 w-20 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
            </div>
          ))}
        </nav>
      </div>
    </div>
  );

  const HeaderSkeleton = () => (
    <Card className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-900 shadow-sm sm:shadow-md">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-100/40 to-transparent dark:from-white/5 dark:via-white/5 dark:to-transparent -translate-x-full group-hover:translate-x-0 transition-transform duration-1200 ease-out" />
      <CardContent className="flex flex-col gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <div className="space-y-2 max-w-xl">
          <Skeleton className="h-7 w-64 sm:w-80 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
          <Skeleton className="h-4 w-72 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 skeleton-shimmer" />
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <SkeletonButton className="h-9 w-28" />
          <SkeletonButton className="h-9 w-32" />
        </div>
      </CardContent>
    </Card>
  );

  const renderAdminMain = () => (
    <main className="py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <Skeleton className="h-8 w-48 mb-2 skeleton-shimmer" />
          <Skeleton className="h-4 w-64 skeleton-shimmer" />
        </motion.div>

        {/* Stats Grid */}
        {showStats && (
          <motion.div variants={itemVariants} className="mb-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Charts and Tables Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Charts */}
          {showCharts && (
            <motion.div variants={itemVariants}>
              <ChartCardSkeleton />
            </motion.div>
          )}

          {/* Activity Feed */}
          {showActivity && (
            <motion.div variants={itemVariants}>
              <ActivitySkeleton />
            </motion.div>
          )}
        </div>

        {/* Full Width Table */}
        {showTable && (
          <motion.div variants={itemVariants} className="mt-8">
            <TableSkeleton />
          </motion.div>
        )}

        {/* Additional Admin-specific sections */}
        {variant === "admin" && (
          <motion.div variants={itemVariants} className="mt-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between"
                      >
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between"
                      >
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between"
                      >
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-14" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );

  const renderUserMain = () => (
    <main className="py-6">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-6 lg:space-y-8">
        {/* Welcome header card */}
        {showHeader && (
          <motion.div variants={itemVariants}>
            <HeaderSkeleton />
          </motion.div>
        )}

        {/* Stats Grid */}
        {showStats && (
          <motion.div variants={itemVariants}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Performance overview */}
        {showCharts && (
          <motion.div variants={itemVariants}>
            <ChartCardSkeleton />
          </motion.div>
        )}

        {/* Recent activity + quick actions */}
        {showActivity && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            <motion.div variants={itemVariants}>
              <ActivitySkeleton />
            </motion.div>
            <motion.div variants={itemVariants}>
              <QuickActionsSkeleton />
            </motion.div>
          </div>
        )}
      </div>
    </main>
  );

  return (
    <div className={`min-h-screen bg-transparent ${className}`}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex"
      >
        {/* Sidebar Skeleton */}
        {showSidebar && <SidebarSkeleton />}

        {/* Main Content */}
        <div className={`flex-1 ${showSidebar ? "lg:pl-64" : ""}`}>
          {variant === "user" ? renderUserMain() : renderAdminMain()}
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardSkeleton;
