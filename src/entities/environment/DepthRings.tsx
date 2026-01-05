/**
 * DepthRings - Orbital rings at multiple depths
 *
 * Creates subtle circular/elliptical rings at different Z-depths
 * to provide spatial reference points and enhance depth perception.
 *
 * Features:
 * - Dotted/dashed rings for ethereal appearance
 * - Progressive fading with distance
 * - Subtle rotation animation
 * - Breathing-synchronized opacity pulsing
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SCENE_DEPTH } from '../../constants';
import { breathPhase } from '../breath/traits';

interface RingConfig {
  id: string;
  /** Z position */
  zPosition: number;
  /** Ring radius */
  radius: number;
  /** Ring opacity */
  opacity: number;
  /** Ring color */
  color: string;
  /** Rotation speed (radians/second) */
  rotationSpeed: number;
  /** Tilt angle (radians) */
  tilt: number;
  /** Number of segments (more = smoother) */
  segments: number;
  /** Dash pattern: [dash length, gap length] */
  dashPattern: [number, number];
  /** Line thickness */
  lineWidth: number;
}

// Ring configurations
const RING_CONFIGS: RingConfig[] = [
  {
    id: 'near-ring',
    zPosition: SCENE_DEPTH.RINGS.POSITIONS[0],
    radius: SCENE_DEPTH.RINGS.RADII[0],
    opacity: SCENE_DEPTH.RINGS.BASE_OPACITY,
    color: '#d4c8b8',
    rotationSpeed: 0.02,
    tilt: 0.3,
    segments: 128,
    dashPattern: [0.5, 0.5],
    lineWidth: 1.5,
  },
  {
    id: 'mid-ring',
    zPosition: SCENE_DEPTH.RINGS.POSITIONS[1],
    radius: SCENE_DEPTH.RINGS.RADII[1],
    opacity: SCENE_DEPTH.RINGS.BASE_OPACITY * 0.7,
    color: '#c8d0d8',
    rotationSpeed: 0.015,
    tilt: 0.4,
    segments: 192,
    dashPattern: [0.3, 0.7],
    lineWidth: 1.2,
  },
  {
    id: 'far-ring',
    zPosition: SCENE_DEPTH.RINGS.POSITIONS[2],
    radius: SCENE_DEPTH.RINGS.RADII[2],
    opacity: SCENE_DEPTH.RINGS.BASE_OPACITY * 0.5,
    color: '#b8c4d0',
    rotationSpeed: 0.01,
    tilt: 0.5,
    segments: 256,
    dashPattern: [0.2, 0.8],
    lineWidth: 1.0,
  },
];

/**
 * Create dotted ring geometry
 */
function createDottedRingGeometry(radius: number, segments: number): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
  }

  return new THREE.BufferGeometry().setFromPoints(points);
}

interface DepthRingProps {
  config: RingConfig;
}

/**
 * Individual depth ring with animation
 */
const DepthRing = memo(function DepthRing({ config }: DepthRingProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lineObjRef = useRef<THREE.Line | null>(null);
  const world = useWorld();

  const geometry = useMemo(
    () => createDottedRingGeometry(config.radius, config.segments),
    [config.radius, config.segments],
  );

  const material = useMemo(() => {
    return new THREE.LineDashedMaterial({
      color: new THREE.Color(config.color),
      transparent: true,
      opacity: config.opacity,
      dashSize: config.dashPattern[0],
      gapSize: config.dashPattern[1],
      linewidth: config.lineWidth,
    });
  }, [config.color, config.opacity, config.dashPattern, config.lineWidth]);

  // Create line object with computed distances
  const lineObj = useMemo(() => {
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    return line;
  }, [geometry, material]);

  // Store ref for animation
  useEffect(() => {
    lineObjRef.current = lineObj;
  }, [lineObj]);

  // Animation: rotation and breathing opacity
  useFrame((state) => {
    if (!lineObjRef.current) return;

    // Slow rotation
    lineObjRef.current.rotation.z = state.clock.elapsedTime * config.rotationSpeed;

    // Breathing-synchronized opacity pulsing
    const breathEntity = world.queryFirst(breathPhase);
    if (breathEntity) {
      const phase = breathEntity.get(breathPhase)?.value ?? 0;
      material.opacity = config.opacity * (0.7 + phase * 0.3);
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
    <group ref={groupRef} position={[0, 0, config.zPosition]} rotation={[config.tilt, 0, 0]}>
      <primitive object={lineObj} />
    </group>
  );
});

export interface DepthRingsProps {
  /**
   * Enable depth rings
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
}

/**
 * DepthRings - Creates depth through orbital ring elements
 *
 * Renders multiple dotted/dashed rings at different depths
 * to provide spatial reference and enhance depth perception.
 */
export const DepthRings = memo(function DepthRings({
  enabled = true,
  opacity = 1.0,
}: DepthRingsProps) {
  if (!enabled) return null;

  // Apply opacity multiplier
  const adjustedConfigs = RING_CONFIGS.map((config) => ({
    ...config,
    opacity: config.opacity * opacity,
  }));

  return (
    <group name="DepthRings">
      {adjustedConfigs.map((config) => (
        <DepthRing key={config.id} config={config} />
      ))}
    </group>
  );
});

export default DepthRings;
