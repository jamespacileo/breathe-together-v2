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
import { createPortal, useFrame, useThree } from '@react-three/fiber';
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
// Position each phase marker at its start position around the ring
const PHASE_LABELS = PHASE_DURATIONS.map((duration, index) => {
  const startTime = PHASE_START_TIMES[index] ?? 0;
  // Convert time position to angle (clockwise from top)
  // Top = -PI/2, progressing clockwise
  const progressPosition = startTime / BREATH_TOTAL_CYCLE;
  const angle = -Math.PI / 2 + progressPosition * Math.PI * 2;

  return {
    name: PHASE_NAMES[index] ?? 'Phase',
    angle,
    phaseIndex: index,
    duration,
  };
}).filter((phase) => phase.duration > 0); // Only include active phases

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
  showUserCount = true,
  userCount = 77,
  zOffset = 0.1,
  renderOrder = 10,
}: ProgressCircleOverlayProps) {
  const { gl, camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const ringGroupRef = useRef<THREE.Group>(null);
  const progressMeshRef = useRef<THREE.Mesh>(null);
  const indicatorRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const world = useWorld();

  // Create a separate scene for the overlay to render AFTER the DoF pipeline
  const overlayScene = useMemo(() => new THREE.Scene(), []);

  // Phase state (updates on phase transitions only - 4 times per 16s cycle)
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState<number>(0);

  // Current animated radius (smoothly interpolates between radius and expandedRadius)
  const currentRadiusRef = useRef<number>(radius);

  // Label offset distance from ring (slightly outside)
  const labelOffset = 0.5;

  // Muted color for inactive elements (matches ring track)
  const mutedColor = '#a08c78';

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

      // Update phase state only on phase transition
      if (currentPhaseType !== prevPhaseRef.current) {
        prevPhaseRef.current = currentPhaseType;
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

  // Render overlay scene after DoF pipeline completes (priority 2, pipeline is priority 1)
  useFrame(() => {
    if (!groupRef.current) return;
    // Render overlay directly to screen without clearing (autoClear disabled for this render)
    const autoClear = gl.autoClear;
    gl.autoClear = false;
    gl.clearDepth(); // Clear only depth to render overlay on top
    gl.render(overlayScene, camera);
    gl.autoClear = autoClear;
  }, 2);

  // Use createPortal to render overlay in separate scene (bypasses DoF pipeline)
  return createPortal(
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

          // Line marker dimensions - thick measurement-style ticks extending outward
          const lineLength = isActive ? thickness * 6 : thickness * 4;
          const lineWidth = isActive ? thickness * 1.5 : thickness * 1.0;

          // Position marker at outer edge of ring, extending outward
          const ringOuterEdge = radius + thickness / 2;
          const markerCenterRadius = ringOuterEdge + lineLength / 2;
          const markerX = Math.cos(label.angle) * markerCenterRadius;
          const markerY = Math.sin(label.angle) * markerCenterRadius;

          // Label positioned further out from the marker
          const labelRadius = ringOuterEdge + lineLength + labelOffset;
          const labelX = Math.cos(label.angle) * labelRadius;
          const labelY = Math.sin(label.angle) * labelRadius;

          // Rotation to align line radially (perpendicular to ring)
          const rotation = label.angle;

          return (
            <group key={`phase-${label.phaseIndex}-${label.name}`}>
              {/* Phase marker line (measurement-style tick extending outward) */}
              <mesh
                position={[markerX, markerY, 0.01]}
                rotation={[0, 0, rotation]}
                renderOrder={renderOrder + 2}
              >
                <planeGeometry args={[lineLength, lineWidth]} />
                <meshBasicMaterial
                  color={isActive ? progressColor : mutedColor}
                  transparent
                  opacity={isActive ? 0.9 : 0.4}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                />
              </mesh>

              {/* Phase label as billboard (always faces camera) */}
              <Billboard position={[labelX, labelY, 0.02]} follow={true}>
                <Text
                  fontSize={isActive ? 0.16 : 0.11}
                  color={isActive ? progressColor : mutedColor}
                  anchorX="center"
                  anchorY="middle"
                  letterSpacing={0.06}
                  renderOrder={renderOrder + 4}
                  material-transparent={true}
                  material-depthWrite={false}
                >
                  {label.name}
                </Text>
              </Billboard>
            </group>
          );
        })}
      </group>

      {/* Center text stays fixed size (outside ring group) */}
      {/* User count (centered) */}
      {showUserCount && (
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.13}
          color={mutedColor}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.04}
          renderOrder={renderOrder + 5}
          material-transparent={true}
          material-depthWrite={false}
        >
          {userCount} breathing
        </Text>
      )}
    </group>,
    overlayScene,
  );
}

export default ProgressCircleOverlay;
