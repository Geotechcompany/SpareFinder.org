import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_NAV_GROUPS,
  type DashboardNavItem,
  useVisibleDashboardNavGroups,
} from "./dashboard-nav-config";

type FlatNavItem = DashboardNavItem & { group: string };

function flattenNav(groups: typeof DASHBOARD_NAV_GROUPS): FlatNavItem[] {
  return groups.flatMap((g) =>
    g.items.map((item) => ({ ...item, group: g.title }))
  );
}

export function SidebarSearch({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const navigate = useNavigate();
  const visibleGroups = useVisibleDashboardNavGroups();
  const items = useMemo(() => flattenNav(visibleGroups), [visibleGroups]);
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q)
    );
  }, [items, query]);

  const showResults = isFocused && query.trim().length > 0;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const goTo = (href: string) => {
    setQuery("");
    setIsFocused(false);
    inputRef.current?.blur();
    navigate(href);
  };

  const field = (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 120)}
        placeholder={isCollapsed ? "Search" : "Search dashboard…"}
        className={cn(
          "h-9 border-white/10 bg-white/[0.04] pl-9 pr-8 text-sm shadow-none placeholder:text-muted-foreground/80 focus-visible:border-brand/40 focus-visible:ring-brand/20",
          isCollapsed && "w-10 px-0 opacity-0"
        )}
        aria-label="Search navigation"
      />
      {query ? (
        <button
          type="button"
          onClick={() => setQuery("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : !isCollapsed ? (
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      ) : null}

      {showResults && !isCollapsed ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-popover/95 p-1 shadow-xl backdrop-blur-xl">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No matches</p>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => goTo(item.href)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted/80"
                >
                  <span className="sidebar-search-icon flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand dark:text-brand-light">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.label}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {item.group} · {item.description}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative z-10 px-2.5 pb-1">
            <button
              type="button"
              onClick={() => inputRef.current?.focus()}
              className="flex h-10 w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-muted-foreground transition-colors hover:border-brand/30 hover:text-foreground"
              aria-label="Search navigation"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="font-semibold">Search</p>
          <p className="text-muted-foreground">⌘K to focus</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return <div className="relative z-10 px-3 pb-1.5">{field}</div>;
}
