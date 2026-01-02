import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.test.{ts,tsx}', 'worker/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}', 'worker/src/**/*.ts'],
      exclude: ['**/*.test.{ts,tsx}', '**/types.ts', '**/*.d.ts'],
    },
    setupFiles: ['./src/test/setup.ts'],
  },
});
