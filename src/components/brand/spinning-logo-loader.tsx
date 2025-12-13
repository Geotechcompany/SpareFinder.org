import React from "react";
import clsx from "clsx";

type SpinningLogoLoaderProps = {
  label?: string;
  size?: number;
  className?: string;
  children?: React.ReactNode;
};

export const SpinningLogoLoader = ({
  label = "Loading…",
  size = 72,
  className,
  children,
}: SpinningLogoLoaderProps) => {
  return (
    <div
      className={clsx(
        "flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-background via-[#F0F2F5] to-[#E8EBF1] text-foreground dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-50",
        className
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="relative"
          style={{ width: size, height: size }}
          aria-label={label}
        >
          {/* Spinning logo (clockwise) */}
          <img
            src="/sparefinderlogodark.png"
            alt="SpareFinder"
            className="h-full w-full object-contain motion-safe:animate-[spin_1.35s_linear_infinite] motion-reduce:animate-none"
          />
        </div>

        {label ? (
          <p className="text-sm text-muted-foreground">{label}</p>
        ) : null}

        {children ? <div className="sr-only">{children}</div> : null}
      </div>
    </div>
  );
};


