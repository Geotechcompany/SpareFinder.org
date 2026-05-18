import React, { useState } from "react";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminMobileSidebar from "@/components/admin/AdminMobileSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminLayoutProvider } from "@/contexts/AdminLayoutContext";
import { AdminSidebarStatsProvider } from "@/contexts/AdminSidebarStatsContext";
import { useDashboardChrome } from "@/hooks/use-dashboard-chrome";
import { useDashboardSidebarOffset } from "@/hooks/use-dashboard-sidebar-offset";
import { cn } from "@/lib/utils";

const AdminLayout: React.FC = () => {
  const { isSplitDashboard } = useDashboardChrome();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  useDashboardSidebarOffset(isCollapsed);

  return (
    <AdminSidebarStatsProvider>
      <AdminLayoutProvider sidebarCollapsed={isCollapsed}>
        <motion.div
          className={cn(
            "dashboard-premium flex min-h-screen w-full",
            isSplitDashboard && "dashboard-theme-split"
          )}
        >
          <AdminSidebar
            isCollapsed={isCollapsed}
            onToggle={() => setIsCollapsed((v) => !v)}
          />

          <AdminMobileSidebar
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          />

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="fixed top-3 right-3 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-soft-elevated backdrop-blur-sm md:hidden"
            aria-label="Open admin navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <motion.div
            initial={false}
            animate={{
              marginLeft: isCollapsed
                ? "var(--collapsed-sidebar-width, 80px)"
                : "var(--expanded-sidebar-width, 300px)",
              width: isCollapsed
                ? "calc(100% - var(--collapsed-sidebar-width, 80px))"
                : "calc(100% - var(--expanded-sidebar-width, 300px))",
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={cn(
              "dashboard-main-light min-h-screen flex-1 overflow-y-auto overflow-x-hidden px-3 pb-8 pt-3 sm:px-6 sm:pb-10 sm:pt-6 lg:px-8 lg:py-8",
              isSplitDashboard && "dashboard-docked-panel"
            )}
          >
            <div className="mx-auto flex w-full max-w-[var(--dashboard-content-max-width)] flex-col">
              <AdminHeader />
              <Outlet />
            </div>
          </motion.div>
        </motion.div>
      </AdminLayoutProvider>
    </AdminSidebarStatsProvider>
  );
};

export default AdminLayout;
