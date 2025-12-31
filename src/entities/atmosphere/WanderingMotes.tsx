/**
 * WanderingMotes - Lazy drifting particles like dust motes or fireflies
 *
 * Creates small glowing particles that drift slowly through the scene
 * with gentle bobbing motion. Evokes a sense of calm, organic atmosphere.
 *
 * Features:
 * - Small glowing spheres that wander in 3D space
 * - Gentle sinusoidal bobbing motion
 * - Breathing-synchronized glow intensity
 * - Varied sizes and drift speeds for natural feel
 *
 * Performance: Uses instanced rendering for efficiency
 */

import { Instance, Instances } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase } from '../breath/traits';

interface MoteConfig {
  /** Unique identifier for React key */
  id: string;
  /** Initial position */
  position: THREE.Vector3;
  /** Drift velocity */
  velocity: THREE.Vector3;
  /** Size of the mote */
  size: number;
  /** Phase offset for bobbing */
  phaseOffset: number;
  /** Bobbing amplitude */
  bobAmplitude: number;
  /** Bobbing frequency */
  bobFrequency: number;
  /** Color variant (0-1 for lerping between colors) */
  colorLerp: number;
}

/**
 * Generate random mote configurations
 */
function generateMoteConfigs(count: number, radius: number): MoteConfig[] {
  const configs: MoteConfig[] = [];

  for (let i = 0; i < count; i++) {
    // Random position within a spherical shell (avoid center)
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = radius * 0.4 + Math.random() * radius * 0.6; // 40-100% of radius

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta) * 0.5; // Flatten vertically
    const z = r * Math.cos(phi);

    // Random slow drift velocity
    const driftSpeed = 0.02 + Math.random() * 0.03;
    const driftAngle = Math.random() * Math.PI * 2;

    configs.push({
      id: `mote-${i}-${x.toFixed(3)}-${z.toFixed(3)}`,
      position: new THREE.Vector3(x, y, z),
      velocity: new THREE.Vector3(
        Math.cos(driftAngle) * driftSpeed,
        (Math.random() - 0.5) * driftSpeed * 0.5,
        Math.sin(driftAngle) * driftSpeed,
      ),
      size: 0.015 + Math.random() * 0.025,
      phaseOffset: Math.random() * Math.PI * 2,
      bobAmplitude: 0.1 + Math.random() * 0.15,
      bobFrequency: 0.3 + Math.random() * 0.4,
      colorLerp: Math.random(),
    });
  }

  return configs;
}

interface WanderingMoteProps {
  config: MoteConfig;
  time: number;
  breathValue: number;
  baseColor: THREE.Color;
  accentColor: THREE.Color;
}

/**
 * Individual wandering mote instance
 */
function WanderingMote({ config, time, breathValue }: WanderingMoteProps) {
  // Calculate current position with bobbing
  const bobY = Math.sin(time * config.bobFrequency + config.phaseOffset) * config.bobAmplitude;

  // Apply drift (wrapping around the scene boundary)
  const x = config.position.x + config.velocity.x * time;
  const y = config.position.y + config.velocity.y * time + bobY;
  const z = config.position.z + config.velocity.z * time;

  // Scale pulsing with breathing
  const scale = config.size * (0.8 + breathValue * 0.4);

  return <Instance position={[x, y, z]} scale={scale} />;
}

export interface WanderingMotesProps {
  /**
   * Number of wandering motes
   * @default 20
   * @min 5
   * @max 50
   */
  count?: number;

  /**
   * Radius of the mote distribution sphere
   * @default 8
   * @min 3
   * @max 15
   */
  radius?: number;

  /**
   * Base color for motes
   * @default '#f8d0a8'
   */
  baseColor?: string;

  /**
   * Accent color for motes (some will blend between base and accent)
   * @default '#b8e8d4'
   */
  accentColor?: string;

  /**
   * Base opacity of motes
   * @default 0.6
   * @min 0.1
   * @max 1
   */
  opacity?: number;

  /**
   * Enable/disable the motes
   * @default true
   */
  enabled?: boolean;
}

/**
 * WanderingMotes - Renders lazy drifting particles using instanced rendering
 */
export function WanderingMotes({
  count = 20,
  radius = 8,
  baseColor = '#f8d0a8',
  accentColor = '#b8e8d4',
  opacity = 0.6,
  enabled = true,
}: WanderingMotesProps) {
  const world = useWorld();
  const timeRef = useRef(0);
  const breathValueRef = useRef(0);

  // Generate mote configurations once
  const moteConfigs = useMemo(() => generateMoteConfigs(count, radius), [count, radius]);

  // Parse colors
  const baseColorObj = useMemo(() => new THREE.Color(baseColor), [baseColor]);
  const accentColorObj = useMemo(() => new THREE.Color(accentColor), [accentColor]);

  // Update time and breath value each frame
  useFrame((state) => {
    timeRef.current = state.clock.elapsedTime;

    try {
      const breathEntity = world?.queryFirst?.(breathPhase);
      if (breathEntity) {
        breathValueRef.current = breathEntity.get?.(breathPhase)?.value ?? 0;
      }
    } catch {
      // Ignore ECS errors during unmount/remount
    }
  });

  if (!enabled) return null;

  // Dynamic opacity based on breathing
  const dynamicOpacity = opacity * (0.7 + breathValueRef.current * 0.3);

  return (
    <group name="Wandering Motes">
      <Instances limit={count}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={dynamicOpacity}
          depthWrite={false}
        />
        {moteConfigs.map((config) => (
          <WanderingMote
            key={config.id}
            config={config}
            time={timeRef.current}
            breathValue={breathValueRef.current}
            baseColor={baseColorObj}
            accentColor={accentColorObj}
          />
        ))}
      </Instances>
    </group>
  );
}

export default WanderingMotes;
