/**
 * BreathTimerRibbon - Progress indicator ribbon showing breathing phase progress
 *
 * A ring around the globe that fills as the current phase progresses (0-100%),
 * with the phase name displayed on the ribbon.
 *
 * Uses Three.js RingGeometry with dynamic thetaLength for the progress arc,
 * plus curved text from drei/Troika for the phase name.
 */

import { Text, type TextProps } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Color,
  DoubleSide,
  FrontSide,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  RingGeometry,
} from 'three';

import { phaseType, rawProgress } from '../breath/traits';

/**
 * Extended TextProps with Troika's curveRadius support
 */
interface CurvedTextProps extends TextProps {
  curveRadius?: number;
}

const CurvedText = Text as React.FC<CurvedTextProps>;

/**
 * Phase names for display
 */
const PHASE_NAMES = ['Inhale', 'Hold', 'Exhale', 'Rest'] as const;

/**
 * Phase colors - each phase has a distinct color
 * Using Monument Valley inspired palette
 */
const PHASE_COLORS: Record<number, string> = {
  0: '#7dd3c0', // Inhale - teal/mint
  1: '#d4a574', // Hold - warm gold
  2: '#a8c5e0', // Exhale - soft blue
  3: '#e8b4b8', // Rest - soft rose
};

/**
 * Background ring opacity (unfilled portion)
 */
const BACKGROUND_OPACITY = 0.15;

interface BreathTimerRibbonProps {
  /** Globe radius for positioning @default 1.5 */
  globeRadius?: number;
  /** Height offset from equator (positive = above) @default -0.65 */
  heightOffset?: number;
  /** Tilt angle in radians @default 0.25 */
  tiltAngle?: number;
  /** Ring thickness (outer - inner radius) @default 0.06 */
  ringThickness?: number;
  /** Base opacity @default 0.85 */
  opacity?: number;
  /** Font size for phase name @default 0.09 */
  fontSize?: number;
  /** Whether to sync rotation with globe @default true */
  syncRotation?: boolean;
}

/**
 * Number of segments for ring geometry (higher = smoother arc)
 */
const RING_SEGMENTS = 64;

/**
 * BreathTimerRibbon - Progress ring showing breathing phase progress
 */
export function BreathTimerRibbon({
  globeRadius = 1.5,
  heightOffset = -0.65,
  tiltAngle = 0.25,
  ringThickness = 0.06,
  opacity = 0.85,
  fontSize = 0.09,
  syncRotation = true,
}: BreathTimerRibbonProps) {
  const groupRef = useRef<Group>(null);
  const progressMeshRef = useRef<Mesh>(null);
  const world = useWorld();

  // Use state for phase to trigger re-renders for text updates
  const [currentPhase, setCurrentPhase] = useState(0);

  // Ring positioning
  const ringRadius = globeRadius + 0.12;
  const innerRadius = ringRadius - ringThickness / 2;
  const outerRadius = ringRadius + ringThickness / 2;

  // Create base ring geometry (will be updated dynamically)
  const backgroundGeometry = useMemo(() => {
    return new RingGeometry(innerRadius, outerRadius, RING_SEGMENTS, 1, 0, Math.PI * 2);
  }, [innerRadius, outerRadius]);

  // Cleanup geometry on unmount
  useEffect(() => {
    return () => {
      backgroundGeometry.dispose();
    };
  }, [backgroundGeometry]);

  // Color for smooth transitions
  const colorRef = useRef(new Color(PHASE_COLORS[0]));

  useFrame(() => {
    if (!groupRef.current) return;

    // Rotation sync with globe
    if (syncRotation) {
      groupRef.current.rotation.y -= 0.0008;
    }

    // Query breath state from ECS
    try {
      const breathEntity = world.queryFirst(phaseType);
      if (breathEntity) {
        const phase = breathEntity.get(phaseType)?.value ?? 0;
        const progress = breathEntity.get(rawProgress)?.value ?? 0;

        // Update phase state (triggers re-render for text)
        if (phase !== currentPhase) {
          setCurrentPhase(phase);
        }

        // Update progress ring geometry
        if (progressMeshRef.current) {
          // Dispose old geometry
          progressMeshRef.current.geometry.dispose();

          // Create new geometry with current progress
          // thetaLength controls how much of the ring is drawn (0 to 2π)
          const thetaLength = Math.max(0.001, progress * Math.PI * 2);
          const newGeometry = new RingGeometry(
            innerRadius,
            outerRadius,
            RING_SEGMENTS,
            1,
            0,
            thetaLength,
          );
          progressMeshRef.current.geometry = newGeometry;

          // Update material color
          const material = progressMeshRef.current.material as MeshBasicMaterial;
          if (material) {
            const targetColor = PHASE_COLORS[phase] || PHASE_COLORS[0];
            colorRef.current.lerp(new Color(targetColor), 0.1);
            material.color.copy(colorRef.current);
          }
        }
      }
    } catch {
      // Ignore ECS errors during unmount/remount in Triplex
    }
  });

  // Get current phase color and name for text
  const phaseColor = PHASE_COLORS[currentPhase] || PHASE_COLORS[0];
  const phaseName = PHASE_NAMES[currentPhase] || 'Breathe';

  return (
    <group ref={groupRef} name="Breath Timer Ribbon">
      {/* Position and tilt the ring */}
      <group position={[0, heightOffset, 0]} rotation={[Math.PI / 2 + tiltAngle, 0, 0]}>
        {/* Background ring (full circle, semi-transparent) */}
        <mesh geometry={backgroundGeometry}>
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={BACKGROUND_OPACITY}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* Progress ring (arc based on rawProgress) */}
        <mesh ref={progressMeshRef} position={[0, 0, 0.001]}>
          <ringGeometry args={[innerRadius, outerRadius, RING_SEGMENTS, 1, 0, 0.001]} />
          <meshBasicMaterial
            color={phaseColor}
            transparent
            opacity={opacity}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Phase name text - positioned at the front of the ring */}
      <PhaseNameText
        phaseName={phaseName}
        color={phaseColor}
        fontSize={fontSize}
        opacity={opacity}
        radius={ringRadius}
        heightOffset={heightOffset}
        tiltAngle={tiltAngle}
      />
    </group>
  );
}

/**
 * PhaseNameText - Curved text showing the current phase name
 */
function PhaseNameText({
  phaseName,
  color,
  fontSize,
  opacity,
  radius,
  heightOffset,
  tiltAngle,
}: {
  phaseName: string;
  color: string;
  fontSize: number;
  opacity: number;
  radius: number;
  heightOffset: number;
  tiltAngle: number;
}) {
  // Position text at the front of the ring, slightly below the ring
  const textY = heightOffset - 0.12;
  const textZ = radius;

  // Use negative curveRadius for convex curvature (text curves outward)
  const curveRadius = -radius;

  return (
    <group rotation={[tiltAngle * 0.3, 0, 0]}>
      {/* Front-facing text */}
      <CurvedText
        fontSize={fontSize}
        color={color}
        anchorX="center"
        anchorY="middle"
        curveRadius={curveRadius}
        position={[0, textY, textZ]}
        letterSpacing={0.15}
        fontWeight={600}
        fillOpacity={opacity}
        material-side={FrontSide}
      >
        {phaseName.toUpperCase()}
      </CurvedText>

      {/* Back-facing text (180° rotated) */}
      <group rotation={[0, Math.PI, 0]}>
        <CurvedText
          fontSize={fontSize}
          color={color}
          anchorX="center"
          anchorY="middle"
          curveRadius={curveRadius}
          position={[0, textY, textZ]}
          letterSpacing={0.15}
          fontWeight={600}
          fillOpacity={opacity}
          material-side={FrontSide}
        >
          {phaseName.toUpperCase()}
        </CurvedText>
      </group>
    </group>
  );
}

export default BreathTimerRibbon;
