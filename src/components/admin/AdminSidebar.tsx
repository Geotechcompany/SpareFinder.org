import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  PremiumSidebarBrand,
  PremiumSidebarNav,
  PremiumSidebarShell,
} from "@/components/dashboard/PremiumSidebarNav";
import { SidebarDockCorner } from "@/components/dashboard/SidebarDockCorner";
import { useDashboardChrome } from "@/hooks/use-dashboard-chrome";
import {
  isAdminNavActive,
  useAdminNavGroups,
} from "@/components/admin/admin-nav-config";
import { AdminSidebarSearch } from "@/components/admin/AdminSidebarSearch";
import { AdminSidebarUserCard } from "@/components/admin/AdminSidebarUserCard";

interface AdminSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isCollapsed = false,
  onToggle,
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { isSplitDashboard } = useDashboardChrome();
  const groups = useAdminNavGroups();

  const handleSignOut = async () => {
    try {
      await logout();
    } finally {
      navigate("/admin/login");
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
        <motion.div className="relative z-10 shrink-0 px-3">
          <AdminSidebarSearch isCollapsed={isCollapsed} />
        </motion.div>
        <PremiumSidebarNav
          isCollapsed={isCollapsed}
          groups={groups}
          showWorkspaceTools={false}
          isNavActive={isAdminNavActive}
          className="pt-1"
        />
        <div className="relative z-10 shrink-0 overflow-visible border-t border-white/10 p-3 pt-2">
          <AdminSidebarUserCard
            isCollapsed={isCollapsed}
            onSignOut={handleSignOut}
          />
        </div>
      </PremiumSidebarShell>
    </motion.div>
  );
};

export default AdminSidebar;
