/**
 * ProgressCircleOverlay - 3D progress circle with phase text overlaying the globe
 *
 * Features:
 * - Circular progress ring around the globe
 * - Phase text (INHALE, HOLD, EXHALE) centered
 * - User count text below
 * - Renders in front of globe but behind icosahedron particles
 * - Synchronized with breathing cycle via UTC time
 *
 * Visual style: Subtle, minimal overlay that complements the globe aesthetic
 */

import { Ring, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../constants';
import { phaseType, rawProgress } from '../entities/breath/traits';

// Phase names for display
const PHASE_NAMES = ['Inhale', 'Hold', 'Exhale', 'Hold'] as const;

// Phase durations for progress calculation
const PHASE_DURATIONS = [
  BREATH_PHASES.INHALE,
  BREATH_PHASES.HOLD_IN,
  BREATH_PHASES.EXHALE,
  BREATH_PHASES.HOLD_OUT,
];

// Calculate cumulative start times for each phase
const PHASE_START_TIMES = PHASE_DURATIONS.reduce<number[]>((acc, _duration, index) => {
  if (index === 0) return [0];
  const lastStart = acc[index - 1] ?? 0;
  acc.push(lastStart + (PHASE_DURATIONS[index - 1] ?? 0));
  return acc;
}, []);

/**
 * ProgressCircleOverlay component props
 */
interface ProgressCircleOverlayProps {
  /** Radius of the progress ring (should be slightly larger than globe) @default 2.0 */
  radius?: number;
  /** Ring thickness @default 0.03 */
  thickness?: number;
  /** Ring color @default '#c9a06c' */
  ringColor?: string;
  /** Progress arc color @default '#7ec8d4' */
  progressColor?: string;
  /** Text color @default '#5a4d42' */
  textColor?: string;
  /** Show user count @default true */
  showUserCount?: boolean;
  /** User count to display @default 77 */
  userCount?: number;
  /** Z position offset (in front of globe) @default 0.1 */
  zOffset?: number;
  /** Render order (higher renders on top) @default 10 */
  renderOrder?: number;
}

/**
 * Creates a partial ring (arc) geometry for progress visualization
 */
function createArcGeometry(
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
  segments: number,
): THREE.BufferGeometry {
  const shape = new THREE.Shape();

  // Outer arc
  shape.absarc(0, 0, outerRadius, startAngle, endAngle, false);
  // Inner arc (reversed)
  shape.absarc(0, 0, innerRadius, endAngle, startAngle, true);
  shape.closePath();

  const geometry = new THREE.ShapeGeometry(shape, segments);
  return geometry;
}

/**
 * ProgressCircleOverlay - Renders a progress circle with text overlaying the globe
 */
export function ProgressCircleOverlay({
  radius = 2.0,
  thickness = 0.03,
  ringColor = 'rgba(160, 140, 120, 0.2)',
  progressColor = '#c9a06c',
  textColor = '#5a4d42',
  showUserCount = true,
  userCount = 77,
  zOffset = 0.1,
  renderOrder = 10,
}: ProgressCircleOverlayProps) {
  const groupRef = useRef<THREE.Group>(null);
  const textRef = useRef<THREE.Mesh>(null);
  const countTextRef = useRef<THREE.Mesh>(null);
  const progressMeshRef = useRef<THREE.Mesh>(null);
  const indicatorRef = useRef<THREE.Mesh>(null);
  const world = useWorld();

  // Create progress arc geometry (will be updated each frame)
  const progressGeometryRef = useRef<THREE.BufferGeometry | null>(null);

  // Material for the progress arc
  const progressMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: progressColor,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [progressColor],
  );

  // Ring material (background track)
  const ringMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#a08c78',
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  // Cleanup materials on unmount
  useEffect(() => {
    return () => {
      progressMaterial.dispose();
      ringMaterial.dispose();
      progressGeometryRef.current?.dispose();
    };
  }, [progressMaterial, ringMaterial]);

  // Track previous values to minimize updates
  const prevPhaseRef = useRef<number>(-1);
  const prevProgressRef = useRef<number>(-1);

  /**
   * Update progress arc and text each frame
   */
  useFrame(() => {
    if (!groupRef.current || !progressMeshRef.current) return;

    try {
      // Get breath state from ECS
      const breathEntity = world?.queryFirst?.(phaseType, rawProgress);
      if (!breathEntity) return;

      const currentPhaseType = breathEntity.get?.(phaseType)?.value ?? 0;
      const currentRawProgress = Math.min(
        1,
        Math.max(0, breathEntity.get?.(rawProgress)?.value ?? 0),
      );

      // Calculate overall cycle progress (0-1)
      const phaseStartTime = PHASE_START_TIMES[currentPhaseType] ?? 0;
      const phaseDuration = PHASE_DURATIONS[currentPhaseType] ?? PHASE_DURATIONS[0] ?? 1;
      const cycleProgress =
        (phaseStartTime + currentRawProgress * phaseDuration) / BREATH_TOTAL_CYCLE;

      // Update phase text only on phase transition
      if (currentPhaseType !== prevPhaseRef.current) {
        prevPhaseRef.current = currentPhaseType;
        if (textRef.current) {
          // drei Text component uses 'text' property
          const textMesh = textRef.current as THREE.Mesh & { text?: string };
          if (textMesh.text !== undefined) {
            textMesh.text = PHASE_NAMES[currentPhaseType] ?? 'Breathe';
          }
        }
      }

      // Update progress arc geometry (throttle to every 2% change)
      const progressThreshold = 0.02;
      if (Math.abs(cycleProgress - prevProgressRef.current) > progressThreshold) {
        prevProgressRef.current = cycleProgress;

        // Dispose old geometry
        progressGeometryRef.current?.dispose();

        // Create new arc geometry
        // Start at top (-PI/2), progress clockwise
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + cycleProgress * Math.PI * 2;

        const innerRadius = radius - thickness / 2;
        const outerRadius = radius + thickness / 2;

        const newGeometry = createArcGeometry(innerRadius, outerRadius, startAngle, endAngle, 64);

        progressGeometryRef.current = newGeometry;
        progressMeshRef.current.geometry = newGeometry;
      }

      // Update indicator dot position along the arc
      if (indicatorRef.current) {
        const angle = -Math.PI / 2 + cycleProgress * Math.PI * 2;
        indicatorRef.current.position.x = Math.cos(angle) * radius;
        indicatorRef.current.position.y = Math.sin(angle) * radius;
      }

      // Subtle breathing pulse on the ring opacity
      const breathPulse = 0.6 + currentRawProgress * 0.3;
      progressMaterial.opacity = breathPulse * 0.8;
    } catch {
      // Ignore ECS errors during unmount/remount in Triplex
    }
  });

  // Initial progress geometry (0%)
  useEffect(() => {
    const startAngle = -Math.PI / 2;
    const innerRadius = radius - thickness / 2;
    const outerRadius = radius + thickness / 2;
    const initialGeometry = createArcGeometry(innerRadius, outerRadius, startAngle, startAngle, 64);
    progressGeometryRef.current = initialGeometry;

    return () => {
      progressGeometryRef.current?.dispose();
    };
  }, [radius, thickness]);

  return (
    <group ref={groupRef} position={[0, 0, zOffset]} renderOrder={renderOrder}>
      {/* Background ring (full circle track) */}
      <Ring
        args={[radius - thickness / 2, radius + thickness / 2, 64]}
        rotation={[0, 0, 0]}
        material={ringMaterial}
        renderOrder={renderOrder}
      />

      {/* Progress arc */}
      <mesh
        ref={progressMeshRef}
        material={progressMaterial}
        renderOrder={renderOrder + 1}
        geometry={progressGeometryRef.current ?? undefined}
      />

      {/* Small progress indicator dot at current position */}
      <mesh ref={indicatorRef} position={[0, radius, 0]} renderOrder={renderOrder + 2}>
        <circleGeometry args={[thickness * 2.5, 16]} />
        <meshBasicMaterial color={progressColor} transparent opacity={0.95} depthWrite={false} />
      </mesh>

      {/* Phase text (centered) */}
      <Text
        ref={textRef}
        position={[0, 0.1, 0.01]}
        fontSize={0.32}
        color={textColor}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.12}
        renderOrder={renderOrder + 3}
        material-transparent={true}
        material-depthWrite={false}
      >
        Hold
      </Text>

      {/* User count text (below phase name) */}
      {showUserCount && (
        <Text
          ref={countTextRef}
          position={[0, -0.25, 0.01]}
          fontSize={0.12}
          color={textColor}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.08}
          renderOrder={renderOrder + 3}
          material-transparent={true}
          material-depthWrite={false}
        >
          {userCount} breathing
        </Text>
      )}
    </group>
  );
}

export default ProgressCircleOverlay;
