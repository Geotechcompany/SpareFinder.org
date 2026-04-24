import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import DashboardSidebar from "@/components/DashboardSidebar";
import MobileSidebar from "@/components/MobileSidebar";
import { DashboardLayoutProvider } from "@/contexts/DashboardLayoutContext";
import { Menu } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardMobileTabs from "@/components/DashboardMobileTabs";

const DashboardLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
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
    <DashboardLayoutProvider>
      <div className="dashboard-premium min-h-screen flex w-full relative overflow-hidden">

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
              : "var(--expanded-sidebar-width, 320px)",
            width: isCollapsed
              ? "calc(100% - var(--collapsed-sidebar-width, 80px))"
              : "calc(100% - var(--expanded-sidebar-width, 320px))",
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="flex-1 px-3 pb-16 pt-3 sm:px-6 sm:pb-6 sm:pt-6 lg:px-8 lg:py-8 relative z-10 overflow-x-hidden md:overflow-x-visible"
        >
          <div className="mx-auto flex h-full w-full max-w-[var(--dashboard-content-max-width)] flex-col">
            <DashboardHeader />
            <Outlet />
          </div>
        </motion.div>

        {/* Mobile bottom tabs */}
        <DashboardMobileTabs />
      </div>
    </DashboardLayoutProvider>
  );
};

export default DashboardLayout;
