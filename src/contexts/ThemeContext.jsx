import { createContext, useState, useContext, useEffect, useMemo } from "react";
import {
  createTheme,
  ThemeProvider as MuiThemeProvider,
} from "@mui/material/styles";
import { getCurrentFestival } from "../utils/festivalDates";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem("themeMode");
    // Ensure we only return 'light' or 'dark'
    return saved === "dark" ? "dark" : "light";
  });

  // New state for festival theme
  const [currentFestival, setCurrentFestival] = useState(null);

  // Check for festivals on mount and when date changes
  useEffect(() => {
    const checkFestival = () => {
      const festival = getCurrentFestival();
      setCurrentFestival(festival);
    };

    // Check immediately on mount
    checkFestival();

    // Calculate time until next midnight
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0); // Next day at 00:00:00
    const timeUntilMidnight = nextMidnight - now;

    // Set timeout for exact midnight
    const midnightTimeout = setTimeout(() => {
      checkFestival();

      // Then set up daily interval for subsequent midnights
      const dailyInterval = setInterval(checkFestival, 24 * 60 * 60 * 1000); // 24 hours

      // Clean up daily interval on unmount
      return () => clearInterval(dailyInterval);
    }, timeUntilMidnight);

    // Clean up timeout on unmount
    return () => {
      clearTimeout(midnightTimeout);
    };
  }, []);

  const festivalEffects = {
    hasSparkles: currentFestival?.colors[mode]?.sparkle || false,
    festivalColors: {
      primary: currentFestival?.colors[mode]?.overlay1,
      secondary: currentFestival?.colors[mode]?.overlay2,
    },
  };

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

  // Get festival colors based on current mode
  const festivalColors = currentFestival?.colors[mode] || null;

  // Light theme
  const lightTheme = {
    background:
      festivalColors?.background ||
      "linear-gradient(180deg, #f9f6ee 0%, #f6e4d2 100%)",
    surface: "#f9f6ee",
    surfaceTransparent: "#f9f6ee80",
    card: "#f9f6ee",
    text: "#333333",
    textSecondary: "#666666",
    border: "#33333333",
    shadow: "0px 2px 6px rgba(0, 0, 0, 0.1)",
    hover: "#f6e4d2",
    iconBg: "#f9f6ee80",
    iconHover: "#f6e4d2",
    Button: "#333333",
    ButtonHover: "#444444",
    ButtonText: "#f9f6ee",
    festivalMessage: currentFestival?.message || null,
    festivalColors: festivalColors,
  };

  // Dark theme
  const darkTheme = {
    background:
      festivalColors?.background ||
      "linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 100%)",
    surface: "#1a1a1a",
    surfaceTransparent: "#1a1a1a80",
    card: "#1a1a1a",
    text: "#f9f6ee",
    textSecondary: "#f6e4d2",
    border: "#f6e4d233",
    shadow: "0px 4px 12px rgba(0, 0, 0, 0.3)",
    hover: "#2d2d2d",
    iconBg: "#1a1a1a80",
    iconHover: "#2d2d2d",
    Button: "#f9f6ee",
    ButtonHover: "#f6e4d2",
    ButtonText: "#333333",
    festivalMessage: currentFestival?.message || null,
    festivalColors: festivalColors,
  };

  // Current theme
  const currentTheme = mode === "light" ? lightTheme : darkTheme;

  // Create MUI theme
  const muiTheme = createTheme({
    palette: {
      mode: mode,
      primary: {
        main: currentTheme.text,
      },
      secondary: {
        main: currentTheme.textSecondary,
      },
      background: {
        default: mode === "light" ? "#f9f6ee" : "#1a1a1a",
        paper: currentTheme.surface,
      },
      text: {
        primary: currentTheme.text,
        secondary: currentTheme.textSecondary,
      },
      divider: currentTheme.border,
      success: {
        main: mode === "light" ? "#2e7d32" : "#81c784",
      },
      warning: {
        main: mode === "light" ? "#ed6c02" : "#ffb74d",
      },
      error: {
        main: mode === "light" ? "#d32f2f" : "#f44336",
      },
      info: {
        main: mode === "light" ? "#0288d1" : "#4fc3f7",
      },
    },
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    h6: {
      fontWeight: 600,
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            background: currentTheme.background,
            backgroundAttachment: "fixed",
            minHeight: "100vh",
          },
        },
      },

      // Global Paper styles
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: currentTheme.card,
            border: `1px solid ${currentTheme.border}`,
            boxShadow: currentTheme.shadow,
            transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
            position: "relative",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              inset: 0,
              borderRadius: "inherit",
              padding: "2px",
              background:
                mode === "light"
                  ? "linear-gradient(45deg, #333333, #666666)"
                  : "linear-gradient(45deg, #f9f6ee, #f6e4d2)",
              WebkitMask:
                "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              opacity: 0,
              transition: "opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
              pointerEvents: "none",
            },
          },
        },
      },

      // Card styles
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: currentTheme.card,
            overflow: "hidden",
            borderRadius: "16px",
            border: `1px solid ${currentTheme.border}`,
            transition: "all 0.3s ease",
          },
        },
      },

      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: "24px",
            "&:last-child": {
              paddingBottom: "24px",
            },
          },
        },
      },

      // Button styles
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: "bold",
            padding: "8px 24px",
            borderRadius: "20px",
            transition: "all 0.3s ease",
          },
          contained: {
            // Default contained buttons
            backgroundColor: currentTheme.Button,
            color: currentTheme.ButtonText,
            "&:hover": {
              backgroundColor: currentTheme.ButtonHover,
            },
            "&:disabled": {
              backgroundColor: mode === "light" ? "#cccccc" : "#444444",
              color: mode === "light" ? "#666666" : "#999999",
            },
          },
          outlined: {
            borderColor: currentTheme.border,
            color: currentTheme.text,
            backgroundColor: "transparent",
            "&:hover": {
              backgroundColor: currentTheme.hover + "40",
              borderColor: currentTheme.text,
            },
          },
          text: {
            color: currentTheme.text,
            "&:hover": {
              backgroundColor: currentTheme.hover + "40",
            },
          },
        },
      },

      // IconButton styles
      MuiIconButton: {
        styleOverrides: {
          root: {
            backgroundColor: currentTheme.iconBg,
            transition: "all 0.3s ease",
            color: currentTheme.text,
            "&:hover": {
              backgroundColor: currentTheme.iconHover,
            },
          },
        },
      },

      // Chip styles
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
            backgroundColor: currentTheme.surfaceTransparent,
            color: currentTheme.text,
            borderColor: currentTheme.border,
          },
          outlined: {
            borderColor: currentTheme.border,
            backgroundColor: "transparent",
            color: currentTheme.text,
            "&:hover": {
              backgroundColor: currentTheme.hover + "40",
            },
          },
          filled: {
            backgroundColor: currentTheme.surface,
            color: currentTheme.text,
          },
        },
      },

      // TextField styles
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              backgroundColor: currentTheme.surfaceTransparent,
              borderRadius: "12px",
              transition: "all 0.3s ease",
              color: currentTheme.text,
              "& fieldset": {
                borderColor: currentTheme.border,
              },
              "&:hover fieldset": {
                borderColor: currentTheme.text,
              },
              "&.Mui-focused fieldset": {
                borderColor: currentTheme.text,
                borderWidth: "2px",
              },
            },
            "& .MuiInputLabel-root": {
              color: currentTheme.textSecondary,
            },
            "& .MuiInputBase-input": {
              color: currentTheme.text,
            },
          },
        },
      },

      // Select styles
      MuiSelect: {
        styleOverrides: {
          root: {
            backgroundColor: currentTheme.surfaceTransparent,
            color: currentTheme.text,
          },
          icon: {
            color: currentTheme.text,
          },
        },
      },

      // Menu styles
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: currentTheme.surface,
            backgroundImage: "none",
            border: `1px solid ${currentTheme.border}`,
            borderRadius: "16px",
            boxShadow: currentTheme.shadow,
            marginTop: "8px",
          },
        },
      },

      // MenuItem styles
      MuiMenuItem: {
        styleOverrides: {
          root: {
            color: currentTheme.text,
            padding: "12px 24px",
            transition: "all 0.2s ease",
            "&:hover": {
              backgroundColor: currentTheme.hover,
            },
            "&.Mui-selected": {
              backgroundColor: currentTheme.hover,
              "&:hover": {
                backgroundColor: currentTheme.hover,
              },
            },
          },
        },
      },

      // ListItemIcon styles
      MuiListItemIcon: {
        styleOverrides: {
          root: {
            color: currentTheme.text,
            minWidth: 40,
          },
        },
      },

      // ListItemText styles
      MuiListItemText: {
        styleOverrides: {
          primary: {
            color: currentTheme.text,
          },
          secondary: {
            color: currentTheme.textSecondary,
          },
        },
      },

      // Divider styles
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: currentTheme.border,
          },
        },
      },

      // Tabs styles
      MuiTabs: {
        styleOverrides: {
          indicator: {
            backgroundColor: currentTheme.text,
            height: "3px",
            borderRadius: "3px 3px 0 0",
          },
        },
      },

      MuiTab: {
        styleOverrides: {
          root: {
            color: currentTheme.textSecondary,
            textTransform: "none",
            fontWeight: 600,
            fontSize: "1rem",
            transition: "all 0.3s ease",
            "&.Mui-selected": {
              color: currentTheme.text,
            },
            "&:hover": {
              color: currentTheme.text,
              backgroundColor: currentTheme.hover + "40",
            },
          },
        },
      },

      // ToggleButton styles
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            borderColor: currentTheme.border,
            border: `1px solid ${currentTheme.border}`,
            borderRadius: "20px",
            padding: "4px",
            backgroundColor: currentTheme.surfaceTransparent,
          },
        },
      },

      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            border: "none",
            borderRadius: "20px !important",
            color: currentTheme.textSecondary,
            backgroundColor: "transparent",
            transition: "all 0.3s ease",
            margin: "2px",
            "&:hover": {
              backgroundColor: currentTheme.hover,
              color: currentTheme.text,
            },
            "&.Mui-selected": {
              backgroundColor: currentTheme.text,
              color: mode === "light" ? "#f9f6ee" : "#1a1a1a",
              "&:hover": {
                backgroundColor: currentTheme.text,
              },
            },
          },
        },
      },

      // Dialog styles
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: currentTheme.surface,
            backgroundImage: "none",
            border: `1px solid ${currentTheme.border}`,
            boxShadow: currentTheme.shadow,
          },
        },
      },

      MuiDialogTitle: {
        styleOverrides: {
          root: {
            color: currentTheme.text,
          },
        },
      },

      MuiDialogContent: {
        styleOverrides: {
          root: {
            backgroundColor: currentTheme.surface,
            color: currentTheme.text,
          },
        },
      },

      MuiDialogContentText: {
        styleOverrides: {
          root: {
            color: currentTheme.textSecondary,
          },
        },
      },

      MuiDialogActions: {
        styleOverrides: {
          root: {
            backgroundColor: currentTheme.surface,
            padding: "16px 24px",
          },
        },
      },

      // Alert styles
      MuiAlert: {
        styleOverrides: {
          root: {
            backgroundColor: currentTheme.surface,
            color: currentTheme.text,
            border: `1px solid ${currentTheme.border}`,
            borderRadius: "12px",
          },
          standardSuccess: {
            backgroundColor: mode === "light" ? "#e8f5e9" : "#1b5e20",
          },
          standardError: {
            backgroundColor: mode === "light" ? "#ffebee" : "#b71c1c",
          },
          standardWarning: {
            backgroundColor: mode === "light" ? "#fff3e0" : "#bf360c",
          },
          standardInfo: {
            backgroundColor: currentTheme.surface,
          },
        },
      },

      // LinearProgress styles
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            backgroundColor: currentTheme.hover,
          },
          bar: {
            backgroundColor: currentTheme.text,
          },
        },
      },

      // SpeedDial styles
      MuiSpeedDial: {
        styleOverrides: {
          fab: {
            backgroundColor: currentTheme.text,
            color: currentTheme.surface,
          },
        },
      },

      MuiSpeedDialAction: {
        styleOverrides: {
          fab: {
            backgroundColor: currentTheme.text,
            color: currentTheme.surface,
            border: `1px solid ${currentTheme.border}`,
            "&:hover": {
              backgroundColor: currentTheme.text,
            },
          },
        },
      },

      // AppBar styles
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: currentTheme.surface,
            color: currentTheme.text,
            boxShadow: currentTheme.shadow,
            borderBottom: `1px solid ${currentTheme.border}`,
          },
        },
      },

      // Autocomplete styles
      MuiAutocomplete: {
        styleOverrides: {
          paper: {
            backgroundColor: currentTheme.surface,
            border: `1px solid ${currentTheme.border}`,
          },
          option: {
            color: currentTheme.text,
            "&:hover": {
              backgroundColor: currentTheme.hover,
            },
            '&[aria-selected="true"]': {
              backgroundColor: currentTheme.hover,
            },
          },
        },
      },

      // Table styles
      MuiTableContainer: {
        styleOverrides: {
          root: {
            backgroundColor: currentTheme.surfaceTransparent,
            borderRadius: "16px",
            border: `1px solid ${currentTheme.border}`,
            boxShadow: currentTheme.shadow,
          },
        },
      },

      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${currentTheme.border}`,
            color: currentTheme.text,
            py: 1.5,
          },
          head: {
            fontWeight: "bold",
            backgroundColor: currentTheme.surface,
            color: currentTheme.text,
          },
        },
      },

      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: "all 0.2s ease",
            "&:hover": {
              backgroundColor: currentTheme.hover + "80",
            },
          },
        },
      },
    },
  });

  // Tailwind theme classes
  const tailwindTheme = {
    background:
      mode === "light"
        ? "bg-gradient-to-b from-[#f9f6ee] to-[#f6e4d2]"
        : "bg-gradient-to-b from-[#1a1a1a] to-[#2d2d2d]",
    surface: mode === "light" ? "bg-[#f9f6ee]" : "bg-[#1a1a1a]",
    surfaceTransparent:
      mode === "light" ? "bg-[#f9f6ee]/50" : "bg-[#1a1a1a]/50",
    text: mode === "light" ? "text-[#333333]" : "text-[#f9f6ee]",
    textSecondary: mode === "light" ? "text-[#666666]" : "text-[#f6e4d2]",
    border: mode === "light" ? "border-[#33333333]" : "border-[#f6e4d2]/20",
    card: mode === "light" ? "bg-[#f9f6ee]" : "bg-[#1a1a1a]",
    hover: mode === "light" ? "hover:bg-[#f6e4d2]" : "hover:bg-[#2d2d2d]",
    iconBg: mode === "light" ? "bg-[#f9f6ee]/50" : "bg-[#1a1a1a]/50",
    iconHover: mode === "light" ? "hover:bg-[#f6e4d2]" : "hover:bg-[#2d2d2d]",
    // Button specific colors
    Button: mode === "light" ? "bg-[#333333]" : "bg-[#333333]",
    ButtonHover: mode === "light" ? "hover:bg-[#000000]" : "hover:bg-[#000000]",
    ButtonText: "text-[#f9f6ee]",
  };

  const contextValue = useMemo(
    () => ({
      mode,
      toggleMode,
      tailwindTheme,
      currentTheme,
      currentFestival,
      isFestivalDay: currentFestival !== null,
      festivalEffects,
    }),
    [mode, currentFestival, festivalEffects],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
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
