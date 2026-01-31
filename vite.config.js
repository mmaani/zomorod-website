import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import legacy from "@vitejs/plugin-legacy";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    legacy({
      // legacy bundle target
      targets: ["defaults", "not IE 11"],

      // generate both modern + legacy bundles (what you want)
      renderLegacyChunks: true,
      renderModernChunks: true,

      // modern polyfills chunk (helps some Safari edge cases)
      modernPolyfills: true
    })
  ],
  build: {
    rollupOptions: {
      output: {
        // optional: helps reduce the single 8MB chunk
        manualChunks: {
          react: ["react", "react-dom"],
          router: ["react-router-dom"]
        }
      },
      plugins: [
        visualizer({
          filename: "dist/stats.html",
          gzipSize: true,
          brotliSize: true,
          open: false
        })
      ]
    }
  }
});
