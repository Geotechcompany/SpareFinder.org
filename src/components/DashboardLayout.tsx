import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import DashboardSidebar from "@/components/DashboardSidebar";
import MobileSidebar from "@/components/MobileSidebar";
import { DashboardLayoutProvider } from "@/contexts/DashboardLayoutContext";
import { WorkspaceSetupGuard } from "@/components/dashboard/WorkspaceSetupGuard";
import { useDashboardChrome } from "@/hooks/use-dashboard-chrome";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardMobileTabs from "@/components/DashboardMobileTabs";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { useDashboardSidebarOffset } from "@/hooks/use-dashboard-sidebar-offset";

const DashboardLayout: React.FC = () => {
  const { isSplitDashboard } = useDashboardChrome();
  const [isCollapsed, setIsCollapsed] = useState(false);
  useDashboardSidebarOffset(isCollapsed);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const didRestoreRef = useRef(false);

  // Persist the last visited dashboard sub-route so a hard refresh can restore it
  // even if the server rewrites /dashboard/* → /dashboard.
  useEffect(() => {
    if (!location.pathname.startsWith("/dashboard")) return;
    const fullPath = `${location.pathname}${location.search}${location.hash}`;
    localStorage.setItem("sparefinder:lastDashboardPath", fullPath);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (didRestoreRef.current) return;
    if (location.pathname !== "/dashboard") return;

    const navEntry = (performance.getEntriesByType?.("navigation")?.[0] as
      | PerformanceNavigationTiming
      | undefined);
    const navType = navEntry?.type;
    const isReload = navType === "reload";
    if (!isReload) return;

    const last = localStorage.getItem("sparefinder:lastDashboardPath");
    if (!last || !last.startsWith("/dashboard/")) return;

    didRestoreRef.current = true;
    navigate(last, { replace: true });
  }, [location.pathname, navigate]);

  const handleToggleSidebar = () => setIsCollapsed(!isCollapsed);
  const handleToggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <DashboardLayoutProvider sidebarCollapsed={isCollapsed}>
      <motion.div
        className={cn(
          "dashboard-premium flex min-h-screen w-full",
            isSplitDashboard && "dashboard-theme-split"
        )}
      >

        {/* Desktop Sidebar */}
        <DashboardSidebar
          isCollapsed={isCollapsed}
          onToggle={handleToggleSidebar}
        />

        {/* Mobile Sidebar */}
        <MobileSidebar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        {/* Mobile Menu Button */}
        <button
          onClick={handleToggleMobileMenu}
          className="fixed top-3 right-3 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-soft-elevated backdrop-blur-sm md:hidden"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Main Content */}
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
            "dashboard-main-light min-h-screen flex-1 overflow-y-auto overflow-x-hidden px-3 pb-16 pt-3 sm:px-6 sm:pb-6 sm:pt-6 lg:px-8 lg:py-8",
            isSplitDashboard && "dashboard-docked-panel"
          )}
        >
          <div className="mx-auto flex w-full max-w-[var(--dashboard-content-max-width)] flex-col">
            <ImpersonationBanner />
            <DashboardHeader />
            <Outlet />
          </div>
        </motion.div>

        {/* Mobile bottom tabs */}
        <DashboardMobileTabs />
      </motion.div>
    </DashboardLayoutProvider>
  );
};

export default DashboardLayout;
