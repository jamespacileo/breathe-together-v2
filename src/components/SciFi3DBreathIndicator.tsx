import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../constants';
import { calculatePhaseInfo } from '../lib/breathPhase';
import { PHASE_NAMES } from '../styles/designTokens';

/**
 * SciFi3DBreathIndicator - Holographic orbital ring breathing timer
 *
 * Design inspiration: Destiny, Interstellar, Mass Effect HUDs
 * - Orbital ring encircling the globe (tilted toward camera)
 * - Ring expands on inhale (outside particle swarm), contracts on exhale
 * - Progress arc fills as breathing cycle advances
 * - Phase segment markers (4·7·8 boundaries)
 * - Floating timer and phase name below ring
 * - Subtle glow synchronized to breathing
 *
 * The ring wraps around the central globe, creating a holographic
 * HUD that users can follow while keeping focus on the center.
 */

// Phase boundaries as fractions of total cycle
const PHASE_BOUNDARIES = [
  0,
  BREATH_PHASES.INHALE / BREATH_TOTAL_CYCLE,
  (BREATH_PHASES.INHALE + BREATH_PHASES.HOLD_IN) / BREATH_TOTAL_CYCLE,
  1,
];

// Ring geometry constants (base values, will be scaled)
const BASE_RING_RADIUS = 1.0; // Normalized, scaled by breath
const RING_THICKNESS = 0.015;

// Breathing animation range
const RING_RADIUS_CONTRACTED = 2.2; // Close to globe during exhale
const RING_RADIUS_EXPANDED = 5.2; // Outside particle swarm during inhale

interface SciFi3DBreathIndicatorProps {
  /** Minimum ring radius (contracted, during exhale) @default 2.2 */
  radiusMin?: number;
  /** Maximum ring radius (expanded, during inhale) @default 5.2 */
  radiusMax?: number;
  /** Opacity (0-1) @default 0.85 */
  opacity?: number;
  /** Whether to show the phase name text @default true */
  showPhaseName?: boolean;
  /** Whether to show the countdown timer @default true */
  showTimer?: boolean;
  /** Whether to show segment markers @default true */
  showSegments?: boolean;
  /** Ring tilt angle in radians @default ~0.35π */
  ringTilt?: number;
}

/**
 * Creates a full ring (torus) geometry at unit radius
 */
function createRingGeometry(tubeRadius: number): THREE.TorusGeometry {
  return new THREE.TorusGeometry(BASE_RING_RADIUS, tubeRadius, 16, 100);
}

/**
 * Easing function for smooth organic motion
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * Calculate current ring radius based on breathing phase
 * Expands during inhale, contracts during exhale, holds during hold phases
 */
function calculateBreathingRadius(
  phaseIndex: number,
  phaseProgress: number,
  radiusMin: number,
  radiusMax: number,
): number {
  const range = radiusMax - radiusMin;

  switch (phaseIndex) {
    case 0: // Inhale - expand from min to max
      return radiusMin + easeInOutCubic(phaseProgress) * range;
    case 1: // Hold after inhale - stay at max
      return radiusMax;
    case 2: // Exhale - contract from max to min
      return radiusMax - easeInOutCubic(phaseProgress) * range;
    case 3: // Hold after exhale - stay at min
      return radiusMin;
    default:
      return radiusMin;
  }
}

/**
 * Updates glow ring opacity based on breathing phase
 */
function updateGlowOpacity(
  meshRef: React.RefObject<THREE.Mesh | null>,
  phaseIndex: number,
  phaseProgress: number,
  baseOpacity: number,
): void {
  if (!meshRef.current) return;

  const glowMaterial = meshRef.current.material as THREE.MeshBasicMaterial;
  let intensity = 0.08;

  if (phaseIndex === 0) {
    intensity = 0.08 + phaseProgress * 0.15; // Brighten during inhale
  } else if (phaseIndex === 1) {
    intensity = 0.23; // Peak during hold
  } else if (phaseIndex === 2) {
    intensity = 0.23 - phaseProgress * 0.15; // Dim during exhale
  }

  glowMaterial.opacity = intensity * baseOpacity;
}

export function SciFi3DBreathIndicator({
  radiusMin = RING_RADIUS_CONTRACTED,
  radiusMax = RING_RADIUS_EXPANDED,
  opacity = 0.85,
  showPhaseName = true,
  showTimer = true,
  showSegments = true,
  ringTilt = Math.PI * 0.35,
}: SciFi3DBreathIndicatorProps) {
  // Refs for direct manipulation
  const ringGroupRef = useRef<THREE.Group>(null);
  const progressArcRef = useRef<THREE.Mesh>(null);
  const glowRingRef = useRef<THREE.Mesh>(null);
  const textGroupRef = useRef<THREE.Group>(null);
  const phaseTextRef = useRef<THREE.Mesh>(null);
  const timerTextRef = useRef<THREE.Mesh>(null);
  const dotRef = useRef<THREE.Mesh>(null);
  const segmentRefs = useRef<(THREE.Mesh | null)[]>([]);

  // Cache for text updates and radius smoothing
  const prevPhaseRef = useRef(-1);
  const prevTimerRef = useRef(-1);
  const currentRadiusRef = useRef(radiusMin);

  // Create ring geometries at unit scale (will be scaled by breathing)
  const { backgroundRing, glowRing } = useMemo(() => {
    const backgroundRing = createRingGeometry(RING_THICKNESS);
    const glowRing = createRingGeometry(RING_THICKNESS * 4);
    return { backgroundRing, glowRing };
  }, []);

  // Progress arc geometry (will be regenerated each frame)
  const progressArcGeometry = useMemo(() => {
    return createRingGeometry(RING_THICKNESS * 1.5);
  }, []);

  // Segment marker angular positions
  const segmentAngles = useMemo(() => {
    return PHASE_BOUNDARIES.slice(0, 3).map((progress) => {
      return -Math.PI / 2 + progress * Math.PI * 2;
    });
  }, []);

  // Materials with warm gold palette
  const materials = useMemo(() => {
    const goldColor = new THREE.Color('#c9a06c');
    const dimColor = new THREE.Color('#8b7a6a');
    const glowColor = new THREE.Color('#d4a574');

    return {
      background: new THREE.MeshBasicMaterial({
        color: dimColor,
        transparent: true,
        opacity: 0.12 * opacity,
        side: THREE.DoubleSide,
      }),
      progress: new THREE.MeshBasicMaterial({
        color: goldColor,
        transparent: true,
        opacity: 0.9 * opacity,
        side: THREE.DoubleSide,
      }),
      glow: new THREE.MeshBasicMaterial({
        color: glowColor,
        transparent: true,
        opacity: 0.08 * opacity,
        side: THREE.DoubleSide,
      }),
      dot: new THREE.MeshBasicMaterial({
        color: goldColor,
        transparent: true,
        opacity: 0.95 * opacity,
      }),
      segment: new THREE.MeshBasicMaterial({
        color: dimColor,
        transparent: true,
        opacity: 0.5 * opacity,
      }),
    };
  }, [opacity]);

  // Cleanup materials
  useEffect(() => {
    return () => {
      for (const m of Object.values(materials)) {
        m.dispose();
      }
    };
  }, [materials]);

  // Cleanup geometries
  useEffect(() => {
    return () => {
      backgroundRing.dispose();
      glowRing.dispose();
      progressArcGeometry.dispose();
    };
  }, [backgroundRing, glowRing, progressArcGeometry]);

  // Animation loop
  useFrame(() => {
    const now = Date.now() / 1000;
    const cycleTime = now % BREATH_TOTAL_CYCLE;
    const { phaseIndex, phaseProgress, accumulatedTime, phaseDuration } =
      calculatePhaseInfo(cycleTime);

    // Calculate breathing radius with smooth interpolation
    const targetRadius = calculateBreathingRadius(phaseIndex, phaseProgress, radiusMin, radiusMax);
    // Smooth the radius changes slightly for organic feel
    currentRadiusRef.current += (targetRadius - currentRadiusRef.current) * 0.15;
    const currentRadius = currentRadiusRef.current;

    // Scale the ring group uniformly
    if (ringGroupRef.current) {
      ringGroupRef.current.scale.setScalar(currentRadius);
    }

    // Overall cycle progress (0-1)
    const cycleProgress = (accumulatedTime + phaseProgress * phaseDuration) / BREATH_TOTAL_CYCLE;

    // Update progress arc geometry
    if (progressArcRef.current && cycleProgress > 0.01) {
      const arcLength = Math.PI * 2 * cycleProgress;
      const numSegments = Math.max(8, Math.floor(64 * cycleProgress));

      const curve = new THREE.EllipseCurve(
        0,
        0,
        BASE_RING_RADIUS,
        BASE_RING_RADIUS,
        -Math.PI / 2,
        -Math.PI / 2 + arcLength,
        false,
        0,
      );
      const points = curve.getPoints(numSegments);

      if (points.length >= 2) {
        const path = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p.x, 0, p.y)));
        const newGeometry = new THREE.TubeGeometry(
          path,
          numSegments,
          RING_THICKNESS * 1.5,
          8,
          false,
        );
        progressArcRef.current.geometry.dispose();
        progressArcRef.current.geometry = newGeometry;
      }
    }

    // Update glow opacity
    updateGlowOpacity(glowRingRef, phaseIndex, phaseProgress, opacity);

    // Update progress dot position (on unit circle, scaled by group)
    if (dotRef.current) {
      const dotAngle = -Math.PI / 2 + cycleProgress * Math.PI * 2;
      dotRef.current.position.x = Math.cos(dotAngle) * BASE_RING_RADIUS;
      dotRef.current.position.z = Math.sin(dotAngle) * BASE_RING_RADIUS;

      // Pulse during phase transitions
      const isTransitioning = phaseProgress < 0.1 || phaseProgress > 0.9;
      const dotScale = isTransitioning ? 1.3 + Math.sin(now * 10) * 0.3 : 1;
      dotRef.current.scale.setScalar(dotScale);
    }

    // Update segment marker positions (on unit circle)
    segmentRefs.current.forEach((mesh, i) => {
      if (mesh) {
        const angle = segmentAngles[i];
        mesh.position.x = Math.cos(angle) * BASE_RING_RADIUS;
        mesh.position.z = Math.sin(angle) * BASE_RING_RADIUS;
      }
    });

    // Position text group below the ring (scales with breathing)
    if (textGroupRef.current) {
      const textY = -currentRadius * 0.85;
      const textZ = currentRadius * 0.25;
      textGroupRef.current.position.set(0, textY, textZ);
    }

    // Update phase name (only on change)
    if (phaseTextRef.current && phaseIndex !== prevPhaseRef.current) {
      prevPhaseRef.current = phaseIndex;
      // biome-ignore lint/suspicious/noExplicitAny: drei Text doesn't export instance type
      const textMesh = phaseTextRef.current as any;
      if (textMesh.text !== undefined) {
        textMesh.text = (PHASE_NAMES[phaseIndex] ?? 'Breathe').toUpperCase();
      }
    }

    // Update timer (only on second change)
    if (timerTextRef.current) {
      const remaining = Math.ceil((1 - phaseProgress) * phaseDuration);
      if (remaining !== prevTimerRef.current) {
        prevTimerRef.current = remaining;
        // biome-ignore lint/suspicious/noExplicitAny: drei Text doesn't export instance type
        const textMesh = timerTextRef.current as any;
        if (textMesh.text !== undefined) {
          textMesh.text = `${remaining}`;
        }
      }
    }
  });

  return (
    <group>
      {/* Ring container - tilted toward camera, scaled by breathing */}
      <group ref={ringGroupRef} rotation={[ringTilt, 0, 0]}>
        {/* Background ring (full circle, dimmed) */}
        <mesh geometry={backgroundRing} material={materials.background} />

        {/* Glow ring (breathing-synchronized) */}
        <mesh ref={glowRingRef} geometry={glowRing} material={materials.glow} />

        {/* Progress arc (fills as cycle progresses) */}
        <mesh ref={progressArcRef} geometry={progressArcGeometry} material={materials.progress} />

        {/* Progress indicator dot */}
        <mesh ref={dotRef} position={[0, 0, -BASE_RING_RADIUS]} material={materials.dot}>
          <sphereGeometry args={[0.025, 16, 16]} />
        </mesh>

        {/* Segment markers at phase boundaries */}
        {showSegments &&
          segmentAngles.map((angle, i) => (
            <mesh
              key={`segment-${PHASE_BOUNDARIES[i]}`}
              ref={(el) => {
                segmentRefs.current[i] = el;
              }}
              position={[Math.cos(angle) * BASE_RING_RADIUS, 0, Math.sin(angle) * BASE_RING_RADIUS]}
              material={materials.segment}
            >
              <sphereGeometry args={[0.012, 12, 12]} />
            </mesh>
          ))}
      </group>

      {/* Text elements - positioned below the ring, facing camera */}
      <group ref={textGroupRef} position={[0, -radiusMin * 0.85, radiusMin * 0.25]}>
        {/* Countdown timer (large) */}
        {showTimer && (
          <Text
            ref={timerTextRef}
            position={[0, 0.15, 0]}
            fontSize={0.35}
            color="#5a4d42"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.01}
            outlineColor="#ffffff"
            outlineOpacity={0.3}
          >
            4
          </Text>
        )}

        {/* Phase name */}
        {showPhaseName && (
          <Text
            ref={phaseTextRef}
            position={[0, -0.2, 0]}
            fontSize={0.14}
            color="#8b7a6a"
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.2}
          >
            INHALE
          </Text>
        )}

        {/* 4·7·8 label */}
        <Text
          position={[0, -0.45, 0]}
          fontSize={0.06}
          color="#a89888"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.1}
        >
          4 · 7 · 8
        </Text>
      </group>
    </group>
  );
}
