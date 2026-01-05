import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: path.resolve(__dirname),
    environment: 'node',
    include: ['src/test/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
    globals: true,
    testTimeout: 30000, // Longer timeout for Durable Object tests
    hookTimeout: 30000,
    pool: 'forks', // Better isolation for Worker tests
    isolate: true, // Run sequentially to avoid port conflicts
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
