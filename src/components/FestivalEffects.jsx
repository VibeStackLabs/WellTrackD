import React from "react";
import { useTheme } from "../contexts/ThemeContext";

const FestivalEffects = () => {
  const { currentFestival, festivalEffects } = useTheme();

  if (!currentFestival) return null;

  return (
    <>
      {/* Holi Color Splashes */}
      {currentFestival.id === "holi" && (
        <div className="festival-effects">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="color-splash"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: `hsl(${Math.random() * 360}, 80%, 60%)`,
                animationDelay: `${Math.random() * 3}s`,
                width: `${80 + Math.random() * 150}px`,
                height: `${80 + Math.random() * 150}px`,
              }}
            />
          ))}
        </div>
      )}

      {/* Diwali Sparkles */}
      {festivalEffects?.hasSparkles && (
        <div className="sparkle-container">
          {[...Array(25)].map((_, i) => (
            <div
              key={i}
              className="sparkle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1.5 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Corner Decorations */}
      <div className="corner-decorations">
        {currentFestival.id === "diwali" && (
          <>
            <span className="decoration top-left">🪔</span>
            <span className="decoration top-right">🪔</span>
            <span className="decoration bottom-left">🪔</span>
            <span className="decoration bottom-right">🪔</span>
          </>
        )}

        {currentFestival.id === "holi" && (
          <span className="decoration bottom-right">🌈</span>
        )}

        {currentFestival.id === "christmas" && (
          <span className="decoration top-right">🎄</span>
        )}

        {currentFestival.id === "ganesh-chaturthi" && (
          <span className="decoration bottom-left">🐘</span>
        )}
      </div>
    </>
  );
};

export default FestivalEffects;
