/**
 * PhaseGlyphs - Floating holographic numbers showing 4·7·8 timing
 *
 * Three glyphs positioned around the globe at 120° intervals:
 * - "4" (teal) - Inhale duration
 * - "7" (white) - Hold duration
 * - "8" (gold) - Exhale duration
 *
 * Active glyph scales up and glows brightly.
 * Uses Billboard for always-facing-camera behavior.
 */

import { Billboard, RoundedBox, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { breathPhase, phaseType, rawProgress } from '../breath/traits';
import { HOLO_COLORS } from './materials';

/**
 * Glyph configuration for each breathing phase
 */
const GLYPH_CONFIG = [
  {
    phase: 0, // Inhale
    label: '4',
    color: HOLO_COLORS.INHALE,
    angle: 0, // Front
  },
  {
    phase: 1, // Hold
    label: '7',
    color: HOLO_COLORS.HOLD,
    angle: (Math.PI * 2) / 3, // 120°
  },
  {
    phase: 2, // Exhale
    label: '8',
    color: HOLO_COLORS.EXHALE,
    angle: (Math.PI * 4) / 3, // 240°
  },
];

interface PhaseGlyphProps {
  label: string;
  color: string;
  position: [number, number, number];
  isActive: boolean;
  progress: number;
}

/**
 * Single phase glyph with holographic styling
 */
function PhaseGlyph({ label, color, position, isActive, progress }: PhaseGlyphProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Animate scale when active
  useFrame((state) => {
    if (!groupRef.current) return;

    const targetScale = isActive ? 1.15 + Math.sin(state.clock.elapsedTime * 2.5) * 0.03 : 0.85;

    // Smooth interpolation
    const currentScale = groupRef.current.scale.x;
    const newScale = currentScale + (targetScale - currentScale) * 0.1;
    groupRef.current.scale.setScalar(newScale);
  });

  const badgeWidth = 0.24;
  const badgeHeight = 0.3;

  return (
    <Billboard follow={true} lockX={false} lockY={false} lockZ={false} position={position}>
      <group ref={groupRef} scale={isActive ? 1.15 : 0.85}>
        {/* Background badge */}
        <RoundedBox args={[badgeWidth, badgeHeight, 0.02]} radius={0.06} smoothness={4}>
          <meshBasicMaterial
            color={isActive ? color : '#a0a0a0'}
            transparent
            opacity={isActive ? 0.85 : 0.25}
            side={THREE.DoubleSide}
          />
        </RoundedBox>

        {/* Glyph number */}
        <Text
          position={[0, 0, 0.015]}
          fontSize={0.15}
          color={isActive ? '#ffffff' : '#888888'}
          anchorX="center"
          anchorY="middle"
          fontWeight={700}
        >
          {label}
        </Text>

        {/* Progress indicator (small bar below number) */}
        {isActive && progress > 0 && (
          <mesh position={[0, -0.11, 0.02]}>
            <planeGeometry args={[badgeWidth * 0.7 * progress, 0.025]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
          </mesh>
        )}

        {/* Glow ring when active */}
        {isActive && (
          <mesh position={[0, 0, -0.01]}>
            <ringGeometry args={[0.13, 0.16, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.35} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
    </Billboard>
  );
}

interface PhaseGlyphsProps {
  /** Distance from globe center @default 2.3 */
  orbitRadius?: number;
  /** Height offset from equator @default 0 */
  height?: number;
  /** Enable orbit animation @default false */
  enableOrbit?: boolean;
  /** Orbit speed (rad/frame) @default 0.0003 */
  orbitSpeed?: number;
  /** Debug mode - force specific phase @default -1 */
  debugPhase?: number;
  /** Debug mode - force specific progress @default -1 */
  debugProgress?: number;
}

/**
 * PhaseGlyphs - Floating phase number indicators
 */
export function PhaseGlyphs({
  orbitRadius = 2.3,
  height = 0,
  enableOrbit = false,
  orbitSpeed = 0.0003,
  debugPhase = -1,
  debugProgress = -1,
}: PhaseGlyphsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const world = useWorld();

  // Use state for re-rendering when phase changes
  const [currentPhase, setCurrentPhase] = useState(0);
  const [currentProgress, setCurrentProgress] = useState(0);

  // Track last phase to detect changes
  const lastPhaseRef = useRef(-1);

  // Calculate positions for each glyph
  const positions = useMemo(() => {
    return GLYPH_CONFIG.map(({ angle }) => {
      const x = Math.sin(angle) * orbitRadius;
      const z = Math.cos(angle) * orbitRadius;
      return [x, height, z] as [number, number, number];
    });
  }, [orbitRadius, height]);

  // Animation loop - update state when phase changes
  useFrame(() => {
    if (!groupRef.current) return;

    // Slow orbit rotation
    if (enableOrbit) {
      groupRef.current.rotation.y += orbitSpeed;
    }

    // Get breath state from ECS
    let newPhase = 0;
    let newProgress = 0;

    if (debugPhase >= 0) {
      newPhase = debugPhase;
      newProgress = debugProgress >= 0 ? debugProgress : 0.5;
    } else {
      try {
        const breathEntity = world.queryFirst(breathPhase);
        if (breathEntity) {
          newPhase = breathEntity.get(phaseType)?.value ?? 0;
          newProgress = breathEntity.get(rawProgress)?.value ?? 0;
        }
      } catch {
        // Ignore ECS errors during unmount
      }
    }

    // Only update state when phase changes to avoid excessive re-renders
    if (newPhase !== lastPhaseRef.current) {
      lastPhaseRef.current = newPhase;
      setCurrentPhase(newPhase);
    }

    // Update progress more frequently (every 5 frames) for smooth bar animation
    setCurrentProgress(newProgress);
  });

  return (
    <group ref={groupRef} name="PhaseGlyphs">
      {GLYPH_CONFIG.map(({ phase, label, color }, index) => (
        <PhaseGlyph
          key={phase}
          label={label}
          color={color}
          position={positions[index]}
          isActive={currentPhase === phase}
          progress={currentPhase === phase ? currentProgress : 0}
        />
      ))}
    </group>
  );
}

export default PhaseGlyphs;
