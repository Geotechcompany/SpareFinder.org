import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Skeleton,
  SkeletonAvatar,
  SkeletonText,
} from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ListSkeletonProps {
  items?: number;
  showHeader?: boolean;
  variant?:
    | "default"
    | "activity"
    | "notification"
    | "user"
    | "product"
    | "message";
  className?: string;
}

const ListSkeleton: React.FC<ListSkeletonProps> = ({
  items = 5,
  showHeader = true,
  variant = "default",
  className,
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  const renderActivityList = () => (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <motion.div
          key={i}
          variants={itemVariants}
          className="flex items-start space-x-3 p-3 rounded-lg border bg-card"
        >
          <SkeletonAvatar size="sm" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-24" variant="text" />
              <Skeleton className="h-3 w-16" variant="text" />
            </div>
            <Skeleton className="h-3 w-3/4" variant="text" />
            <Skeleton className="h-3 w-1/2" variant="text" />
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderNotificationList = () => (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <motion.div
          key={i}
          variants={itemVariants}
          className="flex items-start space-x-3 p-3 rounded-lg border bg-card"
        >
          <Skeleton className="h-8 w-8 rounded-full" variant="avatar" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-3/4" variant="text" />
            <Skeleton className="h-3 w-1/2" variant="text" />
          </div>
          <Skeleton className="h-2 w-2 rounded-full" variant="button" />
        </motion.div>
      ))}
    </div>
  );

  const renderUserList = () => (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <motion.div
          key={i}
          variants={itemVariants}
          className="flex items-center space-x-3 p-3 rounded-lg border bg-card"
        >
          <SkeletonAvatar size="md" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-32" variant="text" />
            <Skeleton className="h-3 w-24" variant="text" />
          </div>
          <Skeleton className="h-6 w-16" variant="button" />
        </motion.div>
      ))}
    </div>
  );

  const renderProductList = () => (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <motion.div
          key={i}
          variants={itemVariants}
          className="flex items-center space-x-4 p-4 rounded-lg border bg-card"
        >
          <Skeleton className="h-16 w-16 rounded-lg" variant="image" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" variant="text" />
            <Skeleton className="h-4 w-1/2" variant="text" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-16" variant="text" />
              <Skeleton className="h-4 w-20" variant="text" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-6 w-20" variant="button" />
            <Skeleton className="h-4 w-16" variant="text" />
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderMessageList = () => (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <motion.div
          key={i}
          variants={itemVariants}
          className="flex items-start space-x-3 p-3 rounded-lg border bg-card"
        >
          <SkeletonAvatar size="sm" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" variant="text" />
              <Skeleton className="h-3 w-12" variant="text" />
            </div>
            <Skeleton className="h-3 w-3/4" variant="text" />
            <Skeleton className="h-3 w-1/2" variant="text" />
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderDefaultList = () => (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <motion.div
          key={i}
          variants={itemVariants}
          className="flex items-center space-x-3 p-3 rounded-lg border bg-card"
        >
          <Skeleton className="h-10 w-10 rounded-full" variant="avatar" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-32" variant="text" />
            <Skeleton className="h-3 w-24" variant="text" />
          </div>
          <Skeleton className="h-6 w-16" variant="button" />
        </motion.div>
      ))}
    </div>
  );

  const renderList = () => {
    switch (variant) {
      case "activity":
        return renderActivityList();
      case "notification":
        return renderNotificationList();
      case "user":
        return renderUserList();
      case "product":
        return renderProductList();
      case "message":
        return renderMessageList();
      default:
        return renderDefaultList();
    }
  };

  return (
    <Card className={cn("", className)}>
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" variant="text" />
            <Skeleton className="h-6 w-16" variant="button" />
          </div>
        </CardHeader>
      )}
      <CardContent>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {renderList()}
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default ListSkeleton;
