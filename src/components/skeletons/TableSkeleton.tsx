import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
  showHeader?: boolean;
  showPagination?: boolean;
  variant?: "default" | "compact" | "detailed";
  className?: string;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({
  columns = 4,
  rows = 5,
  showHeader = true,
  showPagination = true,
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

  const rowVariants = {
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

  const getColumnWidths = () => {
    const widths = ["w-20", "w-32", "w-24", "w-16", "w-28", "w-36"];
    return Array.from({ length: columns }, (_, i) => widths[i % widths.length]);
  };

  const renderCompactTable = () => (
    <div className="space-y-2">
      {showHeader && (
        <div className="flex space-x-4 py-2 border-b">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={i}
              className={`h-4 ${getColumnWidths()[i]}`}
              variant="text"
            />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <motion.div
          key={rowIndex}
          variants={rowVariants}
          className="flex space-x-4 py-2"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={`h-4 ${getColumnWidths()[colIndex]}`}
              variant="text"
            />
          ))}
        </motion.div>
      ))}
    </div>
  );

  const renderDetailedTable = () => (
    <div className="space-y-3">
      {showHeader && (
        <div className="flex space-x-4 py-3 border-b bg-muted/30">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={i}
              className={`h-5 ${getColumnWidths()[i]}`}
              variant="text"
            />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <motion.div
          key={rowIndex}
          variants={rowVariants}
          className="flex space-x-4 py-3 border-b border-muted/20"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={`h-4 ${getColumnWidths()[colIndex]}`}
              variant="text"
            />
          ))}
        </motion.div>
      ))}
    </div>
  );

  const renderDefaultTable = () => (
    <div className="space-y-3">
      {showHeader && (
        <div className="flex space-x-4 py-2 border-b">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={i}
              className={`h-4 ${getColumnWidths()[i]}`}
              variant="text"
            />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <motion.div
          key={rowIndex}
          variants={rowVariants}
          className="flex space-x-4 py-2"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={`h-4 ${getColumnWidths()[colIndex]}`}
              variant="text"
            />
          ))}
        </motion.div>
      ))}
    </div>
  );

  const renderTable = () => {
    switch (variant) {
      case "compact":
        return renderCompactTable();
      case "detailed":
        return renderDetailedTable();
      default:
        return renderDefaultTable();
    }
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" variant="text" />
          <Skeleton className="h-8 w-24" variant="button" />
        </div>
      </CardHeader>
      <CardContent>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {renderTable()}
        </motion.div>
        {showPagination && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <Skeleton className="h-4 w-32" variant="text" />
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-8" variant="button" />
              <Skeleton className="h-8 w-8" variant="button" />
              <Skeleton className="h-8 w-8" variant="button" />
              <Skeleton className="h-8 w-8" variant="button" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TableSkeleton;
