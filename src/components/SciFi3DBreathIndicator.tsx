import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../constants';
import { calculatePhaseInfo } from '../lib/breathPhase';
import { PHASE_NAMES } from '../styles/designTokens';

/**
 * SciFi3DBreathIndicator - Minimal sci-fi inspired breathing timer
 *
 * Design inspiration: Destiny, Interstellar, Mass Effect HUDs
 * - Thin arc ring showing cycle progress
 * - Phase segment markers (4·7·8)
 * - Floating timer countdown
 * - Subtle glow synchronized to breathing
 *
 * Renders in 3D space for seamless integration with the meditation scene.
 * Uses RAF updates for 60fps smoothness without React re-renders.
 */

// Phase durations for segment calculations
const PHASE_STARTS = [
  0,
  BREATH_PHASES.INHALE / BREATH_TOTAL_CYCLE,
  (BREATH_PHASES.INHALE + BREATH_PHASES.HOLD_IN) / BREATH_TOTAL_CYCLE,
  1, // End marker
];

// Arc geometry constants
const ARC_RADIUS = 0.8;
const ARC_THICKNESS = 0.012;
const ARC_ANGLE = Math.PI * 1.5; // 270 degrees
const ARC_START_ANGLE = Math.PI * 0.75; // Start from bottom-left

interface SciFi3DBreathIndicatorProps {
  /** Y position in 3D space */
  yPosition?: number;
  /** Scale of the entire indicator */
  scale?: number;
  /** Opacity (0-1) */
  opacity?: number;
  /** Whether to show the phase name text */
  showPhaseName?: boolean;
  /** Whether to show the countdown timer */
  showTimer?: boolean;
  /** Whether to show segment markers */
  showSegments?: boolean;
}

/**
 * Creates a tube geometry along an arc path
 */
function createArcTube(
  radius: number,
  startAngle: number,
  endAngle: number,
  thickness: number,
): THREE.TubeGeometry {
  const curve = new THREE.EllipseCurve(0, 0, radius, radius, startAngle, endAngle, false, 0);
  const points = curve.getPoints(64);
  const path = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p.x, p.y, 0)));
  return new THREE.TubeGeometry(path, 64, thickness, 8, false);
}

/**
 * Updates the progress arc geometry based on cycle progress
 */
function updateProgressArc(
  meshRef: React.RefObject<THREE.Mesh | null>,
  cycleProgress: number,
): void {
  if (!meshRef.current) return;

  const progressAngle = ARC_ANGLE * cycleProgress;
  if (progressAngle < 0.01) return;

  const numPoints = Math.max(8, Math.floor(64 * cycleProgress));
  const progressCurve = new THREE.EllipseCurve(
    0,
    0,
    ARC_RADIUS,
    ARC_RADIUS,
    ARC_START_ANGLE,
    ARC_START_ANGLE + progressAngle,
    false,
    0,
  );
  const progressPoints = progressCurve.getPoints(numPoints);

  if (progressPoints.length < 2) return;

  const progressPath = new THREE.CatmullRomCurve3(
    progressPoints.map((p) => new THREE.Vector3(p.x, p.y, 0)),
  );
  const newGeometry = new THREE.TubeGeometry(
    progressPath,
    numPoints,
    ARC_THICKNESS * 1.2,
    8,
    false,
  );

  meshRef.current.geometry.dispose();
  meshRef.current.geometry = newGeometry;
}

/**
 * Updates glow intensity based on breathing phase
 */
function updateGlowIntensity(
  meshRef: React.RefObject<THREE.Mesh | null>,
  phaseIndex: number,
  phaseProgress: number,
  baseOpacity: number,
): void {
  if (!meshRef.current) return;

  const glowMaterial = meshRef.current.material as THREE.MeshBasicMaterial;
  let glowIntensity = 0.1;

  if (phaseIndex === 0) {
    glowIntensity = 0.1 + phaseProgress * 0.15; // Grow during inhale
  } else if (phaseIndex === 1) {
    glowIntensity = 0.25; // Peak during hold
  } else if (phaseIndex === 2) {
    glowIntensity = 0.25 - phaseProgress * 0.15; // Fade during exhale
  }

  glowMaterial.opacity = glowIntensity * baseOpacity;
}

/**
 * Updates the progress indicator dot position and scale
 */
function updateProgressDot(
  meshRef: React.RefObject<THREE.Mesh | null>,
  cycleProgress: number,
  phaseProgress: number,
  time: number,
): void {
  if (!meshRef.current) return;

  const dotAngle = ARC_START_ANGLE + cycleProgress * ARC_ANGLE;
  meshRef.current.position.x = Math.cos(dotAngle) * ARC_RADIUS;
  meshRef.current.position.y = Math.sin(dotAngle) * ARC_RADIUS;

  // Pulse during phase transitions
  const isTransitioning = phaseProgress < 0.15 || phaseProgress > 0.85;
  const dotScale = isTransitioning ? 1.2 + Math.sin(time * 8) * 0.2 : 1;
  meshRef.current.scale.setScalar(dotScale);
}

export function SciFi3DBreathIndicator({
  yPosition = -4.5,
  scale = 1,
  opacity = 0.85,
  showPhaseName = true,
  showTimer = true,
  showSegments = true,
}: SciFi3DBreathIndicatorProps) {
  // Refs for direct manipulation
  const groupRef = useRef<THREE.Group>(null);
  const progressArcRef = useRef<THREE.Mesh>(null);
  const glowRingRef = useRef<THREE.Mesh>(null);
  const phaseTextRef = useRef<THREE.Mesh>(null);
  const timerTextRef = useRef<THREE.Mesh>(null);
  const dotRef = useRef<THREE.Mesh>(null);

  // Cache for text updates (avoid string allocation every frame)
  const prevPhaseRef = useRef(-1);
  const prevTimerRef = useRef(-1);

  // Create arc geometries
  const { backgroundArc, progressArc, glowRing } = useMemo(() => {
    const backgroundArc = createArcTube(
      ARC_RADIUS,
      ARC_START_ANGLE,
      ARC_START_ANGLE + ARC_ANGLE,
      ARC_THICKNESS,
    );
    const progressArc = createArcTube(
      ARC_RADIUS,
      ARC_START_ANGLE,
      ARC_START_ANGLE + ARC_ANGLE,
      ARC_THICKNESS * 1.2,
    );
    const glowRing = createArcTube(
      ARC_RADIUS + 0.02,
      ARC_START_ANGLE,
      ARC_START_ANGLE + ARC_ANGLE,
      ARC_THICKNESS * 3,
    );

    return { backgroundArc, progressArc, glowRing };
  }, []);

  // Segment marker positions
  const segmentMarkers = useMemo(() => {
    return PHASE_STARTS.slice(0, 3).map((progress) => {
      const angle = ARC_START_ANGLE + progress * ARC_ANGLE;
      return {
        x: Math.cos(angle) * ARC_RADIUS,
        y: Math.sin(angle) * ARC_RADIUS,
        progress,
      };
    });
  }, []);

  // Materials
  const materials = useMemo(() => {
    const baseColor = new THREE.Color('#c9a06c'); // Gold accent
    const dimColor = new THREE.Color('#8b7a6a'); // Muted warm
    const glowColor = new THREE.Color('#d4a574'); // Light gold

    return {
      background: new THREE.MeshBasicMaterial({
        color: dimColor,
        transparent: true,
        opacity: 0.15 * opacity,
        side: THREE.DoubleSide,
      }),
      progress: new THREE.MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0.9 * opacity,
        side: THREE.DoubleSide,
      }),
      glow: new THREE.MeshBasicMaterial({
        color: glowColor,
        transparent: true,
        opacity: 0.1 * opacity,
        side: THREE.DoubleSide,
      }),
      dot: new THREE.MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0.8 * opacity,
      }),
      segment: new THREE.MeshBasicMaterial({
        color: dimColor,
        transparent: true,
        opacity: 0.4 * opacity,
      }),
    };
  }, [opacity]);

  // Cleanup materials on unmount
  useEffect(() => {
    return () => {
      materials.background.dispose();
      materials.progress.dispose();
      materials.glow.dispose();
      materials.dot.dispose();
      materials.segment.dispose();
    };
  }, [materials]);

  // Cleanup geometries on unmount
  useEffect(() => {
    return () => {
      backgroundArc.dispose();
      progressArc.dispose();
      glowRing.dispose();
    };
  }, [backgroundArc, progressArc, glowRing]);

  // Animation loop
  useFrame(() => {
    const now = Date.now() / 1000;
    const cycleTime = now % BREATH_TOTAL_CYCLE;
    const { phaseIndex, phaseProgress, accumulatedTime, phaseDuration } =
      calculatePhaseInfo(cycleTime);

    // Overall cycle progress (0-1)
    const cycleProgress = (accumulatedTime + phaseProgress * phaseDuration) / BREATH_TOTAL_CYCLE;

    // Update visual elements
    updateProgressArc(progressArcRef, cycleProgress);
    updateGlowIntensity(glowRingRef, phaseIndex, phaseProgress, opacity);
    updateProgressDot(dotRef, cycleProgress, phaseProgress, now);

    // Update phase name text (only on phase change)
    if (phaseTextRef.current && phaseIndex !== prevPhaseRef.current) {
      prevPhaseRef.current = phaseIndex;
      // biome-ignore lint/suspicious/noExplicitAny: drei Text component doesn't export proper instance type
      const textMesh = phaseTextRef.current as any;
      if (textMesh.text !== undefined) {
        textMesh.text = (PHASE_NAMES[phaseIndex] ?? 'Breathe').toUpperCase();
      }
    }

    // Update timer countdown (only when second changes)
    if (timerTextRef.current) {
      const remaining = Math.ceil((1 - phaseProgress) * phaseDuration);
      if (remaining !== prevTimerRef.current) {
        prevTimerRef.current = remaining;
        // biome-ignore lint/suspicious/noExplicitAny: drei Text component doesn't export proper instance type
        const textMesh = timerTextRef.current as any;
        if (textMesh.text !== undefined) {
          textMesh.text = `${remaining}`;
        }
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, yPosition, 0]} scale={scale}>
      {/* Background arc (full circle segment, dimmed) */}
      <mesh geometry={backgroundArc} material={materials.background} />

      {/* Glow ring (breathing-synchronized) */}
      <mesh ref={glowRingRef} geometry={glowRing} material={materials.glow} />

      {/* Progress arc (fills as cycle progresses) */}
      <mesh ref={progressArcRef} geometry={progressArc} material={materials.progress} />

      {/* Progress indicator dot */}
      <mesh ref={dotRef} position={[ARC_RADIUS, 0, 0.01]} material={materials.dot}>
        <sphereGeometry args={[0.025, 16, 16]} />
      </mesh>

      {/* Segment markers (4·7·8 boundaries) */}
      {showSegments &&
        segmentMarkers.map((marker) => (
          <mesh
            key={`segment-${marker.progress}`}
            position={[marker.x, marker.y, 0.005]}
            material={materials.segment}
          >
            <circleGeometry args={[0.015, 16]} />
          </mesh>
        ))}

      {/* Phase name text */}
      {showPhaseName && (
        <Text
          ref={phaseTextRef}
          position={[0, -0.15, 0.01]}
          fontSize={0.12}
          color="#5a4d42"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.15}
        >
          INHALE
        </Text>
      )}

      {/* Countdown timer */}
      {showTimer && (
        <Text
          ref={timerTextRef}
          position={[0, 0.05, 0.01]}
          fontSize={0.22}
          color="#8b7a6a"
          anchorX="center"
          anchorY="middle"
        >
          4
        </Text>
      )}

      {/* 4·7·8 label */}
      <Text
        position={[0, -0.35, 0.01]}
        fontSize={0.045}
        color="#a89888"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.08}
      >
        4 · 7 · 8
      </Text>
    </group>
  );
}
