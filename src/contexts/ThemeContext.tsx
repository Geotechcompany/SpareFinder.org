import React, { createContext, useContext, useEffect, useState } from "react";
import {
  DEFAULT_THEME,
  type AppTheme,
  getThemeColorMeta,
  readStoredTheme,
  THEME_STORAGE_KEY,
} from "@/lib/theme";

type Theme = AppTheme;

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** Resolved light/dark for components that do not support split. */
  actualTheme: "light" | "dark";
  /** Studio theme: dark sidebar + light dashboard main. */
  isSplitDashboard: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<Theme>(
    () => readStoredTheme() ?? DEFAULT_THEME
  );

  const [actualTheme, setActualTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");
    root.removeAttribute("data-theme");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      setActualTheme(systemTheme);
      root.classList.add(systemTheme);
    } else if (theme === "split") {
      setActualTheme("light");
      root.classList.add("light");
      root.dataset.theme = "split";
    } else {
      setActualTheme(theme);
      root.classList.add(theme);
    }

    localStorage.setItem(THEME_STORAGE_KEY, theme);

    const themeColor = getThemeColorMeta(theme, actualTheme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", themeColor);
    document
      .querySelector('meta[name="msapplication-TileColor"]')
      ?.setAttribute("content", themeColor);
  }, [theme, actualTheme]);

  const isSplitDashboard = theme === "split";

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, actualTheme, isSplitDashboard }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
