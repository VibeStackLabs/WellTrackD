import React, { useEffect, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { Snackbar, Alert } from "@mui/material";

const FestivalBanner = () => {
  const { currentFestival, mode } = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (currentFestival) {
      // Check if we've shown this festival message before
      const lastShown = localStorage.getItem(
        `festival-${currentFestival.id}-shown`,
      );
      const today = new Date().toDateString();

      if (lastShown !== today) {
        setOpen(true);
        localStorage.setItem(`festival-${currentFestival.id}-shown`, today);
      }
    }
  }, [currentFestival]);

  if (!currentFestival) return null;

  return (
    <>
      {/* Floating banner */}
      <div className="festival-message-banner">{currentFestival.message}</div>

      {/* Snackbar notification */}
      <Snackbar
        open={open}
        autoHideDuration={6000}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setOpen(false)}
          severity="success"
          sx={{
            width: "100%",
            backgroundColor:
              mode === "light" ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)",
            color: mode === "light" ? "#333" : "#fff",
            "& .MuiAlert-icon": {
              color: mode === "light" ? "#333" : "#fff",
            },
          }}
        >
          {currentFestival.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default FestivalBanner;
