import React from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface DashboardSkeletonProps {
  variant?: 'admin' | 'user';
  showSidebar?: boolean;
  showHeader?: boolean;
  showStats?: boolean;
  showCharts?: boolean;
  showTable?: boolean;
  showActivity?: boolean;
  className?: string;
}

const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({
  variant = 'user',
  showSidebar = true,
  showHeader = true,
  showStats = true,
  showCharts = true,
  showTable = true,
  showActivity = true,
  className = ''
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const StatCardSkeleton = () => (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );

  const ChartCardSkeleton = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex space-x-2 mt-4">
            <Skeleton className="h-2 w-8 rounded-full" />
            <Skeleton className="h-2 w-12 rounded-full" />
            <Skeleton className="h-2 w-6 rounded-full" />
            <Skeleton className="h-2 w-10 rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const TableSkeleton = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Table header */}
          <div className="flex space-x-4 py-2 border-b">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          {/* Table rows */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex space-x-4 py-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const ActivitySkeleton = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const SidebarSkeleton = () => (
    <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 lg:bg-gray-900">
      <div className="flex flex-col flex-grow bg-gray-900 pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <Skeleton className="h-8 w-32" />
        </div>
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center px-2 py-2 text-sm font-medium rounded-md">
              <Skeleton className="h-4 w-4 mr-3" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </nav>
      </div>
    </div>
  );

  const HeaderSkeleton = () => (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1">
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex"
      >
        {/* Sidebar Skeleton */}
        {showSidebar && <SidebarSkeleton />}

        {/* Main Content */}
        <div className={`flex-1 ${showSidebar ? 'lg:pl-64' : ''}`}>
          {/* Header Skeleton */}
          {showHeader && <HeaderSkeleton />}

          {/* Main Dashboard Content */}
          <main className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {/* Page Header */}
              <motion.div variants={itemVariants} className="mb-8">
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
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
              {variant === 'admin' && (
                <motion.div variants={itemVariants} className="mt-8">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <Card>
                      <CardHeader>
                        <Skeleton className="h-5 w-32" />
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center justify-between">
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
                            <div key={i} className="flex items-center justify-between">
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
                            <div key={i} className="flex items-center justify-between">
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
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardSkeleton;