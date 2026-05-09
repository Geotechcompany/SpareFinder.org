import { useIsLgUp } from "@/hooks/use-breakpoint-lg";

const EXPANDED = 320;
const COLLAPSED = 80;

/**
 * Framer-motion `animate` props for admin main columns: full width on &lt; lg,
 * offset when the fixed desktop sidebar is visible.
 */
export function useAdminMainMotion(isCollapsed: boolean) {
  const isLgUp = useIsLgUp();
  return {
    marginLeft: isLgUp ? (isCollapsed ? COLLAPSED : EXPANDED) : 0,
    width: isLgUp
      ? isCollapsed
        ? `calc(100% - ${COLLAPSED}px)`
        : `calc(100% - ${EXPANDED}px)`
      : "100%",
  };
}

/** Padding under the fixed admin mobile top bar (h-14). */
export const ADMIN_MOBILE_TOP_PADDING = "pt-14 lg:pt-0";
