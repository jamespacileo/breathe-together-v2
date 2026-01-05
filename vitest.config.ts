import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.test.{ts,tsx}', 'worker/**/*.test.ts'],
    // Longer timeout for WebGL setup
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}', 'worker/src/**/*.ts'],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/types.ts',
        '**/*.d.ts',
        '**/test/**',
        '**/fixtures/**',
        '**/__tests__/**',
      ],
      // Coverage thresholds - enforce minimum test coverage
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
        // Per-file thresholds for critical modules
        perFile: true,
      },
      // Fail CI if coverage drops below thresholds
      all: true,
    },
    setupFiles: ['./src/test/setup.ts'],
  },
});
