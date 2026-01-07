/**
 * Performance Testing Harness for Three.js Scenes
 *
 * Uses a mock WebGL context with spy functions to track:
 * - Draw calls (drawArrays, drawElements, instanced variants)
 * - Triangles rendered
 * - Shader programs created
 * - Buffers (geometries) created
 * - Textures created
 *
 * This approach works reliably in CI without native WebGL dependencies.
 */

import * as THREE from 'three';
import {
  createMockCanvas,
  createMockWebGLContext,
  type MockWebGLContext,
} from '../infra/webglMock';

export interface PerformanceMetrics {
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
  instancedDrawCalls: number;
}

export interface PerformanceThresholds {
  maxDrawCalls?: number;
  maxTriangles?: number;
  maxGeometries?: number;
  maxTextures?: number;
  maxPrograms?: number;
}

/**
 * Performance targets for different device tiers
 */
export const PERFORMANCE_TARGETS = {
  mobile: {
    maxDrawCalls: 50,
    maxTriangles: 50000,
    maxGeometries: 30,
    maxTextures: 10,
    maxPrograms: 15,
  },
  tablet: {
    maxDrawCalls: 80,
    maxTriangles: 80000,
    maxGeometries: 50,
    maxTextures: 15,
    maxPrograms: 25,
  },
  desktop: {
    maxDrawCalls: 150,
    maxTriangles: 150000,
    maxGeometries: 100,
    maxTextures: 30,
    maxPrograms: 40,
  },
} as const;

export interface TestRenderer {
  renderer: THREE.WebGLRenderer;
  mockGL: MockWebGLContext;
  dispose: () => void;
}

/**
 * Creates a Three.js renderer with our mock WebGL context
 */
export function createTestRenderer(width = 800, height = 600): TestRenderer {
  const mockGL = createMockWebGLContext();
  const canvas = createMockCanvas(mockGL);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    context: mockGL as unknown as WebGL2RenderingContext,
    antialias: false,
    alpha: true,
  });

  renderer.setSize(width, height);

  return {
    renderer,
    mockGL,
    dispose: () => {
      renderer.dispose();
    },
  };
}

/**
 * Extracts performance metrics from the mock WebGL context
 */
export function extractMetrics(mockGL: MockWebGLContext): PerformanceMetrics {
  const stats = mockGL.__stats;
  return {
    drawCalls: stats.drawCalls,
    triangles: Math.round(stats.triangles),
    geometries: stats.buffers, // Each geometry creates buffers
    textures: stats.textures,
    programs: stats.programs,
    instancedDrawCalls: stats.instancedDrawCalls,
  };
}

/**
 * Renders a scene and returns performance metrics
 */
export function measureScenePerformance(
  scene: THREE.Scene,
  camera: THREE.Camera,
  testRenderer?: TestRenderer,
): PerformanceMetrics {
  const ownRenderer = !testRenderer;
  const tr = testRenderer ?? createTestRenderer();

  // Reset stats before measuring
  tr.mockGL.__resetStats();

  // Render one frame
  tr.renderer.render(scene, camera);

  // Extract metrics
  const metrics = extractMetrics(tr.mockGL);

  // Cleanup if we created the renderer
  if (ownRenderer) {
    tr.dispose();
  }

  return metrics;
}

/**
 * Validates metrics against thresholds
 */
export function validateMetrics(
  metrics: PerformanceMetrics,
  thresholds: PerformanceThresholds,
): { passed: boolean; violations: string[] } {
  const violations: string[] = [];

  if (thresholds.maxDrawCalls !== undefined && metrics.drawCalls > thresholds.maxDrawCalls) {
    violations.push(`Draw calls ${metrics.drawCalls} exceeds max ${thresholds.maxDrawCalls}`);
  }

  if (thresholds.maxTriangles !== undefined && metrics.triangles > thresholds.maxTriangles) {
    violations.push(`Triangles ${metrics.triangles} exceeds max ${thresholds.maxTriangles}`);
  }

  if (thresholds.maxGeometries !== undefined && metrics.geometries > thresholds.maxGeometries) {
    violations.push(`Geometries ${metrics.geometries} exceeds max ${thresholds.maxGeometries}`);
  }

  if (thresholds.maxTextures !== undefined && metrics.textures > thresholds.maxTextures) {
    violations.push(`Textures ${metrics.textures} exceeds max ${thresholds.maxTextures}`);
  }

  if (thresholds.maxPrograms !== undefined && metrics.programs > thresholds.maxPrograms) {
    violations.push(`Shader programs ${metrics.programs} exceeds max ${thresholds.maxPrograms}`);
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Formats metrics for logging
 */
export function formatMetrics(metrics: PerformanceMetrics): string {
  return [
    `Draw Calls: ${metrics.drawCalls}`,
    `  - Instanced: ${metrics.instancedDrawCalls}`,
    `Triangles: ${metrics.triangles.toLocaleString()}`,
    `Geometries (buffers): ${metrics.geometries}`,
    `Textures: ${metrics.textures}`,
    `Shader Programs: ${metrics.programs}`,
  ].join('\n');
}
