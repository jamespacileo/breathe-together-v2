import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../../constants';
import { calculatePhaseInfo } from '../../lib/breathPhase';

/**
 * Phase colors for the orbital progress ring
 * Follows the meditation color palette: teal (inhale), gold (hold), coral (exhale)
 */
const PHASE_COLORS = {
  inhale: new THREE.Color('#7ec8d4'), // Teal - fresh, opening
  holdIn: new THREE.Color('#d4a574'), // Warm gold - held fullness
  exhale: new THREE.Color('#d4847e'), // Soft coral - releasing
  holdOut: new THREE.Color('#a8b4c4'), // Cool gray - empty stillness
};

export interface OrbitalProgressRingProps {
  /** Enable/disable the ring */
  enabled?: boolean;
  /** Orbit radius (should match particle orbit) */
  radius?: number;
  /** Ring thickness */
  thickness?: number;
  /** Base opacity */
  opacity?: number;
  /** Number of segments for smooth curve */
  segments?: number;
  /** Vertical offset from globe center */
  yOffset?: number;
  /** Enable holographic shimmer effect */
  shimmer?: boolean;
}

/**
 * OrbitalProgressRing - A thin glowing ring that shows breathing cycle progress.
 *
 * The ring fills clockwise as you progress through each phase, with color
 * shifting to indicate the current phase (inhale/hold/exhale).
 *
 * Positioned at the particle orbit distance, it naturally integrates with
 * the swarm while providing clear visual feedback on breathing progress.
 */
export function OrbitalProgressRing({
  enabled = true,
  radius = 3.5,
  thickness = 0.03,
  opacity = 0.6,
  segments = 128,
  yOffset = 0,
  shimmer = true,
}: OrbitalProgressRingProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  // Create ring geometry that we'll update each frame
  const geometry = useMemo(() => {
    // Start with full ring, we'll adjust thetaLength dynamically
    return new THREE.RingGeometry(radius - thickness, radius, segments, 1, 0, Math.PI * 2);
  }, [radius, thickness, segments]);

  // Track previous geometry for disposal
  const prevGeometryRef = useRef<THREE.RingGeometry | null>(null);

  useFrame(({ clock }) => {
    if (!enabled || !ringRef.current || !materialRef.current) return;

    const time = clock.getElapsedTime();

    // Use UTC time for global synchronization
    const utcTime = Date.now() / 1000;
    const cycleTime = utcTime % BREATH_TOTAL_CYCLE;
    const { phaseIndex, phaseProgress } = calculatePhaseInfo(cycleTime);

    // Calculate total progress through the cycle (0-1)
    let accumulatedTime = 0;
    const phaseDurations = [
      BREATH_PHASES.INHALE,
      BREATH_PHASES.HOLD_IN,
      BREATH_PHASES.EXHALE,
      BREATH_PHASES.HOLD_OUT,
    ];

    for (let i = 0; i < phaseIndex; i++) {
      accumulatedTime += phaseDurations[i] ?? 0;
    }
    const currentPhaseDuration = phaseDurations[phaseIndex] ?? 1;
    const totalProgress =
      (accumulatedTime + phaseProgress * currentPhaseDuration) / BREATH_TOTAL_CYCLE;

    // Update ring arc length based on total progress
    const thetaLength = totalProgress * Math.PI * 2;

    // Create new geometry with updated thetaLength
    // Dispose old geometry to prevent memory leak
    if (prevGeometryRef.current) {
      prevGeometryRef.current.dispose();
    }
    const newGeometry = new THREE.RingGeometry(
      radius - thickness,
      radius,
      segments,
      1,
      -Math.PI / 2, // Start from top
      thetaLength,
    );
    ringRef.current.geometry = newGeometry;
    prevGeometryRef.current = newGeometry;

    // Set color based on current phase
    let targetColor: THREE.Color;
    switch (phaseIndex) {
      case 0:
        targetColor = PHASE_COLORS.inhale;
        break;
      case 1:
        targetColor = PHASE_COLORS.holdIn;
        break;
      case 2:
        targetColor = PHASE_COLORS.exhale;
        break;
      case 3:
        targetColor = PHASE_COLORS.holdOut;
        break;
      default:
        targetColor = PHASE_COLORS.inhale;
    }

    // Smooth color transition
    materialRef.current.color.lerp(targetColor, 0.1);

    // Add shimmer effect
    if (shimmer) {
      const shimmerAmount = Math.sin(time * 3) * 0.1 + 0.9;
      materialRef.current.opacity = opacity * shimmerAmount;
    }
  });

  // Cleanup on unmount
  useMemo(() => {
    return () => {
      geometry.dispose();
      if (prevGeometryRef.current) {
        prevGeometryRef.current.dispose();
      }
    };
  }, [geometry]);

  if (!enabled) return null;

  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} position={[0, yOffset, 0]}>
      <primitive object={geometry} attach="geometry" />
      <meshBasicMaterial
        ref={materialRef}
        color={PHASE_COLORS.inhale}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
