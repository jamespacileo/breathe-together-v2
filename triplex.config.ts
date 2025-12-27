import { defineConfig } from "triplex";

export default defineConfig({
  // Development server configuration
  devServer: {
    // The command to start your dev server
    // Triplex will run this and connect to it
    command: "npm run dev",

    // Port where dev server runs
    port: 5173,

    // Base URL for dev server
    baseURL: "/breathe-together-v2",
  },

  // Component files to make editable in Triplex
  files: [
    "src/levels/**/*.tsx",
    "src/entities/**/*.tsx",
    "src/components/**/*.tsx",
  ],

  // Canvas configuration (Three.js specific)
  canvas: {
    // Where the Canvas component is rendered
    entry: "src/index.tsx",
  },
});
