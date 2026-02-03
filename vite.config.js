import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",

      workbox: {
        // SPA fallback
        navigateFallback: "/index.html",

        // ✅ Keep precache small & safe
        globPatterns: ["**/*.{css,html,ico,png,svg,webp,woff2}"],

        // ✅ Allow bigger files if you really want to precache some JS later
        // (not needed with globPatterns above, but harmless)
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MiB

        // ✅ Navigation: network-first to always get newest HTML after deploy
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html",
              networkTimeoutSeconds: 3,
            },
          },

          // ✅ JS/CSS: cache-first (works great with hashed filenames + immutable)
          {
            urlPattern: ({ request }) =>
              request.destination === "script" || request.destination === "style",
            handler: "CacheFirst",
            options: {
              cacheName: "assets",
              expiration: { maxEntries: 200, maxAgeSeconds: 31536000 },
            },
          },

          // ✅ Images/fonts: cache-first
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
