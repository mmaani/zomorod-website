import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000", // your Express backend
        changeOrigin: true,
      },
    },
  },

  plugins: [
    react(),
    VitePWA({
      strategies: "generateSW",
      registerType: "autoUpdate",
      injectRegister: "auto",

      workbox: {
        // SPA fallback
        navigateFallback: "/index.html",

        // Workbox precache defaults include js/css/html; keep that (recommended)
        // and simply raise the size limit so build won't fail.
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024, // 12 MiB

        // Always fetch newest HTML after deploy (prevents "old site" problem)
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html",
              networkTimeoutSeconds: 3,
            },
          },

          // Hashed assets can be cached forever
          {
            urlPattern: ({ request }) =>
              request.destination === "script" || request.destination === "style",
            handler: "CacheFirst",
            options: {
              cacheName: "assets",
              expiration: { maxEntries: 200, maxAgeSeconds: 31536000 },
            },
          },

          {
            urlPattern: ({ request }) =>
              request.destination === "image" || request.destination === "font",
            handler: "CacheFirst",
            options: {
              cacheName: "static",
              expiration: { maxEntries: 200, maxAgeSeconds: 31536000 },
            },
          },
        ],
      },

      manifest: {
        name: "Zomorod Medical Supplies",
        short_name: "Zomorod",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#ffffff",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
});
