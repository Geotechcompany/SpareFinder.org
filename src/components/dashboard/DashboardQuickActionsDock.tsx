import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { FileText, Settings2, Upload, UserRound } from "lucide-react";
import { AnimatedDock, type DockItemData } from "@/components/ui/animated-dock";
import { useDashboardLayout } from "@/contexts/DashboardLayoutContext";
import { useDashboardSidebarOffset } from "@/hooks/use-dashboard-sidebar-offset";
import { cn } from "@/lib/utils";

const DOCK_ITEMS: DockItemData[] = [
  {
    to: "/dashboard/upload",
    label: "Upload New Part",
    Icon: <Upload size={22} strokeWidth={2.25} />,
  },
  {
    to: "/dashboard/history",
    label: "View History",
    Icon: <FileText size={22} strokeWidth={2.25} />,
  },
  {
    to: "/dashboard/profile",
    label: "View Profile",
    Icon: <UserRound size={22} strokeWidth={2.25} />,
  },
  {
    to: "/dashboard/settings",
    label: "Settings",
    Icon: <Settings2 size={22} strokeWidth={2.25} />,
  },
];

type DashboardQuickActionsDockProps = {
  className?: string;
  /** When dashboard renders outside DashboardLayout (legacy path). */
  sidebarCollapsed?: boolean;
};

export function DashboardQuickActionsDock({
  className,
  sidebarCollapsed: sidebarCollapsedProp,
}: DashboardQuickActionsDockProps) {
  const { inLayout, sidebarCollapsed: layoutCollapsed } = useDashboardLayout();
  const sidebarCollapsed = inLayout
    ? layoutCollapsed
    : (sidebarCollapsedProp ?? false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useDashboardSidebarOffset(sidebarCollapsed);

  if (!mounted) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.85, duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "pointer-events-none fixed bottom-6 z-[70] flex justify-center px-4",
        "left-[var(--dashboard-sidebar-offset,var(--expanded-sidebar-width,300px))] right-0",
        "max-md:hidden",
        className
      )}
      aria-label="Quick actions"
    >
      <motion.div className="pointer-events-auto">
        <AnimatedDock
          items={DOCK_ITEMS}
          className="border-border/50 bg-white/95 px-5 shadow-xl shadow-brand/10 ring-1 ring-black/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-card/90 dark:shadow-black/40"
        />
      </motion.div>
    </motion.div>,
    document.body
  );
}
