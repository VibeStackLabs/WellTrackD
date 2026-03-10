import React, { useMemo, useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";

const FestivalEffects = () => {
  const { currentFestival, festivalEffects } = useTheme();
  const [fireworks, setFireworks] = useState([]);
  const [colorThrows, setColorThrows] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Generate color throws for Holi (from corners AND center)
  useEffect(() => {
    if (currentFestival?.id === "holi") {
      // Create initial color throws
      const initialThrows = Array.from({ length: 10 }, (_, i) =>
        createColorThrow(i),
      );
      setColorThrows(initialThrows);

      // Continuously throw colors
      const interval = setInterval(() => {
        setColorThrows((prev) => {
          const newThrow = createColorThrow(Date.now() + Math.random());
          return [...prev.slice(-12), newThrow]; // Keep last 12
        });
      }, 600); // New color throw every 0.6 seconds

      return () => {
        clearInterval(interval);
        setColorThrows([]);
      };
    }
  }, [currentFestival?.id]);

  // Generate fireworks for Diwali
  useEffect(() => {
    if (currentFestival?.id === "diwali") {
      // Create initial set of fireworks
      const initialFireworks = Array.from(
        { length: isMobile ? 3 : 6 },
        (_, i) => createFirework(i),
      );
      setFireworks(initialFireworks);

      // Add new firework periodically
      const interval = setInterval(() => {
        setFireworks((prev) => {
          const newFirework = createFirework(Date.now());
          // Keep only last 8 fireworks to prevent memory issues
          return [...prev.slice(-7), newFirework];
        });
      }, 1500);

      return () => clearInterval(interval);
    }
  }, [currentFestival?.id]);

  // Memoize static Holi splashes (background)
  const holiSplashes = useMemo(() => {
    if (currentFestival?.id !== "holi") return [];
    return [...Array(8)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      background: `hsl(${Math.random() * 360}, 80%, 60%)`,
      delay: `${Math.random() * 5}s`,
      width: `${100 + Math.random() * 200}px`,
      height: `${100 + Math.random() * 200}px`,
    }));
  }, [currentFestival?.id]);

  if (!currentFestival) return null;

  return (
    <>
      {/* Holi Color Splashes */}
      {currentFestival.id === "holi" && (
        <>
          {/* Background color splashes */}
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

          {/* Active color throws */}
          <div className="color-throw-container">
            {colorThrows.map((throw_) => (
              <div
                key={throw_.id}
                className={`color-throw from-${throw_.source}`}
                style={{
                  "--color1": throw_.colors[0],
                  "--color2": throw_.colors[1],
                  "--color3": throw_.colors[2],
                  "--angle": throw_.angle,
                  left: throw_.source === "center" ? "50%" : undefined,
                  top: throw_.source === "center" ? "50%" : undefined,
                  animationDelay: throw_.delay,
                }}
              >
                <div className="color-cloud" />
                <div className="color-droplets">
                  <div className="droplet" />
                  <div className="droplet" />
                  <div className="droplet" />
                  <div className="droplet" />
                  <div className="droplet" />
                </div>
              </div>
            ))}
          </div>

          {/* Floating color powder */}
          <div className="gulal-powder">
            {[...Array(isMobile ? 12 : 30)].map((_, i) => (
              <div
                key={i}
                className="gulal-particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  background: `hsl(${Math.random() * 360}, 80%, 70%)`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${4 + Math.random() * 6}s`,
                  width: `${2 + Math.random() * 6}px`,
                  height: `${2 + Math.random() * 6}px`,
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* Diwali Firework Bursts */}
      {currentFestival.id === "diwali" && (
        <>
          <div className="fireworks-container">
            {fireworks.map((fw) => (
              <div
                key={fw.id}
                className="firework-burst"
                style={{
                  left: fw.left,
                  top: fw.top,
                }}
              >
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="burst-particle"
                    style={{
                      background: fw.colors[i % fw.colors.length],
                      boxShadow: `0 0 15px ${fw.colors[i % fw.colors.length]}`,
                      animationDelay: `${i * 0.05}s`,
                      left: "50%",
                      top: "50%",
                      transform: `rotate(${i * 30}deg) translate(0, -40px)`,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="ground-effects">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="sparkler"
                style={{
                  left: `${10 + i * 12}%`,
                  bottom: "10px",
                  animationDelay: `${i * 0.2}s`,
                }}
              >
                <div className="sparkler-spark" />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Corner Decorations */}
      <CornerDecorations festivalId={currentFestival.id} />
    </>
  );
};

// Helper to create a color throw (for Holi)
const createColorThrow = (id) => {
  const sources = [
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
    "center",
  ];
  const source = sources[Math.floor(Math.random() * sources.length)];

  return {
    id,
    source,
    angle: Math.random() * 360,
    delay: `${Math.random() * 2}s`,
    colors: [
      `hsl(${Math.random() * 360}, 90%, 60%)`,
      `hsl(${Math.random() * 360}, 90%, 60%)`,
      `hsl(${Math.random() * 360}, 90%, 60%)`,
    ],
  };
};

// Helper to create a firework (for Diwali)
const createFirework = (id) => ({
  id,
  left: `${15 + Math.random() * 70}%`,
  top: `${20 + Math.random() * 50}%`,
  colors: [
    "#FFD700", // Gold
    "#FFA500", // Orange
    "#FF4500", // Orange Red
    "#FF1493", // Deep Pink
    "#FFFF00", // Yellow
    "#FF6347", // Tomato
  ].sort(() => Math.random() - 0.5),
});

// Corner Decorations component
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
        return (
          <>
            <span className="decoration top-left">❤️</span>
            <span className="decoration top-right">🔫</span>
            <span className="decoration bottom-left">💚</span>
            <span className="decoration bottom-right">🔫</span>
          </>
        );
      case "christmas":
        return (
          <>
            <span className="decoration top-left">🎅</span>
            <span className="decoration top-right">🦌</span>
            <span className="decoration bottom-left">🎄</span>
            <span className="decoration bottom-right">⭐</span>
          </>
        );
      case "ganesh-chaturthi":
        return (
          <>
            <span className="decoration top-left">🙏🏻</span>
            <span className="decoration top-right">🐀</span>
            <span className="decoration bottom-left">🐘</span>
            <span className="decoration bottom-right">🌺</span>
          </>
        );
      default:
        return null;
    }
  }, [festivalId]);

  return decorations ? (
    <div className="corner-decorations">{decorations}</div>
  ) : null;
});

CornerDecorations.displayName = "CornerDecorations";

export default React.memo(FestivalEffects);
