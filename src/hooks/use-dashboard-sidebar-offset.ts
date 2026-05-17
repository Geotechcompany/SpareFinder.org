import { useEffect } from "react";

/** Keeps --dashboard-sidebar-offset in sync with collapsed state (gradients, quick-actions dock). */
export function useDashboardSidebarOffset(sidebarCollapsed: boolean) {
  useEffect(() => {
    const px = sidebarCollapsed ? 80 : 300;
    document.documentElement.style.setProperty(
      "--dashboard-sidebar-offset",
      `${px}px`
    );
  }, [sidebarCollapsed]);
}
