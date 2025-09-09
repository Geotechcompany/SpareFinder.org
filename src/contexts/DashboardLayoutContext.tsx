import React, { createContext, useContext } from "react";

interface DashboardLayoutContextValue {
  inLayout: boolean;
}

const DashboardLayoutContext = createContext<DashboardLayoutContextValue>({
  inLayout: false,
});

export const DashboardLayoutProvider: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  return (
    <DashboardLayoutContext.Provider value={{ inLayout: true }}>
      {children}
    </DashboardLayoutContext.Provider>
  );
};

export const useDashboardLayout = () => useContext(DashboardLayoutContext);

export default DashboardLayoutContext;
