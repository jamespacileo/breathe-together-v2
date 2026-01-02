import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Longer timeout for WebGL setup
    testTimeout: 30000,
    // Setup file for WebGL mocks
    setupFiles: ['./src/test/setup.ts'],
  },
});
