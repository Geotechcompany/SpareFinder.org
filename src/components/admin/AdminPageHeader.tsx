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
        "relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-muted/25 p-5 shadow-sm ring-1 ring-black/[0.04] dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/60 dark:ring-white/[0.06] sm:p-6",
        className
      )}
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-primary/[0.08] blur-3xl dark:bg-primary/[0.12]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 left-0 h-36 w-36 rounded-full bg-violet-500/[0.06] blur-3xl dark:bg-violet-500/[0.1]"
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
                <BreadcrumbPage className="rounded-md bg-muted/50 px-2 py-0.5 font-medium text-foreground dark:bg-white/5">
                  {breadcrumbPage}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div>
            {typeof title === "string" ? (
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
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
        "flex flex-wrap items-center gap-1.5 rounded-2xl border border-border/60 bg-background/80 p-1.5 shadow-inner backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/75",
        className
      )}
    >
      {children}
    </div>
  );
}
