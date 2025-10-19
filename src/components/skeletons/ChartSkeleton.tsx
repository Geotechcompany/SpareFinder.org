import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ChartSkeletonProps {
  variant?: "line" | "bar" | "pie" | "area" | "donut" | "scatter" | "radar";
  showHeader?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  className?: string;
}

const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  variant = "line",
  showHeader = true,
  showLegend = true,
  showTooltip = false,
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

  const renderLineChart = () => (
    <div className="space-y-4">
      <div className="h-64 relative">
        {/* Chart area */}
        <div className="absolute inset-0 flex items-end justify-between px-4 pb-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              variants={{
                hidden: { height: 0 },
                visible: {
                  height: `${Math.random() * 80 + 20}%`,
                  transition: {
                    duration: 0.8,
                    delay: i * 0.05,
                    ease: "easeOut",
                  },
                },
              }}
              className="w-6 bg-gradient-to-t from-primary/60 to-primary/20 rounded-t-sm"
            />
          ))}
        </div>
        {/* Grid lines */}
        <div className="absolute inset-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-full border-t border-muted/30"
              style={{ top: `${i * 25}%` }}
            />
          ))}
        </div>
      </div>
      {showLegend && (
        <div className="flex justify-center space-x-4">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-3 w-3 rounded-full" variant="chart" />
            <Skeleton className="h-4 w-16" variant="text" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-3 w-3 rounded-full" variant="chart" />
            <Skeleton className="h-4 w-16" variant="text" />
          </div>
        </div>
      )}
    </div>
  );

  const renderBarChart = () => (
    <div className="space-y-4">
      <div className="h-64 relative">
        <div className="absolute inset-0 flex items-end justify-between px-4 pb-4 space-x-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              variants={{
                hidden: { height: 0 },
                visible: {
                  height: `${Math.random() * 80 + 20}%`,
                  transition: {
                    duration: 0.8,
                    delay: i * 0.1,
                    ease: "easeOut",
                  },
                },
              }}
              className="flex-1 bg-gradient-to-t from-primary/60 to-primary/20 rounded-t"
            />
          ))}
        </div>
      </div>
      {showLegend && (
        <div className="flex justify-center space-x-4">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-3 w-3 rounded" variant="chart" />
            <Skeleton className="h-4 w-16" variant="text" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-3 w-3 rounded" variant="chart" />
            <Skeleton className="h-4 w-16" variant="text" />
          </div>
        </div>
      )}
    </div>
  );

  const renderPieChart = () => (
    <div className="space-y-4">
      <div className="h-64 relative flex items-center justify-center">
        <div className="relative w-48 h-48">
          {/* Pie chart segments */}
          <div className="absolute inset-0 rounded-full border-8 border-muted/30" />
          <motion.div
            variants={{
              hidden: { scale: 0 },
              visible: {
                scale: 1,
                transition: {
                  duration: 0.8,
                  ease: "easeOut",
                },
              },
            }}
            className="absolute inset-0 rounded-full border-8 border-primary/60"
            style={{
              clipPath:
                "polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 50%)",
            }}
          />
          <motion.div
            variants={{
              hidden: { scale: 0 },
              visible: {
                scale: 1,
                transition: {
                  duration: 0.8,
                  delay: 0.2,
                  ease: "easeOut",
                },
              },
            }}
            className="absolute inset-0 rounded-full border-8 border-primary/40"
            style={{
              clipPath: "polygon(50% 50%, 100% 0%, 100% 100%, 50% 50%)",
            }}
          />
        </div>
      </div>
      {showLegend && (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <Skeleton className="h-3 w-3 rounded-full" variant="chart" />
              <Skeleton className="h-4 w-16" variant="text" />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAreaChart = () => (
    <div className="space-y-4">
      <div className="h-64 relative">
        <div className="absolute inset-0 flex items-end justify-between px-4 pb-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.div
              key={i}
              variants={{
                hidden: { height: 0 },
                visible: {
                  height: `${Math.random() * 80 + 20}%`,
                  transition: {
                    duration: 0.8,
                    delay: i * 0.05,
                    ease: "easeOut",
                  },
                },
              }}
              className="w-8 bg-gradient-to-t from-primary/60 to-primary/20 rounded-t-sm"
            />
          ))}
        </div>
        {/* Area fill */}
        <motion.div
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 0.3,
              transition: {
                duration: 0.8,
                delay: 0.5,
              },
            },
          }}
          className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent rounded-t-lg"
        />
      </div>
      {showLegend && (
        <div className="flex justify-center space-x-4">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-3 w-3 rounded-full" variant="chart" />
            <Skeleton className="h-4 w-16" variant="text" />
          </div>
        </div>
      )}
    </div>
  );

  const renderScatterChart = () => (
    <div className="space-y-4">
      <div className="h-64 relative">
        <div className="absolute inset-0">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              variants={{
                hidden: { scale: 0, opacity: 0 },
                visible: {
                  scale: 1,
                  opacity: 1,
                  transition: {
                    duration: 0.5,
                    delay: i * 0.05,
                    ease: "easeOut",
                  },
                },
              }}
              className="absolute w-3 h-3 bg-primary/60 rounded-full"
              style={{
                left: `${Math.random() * 90 + 5}%`,
                top: `${Math.random() * 90 + 5}%`,
              }}
            />
          ))}
        </div>
      </div>
      {showLegend && (
        <div className="flex justify-center space-x-4">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-3 w-3 rounded-full" variant="chart" />
            <Skeleton className="h-4 w-16" variant="text" />
          </div>
        </div>
      )}
    </div>
  );

  const renderChart = () => {
    switch (variant) {
      case "line":
        return renderLineChart();
      case "bar":
        return renderBarChart();
      case "pie":
        return renderPieChart();
      case "area":
        return renderAreaChart();
      case "scatter":
        return renderScatterChart();
      default:
        return renderLineChart();
    }
  };

  return (
    <Card className={cn("", className)}>
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" variant="text" />
            <Skeleton className="h-8 w-20" variant="button" />
          </div>
        </CardHeader>
      )}
      <CardContent>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {renderChart()}
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default ChartSkeleton;
