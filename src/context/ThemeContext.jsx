import React, { createContext, useState, useContext, useEffect } from "react";
import {
  createTheme,
  ThemeProvider as MuiThemeProvider,
} from "@mui/material/styles";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem("themeMode");
    // Ensure we only return 'light' or 'dark'
    return saved === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    localStorage.setItem("themeMode", mode);
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [mode]);

  const toggleMode = () => {
    setMode((prev) => (prev === "light" ? "dark" : "light"));
  };

  // Create MUI theme based on mode
  const muiTheme = createTheme({
    palette: {
      mode: mode,
      primary: {
        main: "#1976d2",
      },
      background: {
        default: mode === "light" ? "#f5f5f5" : "#121212",
        paper: mode === "light" ? "#f9fafb" : "#2d2d2d",
      },
      text: {
        primary: mode === "light" ? "#111827" : "#f9fafb",
        secondary: mode === "light" ? "#6b7280" : "#d1d5db",
      },
    },
    typography: {
      fontFamily: "Inter, sans-serif",
      buttonText: mode === "light" ? "#111827" : "#f9fafb",
      bodyText: mode === "light" ? "#111827" : "#f9fafb",
    },
    components: {
      MuiButton: {
        styleOverrides: {
          text: {
            color: mode === "light" ? "#111827" : "#f9fafb",
          },
        },
      },
    },
  });

  // Tailwind theme classes
  const tailwindTheme = {
    background: mode === "light" ? "bg-gray-50" : "bg-gray-900",
    surface: mode === "light" ? "bg-white" : "bg-gray-800",
    text: mode === "light" ? "text-gray-900" : "text-white",
    textSecondary: mode === "light" ? "text-gray-600" : "text-gray-300",
    border: mode === "light" ? "border-gray-200" : "border-gray-700",
    card: mode === "light" ? "bg-white" : "bg-gray-800",
    paper: mode === "light" ? "#f9fafb" : "#2d2d2d",
  };

  return (
    <ThemeContext.Provider
      value={{
        mode,
        toggleMode,
        tailwindTheme,
      }}
    >
      <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
