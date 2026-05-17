import { useTheme } from "@/contexts/ThemeContext";

/** Sidebar / main chrome for the user dashboard (Studio = dark nav + light workspace). */
export function useDashboardChrome() {
  const { theme } = useTheme();
  const isSplitDashboard = theme === "split";
  const isDarkSidebar = theme === "dark" || isSplitDashboard;

  return { theme, isSplitDashboard, isDarkSidebar };
}
