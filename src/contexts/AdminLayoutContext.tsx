import React, { createContext, useContext } from "react";

interface AdminLayoutContextValue {
  inLayout: boolean;
  sidebarCollapsed: boolean;
}

const AdminLayoutContext = createContext<AdminLayoutContextValue>({
  inLayout: false,
  sidebarCollapsed: false,
});

export const AdminLayoutProvider: React.FC<
  React.PropsWithChildren<{ sidebarCollapsed?: boolean }>
> = ({ children, sidebarCollapsed = false }) => (
  <AdminLayoutContext.Provider value={{ inLayout: true, sidebarCollapsed }}>
    {children}
  </AdminLayoutContext.Provider>
);

export const useAdminLayout = () => useContext(AdminLayoutContext);

export default AdminLayoutContext;
