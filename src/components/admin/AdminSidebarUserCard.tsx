import React from "react";
import { LogOut, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useAdminSidebarStats } from "@/contexts/AdminSidebarStatsContext";

export function AdminSidebarUserCard({
  isCollapsed = false,
  onSignOut,
}: {
  isCollapsed?: boolean;
  onSignOut: () => void;
}) {
  const { user } = useAuth();
  const { systemHealth } = useAdminSidebarStats();

  const name = user?.full_name?.trim() || "Admin";
  const email = user?.email || "";
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const healthLabel =
    systemHealth === "healthy"
      ? "All systems operational"
      : systemHealth === "warning"
        ? "Degraded performance"
        : "Critical issues detected";

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Avatar className="h-10 w-10 ring-2 ring-brand/30">
              <AvatarImage src={user?.avatar_url} alt={name} />
              <AvatarFallback className="bg-gradient-to-br from-brand to-brand-dark text-xs text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="font-semibold">{name}</p>
            <p className="text-muted-foreground">{healthLabel}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onSignOut}
              className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-white/10 hover:text-foreground"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Sign out</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-11 w-11 shrink-0 ring-2 ring-brand/25">
          <AvatarImage src={user?.avatar_url} alt={name} />
          <AvatarFallback className="bg-gradient-to-br from-brand to-brand-dark text-sm text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          <p className="truncate text-[11px] text-muted-foreground">{email}</p>
          <p
            className={cn(
              "mt-1 flex items-center gap-1 text-[10px] font-medium",
              systemHealth === "healthy" && "text-emerald-400",
              systemHealth === "warning" && "text-amber-400",
              systemHealth === "critical" && "text-red-400"
            )}
          >
            <Shield className="h-3 w-3 shrink-0" aria-hidden />
            {healthLabel}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        onClick={onSignOut}
        className="mt-3 h-9 w-full justify-start rounded-lg border border-white/10 bg-white/5 text-sm text-muted-foreground hover:bg-white/10 hover:text-foreground"
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
}
