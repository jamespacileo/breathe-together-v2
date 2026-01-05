/**
 * DistantSilhouettes - Monument Valley inspired distant mountain silhouettes
 *
 * Creates layered geometric silhouettes at different depths suggesting
 * distant mountains or formations. Each layer is progressively:
 * - More faded (lower opacity)
 * - Cooler in color (blue shift)
 * - Smaller in scale (perspective)
 *
 * These create strong depth cues without being visually distracting.
 */

import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SCENE_DEPTH } from '../../constants';

interface SilhouetteLayerConfig {
  id: string;
  /** Z position (negative = behind globe) */
  zPosition: number;
  /** Base Y position */
  yPosition: number;
  /** Opacity (0-1) */
  opacity: number;
  /** Color hex */
  color: string;
  /** Scale multiplier */
  scale: number;
  /** Number of peaks in this layer */
  peakCount: number;
  /** Maximum peak height */
  maxHeight: number;
  /** Horizontal spread */
  spread: number;
  /** Animation drift speed */
  driftSpeed: number;
}

// Silhouette layer configurations (near to far) - ENHANCED for visibility
const SILHOUETTE_LAYERS: SilhouetteLayerConfig[] = [
  {
    id: 'near-silhouette',
    zPosition: SCENE_DEPTH.LAYERS.MID_BG.z,
    yPosition: -12,
    opacity: 0.25, // Increased from 0.08
    color: '#5a4a40', // Darker brown for contrast
    scale: 1.0,
    peakCount: 5,
    maxHeight: 15,
    spread: 60,
    driftSpeed: 0.02,
  },
  {
    id: 'mid-silhouette',
    zPosition: SCENE_DEPTH.LAYERS.FAR_BG.z,
    yPosition: -15,
    opacity: 0.18, // Increased from 0.056
    color: '#4a5060', // Blue-gray
    scale: 0.8,
    peakCount: 7,
    maxHeight: 20,
    spread: 80,
    driftSpeed: 0.015,
  },
  {
    id: 'far-silhouette',
    zPosition: SCENE_DEPTH.LAYERS.DEEP_BG.z,
    yPosition: -18,
    opacity: 0.12, // Increased from 0.04
    color: '#405570', // Deep blue
    scale: 0.6,
    peakCount: 9,
    maxHeight: 25,
    spread: 100,
    driftSpeed: 0.01,
  },
];

/**
 * Generate mountain silhouette geometry
 * Creates a series of triangular peaks with varied heights
 */
function createSilhouetteGeometry(
  config: SilhouetteLayerConfig,
  seed: number,
): THREE.BufferGeometry {
  const vertices: number[] = [];
  const { peakCount, maxHeight, spread } = config;

  // Seeded random for consistent generation
  const seededRandom = (i: number) => {
    const x = Math.sin(seed + i * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };

  const baseY = 0;
  const segmentWidth = spread / peakCount;

  // Start from left edge
  vertices.push(-spread / 2, baseY, 0);

  // Generate peaks
  for (let i = 0; i < peakCount; i++) {
    const x = -spread / 2 + segmentWidth * (i + 0.5);
    const height = maxHeight * (0.4 + seededRandom(i) * 0.6);

    // Valley before peak
    if (i > 0) {
      const valleyX = -spread / 2 + segmentWidth * i;
      const valleyHeight = maxHeight * 0.1 * seededRandom(i + 100);
      vertices.push(valleyX, baseY + valleyHeight, 0);
    }

    // Peak
    vertices.push(x, baseY + height, 0);
  }

  // End at right edge
  vertices.push(spread / 2, baseY, 0);

  // Create shape geometry by extruding down to base
  const shape = new THREE.Shape();
  shape.moveTo(vertices[0], vertices[1]);

  for (let i = 3; i < vertices.length; i += 3) {
    shape.lineTo(vertices[i], vertices[i + 1]);
  }

  // Close shape at bottom
  shape.lineTo(spread / 2, baseY - 5);
  shape.lineTo(-spread / 2, baseY - 5);
  shape.closePath();

  return new THREE.ShapeGeometry(shape);
}

interface SilhouetteLayerProps {
  config: SilhouetteLayerConfig;
  seed: number;
}

/**
 * Individual silhouette layer with subtle drift animation
 */
const SilhouetteLayer = memo(function SilhouetteLayer({ config, seed }: SilhouetteLayerProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => createSilhouetteGeometry(config, seed), [config, seed]);

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(config.color),
      transparent: true,
      opacity: config.opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, [config.color, config.opacity]);

  // Subtle horizontal drift for parallax feel
  useFrame((state) => {
    if (meshRef.current) {
      const drift = Math.sin(state.clock.elapsedTime * config.driftSpeed) * 2;
      meshRef.current.position.x = drift;
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={[0, config.yPosition, config.zPosition]}
      scale={[config.scale, config.scale, 1]}
    />
  );
});

export interface DistantSilhouettesProps {
  /**
   * Enable distant silhouettes
   * @default true
   */
  enabled?: boolean;
  /**
   * Global opacity multiplier
   * @default 1.0
   * @min 0
   * @max 2
   */
  opacity?: number;
  /**
   * Random seed for silhouette generation
   * @default 42
   */
  seed?: number;
}

/**
 * DistantSilhouettes - Creates depth through layered mountain silhouettes
 *
 * Renders multiple layers of geometric mountain shapes at different depths,
 * creating atmospheric perspective and a sense of vast landscape.
 */
export const DistantSilhouettes = memo(function DistantSilhouettes({
  enabled = true,
  opacity = 1.0,
  seed = 42,
}: DistantSilhouettesProps) {
  if (!enabled) return null;

  // Apply opacity multiplier
  const adjustedLayers = SILHOUETTE_LAYERS.map((layer) => ({
    ...layer,
    opacity: layer.opacity * opacity,
  }));

  return (
    <group name="DistantSilhouettes">
      {adjustedLayers.map((config, index) => (
        <SilhouetteLayer key={config.id} config={config} seed={seed + index * 1000} />
      ))}
    </group>
  );
});

export default DistantSilhouettes;
