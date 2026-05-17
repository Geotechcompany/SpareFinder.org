import { cn } from "@/lib/utils";
import { useDashboardChrome } from "@/hooks/use-dashboard-chrome";

type SidebarCollapseTriggerProps = {
  isCollapsed: boolean;
  onClick: () => void;
  className?: string;
  size?: "xs" | "sm" | "md";
};

const SIZE_CLASSES = {
  xs: "h-5 w-5",
  sm: "h-6 w-6",
  md: "h-7 w-7",
} as const;

export function SidebarCollapseTrigger({
  isCollapsed,
  onClick,
  className,
  size = "md",
}: SidebarCollapseTriggerProps) {
  const { isDarkSidebar } = useDashboardChrome();
  const src = isDarkSidebar ? "/sidebar_light.png" : "/sidebar_dark.png";
  const sizeClass = SIZE_CLASSES[size];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
        className
      )}
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      <img
        src={src}
        alt=""
        className={cn(
          sizeClass,
          "object-contain",
          isCollapsed && "rotate-180"
        )}
      />
    </button>
  );
}
