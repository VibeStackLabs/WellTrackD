import React, { useMemo } from "react";
import { useTheme } from "../contexts/ThemeContext";

const FestivalEffects = () => {
  const { currentFestival, festivalEffects } = useTheme();

  // Memoize random positions so they don't recalculate on every render
  const holiSplashes = useMemo(() => {
    if (currentFestival?.id !== "holi") return [];

    return [...Array(15)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      background: `hsl(${Math.random() * 360}, 80%, 60%)`,
      delay: `${Math.random() * 3}s`,
      width: `${80 + Math.random() * 150}px`,
      height: `${80 + Math.random() * 150}px`,
    }));
  }, [currentFestival?.id]); // Only recalculate when festival changes

  const diwaliSparkles = useMemo(() => {
    if (!festivalEffects?.hasSparkles) return [];

    return [...Array(25)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
      duration: `${1.5 + Math.random() * 2}s`,
    }));
  }, [festivalEffects?.hasSparkles]); // Only recalculate when sparkle setting changes

  if (!currentFestival) return null;

  return (
    <>
      {/* Holi Color Splashes - Only render if needed */}
      {currentFestival.id === "holi" && (
        <div className="festival-effects">
          {holiSplashes.map((splash) => (
            <div
              key={splash.id}
              className="color-splash"
              style={{
                left: splash.left,
                top: splash.top,
                background: splash.background,
                animationDelay: splash.delay,
                width: splash.width,
                height: splash.height,
              }}
            />
          ))}
        </div>
      )}

      {/* Diwali Sparkles */}
      {festivalEffects?.hasSparkles && (
        <div className="sparkle-container">
          {diwaliSparkles.map((sparkle) => (
            <div
              key={sparkle.id}
              className="sparkle"
              style={{
                left: sparkle.left,
                top: sparkle.top,
                animationDelay: sparkle.delay,
                animationDuration: sparkle.duration,
              }}
            />
          ))}
        </div>
      )}

      {/* Corner Decorations - Memoized as static */}
      <CornerDecorations festivalId={currentFestival.id} />
    </>
  );
};

// Separate component for corner decorations (prevents re-renders)
const CornerDecorations = React.memo(({ festivalId }) => {
  const decorations = useMemo(() => {
    switch (festivalId) {
      case "diwali":
        return (
          <>
            <span className="decoration top-left">🪔</span>
            <span className="decoration top-right">🪔</span>
            <span className="decoration bottom-left">🪔</span>
            <span className="decoration bottom-right">🪔</span>
          </>
        );
      case "holi":
        return <span className="decoration bottom-right">🌈</span>;
      case "christmas":
        return <span className="decoration top-right">🎄</span>;
      case "ganesh-chaturthi":
        return <span className="decoration bottom-left">🐘</span>;
      default:
        return null;
    }
  }, [festivalId]);

  if (!decorations) return null;

  return <div className="corner-decorations">{decorations}</div>;
});

CornerDecorations.displayName = "CornerDecorations";

export default React.memo(FestivalEffects);
