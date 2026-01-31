import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import legacy from "@vitejs/plugin-legacy";

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
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react")) return "react";
            if (id.includes("react-router")) return "router";
            return "vendor";
          }
        },
      },
    },
  },
});
