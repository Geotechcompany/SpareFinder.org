export type AppTheme = "light" | "dark" | "system" | "split";

/** Default SpareFinder look: dark sidebar + light workspace. */
export const DEFAULT_THEME: AppTheme = "split";

export const THEME_STORAGE_KEY = "theme";

/** One-time migration: Studio (split) is the product default dashboard look. */
export const THEME_STUDIO_MIGRATION_KEY = "theme_studio_default_v1";

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

  if (!localStorage.getItem(THEME_STUDIO_MIGRATION_KEY)) {
    localStorage.setItem(THEME_STUDIO_MIGRATION_KEY, "1");
    const legacy = localStorage.getItem(THEME_STORAGE_KEY);
    // Legacy default was Light; Studio replaces it as the recommended dashboard theme.
    if (!legacy || legacy === "light") {
      localStorage.setItem(THEME_STORAGE_KEY, DEFAULT_THEME);
      return DEFAULT_THEME;
    }
  }

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return isValidTheme(stored) ? stored : null;
}

/** Browser chrome / PWA status bar color for the active theme. */
export function getThemeColorMeta(theme: AppTheme, actualTheme: "light" | "dark"): string {
  if (theme === "split" || theme === "light") return "#F3F5F9";
  if (theme === "dark") return "#0B0F1A";
  return actualTheme === "dark" ? "#0B0F1A" : "#F3F5F9";
}
