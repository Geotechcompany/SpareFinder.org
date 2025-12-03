import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, Clock, Bell, Settings, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  {
    path: "/dashboard",
    label: "Overview",
    icon: Home,
  },
  {
    path: "/dashboard/history",
    label: "History",
    icon: Clock,
  },
  {
    path: "/dashboard/notifications",
    label: "Alerts",
    icon: Bell,
  },
  {
    path: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
  },
];

export const DashboardMobileTabs: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  if (!location.pathname.startsWith("/dashboard")) {
    return null;
  }

  const handleNav = (path: string) => {
    if (location.pathname !== path) {
      navigate(path);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 md:hidden pointer-events-none">
      <div className="mx-auto max-w-6xl px-4 pb-4">
        <div className="relative pointer-events-auto">
          <div className="flex items-center justify-between h-14 rounded-2xl border border-border bg-card/95 shadow-soft-elevated backdrop-blur-xl px-6">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              const isActive =
                location.pathname === tab.path ||
                location.pathname.startsWith(`${tab.path}/`);

              // Leave a little more space near the center for the floating upload button
              const spacingClass =
                index === 1 ? "mr-8" : index === 2 ? "ml-8" : "";

              return (
                <button
                  key={tab.path}
                  type="button"
                  onClick={() => handleNav(tab.path)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 text-[11px] font-medium text-muted-foreground transition-colors",
                    spacingClass,
                    isActive && "text-primary"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Floating Upload button */}
          <button
            type="button"
            onClick={() => handleNav("/dashboard/upload")}
            className="absolute left-1/2 -top-7 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-r from-[#3A5AFE] to-[#4C5DFF] text-white shadow-soft-elevated shadow-primary/40 ring-4 ring-background"
            aria-label="Upload"
          >
            <Upload className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardMobileTabs;



