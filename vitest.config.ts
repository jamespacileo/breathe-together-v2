import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'three/tsl': path.resolve(__dirname, 'node_modules/three/build/three.tsl.js'),
      'three/webgpu': path.resolve(__dirname, 'node_modules/three/build/three.webgpu.js'),
      three: path.resolve(__dirname, 'node_modules/three/build/three.module.js'),
      '@react-three/fiber': path.resolve(__dirname, 'node_modules/@react-three/fiber'),
      '@react-three/drei': path.resolve(__dirname, 'node_modules/@react-three/drei'),
    },
  },
  ssr: {
    noExternal: [/three/, /@react-three/, /koota/],
  },
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
      exclude: ['**/*.test.{ts,tsx}', '**/types.ts', '**/*.d.ts'],
    },
    setupFiles: ['./src/test/setup.ts'],
    pool: 'forks',
    forks: {
      singleFork: true,
    },
    deps: {
      inline: [/three/, /koota/, /@react-three\/fiber/, /@react-three\/drei/],
    },
  },
});
