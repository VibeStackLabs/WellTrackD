import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const APP_VERSION = "1.5.0";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        id: `welltrackd-v${APP_VERSION}`,
        name: "WellTrackD",
        short_name: "WellTrackD",
        description: "WellTrackD App",
        theme_color: "#000000",
        background_color: "#ffffff",
        display: "standalone",
        scope: "/",
        start_url: "/?source=pwa",
        orientation: "portrait",
        icons: [
          {
            src: `favicon-96x96.png?v=${APP_VERSION}`,
            sizes: "96x96",
            type: "image/png",
          },
          {
            src: `apple-touch-icon.png?v=${APP_VERSION}`,
            sizes: "180x180",
            type: "image/png",
          },
          {
            src: `favicon.svg?v=${APP_VERSION}`,
            sizes: "any",
            type: "image/svg+xml",
          },
          {
            src: `favicon.ico?v=${APP_VERSION}`,
            sizes: "any",
            type: "image/x-icon",
          },
          {
            src: `web-app-manifest-192x192.png?v=${APP_VERSION}`,
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: `web-app-manifest-512x512.png?v=${APP_VERSION}`,
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|ico)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
      includeAssets: [
        "apple-touch-icon.png",
        "favicon-96x96.png",
        "favicon.ico",
        "favicon.svg",
        "web-app-manifest-192x192.png",
        "web-app-manifest-512x512.png",
      ],
    }),
  ],
});
