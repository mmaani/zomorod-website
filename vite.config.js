import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import legacy from "@vitejs/plugin-legacy";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ["defaults", "not IE 11"],
      renderLegacyChunks: true,
      renderModernChunks: true,
      modernPolyfills: true,
    }),
  ],
  build: {
    target: "es2015",
    rollupOptions: {
      plugins: [
        visualizer({
          filename: "dist/stats.html",
          gzipSize: true,
          brotliSize: true,
          open: false,
        }),
      ],
    },
  },
});
