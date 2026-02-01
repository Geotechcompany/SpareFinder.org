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
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-[#0B1026] dark:via-[#1A1033] dark:to-[#0C1226] relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-1/3 -right-40 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl opacity-60"
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          <motion.div
            className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl opacity-40"
            animate={{
              scale: [1.2, 1, 1.2],
              x: [0, 50, 0],
              y: [0, -30, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

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
          className="fixed top-3 right-3 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/95 text-muted-foreground shadow-soft-elevated backdrop-blur-sm md:hidden dark:bg-black/70 dark:border-white/10 dark:text-white"
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
          className="flex-1 p-2 pb-16 sm:p-4 sm:pb-6 lg:p-8 relative z-10 overflow-x-hidden md:overflow-x-visible"
        >
          <div className="mx-auto flex h-full max-w-6xl flex-col">
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
