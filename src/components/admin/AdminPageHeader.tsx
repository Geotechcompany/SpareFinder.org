import type { ReactNode } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

export type AdminPageHeaderProps = {
  /** Main heading (string or custom node). */
  title: ReactNode;
  /** Short supporting line under the title. */
  description?: ReactNode;
  /** Last crumb: Public site › Admin › … */
  breadcrumbPage: string;
  /** Right side: badges, buttons, etc. Wrap with `AdminPageHeaderToolbar` for the frosted pill bar. */
  actions?: ReactNode;
  className?: string;
};

/**
 * Shared admin top block: breadcrumbs, title, description, optional actions.
 * Matches the modern dashboard header (gradient panel, soft accents).
 */
export function AdminPageHeader({
  title,
  description,
  breadcrumbPage,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-2xl border border-brand-light/60 bg-gradient-to-br from-white via-brand-50/50 to-cyan-50/40 p-5 ring-1 ring-brand-light/30 sm:p-6",
        "shadow-[0_0_0_1px_hsl(258_45%_92%/0.6),0_16px_40px_-18px_hsl(258_40%_50%/0.1)]",
        "dark:border-white/[0.09] dark:bg-gradient-to-br dark:from-[hsl(270_28%_11%_/0.92)] dark:via-[hsl(260_30%_9%_/0.88)] dark:to-[hsl(232_32%_10%_/0.92)] dark:shadow-[0_0_0_1px_hsl(270_65%_55%_/0.1),0_20px_56px_-22px_rgba(0,0,0,0.55)] dark:ring-1 dark:ring-brand/15 dark:backdrop-blur-xl",
        className
      )}
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-52 w-52 rounded-full bg-brand-light/25 blur-3xl dark:bg-brand/[0.22]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 left-0 h-40 w-40 rounded-full bg-cyan-300/30 blur-3xl dark:bg-cyan-500/[0.12]"
        aria-hidden
      />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="min-w-0 flex-1 space-y-3">
          <Breadcrumb>
            <BreadcrumbList className="text-xs text-muted-foreground sm:text-sm">
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="/"
                  className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-muted/70 hover:text-foreground"
                >
                  Public site
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-muted-foreground/50 [&>svg]:size-3.5" />
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="/admin/dashboard"
                  className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-muted/70 hover:text-foreground"
                >
                  Admin
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-muted-foreground/50 [&>svg]:size-3.5" />
              <BreadcrumbItem>
                <BreadcrumbPage className="rounded-md border border-brand-light/50 bg-brand-50/60 px-2 py-0.5 font-medium text-foreground dark:border-transparent dark:bg-white/5">
                  {breadcrumbPage}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div>
            {typeof title === "string" ? (
              <h1 className="bg-gradient-to-r from-brand-dark via-brand-dark to-cyan-800 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl dark:from-white dark:via-brand-light dark:to-cyan-100/90">
                {title}
              </h1>
            ) : (
              title
            )}
            {description ? (
              <div className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                {description}
              </div>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

/** Frosted inner bar for header actions (badges, icon buttons, etc.). */
export function AdminPageHeaderToolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-2xl border border-brand-light/60 bg-white/85 p-1.5 shadow-[inset_0_1px_0_hsl(0_0%_100%_/0.9),0_0_20px_-12px_hsl(258_55%_78%/0.35)] backdrop-blur-md",
        "dark:border-white/[0.08] dark:bg-[hsl(270_25%_8%_/0.72)] dark:shadow-[inset_0_1px_0_hsl(0_0%_100%_/0.06),0_0_24px_-12px_hsl(270_80%_40%_/0.15)] dark:backdrop-blur-xl",
        className
      )}
    >
      {children}
    </div>
  );
}
