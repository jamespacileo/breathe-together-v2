/**
 * ProgressCircleOverlay - 3D progress circle with organic breathing animation
 *
 * Features:
 * - Circular progress ring that expands on inhale, contracts on exhale
 * - Phase markers and labels around the ring
 * - User count text centered
 * - Synchronized with breathing cycle via ECS
 *
 * Key fix: Uses depthWrite: true so DoF shader sees the ring's actual depth
 * (close to camera = sharp). Without depthWrite, DoF sees the background
 * depth and blurs the ring.
 */

import { Billboard, Ring, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../constants';
import { breathPhase, phaseType, rawProgress } from '../entities/breath/traits';

// Phase configuration - names for each phase type
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

// Dynamically generate phase labels based on active phases (duration > 0)
const PHASE_LABELS = PHASE_DURATIONS.map((duration, index) => {
  const startTime = PHASE_START_TIMES[index] ?? 0;
  const progressPosition = startTime / BREATH_TOTAL_CYCLE;
  const angle = -Math.PI / 2 + progressPosition * Math.PI * 2;

  return {
    name: PHASE_NAMES[index] ?? 'Phase',
    angle,
    phaseIndex: index,
    duration,
  };
}).filter((phase) => phase.duration > 0);

interface ProgressCircleOverlayProps {
  /** Radius of the progress ring when exhaled @default 2.0 */
  radius?: number;
  /** Radius when inhaled (contracted, closer to globe) @default 1.6 */
  contractedRadius?: number;
  /** Ring thickness @default 0.02 */
  thickness?: number;
  /** Progress arc color (soft neutral) @default '#d4cfc8' */
  progressColor?: string;
  /** Show user count @default true */
  showUserCount?: boolean;
  /** User count to display @default 77 */
  userCount?: number;
  /** Z position offset @default 0.1 */
  zOffset?: number;
  /** Render order @default 10 */
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
  shape.absarc(0, 0, outerRadius, startAngle, endAngle, false);
  shape.absarc(0, 0, innerRadius, endAngle, startAngle, true);
  shape.closePath();
  return new THREE.ShapeGeometry(shape, segments);
}

export function ProgressCircleOverlay({
  radius = 2.0,
  contractedRadius = 1.6,
  thickness = 0.02,
  progressColor = '#d4cfc8', // Soft warm gray
  showUserCount = true,
  userCount = 77,
  zOffset = 0.1,
  renderOrder = 10,
}: ProgressCircleOverlayProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringGroupRef = useRef<THREE.Group>(null);
  const progressMeshRef = useRef<THREE.Mesh>(null);
  const indicatorRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const world = useWorld();

  const [currentPhaseIndex, setCurrentPhaseIndex] = useState<number>(0);
  const currentRadiusRef = useRef<number>(radius);
  const labelOffset = 0.35; // Closer labels for softer look

  // Soft neutral colors for gentle integration
  const mutedColor = '#c4beb6'; // Warm neutral gray

  const progressGeometryRef = useRef<THREE.BufferGeometry | null>(null);

  // Soft, transparent materials for gentle integration
  const progressMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: progressColor,
        transparent: true,
        opacity: 0.55, // Soft but visible
        side: THREE.DoubleSide,
        depthWrite: true,
      }),
    [progressColor],
  );

  const ringMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#bfb8b0', // Soft warm gray
        transparent: true,
        opacity: 0.12, // Subtle but visible track
        side: THREE.DoubleSide,
        depthWrite: true,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      progressMaterial.dispose();
      ringMaterial.dispose();
      progressGeometryRef.current?.dispose();
    };
  }, [progressMaterial, ringMaterial]);

  const prevPhaseRef = useRef<number>(-1);
  const prevProgressRef = useRef<number>(-1);

  // Animation loop
  useFrame((_, delta) => {
    if (!groupRef.current || !progressMeshRef.current) return;

    try {
      const breathEntity = world?.queryFirst?.(phaseType, rawProgress, breathPhase);
      if (!breathEntity) return;

      const currentPhaseType = breathEntity.get?.(phaseType)?.value ?? 0;
      const currentRawProgress = Math.min(
        1,
        Math.max(0, breathEntity.get?.(rawProgress)?.value ?? 0),
      );
      const currentBreathPhase = Math.min(
        1,
        Math.max(0, breathEntity.get?.(breathPhase)?.value ?? 0),
      );

      // Calculate cycle progress
      const phaseStartTime = PHASE_START_TIMES[currentPhaseType] ?? 0;
      const phaseDuration = PHASE_DURATIONS[currentPhaseType] ?? PHASE_DURATIONS[0] ?? 1;
      const cycleProgress =
        (phaseStartTime + currentRawProgress * phaseDuration) / BREATH_TOTAL_CYCLE;

      // Update phase state on transitions
      if (currentPhaseType !== prevPhaseRef.current) {
        prevPhaseRef.current = currentPhaseType;
        setCurrentPhaseIndex(currentPhaseType);
      }

      // BREATHING RADIUS ANIMATION - contracts on inhale, expands on exhale
      // breathPhase: 0 = exhaled (expanded, further from globe)
      // breathPhase: 1 = inhaled (contracted, closer to globe)
      const targetRadius = radius - (radius - contractedRadius) * currentBreathPhase;
      const lerpSpeed = 3.5; // Slightly slower for softer feel
      currentRadiusRef.current +=
        (targetRadius - currentRadiusRef.current) * Math.min(1, delta * lerpSpeed);

      const animatedRadius = currentRadiusRef.current;

      // Apply scale to ring group
      if (ringGroupRef.current) {
        const scale = animatedRadius / radius;
        ringGroupRef.current.scale.set(scale, scale, 1);
      }

      // Update progress arc geometry
      const progressThreshold = 0.02;
      if (Math.abs(cycleProgress - prevProgressRef.current) > progressThreshold) {
        prevProgressRef.current = cycleProgress;
        progressGeometryRef.current?.dispose();

        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + cycleProgress * Math.PI * 2;
        const innerRadius = radius - thickness / 2;
        const outerRadius = radius + thickness / 2;

        const newGeometry = createArcGeometry(innerRadius, outerRadius, startAngle, endAngle, 64);
        progressGeometryRef.current = newGeometry;
        progressMeshRef.current.geometry = newGeometry;
      }

      // Update indicator position
      if (indicatorRef.current) {
        const angle = -Math.PI / 2 + cycleProgress * Math.PI * 2;
        indicatorRef.current.position.x = Math.cos(angle) * radius;
        indicatorRef.current.position.y = Math.sin(angle) * radius;
      }

      // Soft breathing pulse on opacity
      const breathPulse = 0.45 + currentBreathPhase * 0.25; // Soft but visible range
      progressMaterial.opacity = breathPulse;
      ringMaterial.opacity = 0.1 + currentBreathPhase * 0.08; // Subtle but visible track
    } catch {
      // Ignore ECS errors during unmount/remount
    }
  });

  // Initial geometry
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
      {/* Ring group - scales with breathing */}
      <group ref={ringGroupRef}>
        {/* Background ring */}
        <Ring
          ref={ringRef}
          args={[radius - thickness / 2, radius + thickness / 2, 64]}
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

        {/* Indicator dot - soft glow point */}
        <mesh ref={indicatorRef} position={[0, radius, 0]} renderOrder={renderOrder + 2}>
          <circleGeometry args={[thickness * 2, 16]} />
          <meshBasicMaterial color={progressColor} transparent opacity={0.65} depthWrite={true} />
        </mesh>

        {/* Phase markers and labels - very subtle */}
        {PHASE_LABELS.map((label) => {
          const isActive = currentPhaseIndex === label.phaseIndex;
          // Smaller, more delicate markers
          const lineLength = isActive ? thickness * 4 : thickness * 3;
          const lineWidth = isActive ? thickness * 0.8 : thickness * 0.5;

          const ringOuterEdge = radius + thickness / 2;
          const markerCenterRadius = ringOuterEdge + lineLength / 2;
          const markerX = Math.cos(label.angle) * markerCenterRadius;
          const markerY = Math.sin(label.angle) * markerCenterRadius;

          const labelRadius = ringOuterEdge + lineLength + labelOffset;
          const labelX = Math.cos(label.angle) * labelRadius;
          const labelY = Math.sin(label.angle) * labelRadius;

          const rotation = label.angle;

          return (
            <group key={`phase-${label.phaseIndex}-${label.name}`}>
              {/* Phase marker line - subtle tick */}
              <mesh
                position={[markerX, markerY, 0.01]}
                rotation={[0, 0, rotation]}
                renderOrder={renderOrder + 2}
              >
                <planeGeometry args={[lineLength, lineWidth]} />
                <meshBasicMaterial
                  color={isActive ? progressColor : mutedColor}
                  transparent
                  opacity={isActive ? 0.6 : 0.3} // Soft but visible
                  depthWrite={true}
                  side={THREE.DoubleSide}
                />
              </mesh>

              {/* Phase label - soft and understated */}
              <Billboard position={[labelX, labelY, 0.02]} follow={true}>
                <Text
                  fontSize={isActive ? 0.12 : 0.09} // Smaller text
                  color={isActive ? progressColor : mutedColor}
                  anchorX="center"
                  anchorY="middle"
                  letterSpacing={0.08}
                  renderOrder={renderOrder + 4}
                  material-transparent={true}
                  material-opacity={isActive ? 0.8 : 0.45} // Soft but visible
                  material-depthWrite={true}
                >
                  {label.name}
                </Text>
              </Billboard>
            </group>
          );
        })}
      </group>

      {/* User count - subtle center text */}
      {showUserCount && (
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.1}
          color={mutedColor}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.06}
          renderOrder={renderOrder + 5}
          material-transparent={true}
          material-opacity={0.55} // Soft but visible
          material-depthWrite={true}
        >
          {userCount} breathing
        </Text>
      )}
    </group>
  );
}

export default ProgressCircleOverlay;
