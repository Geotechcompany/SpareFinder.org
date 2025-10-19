import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ModernSkeletonProps {
  variant?: "text" | "rectangular" | "circular" | "rounded";
  width?: number | string;
  height?: number | string;
  animation?: "pulse" | "wave" | "shimmer" | "none";
  className?: string;
  lines?: number;
  spacing?: number;
}

const ModernSkeleton: React.FC<ModernSkeletonProps> = ({
  variant = "rectangular",
  width = "100%",
  height = 20,
  animation = "shimmer",
  className,
  lines = 1,
  spacing = 8,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "circular":
        return "rounded-full";
      case "rounded":
        return "rounded-lg";
      case "text":
        return "rounded-sm";
      default:
        return "rounded-md";
    }
  };

  const getAnimationStyles = () => {
    switch (animation) {
      case "pulse":
        return "animate-pulse";
      case "wave":
        return "animate-[wave_1.5s_ease-in-out_infinite]";
      case "shimmer":
        return "bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-[shimmer_2s_infinite]";
      default:
        return "";
    }
  };

  const getDimensions = () => {
    const widthValue = typeof width === "number" ? `${width}px` : width;
    const heightValue = typeof height === "number" ? `${height}px` : height;
    return { width: widthValue, height: heightValue };
  };

  const dimensions = getDimensions();

  if (lines > 1) {
    return (
      <div className="space-y-2" style={{ gap: `${spacing}px` }}>
        {Array.from({ length: lines }).map((_, index) => (
          <motion.div
            key={index}
            className={cn(
              "bg-muted",
              getVariantStyles(),
              getAnimationStyles(),
              className
            )}
            style={{
              width: index === lines - 1 ? "75%" : dimensions.width,
              height: dimensions.height,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.5,
              delay: index * 0.1,
              ease: "easeOut",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className={cn(
        "bg-muted",
        getVariantStyles(),
        getAnimationStyles(),
        className
      )}
      style={dimensions}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.5,
        ease: "easeOut",
      }}
    />
  );
};

// Predefined skeleton components for common use cases
export const SkeletonText = ({
  lines = 1,
  className,
  ...props
}: {
  lines?: number;
  className?: string;
}) => (
  <ModernSkeleton
    variant="text"
    height={16}
    animation="shimmer"
    lines={lines}
    className={className}
    {...props}
  />
);

export const SkeletonTitle = ({
  className,
  ...props
}: {
  className?: string;
}) => (
  <ModernSkeleton
    variant="text"
    height={24}
    width="60%"
    animation="shimmer"
    className={className}
    {...props}
  />
);

export const SkeletonAvatar = ({
  size = "md",
  className,
  ...props
}: {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) => {
  const sizes = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  };

  return (
    <ModernSkeleton
      variant="circular"
      width={sizes[size]}
      height={sizes[size]}
      animation="pulse"
      className={className}
      {...props}
    />
  );
};

export const SkeletonButton = ({
  size = "md",
  className,
  ...props
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) => {
  const sizes = {
    sm: { width: 80, height: 32 },
    md: { width: 100, height: 40 },
    lg: { width: 120, height: 48 },
  };

  return (
    <ModernSkeleton
      variant="rounded"
      width={sizes[size].width}
      height={sizes[size].height}
      animation="shimmer"
      className={className}
      {...props}
    />
  );
};

export const SkeletonCard = ({
  className,
  ...props
}: {
  className?: string;
}) => (
  <div className={cn("p-6 rounded-lg border bg-card", className)} {...props}>
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <SkeletonAvatar size="md" />
        <div className="space-y-2">
          <SkeletonText lines={1} />
          <SkeletonText lines={1} />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  </div>
);

export const SkeletonImage = ({
  className,
  ...props
}: {
  className?: string;
}) => (
  <ModernSkeleton
    variant="rounded"
    height={200}
    width="100%"
    animation="shimmer"
    className={cn("aspect-video", className)}
    {...props}
  />
);

export const SkeletonChart = ({
  className,
  ...props
}: {
  className?: string;
}) => (
  <div className={cn("space-y-4", className)} {...props}>
    <div className="flex items-center justify-between">
      <SkeletonTitle />
      <SkeletonButton size="sm" />
    </div>
    <div className="space-y-3">
      <ModernSkeleton
        variant="text"
        height={16}
        width="100%"
        animation="shimmer"
      />
      <ModernSkeleton
        variant="text"
        height={16}
        width="75%"
        animation="shimmer"
      />
      <ModernSkeleton
        variant="text"
        height={16}
        width="50%"
        animation="shimmer"
      />
      <div className="flex space-x-2 mt-4">
        <ModernSkeleton
          variant="rounded"
          height={8}
          width={32}
          animation="pulse"
        />
        <ModernSkeleton
          variant="rounded"
          height={8}
          width={48}
          animation="pulse"
        />
        <ModernSkeleton
          variant="rounded"
          height={8}
          width={24}
          animation="pulse"
        />
        <ModernSkeleton
          variant="rounded"
          height={8}
          width={40}
          animation="pulse"
        />
      </div>
    </div>
  </div>
);

export default ModernSkeleton;
