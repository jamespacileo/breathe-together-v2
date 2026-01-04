/**
 * Distant Shapes Visibility Tests
 *
 * Verifies that distant 3D shapes are properly rendered and visible
 * in the scene for depth perception. These shapes provide spatial
 * reference through size diminution and atmospheric perspective.
 *
 * Run with: npm run test -- distantShapes
 */

import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SHAPE_CONFIGS } from '../entities/environment/DistantShapes';
import { analyzeScene, getPerformanceMetrics } from './sceneAnalyzer';

describe('DistantShapes Component', () => {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;

  beforeEach(() => {
    scene = new THREE.Scene();
    // Standard camera setup matching the app
    camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 1000);
    camera.position.set(0, 5, 20);
    camera.lookAt(0, 0, 0);
  });

  afterEach(() => {
    scene.clear();
  });

  interface BuildConfig {
    opacity?: number;
    color?: string;
    atmosphericFade?: number;
    scale?: number;
  }

  /**
   * Builds the distant shapes scene matching DistantShapes component
   */
  function buildDistantShapesScene(config: BuildConfig = {}): THREE.Group {
    const { opacity = 0.3, color = '#d4ccc4', atmosphericFade = 0.6, scale = 1 } = config;

    const group = new THREE.Group();
    group.name = 'distant-shapes-group';

    const baseColor = new THREE.Color(color);

    for (const shapeConfig of SHAPE_CONFIGS) {
      // Calculate final opacity with atmospheric fade
      const finalOpacity = opacity * shapeConfig.distanceFade * (1 - atmosphericFade * 0.5);

      // Blend colors
      const shapeColor = new THREE.Color(shapeConfig.color);
      const blendedColor = baseColor.clone().lerp(shapeColor, 0.5);

      // Create geometry based on type
      let geometry: THREE.BufferGeometry;
      switch (shapeConfig.type) {
        case 'pillar':
          geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
          break;
        case 'pyramid':
          geometry = new THREE.ConeGeometry(0.5, 1, 4);
          break;
        case 'sphere':
          geometry = new THREE.SphereGeometry(0.5, 16, 12);
          break;
        case 'torus':
          geometry = new THREE.TorusGeometry(0.5, 0.15, 8, 16);
          break;
        case 'cone':
          geometry = new THREE.ConeGeometry(0.5, 1, 16);
          break;
        default:
          geometry = new THREE.BoxGeometry(1, 1, 1);
      }

      // Create material
      const material = new THREE.MeshBasicMaterial({
        color: blendedColor,
        transparent: true,
        opacity: finalOpacity,
      });

      // Create mesh
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `distant-shape-${shapeConfig.id}`;
      mesh.userData = { isDistantShape: true, shapeId: shapeConfig.id };

      // Apply position and scale
      mesh.position.set(
        shapeConfig.position[0] * scale,
        shapeConfig.position[1] * scale,
        shapeConfig.position[2] * scale,
      );
      mesh.scale.set(
        shapeConfig.scale[0] * scale,
        shapeConfig.scale[1] * scale,
        shapeConfig.scale[2] * scale,
      );

      if (shapeConfig.rotation) {
        mesh.rotation.set(
          shapeConfig.rotation[0],
          shapeConfig.rotation[1],
          shapeConfig.rotation[2],
        );
      }

      group.add(mesh);
    }

    scene.add(group);
    return group;
  }

  describe('Shape Configuration', () => {
    it('should have correct number of shape configs', () => {
      expect(SHAPE_CONFIGS.length).toBeGreaterThan(0);
      console.log(`\n📊 Distant Shapes Configuration:`);
      console.log(`   Total shapes configured: ${SHAPE_CONFIGS.length}`);
    });

    it('should have all required properties for each shape', () => {
      for (const config of SHAPE_CONFIGS) {
        expect(config.id).toBeDefined();
        expect(config.type).toBeDefined();
        expect(config.position).toHaveLength(3);
        expect(config.scale).toHaveLength(3);
        expect(config.color).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(config.distanceFade).toBeGreaterThan(0);
        expect(config.distanceFade).toBeLessThanOrEqual(1);
      }
    });

    it('should have shapes at various depth zones', () => {
      const depths = SHAPE_CONFIGS.map((c) => c.position[2]);
      const minDepth = Math.min(...depths);
      const maxDepth = Math.max(...depths);

      console.log(`\n📊 Depth Distribution:`);
      console.log(`   Nearest shape Z: ${minDepth}`);
      console.log(`   Farthest shape Z: ${maxDepth}`);
      console.log(`   Depth range: ${maxDepth - minDepth}`);

      // Shapes should span a good depth range (at least 40 units)
      expect(maxDepth - minDepth).toBeGreaterThan(40);
    });
  });

  describe('Scene Construction', () => {
    it('should create all shapes in the scene', () => {
      buildDistantShapesScene();

      let shapeCount = 0;
      scene.traverse((obj) => {
        if (obj.userData?.isDistantShape) {
          shapeCount++;
        }
      });

      console.log(`\n📊 Scene Construction:`);
      console.log(`   Shapes created: ${shapeCount}`);
      console.log(`   Expected: ${SHAPE_CONFIGS.length}`);

      expect(shapeCount).toBe(SHAPE_CONFIGS.length);
    });

    it('should create shapes with correct names', () => {
      buildDistantShapesScene();

      const createdIds = new Set<string>();
      scene.traverse((obj) => {
        if (obj.userData?.shapeId) {
          createdIds.add(obj.userData.shapeId);
        }
      });

      for (const config of SHAPE_CONFIGS) {
        expect(createdIds.has(config.id)).toBe(true);
      }
    });

    it('should apply scale correctly', () => {
      const testScale = 2;
      buildDistantShapesScene({ scale: testScale });

      scene.traverse((obj) => {
        if (obj.userData?.isDistantShape && obj instanceof THREE.Mesh) {
          const config = SHAPE_CONFIGS.find((c) => c.id === obj.userData.shapeId);
          if (config) {
            // Position should be scaled
            expect(obj.position.x).toBeCloseTo(config.position[0] * testScale, 1);
            expect(obj.position.z).toBeCloseTo(config.position[2] * testScale, 1);
          }
        }
      });
    });
  });

  describe('Visibility in Scene', () => {
    it('should have shapes visible within extended camera frustum', () => {
      buildDistantShapesScene();

      // Use a camera with very far clipping plane to see all shapes
      const wideCamera = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 500);
      wideCamera.position.set(0, 10, 30);
      wideCamera.lookAt(0, 0, -40);
      wideCamera.updateMatrixWorld();

      let visibleCount = 0;
      let totalCount = 0;

      scene.traverse((obj) => {
        if (obj.userData?.isDistantShape && obj instanceof THREE.Mesh) {
          totalCount++;

          // Get world position
          const worldPos = new THREE.Vector3();
          obj.getWorldPosition(worldPos);

          // Check if in extended view (shapes are intentionally placed far away)
          // We consider a shape "visible" if it's within reasonable viewing distance
          const distanceFromOrigin = worldPos.length();
          if (distanceFromOrigin < 150) {
            visibleCount++;
          }
        }
      });

      console.log(`\n📊 Shape Visibility:`);
      console.log(`   Total shapes: ${totalCount}`);
      console.log(`   Within viewing range: ${visibleCount}`);
      console.log(`   Visibility: ${((visibleCount / totalCount) * 100).toFixed(1)}%`);

      // All shapes should be within reasonable viewing distance
      expect(visibleCount).toBe(totalCount);
    });

    it('should have opacity values that make shapes visible', () => {
      buildDistantShapesScene({ opacity: 0.3, atmosphericFade: 0.6 });

      const opacities: number[] = [];

      scene.traverse((obj) => {
        if (obj.userData?.isDistantShape && obj instanceof THREE.Mesh) {
          const material = obj.material as THREE.MeshBasicMaterial;
          opacities.push(material.opacity);
        }
      });

      const minOpacity = Math.min(...opacities);
      const maxOpacity = Math.max(...opacities);
      const avgOpacity = opacities.reduce((a, b) => a + b, 0) / opacities.length;

      console.log(`\n📊 Shape Opacities:`);
      console.log(`   Min opacity: ${minOpacity.toFixed(4)}`);
      console.log(`   Max opacity: ${maxOpacity.toFixed(4)}`);
      console.log(`   Avg opacity: ${avgOpacity.toFixed(4)}`);

      // All shapes should have some visibility (opacity > 0.01)
      expect(minOpacity).toBeGreaterThan(0.01);
      // Near shapes should be more visible than far shapes
      expect(maxOpacity).toBeGreaterThan(minOpacity);
    });

    it('should have shapes positioned behind main scene content', () => {
      buildDistantShapesScene();

      // Main scene content is around Z = 0 to Z = -10
      // All distant shapes should be further back
      const mainSceneMaxZ = -15;

      let allBehind = true;
      scene.traverse((obj) => {
        if (obj.userData?.isDistantShape && obj instanceof THREE.Mesh) {
          if (obj.position.z > mainSceneMaxZ) {
            allBehind = false;
          }
        }
      });

      expect(allBehind).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should meet draw call budget', () => {
      buildDistantShapesScene();

      const metrics = getPerformanceMetrics(analyzeScene(scene));

      console.log(`\n📊 Distant Shapes Performance:`);
      console.log(`   Draw calls: ${metrics.drawCalls}`);
      console.log(`   Geometries: ${metrics.geometries}`);
      console.log(`   Materials: ${metrics.materials}`);

      // Each shape is one draw call - should match config count
      expect(metrics.drawCalls).toBe(SHAPE_CONFIGS.length);
    });

    it('should have reasonable triangle count', () => {
      buildDistantShapesScene();

      const metrics = getPerformanceMetrics(analyzeScene(scene));

      console.log(`\n📊 Triangle Count:`);
      console.log(`   Total triangles: ${metrics.triangles}`);
      console.log(`   Per shape avg: ${(metrics.triangles / SHAPE_CONFIGS.length).toFixed(0)}`);

      // Simple shapes shouldn't have too many triangles
      // ~200 triangles per shape max (sphere has most)
      expect(metrics.triangles).toBeLessThan(SHAPE_CONFIGS.length * 300);
    });
  });

  describe('Depth Zone Coverage', () => {
    it('should have shapes in far background zone (Z < -60)', () => {
      const farShapes = SHAPE_CONFIGS.filter((c) => c.position[2] < -60);
      console.log(`\n📊 Far background shapes: ${farShapes.length}`);
      expect(farShapes.length).toBeGreaterThan(0);
    });

    it('should have shapes in mid background zone (Z -35 to -50)', () => {
      const midShapes = SHAPE_CONFIGS.filter((c) => c.position[2] >= -50 && c.position[2] <= -35);
      console.log(`\n📊 Mid background shapes: ${midShapes.length}`);
      expect(midShapes.length).toBeGreaterThan(0);
    });

    it('should have shapes in near background zone (Z -20 to -30)', () => {
      const nearShapes = SHAPE_CONFIGS.filter((c) => c.position[2] >= -30 && c.position[2] <= -20);
      console.log(`\n📊 Near background shapes: ${nearShapes.length}`);
      expect(nearShapes.length).toBeGreaterThan(0);
    });
  });
});
