/**
 * Material UI Theme Configuration
 *
 * Modern, clean theme for a professional desktop admin application.
 */

import {
  createTheme,
  type ThemeOptions,
  type PaletteMode,
} from "@mui/material/styles";

const getThemeOptions = (mode: PaletteMode): ThemeOptions => ({
  palette: {
    mode,
    ...(mode === "light"
      ? {
          primary: {
            main: "#2563eb",
            light: "#60a5fa",
            dark: "#1e40af",
            contrastText: "#ffffff",
          },
          secondary: {
            main: "#7c3aed",
            light: "#a78bfa",
            dark: "#5b21b6",
            contrastText: "#ffffff",
          },
          background: {
            default: "#f8fafc",
            paper: "#ffffff",
          },
          text: {
            primary: "#0f172a",
            secondary: "#475569",
          },
          error: {
            main: "#dc2626",
          },
          warning: {
            main: "#f59e0b",
          },
          success: {
            main: "#10b981",
          },
          divider: "#e2e8f0",
        }
      : {
          primary: {
            main: "#60a5fa",
            light: "#93c5fd",
            dark: "#2563eb",
          },
          secondary: {
            main: "#a78bfa",
            light: "#c4b5fd",
            dark: "#7c3aed",
          },
          background: {
            default: "#0f172a",
            paper: "#1e293b",
          },
          text: {
            primary: "#f1f5f9",
            secondary: "#cbd5e1",
          },
          divider: "#334155",
        }),
  },
  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontSize: "2.25rem",
      fontWeight: 600,
      letterSpacing: "-0.02em",
    },
    h2: {
      fontSize: "1.875rem",
      fontWeight: 600,
      letterSpacing: "-0.01em",
    },
    h3: {
      fontSize: "1.5rem",
      fontWeight: 600,
    },
    h4: {
      fontSize: "1.25rem",
      fontWeight: 600,
    },
    h5: {
      fontSize: "1.125rem",
      fontWeight: 600,
    },
    h6: {
      fontSize: "1rem",
      fontWeight: 600,
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.6,
    },
    body2: {
      fontSize: "0.875rem",
      lineHeight: 1.5,
    },
    button: {
      textTransform: "none",
      fontWeight: 500,
      fontSize: "0.9375rem",
    },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: "thin",
          "&::-webkit-scrollbar": {
            width: "8px",
            height: "8px",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: mode === "light" ? "#cbd5e1" : "#475569",
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: mode === "light" ? "#f1f5f9" : "#1e293b",
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "10px 20px",
          fontWeight: 500,
        },
        contained: {
          boxShadow: "none",
          "&:hover": {
            boxShadow:
              "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
          },
        },
        sizeLarge: {
          padding: "12px 28px",
          fontSize: "1rem",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: mode === "light" ? "1px solid #e2e8f0" : "1px solid #334155",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow:
            mode === "light"
              ? "0 1px 20px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)"
              : "0 1px 20px 0 rgb(0 0 0 / 0.3)",
        },
      },
    },
  },
});

export const createAppTheme = (mode: PaletteMode = "light") => {
  return createTheme(getThemeOptions(mode));
};
