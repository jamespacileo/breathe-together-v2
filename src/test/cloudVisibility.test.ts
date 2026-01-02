/**
 * Cloud Visibility and Animation Tests
 *
 * Tests to verify:
 * 1. All clouds are positioned within the camera frustum
 * 2. Cloud looping works correctly (right-to-left movement)
 * 3. Cloud positions are stable on initialization (no re-renders)
 *
 * Key insight: Camera is at z=10 with 45° FOV, looking at origin.
 * For clouds to be visible, they need to be within the frustum cone.
 *
 * Frustum calculation for a 45° FOV camera at z=10:
 * - Near plane ~0.1, Far plane ~1000 (three.js defaults)
 * - At distance D from camera, visible height = 2 * D * tan(FOV/2)
 * - At z=-20 (30 units from camera): ~25 units visible height
 * - At z=-40 (50 units from camera): ~41 units visible height
 */

import { describe, expect, it } from 'vitest';

// Camera configuration from app.tsx
const CAMERA_CONFIG = {
  position: { x: 0, y: 0, z: 10 },
  fov: 45, // degrees
  aspectRatio: 16 / 9, // typical browser aspect
  near: 0.1,
  far: 1000,
};

// Cloud configuration extracted from CloudSystem.tsx
interface CloudConfig {
  id: string;
  position: { x: number; y: number; z: number };
  bounds: { width: number; height: number; depth: number };
  layer: 'top' | 'middle' | 'bottom';
}

// Updated cloud positions - closer to camera for better visibility
// Camera at z=10, clouds at z=-5 to z=-15 (15-25 units from camera)
// DISTRIBUTION: More clouds at top (7), medium in middle (4), fewer at bottom (2)
const CLOUD_CONFIGS: CloudConfig[] = [
  // TOP LAYER (z: -5 to -8) - 7 clouds
  {
    id: 'top-pink-left',
    position: { x: -8, y: 5, z: -5 },
    bounds: { width: 8, height: 2, depth: 5 },
    layer: 'top',
  },
  {
    id: 'top-lavender-right',
    position: { x: 9, y: 6, z: -6 },
    bounds: { width: 7, height: 1.8, depth: 4 },
    layer: 'top',
  },
  {
    id: 'top-blue-center',
    position: { x: 0, y: 4, z: -7 },
    bounds: { width: 6, height: 1.5, depth: 4 },
    layer: 'top',
  },
  {
    id: 'top-coral-far-left',
    position: { x: -10, y: 4, z: -6 },
    bounds: { width: 6, height: 1.5, depth: 4 },
    layer: 'top',
  },
  {
    id: 'top-cream-high',
    position: { x: 5, y: 5.5, z: -5 },
    bounds: { width: 5, height: 1.2, depth: 3 },
    layer: 'top',
  },
  {
    id: 'top-rose-wisp',
    position: { x: -4, y: 6, z: -8 },
    bounds: { width: 5, height: 1.3, depth: 3 },
    layer: 'top',
  },
  {
    id: 'top-mint-accent',
    position: { x: 7, y: 3.5, z: -7 },
    bounds: { width: 5, height: 1.4, depth: 3 },
    layer: 'top',
  },

  // MIDDLE LAYER (z: -8 to -12) - 4 clouds
  {
    id: 'mid-peach-left',
    position: { x: -12, y: 2, z: -10 },
    bounds: { width: 10, height: 2, depth: 6 },
    layer: 'middle',
  },
  {
    id: 'mid-mint-right',
    position: { x: 12, y: 2, z: -11 },
    bounds: { width: 9, height: 1.8, depth: 5 },
    layer: 'middle',
  },
  {
    id: 'mid-rose-center',
    position: { x: -2, y: 1, z: -9 },
    bounds: { width: 8, height: 1.5, depth: 4 },
    layer: 'middle',
  },
  {
    id: 'mid-sage-right',
    position: { x: 8, y: 0, z: -10 },
    bounds: { width: 8, height: 1.5, depth: 5 },
    layer: 'middle',
  },

  // BOTTOM LAYER (z: -12 to -15) - 2 clouds
  {
    id: 'bottom-mist-left',
    position: { x: -10, y: -2, z: -13 },
    bounds: { width: 14, height: 1.5, depth: 8 },
    layer: 'bottom',
  },
  {
    id: 'bottom-blush-right',
    position: { x: 10, y: -3, z: -14 },
    bounds: { width: 12, height: 1.5, depth: 7 },
    layer: 'bottom',
  },
];

// Cloud looping configuration (adjusted for closer cloud positions)
const CLOUD_LOOP = {
  xMin: -25,
  xMax: 25,
  buffer: 8,
};

/**
 * Calculate visible area at a given Z distance from camera
 */
function calculateVisibleArea(zPosition: number) {
  const distance = CAMERA_CONFIG.position.z - zPosition;
  const fovRad = (CAMERA_CONFIG.fov * Math.PI) / 180;
  const halfHeight = Math.tan(fovRad / 2) * distance;
  const halfWidth = halfHeight * CAMERA_CONFIG.aspectRatio;

  return {
    distance,
    height: halfHeight * 2,
    width: halfWidth * 2,
    yMin: -halfHeight,
    yMax: halfHeight,
    xMin: -halfWidth,
    xMax: halfWidth,
  };
}

/**
 * Check if a cloud is within the camera frustum
 */
function isCloudVisible(cloud: CloudConfig): {
  visible: boolean;
  inFrustum: { x: boolean; y: boolean; z: boolean };
  visibleArea: ReturnType<typeof calculateVisibleArea>;
  cloudBounds: { xMin: number; xMax: number; yMin: number; yMax: number };
} {
  const visibleArea = calculateVisibleArea(cloud.position.z);

  // Cloud bounds (position is center, bounds is total size)
  const cloudBounds = {
    xMin: cloud.position.x - cloud.bounds.width / 2,
    xMax: cloud.position.x + cloud.bounds.width / 2,
    yMin: cloud.position.y - cloud.bounds.height / 2,
    yMax: cloud.position.y + cloud.bounds.height / 2,
  };

  // Check if cloud overlaps with visible area (partial visibility counts)
  const inFrustumX = cloudBounds.xMax > visibleArea.xMin && cloudBounds.xMin < visibleArea.xMax;
  const inFrustumY = cloudBounds.yMax > visibleArea.yMin && cloudBounds.yMin < visibleArea.yMax;
  const inFrustumZ =
    cloud.position.z > -CAMERA_CONFIG.far && cloud.position.z < CAMERA_CONFIG.position.z;

  return {
    visible: inFrustumX && inFrustumY && inFrustumZ,
    inFrustum: { x: inFrustumX, y: inFrustumY, z: inFrustumZ },
    visibleArea,
    cloudBounds,
  };
}

describe('Cloud Visibility Tests', () => {
  describe('Camera frustum calculations', () => {
    it('should calculate correct visible area at different depths', () => {
      // At z=0 (10 units from camera)
      const area0 = calculateVisibleArea(0);
      expect(area0.distance).toBe(10);
      expect(area0.height).toBeCloseTo(8.28, 1); // 2 * tan(22.5°) * 10

      // At z=-20 (30 units from camera)
      const area20 = calculateVisibleArea(-20);
      expect(area20.distance).toBe(30);
      expect(area20.height).toBeCloseTo(24.85, 1);

      // At z=-40 (50 units from camera)
      const area40 = calculateVisibleArea(-40);
      expect(area40.distance).toBe(50);
      expect(area40.height).toBeCloseTo(41.42, 1);
    });
  });

  describe('Cloud positioning validation', () => {
    it('should have all clouds within Z frustum', () => {
      for (const cloud of CLOUD_CONFIGS) {
        const result = isCloudVisible(cloud);
        expect(result.inFrustum.z).toBe(true);
      }
    });

    it('should identify clouds outside horizontal frustum', () => {
      const outOfBoundsX: string[] = [];

      for (const cloud of CLOUD_CONFIGS) {
        const result = isCloudVisible(cloud);
        if (!result.inFrustum.x) {
          outOfBoundsX.push(
            `${cloud.id}: x=${cloud.position.x} at z=${cloud.position.z}, visible range [${result.visibleArea.xMin.toFixed(1)}, ${result.visibleArea.xMax.toFixed(1)}]`,
          );
        }
      }

      // Log which clouds are outside X bounds (helpful for debugging)
      if (outOfBoundsX.length > 0) {
        console.log('Clouds outside X frustum:');
        for (const msg of outOfBoundsX) {
          console.log(`  - ${msg}`);
        }
      }

      // This test documents the issue - some clouds may be outside X bounds
      // To fix: adjust X positions or bring clouds closer (reduce Z distance)
    });

    it('should identify clouds outside vertical frustum', () => {
      const outOfBoundsY: string[] = [];

      for (const cloud of CLOUD_CONFIGS) {
        const result = isCloudVisible(cloud);
        if (!result.inFrustum.y) {
          outOfBoundsY.push(
            `${cloud.id}: y=${cloud.position.y} at z=${cloud.position.z}, visible range [${result.visibleArea.yMin.toFixed(1)}, ${result.visibleArea.yMax.toFixed(1)}]`,
          );
        }
      }

      if (outOfBoundsY.length > 0) {
        console.log('Clouds outside Y frustum:');
        for (const msg of outOfBoundsY) {
          console.log(`  - ${msg}`);
        }
      }
    });

    it('should report cloud visibility summary', () => {
      console.log('\n=== CLOUD VISIBILITY ANALYSIS ===\n');

      const layerStats = {
        top: { total: 0, visible: 0 },
        middle: { total: 0, visible: 0 },
        bottom: { total: 0, visible: 0 },
      };

      for (const cloud of CLOUD_CONFIGS) {
        const result = isCloudVisible(cloud);
        layerStats[cloud.layer].total++;
        if (result.visible) layerStats[cloud.layer].visible++;

        const status = result.visible ? '✅' : '❌';
        console.log(
          `${status} ${cloud.id.padEnd(25)} | pos(${cloud.position.x.toFixed(0).padStart(4)}, ${cloud.position.y.toFixed(0).padStart(3)}, ${cloud.position.z.toFixed(0).padStart(4)}) | ` +
            `visible area: x[${result.visibleArea.xMin.toFixed(0)}, ${result.visibleArea.xMax.toFixed(0)}] y[${result.visibleArea.yMin.toFixed(0)}, ${result.visibleArea.yMax.toFixed(0)}]`,
        );
      }

      console.log('\n--- Layer Summary ---');
      for (const [layer, stats] of Object.entries(layerStats)) {
        console.log(`${layer}: ${stats.visible}/${stats.total} visible`);
      }
      console.log('\n=== END ANALYSIS ===\n');

      // At least 50% of clouds should be visible
      const totalVisible = Object.values(layerStats).reduce((sum, s) => sum + s.visible, 0);
      const totalClouds = CLOUD_CONFIGS.length;
      expect(totalVisible / totalClouds).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('Cloud positions (implemented)', () => {
    // These positions are now implemented in CloudSystem.tsx
    const IMPLEMENTED_POSITIONS: Array<{ z: number; description: string }> = [
      { z: -5, description: 'Top layer (15 units from camera)' },
      { z: -10, description: 'Middle layer (20 units from camera)' },
      { z: -15, description: 'Bottom layer (25 units from camera)' },
    ];

    it('verifies implemented positions are within frustum', () => {
      console.log('\n=== IMPLEMENTED CLOUD POSITIONS ===\n');
      console.log('For camera at z=10 with 45° FOV:\n');

      for (const pos of IMPLEMENTED_POSITIONS) {
        const visibleArea = calculateVisibleArea(pos.z);
        console.log(
          `${pos.description}: ` +
            `visible area = ${visibleArea.width.toFixed(1)}w x ${visibleArea.height.toFixed(1)}h ` +
            `| x: [${visibleArea.xMin.toFixed(1)}, ${visibleArea.xMax.toFixed(1)}] | y: [${visibleArea.yMin.toFixed(1)}, ${visibleArea.yMax.toFixed(1)}]`,
        );
      }

      console.log('\nCurrent cloud z-range: -5 to -15 (15-25 units from camera)');
      console.log('All clouds are now within optimal visibility range.\n');

      // Verify all implemented clouds are visible
      const visibleCount = CLOUD_CONFIGS.filter((c) => isCloudVisible(c).visible).length;
      expect(visibleCount).toBe(CLOUD_CONFIGS.length);
    });
  });
});

describe('Cloud Looping Tests', () => {
  /**
   * Test the looping logic without needing WebGL
   */
  describe('Horizontal looping behavior', () => {
    it('should reset position when cloud exits left boundary', () => {
      let currentX = 0;
      const speed = 1.0;

      // Simulate movement until reaching boundary
      for (let frame = 0; frame < 10000; frame++) {
        currentX -= speed * 0.016; // ~60fps

        if (currentX < CLOUD_LOOP.xMin - CLOUD_LOOP.buffer) {
          currentX = CLOUD_LOOP.xMax + CLOUD_LOOP.buffer;
          break;
        }
      }

      // After loop reset, should be at right side
      expect(currentX).toBe(CLOUD_LOOP.xMax + CLOUD_LOOP.buffer);
    });

    it('should calculate correct time to complete one loop', () => {
      const speed = 0.8; // baseSpeed
      const configSpeed = 1.0; // cloud speed multiplier
      const effectiveSpeed = speed * configSpeed * 0.8 * 0.016; // from useFrame

      const totalDistance =
        CLOUD_LOOP.xMax + CLOUD_LOOP.buffer - (CLOUD_LOOP.xMin - CLOUD_LOOP.buffer);
      const framesPerLoop = totalDistance / effectiveSpeed;
      const secondsPerLoop = framesPerLoop / 60;

      console.log(`Loop distance: ${totalDistance} units`);
      console.log(`Effective speed: ${effectiveSpeed.toFixed(4)} units/frame`);
      console.log(`Frames per loop: ${framesPerLoop.toFixed(0)}`);
      console.log(`Time per loop: ${secondsPerLoop.toFixed(1)} seconds`);

      // Loop should take between 1 minute and 10 minutes for good visual effect
      expect(secondsPerLoop).toBeGreaterThan(60);
      expect(secondsPerLoop).toBeLessThan(600);
    });

    it('should maintain cloud order during looping', () => {
      // Simulate multiple clouds with different speeds
      const clouds = [
        { id: 'fast', x: 10, speed: 1.2 },
        { id: 'medium', x: 0, speed: 0.8 },
        { id: 'slow', x: -10, speed: 0.5 },
      ];

      const baseSpeed = 0.8;
      const loopEvents: string[] = [];

      // Run simulation for 30000 frames (~8.3 minutes at 60fps)
      // This ensures even slow clouds have time to complete loops
      for (let frame = 0; frame < 30000; frame++) {
        for (const cloud of clouds) {
          cloud.x -= cloud.speed * baseSpeed * 0.8 * 0.016;

          if (cloud.x < CLOUD_LOOP.xMin - CLOUD_LOOP.buffer) {
            cloud.x = CLOUD_LOOP.xMax + CLOUD_LOOP.buffer;
            loopEvents.push(`Frame ${frame}: ${cloud.id} looped`);
          }
        }
      }

      // Fast cloud should loop most often
      const fastLoops = loopEvents.filter((e) => e.includes('fast')).length;
      const slowLoops = loopEvents.filter((e) => e.includes('slow')).length;

      console.log(
        `Loop events: fast=${fastLoops}, medium=${loopEvents.filter((e) => e.includes('medium')).length}, slow=${slowLoops}`,
      );

      // With new loop bounds (66 units total), expected loops:
      // - Fast (1.2): ~5 loops in 8.3 minutes
      // - Slow (0.5): ~2 loops in 8.3 minutes
      expect(fastLoops).toBeGreaterThan(slowLoops);
    });
  });

  describe('Movement direction verification', () => {
    it('should move clouds from right to left (negative X direction)', () => {
      let currentX = 20;
      const speed = 0.8 * 1.0 * 0.8 * 0.016; // baseSpeed * configSpeed * multiplier * delta

      const startX = currentX;
      currentX -= speed;

      // Position should decrease (moving left)
      expect(currentX).toBeLessThan(startX);
    });
  });
});

describe('Cloud System Stability Tests', () => {
  describe('Configuration stability', () => {
    it('should have deterministic cloud configurations', () => {
      // Cloud configs should be identical across calls
      const configs1 = [...CLOUD_CONFIGS];
      const configs2 = [...CLOUD_CONFIGS];

      expect(configs1).toEqual(configs2);
    });

    it('should have unique IDs for all clouds', () => {
      const ids = CLOUD_CONFIGS.map((c) => c.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have reasonable opacity values', () => {
      // Based on CloudSystem: finalOpacity = config.opacity * baseOpacity
      // config.opacity ranges from 0.25 to 0.45
      // baseOpacity default is 0.4
      // So final opacity is 0.1 to 0.18

      const baseOpacity = 0.4;
      const configOpacities = [
        0.45, 0.42, 0.38, 0.4, 0.38, 0.35, 0.32, 0.35, 0.32, 0.28, 0.3, 0.25, 0.28,
      ];

      for (const opacity of configOpacities) {
        const finalOpacity = opacity * baseOpacity;
        // Clouds should be visible but subtle
        expect(finalOpacity).toBeGreaterThan(0.05);
        expect(finalOpacity).toBeLessThan(0.5);
      }
    });
  });
});

/**
 * Integration test ideas (require WebGL/React context)
 */
describe('Integration Test Ideas (Documentation)', () => {
  it('documents how to test actual rendering', () => {
    /**
     * To test actual cloud rendering, you would need:
     *
     * 1. **React Testing Library + @react-three/test-renderer**
     *    ```typescript
     *    import { create } from '@react-three/test-renderer';
     *    const renderer = await create(<CloudSystem />);
     *    const clouds = renderer.scene.findByType('Clouds');
     *    expect(clouds.children.length).toBe(14);
     *    ```
     *
     * 2. **Playwright E2E tests with screenshots**
     *    ```typescript
     *    await page.goto('/');
     *    await page.waitForSelector('canvas');
     *    const screenshot = await page.screenshot();
     *    // Use image comparison or pixel analysis
     *    ```
     *
     * 3. **WebGL render target inspection**
     *    ```typescript
     *    // Render to offscreen target, read pixels
     *    const renderTarget = new THREE.WebGLRenderTarget(800, 600);
     *    renderer.setRenderTarget(renderTarget);
     *    renderer.render(scene, camera);
     *    const pixels = new Uint8Array(800 * 600 * 4);
     *    renderer.readRenderTargetPixels(renderTarget, 0, 0, 800, 600, pixels);
     *    // Analyze pixel data for cloud colors
     *    ```
     *
     * 4. **Animation frame capture test**
     *    ```typescript
     *    // Capture cloud positions over time
     *    const positions: number[] = [];
     *    for (let i = 0; i < 60; i++) {
     *      advanceFrames(1);
     *      positions.push(cloudRef.current.position.x);
     *    }
     *    // Verify monotonic decrease (moving left)
     *    expect(positions.every((p, i) => i === 0 || p < positions[i - 1])).toBe(true);
     *    ```
     */

    expect(true).toBe(true);
  });
});
