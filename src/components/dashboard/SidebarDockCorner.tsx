import { cn } from "@/lib/utils";

type SidebarDockCornerProps = {
  className?: string;
};

/**
 * Rounded junction at the sidebar's top-right — protrudes into the main workspace.
 * Lives on the fixed sidebar so it tracks collapse/expand without CSS offset hacks.
 */
export function SidebarDockCorner({ className }: SidebarDockCornerProps) {
  return (
    <div
      className={cn(
        "sidebar-dock-corner pointer-events-none absolute left-full top-0 z-[45]",
        className
      )}
      aria-hidden
    >
      <div className="sidebar-dock-corner-chrome h-[var(--dock-cap-height)] w-[var(--dock-panel-radius)]">
        <div className="sidebar-dock-corner-surface h-full w-full rounded-tl-[var(--dock-panel-radius)]" />
      </div>
    </div>
  );
}
