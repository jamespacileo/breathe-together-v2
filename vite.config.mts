import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  /**
   * Cloudflare Workers serves from root path
   * Always use "/" for both development and production
   */
  base: "/",
  plugins: [react()],

  build: {
    target: "esnext",
    minify: "esbuild", // Fast minification with esbuild (default)
    sourcemap: false, // Disable source maps in production for smaller builds
    rollupOptions: {
      output: {
        // Code splitting: separate vendor chunks for better caching
        manualChunks: {
          "three-vendor": ["three"],
          "react-vendor": ["react", "react-dom"],
          "r3f-vendor": ["@react-three/fiber", "@react-three/drei"],
          "koota-vendor": ["koota"],
        },
      },
    },
  },

  optimizeDeps: {
    // Pre-bundle these dependencies for faster dev server startup
    include: ["three", "@react-three/fiber", "@react-three/drei", "koota"],
  },
});
