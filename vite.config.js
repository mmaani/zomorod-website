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
        // SPA fallback for navigation
        navigateFallback: "/index.html",

        // ✅ Precache ONLY small, safe files (NO JS)
        globPatterns: ["**/*.{html,css,ico,png,svg,webp,woff2}"],

        // ✅ Belt + suspenders: never precache JS/maps even if something tries to include them
        globIgnores: ["**/*.js", "**/*.mjs", "**/*.map"],

        // (harmless, but not required since we’re not precaching JS)
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MiB

        runtimeCaching: [
          // ✅ Navigations: always try network first so new deploy HTML is fetched
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 20, maxAgeSeconds: 24 * 60 * 60 }, // 1 day
            },
          },

          // ✅ Scripts & styles: cache-first (perfect with hashed filenames + immutable headers)
          {
            urlPattern: ({ request }) =>
              request.destination === "script" || request.destination === "style",
            handler: "CacheFirst",
            options: {
              cacheName: "assets",
              expiration: { maxEntries: 200, maxAgeSeconds: 31536000 },
            },
          },

          // ✅ Images & fonts: cache-first
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
