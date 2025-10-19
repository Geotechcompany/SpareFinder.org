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

  const renderPage = () => {
    switch (variant) {
      case "dashboard":
        return renderDashboardPage();
      case "profile":
        return renderProfilePage();
      case "upload":
        return renderUploadPage();
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
