import { useEffect, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";

const FestivalBanner = () => {
  const { currentFestival } = useTheme();
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

  if (!currentFestival || !open) return null; // Remove || !open if you want to show banner whole day

  return (
    <>
      {/* Floating banner */}
      <div className="festival-message-banner">{currentFestival.message}</div>
    </>
  );
};

export default FestivalBanner;
