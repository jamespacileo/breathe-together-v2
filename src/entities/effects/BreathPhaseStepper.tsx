/**
 * BreathPhaseStepper - Minimal 4-dot stepper showing breathing phase progress
 *
 * Displays 4 small dots in a horizontal row near the globe:
 * - Dot 1: Inhale (index 0)
 * - Dot 2: Hold (index 1)
 * - Dot 3: Exhale (index 2)
 * - Dot 4: Rest (index 3, often 0 duration in 4-7-8)
 *
 * Current phase dot is larger/brighter, others are faded.
 * Rendered OUTSIDE RefractionPipeline to avoid blur.
 */

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../../constants';
import { calculatePhaseInfo } from '../../lib/breathPhase';

/** Phase names - used as stable keys for React elements */
const PHASE_NAMES = ['inhale', 'hold', 'exhale', 'rest'] as const;

/** Phase colors - subtle, elegant palette */
const PHASE_COLORS = [
  '#7ec8d4', // Inhale - teal
  '#d4a574', // Hold - gold
  '#d4847e', // Exhale - coral
  '#a8b4c4', // Rest - cool gray (if used)
];

/** Get number of active phases (skip phases with 0 duration) */
function getActivePhaseCount(): number {
  let count = 0;
  if (BREATH_PHASES.INHALE > 0) count++;
  if (BREATH_PHASES.HOLD_IN > 0) count++;
  if (BREATH_PHASES.EXHALE > 0) count++;
  if (BREATH_PHASES.HOLD_OUT > 0) count++;
  return count;
}

export interface BreathPhaseStepperProps {
  /** Enable/disable the stepper */
  enabled?: boolean;
  /** Vertical position (Y) */
  yPosition?: number;
  /** Horizontal spacing between dots */
  spacing?: number;
  /** Dot size when inactive */
  dotSize?: number;
  /** Scale multiplier for active dot */
  activeScale?: number;
  /** Opacity when inactive */
  inactiveOpacity?: number;
  /** Opacity when active */
  activeOpacity?: number;
}

/**
 * BreathPhaseStepper - Minimal phase indicator
 *
 * A row of dots showing which breathing phase is active.
 * Simple, unobtrusive, and positioned near the globe.
 */
export function BreathPhaseStepper({
  enabled = true,
  yPosition = -2.5,
  spacing = 0.4,
  dotSize = 0.08,
  activeScale = 2.0,
  inactiveOpacity = 0.25,
  activeOpacity = 0.9,
}: BreathPhaseStepperProps) {
  const groupRef = useRef<THREE.Group>(null);
  const dotRefs = useRef<(THREE.Mesh | null)[]>([]);
  const materialRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

  const phaseCount = getActivePhaseCount();

  useFrame(() => {
    if (!enabled || !groupRef.current) return;

    // Use UTC time for global synchronization
    const utcTime = Date.now() / 1000;
    const cycleTime = utcTime % BREATH_TOTAL_CYCLE;
    const { phaseIndex } = calculatePhaseInfo(cycleTime);

    // Update each dot
    for (let i = 0; i < phaseCount; i++) {
      const dot = dotRefs.current[i];
      const mat = materialRefs.current[i];
      if (!dot || !mat) continue;

      const isActive = phaseIndex === i;

      // Smooth size transition
      const targetScale = isActive ? dotSize * activeScale : dotSize;
      const currentScale = dot.scale.x;
      dot.scale.setScalar(THREE.MathUtils.lerp(currentScale, targetScale, 0.15));

      // Smooth opacity transition
      const targetOpacity = isActive ? activeOpacity : inactiveOpacity;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.15);
    }
  });

  if (!enabled) return null;

  // Calculate total width and starting X position to center dots
  const totalWidth = (phaseCount - 1) * spacing;
  const startX = -totalWidth / 2;

  return (
    <group
      ref={groupRef}
      position={[0, yPosition, 0]}
      // Render on top, outside of DOF
      renderOrder={1000}
    >
      {PHASE_NAMES.slice(0, phaseCount).map((phaseName, i) => (
        <mesh
          key={phaseName}
          ref={(el) => {
            dotRefs.current[i] = el;
          }}
          position={[startX + i * spacing, 0, 0]}
          scale={dotSize}
          renderOrder={1000}
        >
          <sphereGeometry args={[1, 12, 12]} />
          <meshBasicMaterial
            ref={(el) => {
              materialRefs.current[i] = el;
            }}
            color={PHASE_COLORS[i]}
            transparent
            opacity={inactiveOpacity}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

export default BreathPhaseStepper;
