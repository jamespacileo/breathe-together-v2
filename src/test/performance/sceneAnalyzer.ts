/**
 * Scene Graph Analyzer for Performance Testing
 *
 * Analyzes Three.js scenes without requiring WebGL context.
 * Counts draw calls, geometries, materials by traversing the scene graph.
 *
 * This approach is:
 * - Reliable (no WebGL mocking issues)
 * - Fast (no rendering needed)
 * - CI-friendly (works in Node.js without native deps)
 */

import * as THREE from 'three';

export interface SceneMetrics {
  drawCalls: number;
  meshCount: number;
  instancedMeshCount: number;
  pointsCount: number;
  geometries: Set<THREE.BufferGeometry>;
  materials: Set<THREE.Material>;
  triangles: number;
  vertices: number;
}

export interface PerformanceMetrics {
  drawCalls: number;
  triangles: number;
  geometries: number;
  materials: number;
  meshes: number;
  instancedMeshes: number;
}

export interface PerformanceThresholds {
  maxDrawCalls?: number;
  maxTriangles?: number;
  maxGeometries?: number;
  maxMaterials?: number;
}

/**
 * Performance targets for different device tiers
 */
export const PERFORMANCE_TARGETS = {
  mobile: {
    maxDrawCalls: 50,
    maxTriangles: 50000,
    maxGeometries: 30,
    maxMaterials: 20,
  },
  tablet: {
    maxDrawCalls: 80,
    maxTriangles: 80000,
    maxGeometries: 50,
    maxMaterials: 35,
  },
  desktop: {
    maxDrawCalls: 150,
    maxTriangles: 150000,
    maxGeometries: 100,
    maxMaterials: 60,
  },
} as const;

/**
 * Analyzes a Three.js scene and returns performance metrics
 */
export function analyzeScene(scene: THREE.Scene): SceneMetrics {
  const metrics: SceneMetrics = {
    drawCalls: 0,
    meshCount: 0,
    instancedMeshCount: 0,
    pointsCount: 0,
    geometries: new Set(),
    materials: new Set(),
    triangles: 0,
    vertices: 0,
  };

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Scene traversal needs to handle multiple object types (InstancedMesh, Mesh, Points, Lines) with different counting logic
  scene.traverse((object) => {
    // Count InstancedMesh (1 draw call for all instances!)
    if (object instanceof THREE.InstancedMesh) {
      metrics.drawCalls += 1; // Single draw call for instanced mesh
      metrics.instancedMeshCount += 1;

      if (object.geometry) {
        metrics.geometries.add(object.geometry);
        const posAttr = object.geometry.getAttribute('position');
        if (posAttr) {
          metrics.vertices += posAttr.count * object.count; // vertices * instances
        }
        const indexAttr = object.geometry.getIndex();
        if (indexAttr) {
          metrics.triangles += (indexAttr.count / 3) * object.count; // triangles * instances
        } else if (posAttr) {
          metrics.triangles += (posAttr.count / 3) * object.count;
        }
      }

      if (object.material) {
        if (Array.isArray(object.material)) {
          for (const m of object.material) {
            metrics.materials.add(m);
          }
        } else {
          metrics.materials.add(object.material);
        }
      }
    }
    // Count regular Mesh (1 draw call each)
    else if (object instanceof THREE.Mesh) {
      metrics.drawCalls += 1;
      metrics.meshCount += 1;

      if (object.geometry) {
        metrics.geometries.add(object.geometry);
        const posAttr = object.geometry.getAttribute('position');
        if (posAttr) {
          metrics.vertices += posAttr.count;
        }
        const indexAttr = object.geometry.getIndex();
        if (indexAttr) {
          metrics.triangles += indexAttr.count / 3;
        } else if (posAttr) {
          metrics.triangles += posAttr.count / 3;
        }
      }

      if (object.material) {
        if (Array.isArray(object.material)) {
          for (const m of object.material) {
            metrics.materials.add(m);
          }
        } else {
          metrics.materials.add(object.material);
        }
      }
    }
    // Count Points (1 draw call each)
    else if (object instanceof THREE.Points) {
      metrics.drawCalls += 1;
      metrics.pointsCount += 1;

      if (object.geometry) {
        metrics.geometries.add(object.geometry);
        const posAttr = object.geometry.getAttribute('position');
        if (posAttr) {
          metrics.vertices += posAttr.count;
        }
      }

      if (object.material) {
        metrics.materials.add(object.material as THREE.Material);
      }
    }
    // Count Lines
    else if (object instanceof THREE.Line) {
      metrics.drawCalls += 1;

      if (object.geometry) {
        metrics.geometries.add(object.geometry);
      }

      if (object.material) {
        metrics.materials.add(object.material as THREE.Material);
      }
    }
  });

  return metrics;
}

/**
 * Converts detailed scene metrics to simplified performance metrics
 */
export function getPerformanceMetrics(sceneMetrics: SceneMetrics): PerformanceMetrics {
  return {
    drawCalls: sceneMetrics.drawCalls,
    triangles: Math.round(sceneMetrics.triangles),
    geometries: sceneMetrics.geometries.size,
    materials: sceneMetrics.materials.size,
    meshes: sceneMetrics.meshCount,
    instancedMeshes: sceneMetrics.instancedMeshCount,
  };
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

  if (thresholds.maxMaterials !== undefined && metrics.materials > thresholds.maxMaterials) {
    violations.push(`Materials ${metrics.materials} exceeds max ${thresholds.maxMaterials}`);
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
    `  - Regular Meshes: ${metrics.meshes}`,
    `  - Instanced Meshes: ${metrics.instancedMeshes}`,
    `Triangles: ${metrics.triangles.toLocaleString()}`,
    `Geometries: ${metrics.geometries}`,
    `Materials: ${metrics.materials}`,
  ].join('\n');
}
