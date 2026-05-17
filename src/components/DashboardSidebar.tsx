import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarUserPlanCard } from "@/components/dashboard/SidebarUserPlanCard";
import {
  PremiumSidebarBrand,
  PremiumSidebarNav,
  PremiumSidebarShell,
} from "@/components/dashboard/PremiumSidebarNav";
import { SidebarDockCorner } from "@/components/dashboard/SidebarDockCorner";
import { useDashboardChrome } from "@/hooks/use-dashboard-chrome";

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const DashboardSidebar: React.FC<SidebarProps> = ({
  isCollapsed = false,
  onToggle,
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { isSplitDashboard } = useDashboardChrome();

  const handleSignOut = async () => {
    try {
      await logout();
      navigate("/login");
    } catch {
      navigate("/login");
    }
  };

  return (
    <motion.div
      initial={false}
      animate={{
        width: isCollapsed
          ? "var(--collapsed-sidebar-width, 80px)"
          : "var(--expanded-sidebar-width, 300px)",
      }}
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-0 z-40 hidden h-screen overflow-visible md:flex"
    >
      {isSplitDashboard ? <SidebarDockCorner /> : null}
      <PremiumSidebarShell className="h-full w-full">
        <PremiumSidebarBrand isCollapsed={isCollapsed} onToggle={onToggle} />
        <PremiumSidebarNav isCollapsed={isCollapsed} />
        <div className="relative z-10 shrink-0 overflow-visible border-t border-white/10 p-3 pt-8">
          <SidebarUserPlanCard
            isCollapsed={isCollapsed}
            onSignOut={handleSignOut}
          />
        </div>
      </PremiumSidebarShell>
    </motion.div>
  );
};

export default DashboardSidebar;
