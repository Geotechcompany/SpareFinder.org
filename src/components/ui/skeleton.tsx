import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const skeletonVariants = cva("animate-pulse rounded-md bg-muted", {
  variants: {
    variant: {
      default: "bg-muted",
      card: "bg-muted/50",
      text: "bg-muted/70",
      avatar: "bg-muted/60 rounded-full",
      button: "bg-muted/80 rounded-md",
      input: "bg-muted/60 rounded-md",
      image: "bg-muted/40 rounded-lg",
      chart: "bg-muted/30 rounded-sm",
      shimmer:
        "bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-[shimmer_2s_infinite]",
      pulse: "bg-muted animate-pulse",
      wave: "bg-muted animate-[wave_1.5s_ease-in-out_infinite]",
    },
    size: {
      sm: "h-3",
      md: "h-4",
      lg: "h-6",
      xl: "h-8",
      "2xl": "h-12",
      full: "h-full",
    },
    width: {
      xs: "w-8",
      sm: "w-16",
      md: "w-24",
      lg: "w-32",
      xl: "w-48",
      "2xl": "w-64",
      full: "w-full",
      auto: "w-auto",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
    width: "auto",
  },
});

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  lines?: number;
  showIcon?: boolean;
  iconSize?: "sm" | "md" | "lg";
}

function Skeleton({
  className,
  variant,
  size,
  width,
  lines = 1,
  showIcon = false,
  iconSize = "md",
  ...props
}: SkeletonProps) {
  if (lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              skeletonVariants({ variant, size, width, className }),
              index === lines - 1 && "w-3/4" // Last line is shorter
            )}
            {...props}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(skeletonVariants({ variant, size, width }), className)}
      {...props}
    />
  );
}

// Specific skeleton components for common UI elements
export const SkeletonCard = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("rounded-lg border bg-card p-6 shadow-sm", className)}
    {...props}
  >
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" variant="avatar" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" variant="text" />
          <Skeleton className="h-3 w-24" variant="text" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" variant="text" lines={2} />
    </div>
  </div>
);

export const SkeletonAvatar = ({
  size = "md",
  className,
  ...props
}: {
  size?: "sm" | "md" | "lg" | "xl";
} & React.HTMLAttributes<HTMLDivElement>) => {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  return (
    <Skeleton
      className={cn(sizeClasses[size], "rounded-full", className)}
      variant="avatar"
      {...props}
    />
  );
};

export const SkeletonButton = ({
  size = "md",
  className,
  ...props
}: { size?: "sm" | "md" | "lg" } & React.HTMLAttributes<HTMLDivElement>) => {
  const sizeClasses = {
    sm: "h-8 px-3",
    md: "h-10 px-4",
    lg: "h-12 px-6",
  };

  return (
    <Skeleton
      className={cn(sizeClasses[size], "rounded-md", className)}
      variant="button"
      {...props}
    />
  );
};

export const SkeletonInput = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <Skeleton
    className={cn("h-10 w-full rounded-md", className)}
    variant="input"
    {...props}
  />
);

export const SkeletonText = ({
  lines = 1,
  className,
  ...props
}: { lines?: number } & React.HTMLAttributes<HTMLDivElement>) => (
  <Skeleton
    className={cn("", className)}
    variant="text"
    lines={lines}
    {...props}
  />
);

export const SkeletonImage = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <Skeleton
    className={cn("aspect-video w-full rounded-lg", className)}
    variant="image"
    {...props}
  />
);

export const SkeletonChart = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("space-y-4", className)} {...props}>
    <div className="flex items-center justify-between">
      <Skeleton className="h-5 w-32" variant="text" />
      <Skeleton className="h-8 w-20" variant="button" />
    </div>
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
  </div>
);

export { Skeleton };
