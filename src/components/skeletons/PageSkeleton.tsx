import React from "react";
import { motion } from "framer-motion";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PageSkeletonProps {
  variant?:
    | "dashboard"
    | "profile"
    | "settings"
    | "analytics"
    | "upload"
    | "history";
  showSidebar?: boolean;
  showHeader?: boolean;
  className?: string;
}

const PageSkeleton: React.FC<PageSkeletonProps> = ({
  variant = "dashboard",
  showSidebar = true,
  showHeader = true,
  className,
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

  const renderDashboardPage = () => (
    <div className="space-y-8">
      {/* Page Header */}
      <motion.div variants={itemVariants} className="space-y-2">
        <Skeleton className="h-8 w-48" variant="text" />
        <Skeleton className="h-4 w-64" variant="text" />
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-4 w-24" variant="text" />
              <Skeleton className="h-8 w-8 rounded-full" variant="avatar" />
            </div>
            <Skeleton className="h-8 w-16 mb-2" variant="text" />
            <Skeleton className="h-3 w-20" variant="text" />
          </div>
        ))}
      </motion.div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          variants={itemVariants}
          className="p-6 rounded-lg border bg-card"
        >
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-32" variant="text" />
            <Skeleton className="h-8 w-20" variant="button" />
          </div>
          <div className="h-64 space-y-3">
            <Skeleton className="h-4 w-full" variant="chart" />
            <Skeleton className="h-4 w-3/4" variant="chart" />
            <Skeleton className="h-4 w-1/2" variant="chart" />
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="p-6 rounded-lg border bg-card"
        >
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-32" variant="text" />
            <Skeleton className="h-8 w-24" variant="button" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" variant="avatar" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" variant="text" />
                  <Skeleton className="h-3 w-1/2" variant="text" />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );

  const renderProfilePage = () => (
    <div className="space-y-8">
      {/* Profile Header */}
      <motion.div
        variants={itemVariants}
        className="flex items-center space-x-6"
      >
        <Skeleton className="h-24 w-24 rounded-full" variant="avatar" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" variant="text" />
          <Skeleton className="h-4 w-32" variant="text" />
          <Skeleton className="h-4 w-24" variant="text" />
        </div>
      </motion.div>

      {/* Profile Stats */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-6 rounded-lg border bg-card text-center">
            <Skeleton className="h-8 w-16 mx-auto mb-2" variant="text" />
            <Skeleton className="h-4 w-24 mx-auto" variant="text" />
          </div>
        ))}
      </motion.div>

      {/* Profile Content */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <div className="p-6 rounded-lg border bg-card">
          <Skeleton className="h-6 w-32 mb-4" variant="text" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" variant="text" />
                <Skeleton className="h-10 w-full" variant="input" />
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-lg border bg-card">
          <Skeleton className="h-6 w-32 mb-4" variant="text" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-12 w-12 rounded-xl" variant="image" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" variant="text" />
                  <Skeleton className="h-3 w-1/2" variant="text" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );

  const renderUploadPage = () => (
    <div className="space-y-8">
      {/* Upload Header */}
      <motion.div variants={itemVariants} className="text-center space-y-2">
        <Skeleton className="h-8 w-48 mx-auto" variant="text" />
        <Skeleton className="h-4 w-64 mx-auto" variant="text" />
      </motion.div>

      {/* Upload Area */}
      <motion.div
        variants={itemVariants}
        className="p-12 rounded-lg border-2 border-dashed border-muted-foreground/25 text-center"
      >
        <Skeleton className="h-16 w-16 mx-auto mb-4" variant="image" />
        <Skeleton className="h-6 w-48 mx-auto mb-2" variant="text" />
        <Skeleton className="h-4 w-64 mx-auto mb-6" variant="text" />
        <Skeleton className="h-10 w-32 mx-auto" variant="button" />
      </motion.div>

      {/* Recent Uploads */}
      <motion.div
        variants={itemVariants}
        className="p-6 rounded-lg border bg-card"
      >
        <Skeleton className="h-6 w-32 mb-4" variant="text" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-16 w-16 rounded-lg" variant="image" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" variant="text" />
                <Skeleton className="h-3 w-1/2" variant="text" />
              </div>
              <Skeleton className="h-6 w-16" variant="button" />
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );

  const renderHistoryPage = () => (
    <div className="space-y-8">
      {/* History Header */}
      <motion.div variants={itemVariants} className="space-y-2">
        <Skeleton className="h-7 w-56" variant="text" />
        <Skeleton className="h-4 w-80" variant="text" />
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border bg-card p-4 sm:p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <Skeleton className="h-4 w-24" variant="text" />
              <Skeleton className="h-9 w-9 rounded-xl" variant="avatar" />
            </div>
            <Skeleton className="mb-1 h-7 w-16" variant="text" />
            <Skeleton className="h-3 w-24" variant="text" />
          </div>
        ))}
      </motion.div>

      {/* SpareFinder Research Jobs Grid */}
      <motion.div variants={itemVariants} className="space-y-4">
        <Skeleton className="h-5 w-40" variant="text" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border bg-card shadow-sm"
            >
              <Skeleton className="h-32 w-full" variant="image" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-40" variant="text" />
                <Skeleton className="h-3 w-32" variant="text" />
                <Skeleton className="h-3 w-24" variant="text" />
                <div className="flex items-center justify-between pt-2">
                  <Skeleton className="h-8 w-24" variant="button" />
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-8 w-8" variant="button" />
                    <Skeleton className="h-8 w-8" variant="button" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );

  const renderSettingsPage = () => (
    <div className="space-y-8">
      {/* Settings Header */}
      <motion.div variants={itemVariants} className="space-y-2">
        <Skeleton className="h-7 w-56" variant="text" />
        <Skeleton className="h-4 w-80" variant="text" />
      </motion.div>

      {/* Settings Layout: sidebar tabs + content */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 gap-6 lg:grid-cols-4"
      >
        {/* Tabs column */}
        <div className="lg:col-span-1 rounded-2xl border bg-card p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2"
            >
              <div className="flex items-center space-x-3">
                <Skeleton className="h-5 w-5" variant="button" />
                <Skeleton className="h-4 w-24" variant="text" />
              </div>
              <Skeleton className="h-4 w-8" variant="text" />
            </div>
          ))}
        </div>

        {/* Forms column */}
        <div className="lg:col-span-3 space-y-6">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-2xl border bg-card p-4 sm:p-6 space-y-4"
            >
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" variant="text" />
                <Skeleton className="h-4 w-64" variant="text" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" variant="text" />
                    <Skeleton className="h-10 w-full" variant="input" />
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Skeleton className="h-8 w-24" variant="button" />
                <Skeleton className="h-4 w-32" variant="text" />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );

  const renderAnalyticsPage = () => (
    <div className="space-y-8">
      {/* Billing/Analytics Header */}
      <motion.div variants={itemVariants} className="space-y-2">
        <Skeleton className="h-7 w-56" variant="text" />
        <Skeleton className="h-4 w-96" variant="text" />
      </motion.div>

      {/* Plan cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border bg-card p-5 space-y-4 shadow-sm"
          >
            <Skeleton className="h-5 w-32" variant="text" />
            <div className="flex items-baseline space-x-2">
              <Skeleton className="h-8 w-16" variant="text" />
              <Skeleton className="h-4 w-10" variant="text" />
            </div>
            <SkeletonText lines={3} />
            <Skeleton className="h-9 w-full" variant="button" />
          </div>
        ))}
      </motion.div>

      {/* Invoices table */}
      <motion.div variants={itemVariants} className="rounded-2xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
          <Skeleton className="h-5 w-40" variant="text" />
          <Skeleton className="h-9 w-32" variant="button" />
        </div>
        <div className="divide-y px-4 py-3 sm:px-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" variant="text" />
                <Skeleton className="h-3 w-24" variant="text" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-16" variant="text" />
                <Skeleton className="h-4 w-16" variant="text" />
                <Skeleton className="h-8 w-24" variant="button" />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );

  const renderPage = () => {
    switch (variant) {
      case "dashboard":
        return renderDashboardPage();
      case "profile":
        return renderProfilePage();
      case "upload":
        return renderUploadPage();
      case "history":
        return renderHistoryPage();
      case "settings":
        return renderSettingsPage();
      case "analytics":
        return renderAnalyticsPage();
      default:
        return renderDashboardPage();
    }
  };

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex"
      >
        {/* Sidebar */}
        {showSidebar && (
          <motion.div
            variants={itemVariants}
            className="w-64 p-6 border-r bg-card"
          >
            <div className="space-y-6">
              <Skeleton className="h-8 w-32" variant="text" />
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="h-5 w-5" variant="button" />
                    <Skeleton className="h-4 w-24" variant="text" />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          {showHeader && (
            <motion.div
              variants={itemVariants}
              className="p-6 border-b bg-card"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32" variant="text" />
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-8 w-8 rounded-full" variant="avatar" />
                  <Skeleton className="h-8 w-24" variant="button" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Page Content */}
          <motion.div variants={itemVariants} className="p-6">
            {renderPage()}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default PageSkeleton;
