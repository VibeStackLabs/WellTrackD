import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "apple-touch-icon.png",
        "favicon-96x96.png",
        "favicon.ico",
        "favicon.svg",
        "web-app-manifest-192x192.png",
        "web-app-manifest-512x512.png",
      ],
      manifest: {
        name: "WellTrackD",
        short_name: "WellTrackD",
        description: "WellTrackD App",
        theme_color: "#000000",
        background_color: "#ffffff",
        display: "standalone",
        scope: "/",
        start_url: "/",
        orientation: "portrait",
        icons: [
          {
            src: "favicon-96x96.png",
            sizes: "96x96",
            type: "image/png",
          },
          {
            src: "apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
          },
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
          },
          {
            src: "favicon.ico",
            sizes: "any",
            type: "image/x-icon",
          },
          {
            src: "web-app-manifest-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "web-app-manifest-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});
