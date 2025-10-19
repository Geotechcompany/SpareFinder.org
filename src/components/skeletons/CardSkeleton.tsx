import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Skeleton,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonText,
} from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CardSkeletonProps {
  variant?: "default" | "stats" | "profile" | "activity" | "metric" | "chart";
  className?: string;
  showHeader?: boolean;
  showContent?: boolean;
  showFooter?: boolean;
  lines?: number;
}

const CardSkeleton: React.FC<CardSkeletonProps> = ({
  variant = "default",
  className,
  showHeader = true,
  showContent = true,
  showFooter = false,
  lines = 3,
}) => {
  const containerVariants = {
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

  const renderStatsCard = () => (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" variant="text" />
          <Skeleton className="h-8 w-8 rounded-full" variant="avatar" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" variant="text" />
        <Skeleton className="h-3 w-20" variant="text" />
      </CardContent>
    </Card>
  );

  const renderProfileCard = () => (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center space-x-4">
          <SkeletonAvatar size="lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" variant="text" />
            <Skeleton className="h-4 w-24" variant="text" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <SkeletonText lines={lines} />
      </CardContent>
    </Card>
  );

  const renderActivityCard = () => (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" variant="text" />
          <Skeleton className="h-6 w-16" variant="button" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <SkeletonAvatar size="sm" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" variant="text" />
                <Skeleton className="h-3 w-1/2" variant="text" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderMetricCard = () => (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" variant="text" />
          <Skeleton className="h-6 w-6 rounded" variant="button" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-8 w-20" variant="text" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-3 w-12" variant="text" />
            <Skeleton className="h-3 w-16" variant="text" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderChartCard = () => (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" variant="text" />
          <Skeleton className="h-8 w-20" variant="button" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" variant="chart" />
          <Skeleton className="h-4 w-3/4" variant="chart" />
          <Skeleton className="h-4 w-1/2" variant="chart" />
          <div className="flex space-x-2 mt-4">
            <Skeleton className="h-2 w-8 rounded-full" variant="chart" />
            <Skeleton className="h-2 w-12 rounded-full" variant="chart" />
            <Skeleton className="h-2 w-6 rounded-full" variant="chart" />
            <Skeleton className="h-2 w-10 rounded-full" variant="chart" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderDefaultCard = () => (
    <Card className={cn("", className)}>
      {showHeader && (
        <CardHeader>
          <Skeleton className="h-5 w-32" variant="text" />
        </CardHeader>
      )}
      {showContent && (
        <CardContent>
          <SkeletonText lines={lines} />
        </CardContent>
      )}
      {showFooter && (
        <div className="px-6 py-4 border-t">
          <div className="flex space-x-2">
            <Skeleton className="h-8 w-20" variant="button" />
            <Skeleton className="h-8 w-20" variant="button" />
          </div>
        </div>
      )}
    </Card>
  );

  const renderCard = () => {
    switch (variant) {
      case "stats":
        return renderStatsCard();
      case "profile":
        return renderProfileCard();
      case "activity":
        return renderActivityCard();
      case "metric":
        return renderMetricCard();
      case "chart":
        return renderChartCard();
      default:
        return renderDefaultCard();
    }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      {renderCard()}
    </motion.div>
  );
};

export default CardSkeleton;
