import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBellDropdown } from "@/components/NotificationBellDropdown";
import ThemeToggle from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

export function AdminHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/80 px-3 py-2.5 shadow-soft-elevated backdrop-blur-sm sm:mb-6 sm:px-4",
        className
      )}
    >
      <motion.div className="flex min-w-0 items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark text-white shadow-md shadow-brand/25">
          <Shield className="h-4 w-4" strokeWidth={2.25} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Admin console</p>
          <p className="truncate text-[11px] text-muted-foreground">
            Manage users, billing, and platform settings
          </p>
        </div>
      </motion.div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="hidden h-9 rounded-full border-border/80 sm:inline-flex"
        >
          <Link to="/dashboard">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            User dashboard
          </Link>
        </Button>
        <ThemeToggle />
        <NotificationBellDropdown />
      </div>
    </header>
  );
}
