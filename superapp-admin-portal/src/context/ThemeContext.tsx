/**
 * Theme Context
 *
 * Manages theme mode (light/dark) state with localStorage persistence.
 */

import { createContext, useContext, useState, useMemo, useEffect } from "react";
import type { ReactNode } from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material";
import { createAppTheme } from "../theme";

type ThemeMode = "light" | "dark";

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = "app-theme-mode";

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  // Initialize from localStorage or default to light
  const [mode, setMode] = useState<ThemeMode>(() => {
    const savedMode = localStorage.getItem(THEME_STORAGE_KEY);
    return savedMode === "dark" || savedMode === "light" ? savedMode : "light";
  });

  // Save to localStorage whenever mode changes
  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    // Reflect mode on document element for global styling/testing
    try {
      const root = document.documentElement;
      root.setAttribute("data-theme", mode);
      root.classList.remove("theme-light", "theme-dark");
      root.classList.add(mode === "dark" ? "theme-dark" : "theme-light");
    } catch {
      // no-op for non-browser envs
    }
  }, [mode]);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
  };

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
