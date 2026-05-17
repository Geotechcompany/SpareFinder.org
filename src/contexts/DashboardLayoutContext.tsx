import React, { createContext, useContext } from "react";

interface DashboardLayoutContextValue {
  inLayout: boolean;
  sidebarCollapsed: boolean;
}

const DashboardLayoutContext = createContext<DashboardLayoutContextValue>({
  inLayout: false,
  sidebarCollapsed: false,
});

export const DashboardLayoutProvider: React.FC<
  React.PropsWithChildren<{ sidebarCollapsed?: boolean }>
> = ({ children, sidebarCollapsed = false }) => {
  return (
    <DashboardLayoutContext.Provider
      value={{ inLayout: true, sidebarCollapsed }}
    >
      {children}
    </DashboardLayoutContext.Provider>
  );
};

export const useDashboardLayout = () => useContext(DashboardLayoutContext);

export default DashboardLayoutContext;
