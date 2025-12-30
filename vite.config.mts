import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  /**
   * For development: use root path "/" so texture paths resolve correctly
   * For production: use GitHub repo name (set by GitHub Actions GITHUB_REPOSITORY env var)
   * Only in production should we use the /breathe-together-v2/ base path for GitHub Pages
   *
   * Uses GITHUB_ACTIONS env var (always set in CI) instead of NODE_ENV,
   * which may be undefined during Vite config phase.
   */
  base: (() => {
    if (process.env.GITHUB_ACTIONS) {
      // Extract repo name from GITHUB_REPOSITORY format: "owner/repo"
      const repoName = process.env.GITHUB_REPOSITORY?.split("/")
        .pop()
        ?.trim();

      return "/" + (repoName || "breathe-together-v2") + "/";
    }
    return "/";
  })(),
  plugins: [react()],
});
