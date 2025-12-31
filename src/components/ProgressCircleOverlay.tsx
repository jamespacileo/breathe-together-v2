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

import { Billboard, Ring, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../constants';
import { breathPhase, phaseType, rawProgress } from '../entities/breath/traits';

// Phase names for display
const PHASE_NAMES = ['Inhale', 'Hold', 'Exhale', 'Hold'] as const;

// Phase label configuration - positioned around the ring
// Each phase starts at a specific angle (clockwise from top)
const PHASE_LABELS = [
  { name: 'Inhale', angle: -Math.PI / 2, phaseIndex: 0 }, // Top (0%)
  { name: 'Hold', angle: 0, phaseIndex: 1 }, // Right (25%)
  { name: 'Exhale', angle: Math.PI / 2, phaseIndex: 2 }, // Bottom (50%)
  { name: 'Hold', angle: Math.PI, phaseIndex: 3 }, // Left (75%)
] as const;

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
  /** Radius of the progress ring when exhaled (contracted) @default 2.0 */
  radius?: number;
  /** Radius of the progress ring when inhaled (expanded) @default 3.2 */
  expandedRadius?: number;
  /** Ring thickness @default 0.03 */
  thickness?: number;
  /** Progress arc color @default '#c9a06c' */
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
  expandedRadius = 3.2,
  thickness = 0.03,
  progressColor = '#c9a06c',
  textColor = '#5a4d42',
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

  // Phase name state (updates on phase transitions only - 4 times per 16s cycle)
  const [phaseName, setPhaseName] = useState<string>('Hold');
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState<number>(0);

  // Current animated radius (smoothly interpolates between radius and expandedRadius)
  const currentRadiusRef = useRef<number>(radius);

  // Label offset distance from ring (slightly outside)
  const labelOffset = 0.35;

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
   * Update progress arc, breathing scale, and text each frame
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Animation loop requires multiple state checks for breathing animation, progress arc updates, indicator position, and material opacity - all tightly coupled
  useFrame((_, delta) => {
    if (!groupRef.current || !progressMeshRef.current) return;

    try {
      // Get breath state from ECS
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

      // Calculate overall cycle progress (0-1)
      const phaseStartTime = PHASE_START_TIMES[currentPhaseType] ?? 0;
      const phaseDuration = PHASE_DURATIONS[currentPhaseType] ?? PHASE_DURATIONS[0] ?? 1;
      const cycleProgress =
        (phaseStartTime + currentRawProgress * phaseDuration) / BREATH_TOTAL_CYCLE;

      // Update phase text only on phase transition
      if (currentPhaseType !== prevPhaseRef.current) {
        prevPhaseRef.current = currentPhaseType;
        const newPhaseName = PHASE_NAMES[currentPhaseType] ?? 'Breathe';
        setPhaseName(newPhaseName);
        setCurrentPhaseIndex(currentPhaseType);
      }

      // ========== BREATHING RADIUS ANIMATION ==========
      // Calculate target radius based on breath phase (0=exhaled/small, 1=inhaled/large)
      const targetRadius = radius + (expandedRadius - radius) * currentBreathPhase;

      // Smooth interpolation for organic feel (lerp with damping)
      const lerpSpeed = 4.0; // Higher = faster response
      currentRadiusRef.current +=
        (targetRadius - currentRadiusRef.current) * Math.min(1, delta * lerpSpeed);

      const animatedRadius = currentRadiusRef.current;

      // Apply scale to ring group (ring + progress arc + indicator)
      if (ringGroupRef.current) {
        const scale = animatedRadius / radius;
        ringGroupRef.current.scale.set(scale, scale, 1);
      }

      // Update progress arc geometry (throttle to every 2% change)
      const progressThreshold = 0.02;
      if (Math.abs(cycleProgress - prevProgressRef.current) > progressThreshold) {
        prevProgressRef.current = cycleProgress;

        // Dispose old geometry
        progressGeometryRef.current?.dispose();

        // Create new arc geometry (use base radius, scale handles size)
        // Start at top (-PI/2), progress clockwise
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + cycleProgress * Math.PI * 2;

        const innerRadius = radius - thickness / 2;
        const outerRadius = radius + thickness / 2;

        const newGeometry = createArcGeometry(innerRadius, outerRadius, startAngle, endAngle, 64);

        progressGeometryRef.current = newGeometry;
        progressMeshRef.current.geometry = newGeometry;
      }

      // Update indicator dot position along the arc (use base radius, scale handles size)
      if (indicatorRef.current) {
        const angle = -Math.PI / 2 + cycleProgress * Math.PI * 2;
        indicatorRef.current.position.x = Math.cos(angle) * radius;
        indicatorRef.current.position.y = Math.sin(angle) * radius;
      }

      // Subtle breathing pulse on the ring opacity
      const breathPulse = 0.5 + currentBreathPhase * 0.4;
      progressMaterial.opacity = breathPulse * 0.85;
      ringMaterial.opacity = 0.1 + currentBreathPhase * 0.1;
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
      {/* Ring group - scales with breathing (expands on inhale, contracts on exhale) */}
      <group ref={ringGroupRef}>
        {/* Background ring (full circle track) */}
        <Ring
          ref={ringRef}
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

        {/* Phase markers and labels - positioned around the ring */}
        {PHASE_LABELS.map((label) => {
          const isActive = currentPhaseIndex === label.phaseIndex;
          const labelRadius = radius + labelOffset;

          // Line marker dimensions
          const lineLength = isActive ? thickness * 8 : thickness * 5;
          const lineWidth = isActive ? thickness * 1.2 : thickness * 0.8;

          // Position line marker centered on the ring edge
          const markerX = Math.cos(label.angle) * radius;
          const markerY = Math.sin(label.angle) * radius;
          const labelX = Math.cos(label.angle) * labelRadius;
          const labelY = Math.sin(label.angle) * labelRadius;

          // Rotation to align line radially (perpendicular to ring)
          const rotation = label.angle + Math.PI / 2;

          return (
            <group key={`phase-${label.phaseIndex}-${label.name}`}>
              {/* Phase marker line (radial tick mark) */}
              <mesh
                position={[markerX, markerY, 0.01]}
                rotation={[0, 0, rotation]}
                renderOrder={renderOrder + 2}
              >
                <planeGeometry args={[lineWidth, lineLength]} />
                <meshBasicMaterial
                  color={isActive ? progressColor : '#a08c78'}
                  transparent
                  opacity={isActive ? 0.95 : 0.5}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                />
              </mesh>

              {/* Phase label as billboard (always faces camera) */}
              <Billboard position={[labelX, labelY, 0.02]} follow={true}>
                <Text
                  fontSize={isActive ? 0.18 : 0.12}
                  color={isActive ? progressColor : textColor}
                  anchorX="center"
                  anchorY="middle"
                  letterSpacing={0.08}
                  renderOrder={renderOrder + 4}
                  material-transparent={true}
                  material-depthWrite={false}
                  fontWeight={isActive ? 'bold' : 'normal'}
                >
                  {label.name}
                </Text>
              </Billboard>
            </group>
          );
        })}
      </group>

      {/* Center text stays fixed size (outside ring group) */}
      {/* Current phase text (large, centered) */}
      <Text
        position={[0, 0.1, 0.01]}
        fontSize={0.38}
        color={textColor}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.1}
        textAlign="center"
        renderOrder={renderOrder + 5}
        material-transparent={true}
        material-depthWrite={false}
      >
        {phaseName}
      </Text>

      {/* User count text (below phase name) */}
      {showUserCount && (
        <Text
          position={[0, -0.3, 0.01]}
          fontSize={0.11}
          color={textColor}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.06}
          renderOrder={renderOrder + 5}
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
