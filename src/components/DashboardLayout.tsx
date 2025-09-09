import React, { useState } from "react";
import { motion } from "framer-motion";
import DashboardSidebar from "@/components/DashboardSidebar";
import MobileSidebar from "@/components/MobileSidebar";
import { DashboardLayoutProvider } from "@/contexts/DashboardLayoutContext";
import { Menu } from "lucide-react";
import { Outlet } from "react-router-dom";

const DashboardLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleToggleSidebar = () => setIsCollapsed(!isCollapsed);
  const handleToggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <DashboardLayoutProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20 relative overflow-hidden">
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
          className="fixed top-4 right-4 z-50 p-2 rounded-lg bg-black/20 backdrop-blur-xl border border-white/10 md:hidden"
        >
          <Menu className="w-5 h-5 text-white" />
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
          className="flex-1 p-2 sm:p-4 lg:p-8 relative z-10 overflow-x-hidden md:overflow-x-visible"
        >
          <Outlet />
        </motion.div>
      </div>
    </DashboardLayoutProvider>
  );
};

export default DashboardLayout;
