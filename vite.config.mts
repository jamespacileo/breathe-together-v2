import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  /**
   * For development: use root path "/" so texture paths resolve correctly
   * For production: use GitHub repo name (set by GitHub Actions GITHUB_REPOSITORY env var)
   * Only in production should we use the /breathe-together-v2/ base path for GitHub Pages
   */
  base:
    process.env.NODE_ENV === "production"
      ? "/" + (process.env.GITHUB_REPOSITORY?.split("/").pop() || "breathe-together-v2") + "/"
      : "/",
  plugins: [react()],
});
