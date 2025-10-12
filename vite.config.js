// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        // Define the entry points for your extension
        content: resolve(__dirname, "src/content/content.jsx"),
        background: resolve(__dirname, "src/background/background.js"),
      },
      output: {
        // Configure the output file names to be predictable
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
    // Disable minification for easier debugging
    minify: false,
  },
});
