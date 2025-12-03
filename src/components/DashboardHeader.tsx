import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ThemeToggle from "@/components/ThemeToggle";
import CreditsDisplay from "@/components/CreditsDisplay";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const pageMeta: Record<
  string,
  { title: string; description: string; section?: string }
> = {
  "/dashboard": {
    title: "Overview",
    description: "High-level view of your AI-powered spare parts analysis.",
    section: "Dashboard",
  },
  "/dashboard/upload": {
    title: "Upload & Analyze",
    description: "Upload new images or PDFs to identify industrial spare parts.",
    section: "Analysis",
  },
  "/dashboard/history": {
    title: "Analysis History",
    description: "Review previous analyses and quickly jump back into details.",
    section: "History",
  },
  "/dashboard/reviews": {
    title: "Your Reviews",
    description: "Share feedback and see how others rate SpareFinder.",
    section: "Engagement",
  },
  "/dashboard/billing": {
    title: "Billing & Credits",
    description: "Manage your subscription, invoices, and analysis credits.",
    section: "Account",
  },
  "/dashboard/settings": {
    title: "Settings",
    description: "Configure preferences, notifications, and integrations.",
    section: "Account",
  },
  "/dashboard/profile": {
    title: "Profile",
    description: "Update your account information and company details.",
    section: "Account",
  },
  "/dashboard/notifications": {
    title: "Notifications",
    description: "Stay on top of important events and job status updates.",
    section: "Engagement",
  },
};

const getPageMeta = (pathname: string) => {
  const entry =
    Object.entries(pageMeta)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([key]) => pathname.startsWith(key))?.[1] ??
    pageMeta["/dashboard"];

  return entry;
};

const getUserInitials = (fullName?: string | null, email?: string | null) => {
  const source = fullName || email || "";
  if (!source) return "U";
  const parts = source.split(" ").filter(Boolean);
  if (parts.length === 0) return source[0]?.toUpperCase() ?? "U";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "U";
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export const DashboardHeader: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const meta = getPageMeta(pathname);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login");
    }
  };

  return (
    <div className="mb-4 space-y-3 md:mb-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          {meta.section && (
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span>{meta.section}</span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
              <span className="text-muted-foreground/80">
                {user?.company || "SpareFinder"}
              </span>
            </div>
          )}
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            {meta.title}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {meta.description}
          </p>
        </div>

        <div className="flex w-full items-center justify-end gap-2 md:w-auto md:gap-3">
          <CreditsDisplay
            size="small"
            className="inline-flex shadow-sm"
          />

          {/* Notifications */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/dashboard/notifications")}
            className={cn(
              "h-9 w-9 border-border bg-background/80 text-muted-foreground hover:bg-accent hover:text-foreground md:h-9 md:w-9",
              pathname.startsWith("/dashboard/notifications") &&
                "bg-primary/10 text-primary border-primary/30 hover:bg-primary/15"
            )}
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </Button>

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full border border-border bg-background/80 px-2 py-1 pl-1.5 text-left text-sm shadow-sm transition hover:bg-accent/60">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar_url} alt={user?.full_name} />
                  <AvatarFallback className="bg-gradient-to-r from-purple-600 to-blue-600 text-xs font-semibold text-white">
                    {getUserInitials(user?.full_name, user?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden min-w-[120px] flex-col leading-tight md:flex">
                  <span className="truncate text-xs font-medium text-foreground">
                    {user?.full_name || user?.email?.split("@")[0] || "User"}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {user?.company || "Standard workspace"}
                  </span>
                </div>
                <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground md:inline" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-[220px] border-border bg-background/95"
            >
              <DropdownMenuLabel className="text-xs">
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user?.avatar_url} alt={user?.full_name} />
                    <AvatarFallback className="bg-gradient-to-r from-purple-600 to-blue-600 text-[10px] font-semibold text-white">
                      {getUserInitials(user?.full_name, user?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-foreground">
                      {user?.full_name || user?.email?.split("@")[0] || "User"}
                    </p>
                    {user?.email && (
                      <p className="text-[11px] text-muted-foreground">
                        {user.email}
                      </p>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/dashboard/profile")}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-500 focus:text-red-500"
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;


