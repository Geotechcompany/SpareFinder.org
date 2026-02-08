import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface NavLink {
  label: string;
  href: string;
}

export interface MobileMenuSidebarProps {
  open: boolean;
  onClose: () => void;
  platform: NavLink[];
  solutions: NavLink[];
  resources: NavLink[];
  className?: string;
}

export function MobileMenuSidebar({
  open,
  onClose,
  platform,
  solutions,
  resources,
  className,
}: MobileMenuSidebarProps) {
  React.useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const sidebar = (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm transition-opacity duration-200 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={cn(
          "fixed left-0 top-0 z-[120] flex h-full w-[280px] max-w-[85vw] flex-col border-r border-gray-200 bg-white shadow-xl transition-transform duration-300 ease-out dark:border-white/10 dark:bg-gray-900 lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
          className
        )}
        aria-hidden={!open}
        aria-label="Mobile menu"
      >
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-4 dark:border-white/10">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Menu
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              aria-label="Close menu"
              className="h-9 w-9 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X className="size-5" />
            </Button>
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Platform
            </p>
            {platform.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={onClose}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/10"
              >
                {link.label}
              </a>
            ))}
            <p className="mb-1 mt-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Solutions
            </p>
            {solutions.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={onClose}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/10"
              >
                {link.label}
              </a>
            ))}
            <p className="mb-1 mt-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Resources
            </p>
            {resources.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={onClose}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/10"
              >
                {link.label}
              </a>
            ))}
            <a
              href="/reviews"
              onClick={onClose}
              className="mt-2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/10"
            >
              Reviews
            </a>
          </nav>
          <div className="shrink-0 border-t border-gray-200 p-3 dark:border-white/10">
            <a
              href="/login"
              onClick={onClose}
              className="mb-2 flex h-11 items-center justify-center rounded-lg border border-gray-300 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
            >
              Sign In
            </a>
            <a
              href="/register"
              onClick={onClose}
              className="flex h-11 items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-sm font-semibold text-white shadow-md hover:from-purple-700 hover:to-blue-700"
            >
              Get Started
            </a>
          </div>
        </div>
      </aside>
    </>
  );

  if (typeof document === "undefined") return null;
  return createPortal(sidebar, document.body);
}
