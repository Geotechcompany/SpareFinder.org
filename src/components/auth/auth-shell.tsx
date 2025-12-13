import React from "react";
import { Link } from "react-router-dom";

type AuthShellProps = {
  /** Top-left back link */
  backHref: string;
  backLabel: string;
  /** Page branding */
  logoSrc: string;
  logoAlt?: string;
  /** Left column hero */
  badge?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Main card body */
  children: React.ReactNode;
  /** Optional right column image */
  rightImage?: {
    src: string;
    alt: string;
  };
  /** Optional right column overlay content */
  rightContent?: React.ReactNode;
  /** Optional footer text */
  footerText?: React.ReactNode;
};

export const AuthShell = ({
  backHref,
  backLabel,
  logoSrc,
  logoAlt = "SpareFinder logo",
  badge,
  title,
  description,
  children,
  rightImage,
  rightContent,
  footerText,
}: AuthShellProps) => {
  return (
    <div className="relative flex min-h-[100dvh] bg-gradient-to-b from-background via-[#F0F2F5] to-[#E8EBF1] text-foreground dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-50">
      {/* Left: form + chrome */}
      <div className="relative z-10 flex flex-1 flex-col gap-6 px-4 py-5 sm:px-10 sm:py-8 lg:px-16 lg:py-10">
        {/* Subtle gradient + glow */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-24 top-32 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -right-32 bottom-10 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-400/15" />
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
        </div>

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link
            to={backHref}
            className="group inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-4 w-4 rounded-full border border-border bg-card" />
              <span>{backLabel}</span>
            </span>
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full bg-card/80 px-3 py-1 text-xs text-muted-foreground ring-1 ring-border/60 backdrop-blur dark:bg-slate-900/80 dark:text-slate-200 dark:ring-white/10">
            <img
              src={logoSrc}
              alt={logoAlt}
              className="h-7 w-auto object-contain"
            />
          </div>
        </div>

        {/* Centered card */}
        <div className="flex flex-1 items-start sm:items-center">
          <div className="w-full max-w-md mx-auto">
            {/* Headline / hero copy */}
            <div className="mb-6 space-y-3">
              {badge ? (
                <div className="inline-flex items-center rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200">
                  {badge}
                </div>
              ) : null}
              <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                {title}
              </h1>
              {description ? (
                <p className="max-w-lg text-sm text-muted-foreground sm:text-base">
                  {description}
                </p>
              ) : null}
            </div>

            <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-card/90 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.65)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 sm:p-7">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
              {children}
            </div>
          </div>
        </div>

        <div className="mt-auto pt-6 flex items-center justify-between text-[11px] text-muted-foreground">
          {footerText ?? (
            <span>© {new Date().getFullYear()} SpareFinder. All rights reserved.</span>
          )}
        </div>
      </div>

      {/* Right: product imagery */}
      {rightImage ? (
        <div className="relative hidden w-[60%] flex-col overflow-hidden border-l border-border/60 bg-muted/80 lg:flex xl:w-[62%] dark:border-white/5 dark:bg-slate-900/40">
          <div className="absolute inset-0">
            <img
              src={rightImage.src}
              alt={rightImage.alt}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-slate-950 via-slate-950/80 to-transparent opacity-90" />
          </div>
          <div className="relative z-10 flex h-full flex-col justify-between p-8 xl:p-10">
            {rightContent}
          </div>
        </div>
      ) : null}
    </div>
  );
};
