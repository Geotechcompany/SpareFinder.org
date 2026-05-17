export type AppTheme = "light" | "dark" | "system" | "split";

/** Default SpareFinder look: dark sidebar + light workspace. */
export const DEFAULT_THEME: AppTheme = "split";

export const THEME_STORAGE_KEY = "theme";

const THEME_LABELS: Record<AppTheme, string> = {
  split: "Studio",
  light: "Light",
  dark: "Dark",
  system: "System",
};

export function getThemeLabel(theme: AppTheme): string {
  return THEME_LABELS[theme];
}

export function isValidTheme(value: string | null): value is AppTheme {
  return value === "light" || value === "dark" || value === "system" || value === "split";
}

export function readStoredTheme(): AppTheme | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return isValidTheme(stored) ? stored : null;
}
