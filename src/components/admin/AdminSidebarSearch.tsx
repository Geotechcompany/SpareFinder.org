import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAdminNavGroups } from "./admin-nav-config";
import type { DashboardNavItem } from "@/components/dashboard/dashboard-nav-config";

type FlatNavItem = DashboardNavItem & { group: string };

export function AdminSidebarSearch({
  isCollapsed = false,
}: {
  isCollapsed?: boolean;
}) {
  const navigate = useNavigate();
  const groups = useAdminNavGroups();
  const items = useMemo<FlatNavItem[]>(
    () =>
      groups.flatMap((g) =>
        g.items.map((item) => ({ ...item, group: g.title }))
      ),
    [groups]
  );
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

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => inputRef.current?.focus()}
            className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            aria-label="Search admin navigation"
          >
            <Search className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Search admin (Ctrl+K)</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="relative z-10 mb-2 px-0.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          placeholder="Search admin…"
          className="h-9 border-white/10 bg-white/5 pl-8 pr-8 text-sm placeholder:text-muted-foreground/70 focus-visible:ring-brand/30"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {showResults ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-[#0f1118]/95 p-1 shadow-xl backdrop-blur-xl">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No matches</p>
          ) : (
            filtered.map((item) => (
              <button
                key={item.href}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => goTo(item.href)}
                className="flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/10"
              >
                <span className="text-sm font-medium text-foreground">
                  {item.label}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {item.group} · {item.description}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
