import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  /**
   * Cloudflare Workers serves from root path
   * Always use "/" for both development and production
   */
  base: "/",
  plugins: [react()],
});
