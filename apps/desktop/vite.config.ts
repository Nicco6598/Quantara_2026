/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";

const isBundleAnalyze = process.env.CI === "true" || process.env.VITE_MODE === "analyze";

export default defineConfig({
  base: "./",
  clearScreen: false,
  optimizeDeps: {
    entries: ["index.html"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/scheduler")
          )
            return "vendor-react";
          if (id.includes("node_modules/framer-motion")) return "vendor-motion";
          if (id.includes("node_modules/zustand")) return "vendor-zustand";
          if (
            id.includes("node_modules/lucide-react") ||
            id.includes("node_modules/@phosphor-icons")
          )
            return "vendor-icons";
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    ...(isBundleAnalyze
      ? [
          visualizer({
            filename: "dist/stats.html",
            open: false,
            gzipSize: true,
            brotliSize: true,
          }),
        ]
      : []),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    host: "127.0.0.1",
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/target/**"],
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
