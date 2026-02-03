import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",

      // ✅ important so navigations go through index.html properly
      workbox: {
        navigateFallback: "/index.html",

        // ✅ do NOT precache index.html "forever"
        // Let it update on deploy; keep assets immutable instead.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],

        // ✅ runtime: make navigation (HTML) network-first
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html",
              networkTimeoutSeconds: 3
            }
          }
        ]
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
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" }
        ]
      }
    })
  ]
});
