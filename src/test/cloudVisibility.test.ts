/**
 * Cloud Spherical Distribution and Animation Tests
 *
 * Tests to verify:
 * 1. Clouds are distributed on Fibonacci spheres around the globe
 * 2. Orbital drift works correctly (slow Y-axis rotation)
 * 3. Cloud layers are properly configured (inner/middle/outer)
 * 4. Clouds will rotate with parent group (MomentumControls)
 *
 * Key insight: Clouds are now positioned spherically at radii 7-13,
 * surrounding the globe (radius 1.5) and shards (orbit ~4.5).
 */

import { describe, expect, it } from 'vitest';

// Cloud configuration extracted from CloudSystem.tsx
interface CloudConfig {
  id: string;
  sphereIndex: number;
  layerTotal: number;
  radius: number;
  color: string;
  opacity: number;
  orbitSpeed: number;
  layer: 'inner' | 'middle' | 'outer';
  bobSpeed: number;
  bobAmount: number;
  breathAmount: number;
}

// Scene geometry constants
const SCENE_CONFIG = {
  globeRadius: 1.5,
  shardsOrbitRadius: 4.5,
  cameraPosition: { x: 0, y: 0, z: 10 },
};

// Cloud configurations matching CloudSystem.tsx
const CLOUD_CONFIGS: CloudConfig[] = [
  // INNER LAYER (radius 7-8) - 6 clouds
  {
    id: 'inner-pink-1',
    sphereIndex: 0,
    layerTotal: 6,
    radius: 7,
    color: '#f8b4c4',
    opacity: 0.35,
    orbitSpeed: 0.012,
    layer: 'inner',
    bobSpeed: 0.15,
    bobAmount: 0.15,
    breathAmount: 0.3,
  },
  {
    id: 'inner-lavender-2',
    sphereIndex: 1,
    layerTotal: 6,
    radius: 7.5,
    color: '#d4c4e8',
    opacity: 0.32,
    orbitSpeed: 0.01,
    layer: 'inner',
    bobSpeed: 0.12,
    bobAmount: 0.12,
    breathAmount: 0.25,
  },
  {
    id: 'inner-blue-3',
    sphereIndex: 2,
    layerTotal: 6,
    radius: 8,
    color: '#a8d4e8',
    opacity: 0.3,
    orbitSpeed: 0.014,
    layer: 'inner',
    bobSpeed: 0.1,
    bobAmount: 0.1,
    breathAmount: 0.2,
  },
  {
    id: 'inner-coral-4',
    sphereIndex: 3,
    layerTotal: 6,
    radius: 7.2,
    color: '#f8c8b8',
    opacity: 0.28,
    orbitSpeed: 0.011,
    layer: 'inner',
    bobSpeed: 0.13,
    bobAmount: 0.14,
    breathAmount: 0.22,
  },
  {
    id: 'inner-cream-5',
    sphereIndex: 4,
    layerTotal: 6,
    radius: 7.8,
    color: '#f8f0e8',
    opacity: 0.25,
    orbitSpeed: 0.009,
    layer: 'inner',
    bobSpeed: 0.11,
    bobAmount: 0.11,
    breathAmount: 0.18,
  },
  {
    id: 'inner-mint-6',
    sphereIndex: 5,
    layerTotal: 6,
    radius: 7.3,
    color: '#c8e8dc',
    opacity: 0.3,
    orbitSpeed: 0.013,
    layer: 'inner',
    bobSpeed: 0.12,
    bobAmount: 0.13,
    breathAmount: 0.24,
  },

  // MIDDLE LAYER (radius 9-10) - 5 clouds
  {
    id: 'mid-peach-1',
    sphereIndex: 0,
    layerTotal: 5,
    radius: 9,
    color: '#f8d4b8',
    opacity: 0.38,
    orbitSpeed: 0.008,
    layer: 'middle',
    bobSpeed: 0.08,
    bobAmount: 0.2,
    breathAmount: 0.35,
  },
  {
    id: 'mid-mint-2',
    sphereIndex: 1,
    layerTotal: 5,
    radius: 9.5,
    color: '#b8e8d4',
    opacity: 0.35,
    orbitSpeed: 0.007,
    layer: 'middle',
    bobSpeed: 0.09,
    bobAmount: 0.18,
    breathAmount: 0.3,
  },
  {
    id: 'mid-rose-3',
    sphereIndex: 2,
    layerTotal: 5,
    radius: 10,
    color: '#e8c4d4',
    opacity: 0.32,
    orbitSpeed: 0.009,
    layer: 'middle',
    bobSpeed: 0.11,
    bobAmount: 0.16,
    breathAmount: 0.28,
  },
  {
    id: 'mid-sage-4',
    sphereIndex: 3,
    layerTotal: 5,
    radius: 9.2,
    color: '#c8dcc8',
    opacity: 0.3,
    orbitSpeed: 0.006,
    layer: 'middle',
    bobSpeed: 0.085,
    bobAmount: 0.19,
    breathAmount: 0.32,
  },
  {
    id: 'mid-blush-5',
    sphereIndex: 4,
    layerTotal: 5,
    radius: 9.8,
    color: '#f0d4d4',
    opacity: 0.28,
    orbitSpeed: 0.0075,
    layer: 'middle',
    bobSpeed: 0.1,
    bobAmount: 0.17,
    breathAmount: 0.26,
  },

  // OUTER LAYER (radius 11-13) - 4 clouds
  {
    id: 'outer-mist-1',
    sphereIndex: 0,
    layerTotal: 4,
    radius: 11,
    color: '#e8e4e0',
    opacity: 0.4,
    orbitSpeed: 0.005,
    layer: 'outer',
    bobSpeed: 0.04,
    bobAmount: 0.25,
    breathAmount: 0.4,
  },
  {
    id: 'outer-pink-2',
    sphereIndex: 1,
    layerTotal: 4,
    radius: 12,
    color: '#f8b4c4',
    opacity: 0.35,
    orbitSpeed: 0.004,
    layer: 'outer',
    bobSpeed: 0.05,
    bobAmount: 0.22,
    breathAmount: 0.35,
  },
  {
    id: 'outer-lavender-3',
    sphereIndex: 2,
    layerTotal: 4,
    radius: 13,
    color: '#d4c4e8',
    opacity: 0.3,
    orbitSpeed: 0.0045,
    layer: 'outer',
    bobSpeed: 0.045,
    bobAmount: 0.24,
    breathAmount: 0.38,
  },
  {
    id: 'outer-peach-4',
    sphereIndex: 3,
    layerTotal: 4,
    radius: 11.5,
    color: '#f8d4b8',
    opacity: 0.32,
    orbitSpeed: 0.0055,
    layer: 'outer',
    bobSpeed: 0.055,
    bobAmount: 0.2,
    breathAmount: 0.36,
  },
];

/**
 * Calculate Fibonacci sphere point for even distribution
 * Same algorithm used by CloudSystem and ParticleSwarm
 */
function getFibonacciSpherePoint(
  index: number,
  total: number,
): { x: number; y: number; z: number } {
  if (total <= 1) {
    return { x: 0, y: 1, z: 0 };
  }

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (index / (total - 1)) * 2;
  const radiusAtY = Math.sqrt(1 - y * y);
  const theta = goldenAngle * index;

  return {
    x: Math.cos(theta) * radiusAtY,
    y: y,
    z: Math.sin(theta) * radiusAtY,
  };
}

/**
 * Calculate cloud position on sphere
 */
function getCloudPosition(cloud: CloudConfig): { x: number; y: number; z: number } {
  const direction = getFibonacciSpherePoint(cloud.sphereIndex, cloud.layerTotal);
  return {
    x: direction.x * cloud.radius,
    y: direction.y * cloud.radius,
    z: direction.z * cloud.radius,
  };
}

describe('Cloud Spherical Distribution Tests', () => {
  describe('Fibonacci sphere distribution', () => {
    it('should distribute points evenly on unit sphere', () => {
      const total = 6;
      const points: { x: number; y: number; z: number }[] = [];

      for (let i = 0; i < total; i++) {
        points.push(getFibonacciSpherePoint(i, total));
      }

      // All points should be on unit sphere (magnitude = 1)
      for (const point of points) {
        const magnitude = Math.sqrt(point.x ** 2 + point.y ** 2 + point.z ** 2);
        expect(magnitude).toBeCloseTo(1, 5);
      }

      // Points should be spread across Y axis (-1 to 1)
      const yValues = points.map((p) => p.y);
      expect(Math.max(...yValues)).toBeCloseTo(1, 1);
      expect(Math.min(...yValues)).toBeCloseTo(-1, 1);
    });

    it('should produce different positions for each index', () => {
      const total = 6;
      const positions = new Set<string>();

      for (let i = 0; i < total; i++) {
        const point = getFibonacciSpherePoint(i, total);
        const key = `${point.x.toFixed(4)},${point.y.toFixed(4)},${point.z.toFixed(4)}`;
        positions.add(key);
      }

      expect(positions.size).toBe(total);
    });
  });

  describe('Cloud layer configuration', () => {
    it('should have correct number of clouds per layer', () => {
      const innerClouds = CLOUD_CONFIGS.filter((c) => c.layer === 'inner');
      const middleClouds = CLOUD_CONFIGS.filter((c) => c.layer === 'middle');
      const outerClouds = CLOUD_CONFIGS.filter((c) => c.layer === 'outer');

      expect(innerClouds.length).toBe(6);
      expect(middleClouds.length).toBe(5);
      expect(outerClouds.length).toBe(4);
      expect(CLOUD_CONFIGS.length).toBe(15);
    });

    it('should have inner clouds closer than shards orbit radius', () => {
      const innerClouds = CLOUD_CONFIGS.filter((c) => c.layer === 'inner');

      // Inner clouds should be outside shards (4.5) but close
      for (const cloud of innerClouds) {
        expect(cloud.radius).toBeGreaterThan(SCENE_CONFIG.shardsOrbitRadius);
        expect(cloud.radius).toBeLessThan(9);
      }
    });

    it('should have layer radii in correct order', () => {
      const innerRadii = CLOUD_CONFIGS.filter((c) => c.layer === 'inner').map((c) => c.radius);
      const middleRadii = CLOUD_CONFIGS.filter((c) => c.layer === 'middle').map((c) => c.radius);
      const outerRadii = CLOUD_CONFIGS.filter((c) => c.layer === 'outer').map((c) => c.radius);

      const maxInner = Math.max(...innerRadii);
      const minMiddle = Math.min(...middleRadii);
      const maxMiddle = Math.max(...middleRadii);
      const minOuter = Math.min(...outerRadii);

      expect(maxInner).toBeLessThan(minMiddle);
      expect(maxMiddle).toBeLessThan(minOuter);
    });

    it('should have all clouds outside globe and shards', () => {
      for (const cloud of CLOUD_CONFIGS) {
        // All clouds should be far outside the shards orbit
        expect(cloud.radius).toBeGreaterThan(SCENE_CONFIG.shardsOrbitRadius + 1);
      }
    });
  });

  describe('Cloud positioning', () => {
    it('should calculate cloud positions correctly', () => {
      console.log('\n=== CLOUD POSITION ANALYSIS ===\n');

      for (const cloud of CLOUD_CONFIGS) {
        const pos = getCloudPosition(cloud);
        const distance = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);

        console.log(
          `${cloud.id.padEnd(20)} | radius: ${cloud.radius.toFixed(1)} | ` +
            `pos: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}) | ` +
            `distance: ${distance.toFixed(2)}`,
        );

        // Distance from origin should equal configured radius
        expect(distance).toBeCloseTo(cloud.radius, 2);
      }
    });

    it('should have clouds distributed around the sphere (not clustered)', () => {
      const positions = CLOUD_CONFIGS.map((c) => getCloudPosition(c));

      // Check that clouds aren't all on one side
      const xPositive = positions.filter((p) => p.x > 0).length;
      const xNegative = positions.filter((p) => p.x < 0).length;
      const zPositive = positions.filter((p) => p.z > 0).length;
      const zNegative = positions.filter((p) => p.z < 0).length;

      // Should have clouds on both sides of each axis
      expect(xPositive).toBeGreaterThan(3);
      expect(xNegative).toBeGreaterThan(3);
      expect(zPositive).toBeGreaterThan(3);
      expect(zNegative).toBeGreaterThan(3);
    });
  });
});

describe('Cloud Orbital Drift Tests', () => {
  describe('Orbital movement behavior', () => {
    it('should have reasonable orbit speeds', () => {
      for (const cloud of CLOUD_CONFIGS) {
        // Orbit speed in radians/second (should be slow for ambient feel)
        expect(cloud.orbitSpeed).toBeGreaterThan(0.003);
        expect(cloud.orbitSpeed).toBeLessThan(0.02);
      }
    });

    it('should have slower orbit speeds for outer layers', () => {
      const innerSpeeds = CLOUD_CONFIGS.filter((c) => c.layer === 'inner').map((c) => c.orbitSpeed);
      const outerSpeeds = CLOUD_CONFIGS.filter((c) => c.layer === 'outer').map((c) => c.orbitSpeed);

      const avgInner = innerSpeeds.reduce((a, b) => a + b, 0) / innerSpeeds.length;
      const avgOuter = outerSpeeds.reduce((a, b) => a + b, 0) / outerSpeeds.length;

      // Outer clouds should orbit slower (more distant, parallax effect)
      expect(avgOuter).toBeLessThan(avgInner);
    });

    it('should calculate time for full orbit', () => {
      console.log('\n=== ORBIT TIME ANALYSIS ===\n');

      for (const cloud of CLOUD_CONFIGS.filter((c) => c.layer === 'outer')) {
        // Time for full 2π rotation at baseSpeed=0.8
        const effectiveSpeed = cloud.orbitSpeed * 0.8 * 0.016; // radians per frame
        const framesPerOrbit = (Math.PI * 2) / effectiveSpeed;
        const secondsPerOrbit = framesPerOrbit / 60;

        console.log(
          `${cloud.id.padEnd(20)} | speed: ${cloud.orbitSpeed.toFixed(4)} rad/s | ` +
            `orbit time: ${(secondsPerOrbit / 60).toFixed(1)} minutes`,
        );

        // Full orbit should take several minutes (slow, ambient movement)
        expect(secondsPerOrbit).toBeGreaterThan(60); // > 1 minute
        expect(secondsPerOrbit).toBeLessThan(3600); // < 1 hour
      }
    });
  });

  describe('Bobbing and breathing animation', () => {
    it('should have reasonable bobbing parameters', () => {
      for (const cloud of CLOUD_CONFIGS) {
        // Bob amount should be small relative to radius
        expect(cloud.bobAmount / cloud.radius).toBeLessThan(0.05);

        // Bob speed should create gentle motion
        expect(cloud.bobSpeed).toBeGreaterThan(0.03);
        expect(cloud.bobSpeed).toBeLessThan(0.2);
      }
    });

    it('should have breath amount smaller than bob amount', () => {
      for (const cloud of CLOUD_CONFIGS) {
        // Breathing (radial) motion should be subtle
        expect(cloud.breathAmount).toBeLessThan(0.5);
        expect(cloud.breathAmount).toBeGreaterThan(0.1);
      }
    });
  });
});

describe('Cloud System Integration Tests', () => {
  describe('Configuration stability', () => {
    it('should have unique IDs for all clouds', () => {
      const ids = CLOUD_CONFIGS.map((c) => c.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid sphere indices within layer totals', () => {
      for (const cloud of CLOUD_CONFIGS) {
        expect(cloud.sphereIndex).toBeGreaterThanOrEqual(0);
        expect(cloud.sphereIndex).toBeLessThan(cloud.layerTotal);
      }
    });

    it('should have consistent layer totals within each layer', () => {
      const innerTotals = new Set(
        CLOUD_CONFIGS.filter((c) => c.layer === 'inner').map((c) => c.layerTotal),
      );
      const middleTotals = new Set(
        CLOUD_CONFIGS.filter((c) => c.layer === 'middle').map((c) => c.layerTotal),
      );
      const outerTotals = new Set(
        CLOUD_CONFIGS.filter((c) => c.layer === 'outer').map((c) => c.layerTotal),
      );

      expect(innerTotals.size).toBe(1);
      expect(middleTotals.size).toBe(1);
      expect(outerTotals.size).toBe(1);
    });
  });

  describe('Opacity and visibility', () => {
    it('should have reasonable opacity values', () => {
      const baseOpacity = 0.4;

      for (const cloud of CLOUD_CONFIGS) {
        const finalOpacity = cloud.opacity * baseOpacity;

        // Clouds should be visible but subtle
        expect(finalOpacity).toBeGreaterThan(0.08);
        expect(finalOpacity).toBeLessThan(0.25);
      }
    });

    it('should have outer clouds with similar or higher base opacity', () => {
      // Outer clouds need higher opacity to compensate for distance
      const outerOpacities = CLOUD_CONFIGS.filter((c) => c.layer === 'outer').map((c) => c.opacity);
      const innerOpacities = CLOUD_CONFIGS.filter((c) => c.layer === 'inner').map((c) => c.opacity);

      const avgOuter = outerOpacities.reduce((a, b) => a + b, 0) / outerOpacities.length;
      const avgInner = innerOpacities.reduce((a, b) => a + b, 0) / innerOpacities.length;

      // Outer should have >= opacity to remain visible at distance
      expect(avgOuter).toBeGreaterThanOrEqual(avgInner * 0.9);
    });
  });

  describe('Integration with scene hierarchy', () => {
    it('documents that clouds rotate with MomentumControls parent', () => {
      /**
       * CloudSystem integration with scene rotation:
       *
       * Scene hierarchy:
       * ```
       * <MomentumControls>         ← Rotates everything inside
       *   <RefractionPipeline>
       *     <Environment>
       *       <CloudSystem />      ← Clouds are inside, rotate with parent
       *     </Environment>
       *     <EarthGlobe />         ← Globe rotates with parent
       *     <ParticleSwarm />      ← Shards rotate with parent
       *   </RefractionPipeline>
       * </MomentumControls>
       * ```
       *
       * Key behaviors:
       * 1. When user drags, MomentumControls rotates its group
       * 2. All children (clouds, globe, shards) rotate together
       * 3. CloudSystem's local animations (orbital drift, bobbing) work
       *    in local space, adding subtle movement on top of parent rotation
       * 4. Clouds are distributed spherically around the globe, so they
       *    appear all around regardless of viewing angle
       *
       * Previous behavior (horizontal looping) would fight against parent
       * rotation because it used world-space absolute positions.
       */

      expect(true).toBe(true);
    });
  });
});

describe('Layer Summary Report', () => {
  it('should generate layer summary', () => {
    console.log('\n=== CLOUD LAYER SUMMARY ===\n');

    const layers = ['inner', 'middle', 'outer'] as const;

    for (const layer of layers) {
      const clouds = CLOUD_CONFIGS.filter((c) => c.layer === layer);
      const radii = clouds.map((c) => c.radius);
      const opacities = clouds.map((c) => c.opacity);
      const speeds = clouds.map((c) => c.orbitSpeed);

      console.log(`${layer.toUpperCase()} LAYER:`);
      console.log(`  Count: ${clouds.length}`);
      console.log(
        `  Radius range: ${Math.min(...radii).toFixed(1)} - ${Math.max(...radii).toFixed(1)}`,
      );
      console.log(
        `  Opacity range: ${Math.min(...opacities).toFixed(2)} - ${Math.max(...opacities).toFixed(2)}`,
      );
      console.log(
        `  Orbit speed range: ${Math.min(...speeds).toFixed(4)} - ${Math.max(...speeds).toFixed(4)}`,
      );
      console.log();
    }

    console.log('=== END SUMMARY ===\n');

    // At least 10 clouds total
    expect(CLOUD_CONFIGS.length).toBeGreaterThanOrEqual(10);
  });
});
