import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: true,
    testTimeout: 30000, // Longer timeout for Durable Object tests
    hookTimeout: 30000,
    pool: 'forks', // Better isolation for Worker tests
    poolOptions: {
      forks: {
        singleFork: true, // Run sequentially to avoid port conflicts
      },
    },
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
});
