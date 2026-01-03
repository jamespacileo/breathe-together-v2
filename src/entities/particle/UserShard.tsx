/**
 * UserShard - Special shard representing the current user ("YOU")
 *
 * Features:
 * - MeshTransmissionMaterial for glass-like appearance (from the reference)
 * - Edges overlay for visual distinction
 * - "YOU" text label
 * - Synchronized with breathing animation via ECS traits
 *
 * This is rendered as a separate mesh (not part of InstancedMesh) to allow
 * for the special material and edges effect.
 */

import { Edges, MeshTransmissionMaterial, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { MoodId } from '../../constants';
import { MONUMENT_VALLEY_PALETTE } from '../../lib/colors';
import { breathPhase, orbitRadius } from '../breath/traits';

export interface UserShardProps {
  /** Position direction on the unit sphere (normalized) */
  direction: THREE.Vector3;
  /** Base orbit radius @default 4.5 */
  baseRadius?: number;
  /** Shard size @default 0.4 */
  shardSize?: number;
  /** User's mood for color */
  mood?: MoodId;
  /** Scale (0-1 for enter/exit animation) @default 1 */
  scale?: number;
  /** Phase offset for wave effect @default 0 */
  phaseOffset?: number;
  /** Ambient seed for floating motion @default 0 */
  ambientSeed?: number;
  /** Edge color for the outline @default '#fef8ee' (warm white) */
  edgeColor?: string;
  /** Whether to show the "YOU" label @default true */
  showLabel?: boolean;
}

// Material properties inspired by the reference example
const TRANSMISSION_PROPS = {
  transmission: 0.95,
  thickness: 1.5,
  roughness: 0.15,
  envMapIntensity: 2.5,
  chromaticAberration: 0.03,
  anisotropy: 0.2,
  distortion: 0.1,
  distortionScale: 0.2,
  temporalDistortion: 0.1,
};

// Animation constants (matching ParticleSwarm)
const BREATH_LERP_SPEED = 6.0;
const AMBIENT_SCALE = 0.08;
const AMBIENT_Y_SCALE = 0.04;
const PERPENDICULAR_AMPLITUDE = 0.03;
const PERPENDICULAR_FREQUENCY = 0.35;
const ORBIT_BASE_SPEED = 0.015;

// Reusable objects for animation
const _tempPosition = new THREE.Vector3();
const _tempOrbitedDir = new THREE.Vector3();
const _tempTangent1 = new THREE.Vector3();
const _tempTangent2 = new THREE.Vector3();
const _tempAmbient = new THREE.Vector3();
const _yAxis = new THREE.Vector3(0, 1, 0);

export function UserShard({
  direction,
  baseRadius = 4.5,
  shardSize = 0.4,
  mood = 'presence',
  scale = 1,
  phaseOffset = 0,
  ambientSeed = 0,
  edgeColor = '#fef8ee',
  showLabel = true,
}: UserShardProps) {
  const world = useWorld();
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  // State refs for smooth animation
  const currentRadiusRef = useRef(baseRadius);
  const orbitAngleRef = useRef(0);
  const wobbleSeedRef = useRef(ambientSeed * Math.E);
  const rotationRef = useRef({ x: 0, y: 0 });

  // Get mood color
  const moodColor = useMemo(() => {
    return MONUMENT_VALLEY_PALETTE[mood] ?? MONUMENT_VALLEY_PALETTE.presence;
  }, [mood]);

  // Create geometry
  const geometry = useMemo(() => {
    return new THREE.IcosahedronGeometry(shardSize, 0);
  }, [shardSize]);

  // Animation loop - synchronized with breathing
  useFrame((state, delta) => {
    const group = groupRef.current;
    const mesh = meshRef.current;
    if (!group || !mesh) return;

    const clampedDelta = Math.min(delta, 0.1);
    const time = state.clock.elapsedTime;

    // Get breathing state from ECS
    let targetRadius = baseRadius;
    let currentBreathPhase = 0;
    const breathEntity = world.queryFirst(orbitRadius, breathPhase);
    if (breathEntity) {
      targetRadius = breathEntity.get(orbitRadius)?.value ?? baseRadius;
      currentBreathPhase = breathEntity.get(breathPhase)?.value ?? 0;
    }

    // Apply phase offset for wave effect
    const phaseOffsetAmount = phaseOffset * (baseRadius - 2.5); // 2.5 is approximate minOrbitRadius
    const targetWithOffset = targetRadius + phaseOffsetAmount;

    // Smooth radius lerp
    const lerpFactor = 1 - Math.exp(-BREATH_LERP_SPEED * clampedDelta);
    currentRadiusRef.current += (targetWithOffset - currentRadiusRef.current) * lerpFactor;

    // Orbit drift
    orbitAngleRef.current += ORBIT_BASE_SPEED * clampedDelta;
    _tempOrbitedDir.copy(direction).applyAxisAngle(_yAxis, orbitAngleRef.current);

    // Calculate tangent vectors for wobble
    _tempTangent1.copy(_tempOrbitedDir).cross(_yAxis).normalize();
    if (_tempTangent1.lengthSq() < 0.001) {
      _tempTangent1.set(1, 0, 0);
    }
    _tempTangent2.copy(_tempOrbitedDir).cross(_tempTangent1).normalize();

    // Perpendicular wobble
    const wobblePhase = time * PERPENDICULAR_FREQUENCY * Math.PI * 2 + wobbleSeedRef.current;
    const wobble1 = Math.sin(wobblePhase) * PERPENDICULAR_AMPLITUDE;
    const wobble2 = Math.cos(wobblePhase * 0.7) * PERPENDICULAR_AMPLITUDE * 0.6;

    // Ambient floating
    const seed = ambientSeed;
    _tempAmbient.set(
      Math.sin(time * 0.4 + seed) * AMBIENT_SCALE,
      Math.sin(time * 0.3 + seed * 0.7) * AMBIENT_Y_SCALE,
      Math.cos(time * 0.35 + seed * 1.3) * AMBIENT_SCALE,
    );

    // Calculate final position
    _tempPosition
      .copy(_tempOrbitedDir)
      .multiplyScalar(currentRadiusRef.current)
      .addScaledVector(_tempTangent1, wobble1)
      .addScaledVector(_tempTangent2, wobble2)
      .add(_tempAmbient);

    // Update group position
    group.position.copy(_tempPosition);

    // Update rotation (tumbling)
    rotationRef.current.x += 0.002 * 1.0;
    rotationRef.current.y += 0.003 * 1.1;
    mesh.rotation.set(rotationRef.current.x, rotationRef.current.y, 0);

    // Update scale with breathing
    const breathScale = 1.0 + currentBreathPhase * 0.05;
    const finalScale = scale * breathScale;
    mesh.scale.setScalar(finalScale);
  });

  // Don't render if scale is 0
  if (scale <= 0.001) {
    return null;
  }

  return (
    <group ref={groupRef} name="User Shard">
      <mesh ref={meshRef} geometry={geometry}>
        <MeshTransmissionMaterial
          color={moodColor}
          {...TRANSMISSION_PROPS}
          resolution={256}
          samples={8}
        />
        <Edges scale={1.05} threshold={15} color={edgeColor} lineWidth={1.5} />
      </mesh>

      {/* "YOU" label */}
      {showLabel && (
        <Text
          position={[0, shardSize * 1.8, 0]}
          fontSize={shardSize * 0.6}
          color={edgeColor}
          anchorX="center"
          anchorY="bottom"
          fontWeight="bold"
          outlineWidth={0.02}
          outlineColor="#000000"
          outlineOpacity={0.3}
        >
          YOU
        </Text>
      )}
    </group>
  );
}

export default UserShard;
