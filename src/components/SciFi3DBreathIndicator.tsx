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

// Ring geometry constants
const RING_RADIUS = 2.2; // Larger than globe (1.5) to orbit around it
const RING_THICKNESS = 0.015;

interface SciFi3DBreathIndicatorProps {
  /** Ring radius (should be larger than globe) @default 2.2 */
  ringRadius?: number;
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
 * Creates a full ring (torus) geometry
 */
function createRingGeometry(radius: number, tubeRadius: number): THREE.TorusGeometry {
  return new THREE.TorusGeometry(radius, tubeRadius, 16, 100);
}

/**
 * Creates an arc segment of a ring
 */
function createArcGeometry(
  radius: number,
  tubeRadius: number,
  startAngle: number,
  arcLength: number,
): THREE.TubeGeometry {
  const curve = new THREE.EllipseCurve(
    0,
    0,
    radius,
    radius,
    startAngle,
    startAngle + arcLength,
    false,
    0,
  );
  const points = curve.getPoints(Math.max(16, Math.floor(100 * (arcLength / (Math.PI * 2)))));
  const path = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p.x, 0, p.y)));
  return new THREE.TubeGeometry(
    path,
    Math.max(8, Math.floor(64 * (arcLength / (Math.PI * 2)))),
    tubeRadius,
    8,
    false,
  );
}

/**
 * Updates the progress arc geometry based on cycle progress
 */
function updateProgressArc(
  meshRef: React.RefObject<THREE.Mesh | null>,
  cycleProgress: number,
): void {
  if (!meshRef.current || cycleProgress < 0.01) return;

  const arcLength = Math.PI * 2 * cycleProgress;
  const numSegments = Math.max(8, Math.floor(64 * cycleProgress));

  const curve = new THREE.EllipseCurve(
    0,
    0,
    RING_RADIUS,
    RING_RADIUS,
    -Math.PI / 2, // Start at top
    -Math.PI / 2 + arcLength,
    false,
    0,
  );
  const points = curve.getPoints(numSegments);

  if (points.length < 2) return;

  const path = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p.x, 0, p.y)));
  const newGeometry = new THREE.TubeGeometry(path, numSegments, RING_THICKNESS * 1.5, 8, false);

  meshRef.current.geometry.dispose();
  meshRef.current.geometry = newGeometry;
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
    intensity = 0.08 + phaseProgress * 0.12; // Brighten during inhale
  } else if (phaseIndex === 1) {
    intensity = 0.2; // Peak during hold
  } else if (phaseIndex === 2) {
    intensity = 0.2 - phaseProgress * 0.12; // Dim during exhale
  }

  glowMaterial.opacity = intensity * baseOpacity;
}

/**
 * Updates progress dot position along the ring
 */
function updateProgressDot(
  meshRef: React.RefObject<THREE.Mesh | null>,
  cycleProgress: number,
  phaseProgress: number,
  time: number,
): void {
  if (!meshRef.current) return;

  // Position dot along the ring (starts at top, goes clockwise)
  const angle = -Math.PI / 2 + cycleProgress * Math.PI * 2;
  meshRef.current.position.x = Math.cos(angle) * RING_RADIUS;
  meshRef.current.position.z = Math.sin(angle) * RING_RADIUS;

  // Pulse during phase transitions
  const isTransitioning = phaseProgress < 0.1 || phaseProgress > 0.9;
  const scale = isTransitioning ? 1.3 + Math.sin(time * 10) * 0.3 : 1;
  meshRef.current.scale.setScalar(scale);
}

export function SciFi3DBreathIndicator({
  ringRadius = 2.2,
  opacity = 0.85,
  showPhaseName = true,
  showTimer = true,
  showSegments = true,
  ringTilt = Math.PI * 0.35,
}: SciFi3DBreathIndicatorProps) {
  // Refs for direct manipulation
  const groupRef = useRef<THREE.Group>(null);
  const progressArcRef = useRef<THREE.Mesh>(null);
  const glowRingRef = useRef<THREE.Mesh>(null);
  const phaseTextRef = useRef<THREE.Mesh>(null);
  const timerTextRef = useRef<THREE.Mesh>(null);
  const dotRef = useRef<THREE.Mesh>(null);

  // Cache for text updates
  const prevPhaseRef = useRef(-1);
  const prevTimerRef = useRef(-1);

  // Update constants based on props
  const actualRadius = ringRadius;

  // Create ring geometries
  const { backgroundRing, progressArc, glowRing } = useMemo(() => {
    const backgroundRing = createRingGeometry(actualRadius, RING_THICKNESS);
    const progressArc = createArcGeometry(actualRadius, RING_THICKNESS * 1.5, -Math.PI / 2, 0.01);
    const glowRing = createRingGeometry(actualRadius, RING_THICKNESS * 4);

    return { backgroundRing, progressArc, glowRing };
  }, [actualRadius]);

  // Segment marker positions (on the ring)
  const segmentMarkers = useMemo(() => {
    return PHASE_BOUNDARIES.slice(0, 3).map((progress) => {
      const angle = -Math.PI / 2 + progress * Math.PI * 2;
      return {
        x: Math.cos(angle) * actualRadius,
        z: Math.sin(angle) * actualRadius,
        progress,
      };
    });
  }, [actualRadius]);

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
      progressArc.dispose();
      glowRing.dispose();
    };
  }, [backgroundRing, progressArc, glowRing]);

  // Animation loop
  useFrame(() => {
    const now = Date.now() / 1000;
    const cycleTime = now % BREATH_TOTAL_CYCLE;
    const { phaseIndex, phaseProgress, accumulatedTime, phaseDuration } =
      calculatePhaseInfo(cycleTime);

    // Overall cycle progress (0-1)
    const cycleProgress = (accumulatedTime + phaseProgress * phaseDuration) / BREATH_TOTAL_CYCLE;

    // Update visuals
    updateProgressArc(progressArcRef, cycleProgress);
    updateGlowOpacity(glowRingRef, phaseIndex, phaseProgress, opacity);
    updateProgressDot(dotRef, cycleProgress, phaseProgress, now);

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
    <group ref={groupRef}>
      {/* Ring container - tilted toward camera */}
      <group rotation={[ringTilt, 0, 0]}>
        {/* Background ring (full circle, dimmed) */}
        <mesh geometry={backgroundRing} material={materials.background} />

        {/* Glow ring (breathing-synchronized) */}
        <mesh ref={glowRingRef} geometry={glowRing} material={materials.glow} />

        {/* Progress arc (fills as cycle progresses) */}
        <mesh ref={progressArcRef} geometry={progressArc} material={materials.progress} />

        {/* Progress indicator dot */}
        <mesh ref={dotRef} position={[0, 0, -actualRadius]} material={materials.dot}>
          <sphereGeometry args={[0.06, 16, 16]} />
        </mesh>

        {/* Segment markers at phase boundaries */}
        {showSegments &&
          segmentMarkers.map((marker) => (
            <mesh
              key={`segment-${marker.progress}`}
              position={[marker.x, 0, marker.z]}
              material={materials.segment}
            >
              <sphereGeometry args={[0.03, 12, 12]} />
            </mesh>
          ))}
      </group>

      {/* Text elements - positioned below the ring, facing camera */}
      <group position={[0, -actualRadius * 0.9, actualRadius * 0.3]}>
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
