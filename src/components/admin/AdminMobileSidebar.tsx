import React from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  PremiumSidebarBrand,
  PremiumSidebarNav,
  PremiumSidebarShell,
} from "@/components/dashboard/PremiumSidebarNav";
import {
  isAdminNavActive,
  useAdminNavGroups,
} from "@/components/admin/admin-nav-config";
import { AdminSidebarSearch } from "@/components/admin/AdminSidebarSearch";
import { AdminSidebarUserCard } from "@/components/admin/AdminSidebarUserCard";

interface AdminMobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminMobileSidebar: React.FC<AdminMobileSidebarProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const groups = useAdminNavGroups();

  const handleSignOut = async () => {
    try {
      await logout();
    } finally {
      onClose();
      navigate("/admin/login");
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-md md:hidden"
            aria-hidden
          />

          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed left-0 top-0 z-50 flex h-full w-[min(100vw,300px)] md:hidden"
          >
            <PremiumSidebarShell className="h-full w-full shadow-2xl shadow-brand/10">
              <PremiumSidebarBrand
                isCollapsed={false}
                showClose
                onClose={onClose}
              />
              <div className="relative z-10 shrink-0 px-3">
                <AdminSidebarSearch />
              </div>
              <PremiumSidebarNav
                isCollapsed={false}
                groups={groups}
                showWorkspaceTools={false}
                isNavActive={isAdminNavActive}
                onNavigate={onClose}
                className="pt-1"
              />
              <div className="relative z-10 shrink-0 border-t border-white/10 p-3">
                <AdminSidebarUserCard onSignOut={handleSignOut} />
              </div>
            </PremiumSidebarShell>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
};

export default AdminMobileSidebar;
