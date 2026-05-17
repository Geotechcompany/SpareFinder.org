import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Sparkles, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { cn } from "@/lib/utils";
import {
  type DashboardNavGroup,
  isDashboardNavActive,
  useVisibleDashboardNavGroups,
} from "./dashboard-nav-config";
import { SidebarSearch } from "./SidebarSearch";
import { SidebarWorkspaceSwitcher } from "./SidebarWorkspaceSwitcher";
import { SidebarCollapseTrigger } from "./SidebarCollapseTrigger";
import { useDashboardChrome } from "@/hooks/use-dashboard-chrome";

function PremiumSidebarBackground() {
  const { isDarkSidebar } = useDashboardChrome();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-b from-brand/[0.04] via-transparent to-cyan-500/[0.05]",
          isDarkSidebar && "sidebar-mesh-gradient dark:from-brand/10 dark:to-cyan-500/5"
        )}
      />
      <motion.div className="absolute -left-20 top-0 h-56 w-56 rounded-full bg-brand/15 blur-3xl" />
      <div className="absolute -right-16 bottom-24 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
      <div
        className={cn(
          "absolute inset-0 opacity-[0.35] dark:opacity-[0.2]",
          isDarkSidebar && "sidebar-mesh-dots"
        )}
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)",
          backgroundSize: "20px 20px",
        }}
      />
    </div>
  );
}

const COLLAPSED_BRAND_ICON = "/favicon.ico";

export function PremiumSidebarBrand({
  isCollapsed,
  onToggle,
  showClose,
  onClose,
}: {
  isCollapsed: boolean;
  onToggle?: () => void;
  showClose?: boolean;
  onClose?: () => void;
}) {
  const { isDarkSidebar } = useDashboardChrome();
  const logoSrc = isDarkSidebar
    ? "/sparefinder_logo_light.png"
    : "/sparefinderlogo.png";

  if (isCollapsed) {
    return (
      <div className="relative z-10 flex shrink-0 items-center justify-center gap-1.5 border-b border-white/10 px-2 py-3">
        <AnimatePresence mode="wait">
          <motion.div
            key="brand-collapsed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center justify-center gap-1.5"
          >
            <img
              src={COLLAPSED_BRAND_ICON}
              alt="SpareFinder"
              className="h-7 w-7 shrink-0 rounded-md object-contain"
            />
            {onToggle ? (
              <SidebarCollapseTrigger
                isCollapsed
                onClick={onToggle}
                size="xs"
                className="hidden md:flex"
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <motion.div className="relative z-10 flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5">
      <AnimatePresence mode="wait">
        <motion.div
          key="brand-expanded"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          className="flex min-w-0 flex-1 items-center"
        >
          <img
            src={logoSrc}
            alt="SpareFinder"
            className="h-12 w-auto max-w-[min(100%,280px)] object-contain object-left sm:h-[3.25rem]"
          />
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center gap-1">
        {showClose && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground md:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        {onToggle ? (
          <SidebarCollapseTrigger
            isCollapsed={false}
            onClick={onToggle}
            size="sm"
            className="hidden md:flex"
          />
        ) : null}
      </div>
    </motion.div>
  );
}

function PremiumUpgradeCard({ isCollapsed }: { isCollapsed: boolean }) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { isPlanActive, isLoading, tier } = useSubscription();

  if (isCollapsed || isLoading || isAdmin) return null;
  if (isPlanActive && tier !== "free") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 mx-2.5 mb-1.5 mt-0.5"
    >
      <button
        type="button"
        onClick={() =>
          navigate(!isPlanActive ? "/onboarding/trial" : "/dashboard/billing")
        }
        className="group relative w-full overflow-hidden rounded-xl border border-brand/25 bg-gradient-to-br from-brand/20 via-brand-dark/15 to-cyan-500/10 p-2.5 text-left shadow-lg shadow-brand/10 transition-all hover:border-brand/40 hover:shadow-brand/20"
      >
        <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-brand/30 blur-2xl transition-opacity group-hover:opacity-100" />
        <div className="relative flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-500/30">
            <Crown className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              Upgrade to Pro
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              Unlock AI identification, history, and priority processing.
            </p>
          </div>
        </div>
      </button>
    </motion.div>
  );
}

function NavItemLink({
  item,
  active,
  isCollapsed,
  onNavigate,
}: {
  item: DashboardNavGroup["items"][number];
  active: boolean;
  isCollapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const { isDarkSidebar } = useDashboardChrome();

  const link = (
    <Link
      to={item.href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-all duration-200",
        isCollapsed && "justify-center px-2",
        active
          ? "border-brand/25 bg-gradient-to-r from-brand/15 via-primary/10 to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          : "border-transparent hover:border-white/10 hover:bg-white/[0.04] dark:hover:bg-white/[0.06]"
      )}
    >
      {active ? (
        <motion.span
          layoutId="sidebar-active-rail"
          className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-brand to-brand-dark"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      ) : null}

      <div
        className={cn(
          "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
          active
            ? "bg-gradient-to-br from-brand to-brand-dark text-white shadow-md shadow-brand/25 ring-1 ring-white/20"
            : isDarkSidebar
              ? "sidebar-nav-icon-idle ring-1 ring-white/10"
              : "bg-muted/70 text-muted-foreground ring-1 ring-black/5 group-hover:bg-muted group-hover:text-foreground"
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 2} />
      </div>

      {!isCollapsed ? (
        <div className="min-w-0 flex-1 pr-0.5">
          <div className="flex items-center justify-between gap-1.5">
            <span
              className={cn(
                "truncate text-sm font-semibold leading-tight",
                active ? "text-foreground" : "text-foreground/90"
              )}
            >
              {item.label}
            </span>
            {item.badge ? (
              <span className="sidebar-badge shrink-0 rounded-full bg-brand/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand dark:text-brand-light">
                {item.badge}
              </span>
            ) : null}
          </div>
          <p className="truncate text-[11px] leading-snug text-muted-foreground">
            {item.description}
          </p>
        </div>
      ) : (
        <span className="sr-only">{item.label}</span>
      )}
    </Link>
  );

  if (!isCollapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        <p className="font-semibold">{item.label}</p>
        <p className="text-muted-foreground">{item.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function PremiumSidebarShellHeader({
  isCollapsed = false,
}: {
  isCollapsed?: boolean;
}) {
  return (
    <>
      <SidebarWorkspaceSwitcher isCollapsed={isCollapsed} />
      <SidebarSearch isCollapsed={isCollapsed} />
    </>
  );
}

export function PremiumSidebarNav({
  isCollapsed = false,
  groups,
  onNavigate,
  className,
  showWorkspaceTools = true,
}: {
  isCollapsed?: boolean;
  groups?: DashboardNavGroup[];
  onNavigate?: () => void;
  className?: string;
  showWorkspaceTools?: boolean;
}) {
  const location = useLocation();
  const defaultGroups = useVisibleDashboardNavGroups();
  const visibleGroups = groups ?? defaultGroups;

  return (
    <nav
      className={cn(
        "relative z-10 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-2.5",
        className
      )}
      aria-label="Main navigation"
    >
      {showWorkspaceTools ? (
        <PremiumSidebarShellHeader isCollapsed={isCollapsed} />
      ) : null}
      <PremiumUpgradeCard isCollapsed={isCollapsed} />
      <div className="space-y-4">
        {visibleGroups.map((group, groupIdx) => (
          <motion.div key={group.title} className="space-y-1">
            {!isCollapsed ? (
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">
                {group.title}
              </p>
            ) : groupIdx > 0 ? (
              <motion.div className="mx-2 my-2.5 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            ) : null}
            <div className="space-y-1">
              {group.items.map((item, index) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: groupIdx * 0.04 + index * 0.025 }}
                >
                  <NavItemLink
                    item={item}
                    active={isDashboardNavActive(location.pathname, item.href)}
                    isCollapsed={isCollapsed}
                    onNavigate={onNavigate}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </nav>
  );
}

export function PremiumSidebarShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { isDarkSidebar } = useDashboardChrome();

  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-visible border-r backdrop-blur-2xl",
        isDarkSidebar
          ? "dashboard-sidebar-dark border-white/10 text-slate-100"
          : "border-border/60 bg-sidebar/80 text-sidebar-foreground shadow-[4px_0_32px_rgba(15,23,42,0.06)]",
        "dark:border-white/10 dark:bg-[#0a0c14]/90 dark:text-slate-100 dark:shadow-[4px_0_32px_rgba(0,0,0,0.35)]",
        className
      )}
    >
      <PremiumSidebarBackground />
      {children}
    </div>
  );
}
