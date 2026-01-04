/**
 * HolographicUI - 3D holographic breathing UI elements
 *
 * Replaces HTML-based breathing UI with integrated 3D elements
 * positioned around the globe for an immersive experience.
 *
 * Components:
 * - BreathingProgressRing: Circular progress torus around equator
 * - PhaseArcLabels: Curved INHALE/HOLD/EXHALE labels above globe
 * - TimerRibbon: Countdown seconds below globe
 * - PhaseMarkers: 4·7·8 orbital octahedra showing rhythm
 * - PresenceConstellation: User count as star points
 *
 * Usage:
 * ```tsx
 * <HolographicBreathingUI
 *   globeRadius={1.5}
 *   presenceCount={42}
 *   showTimer={true}
 * />
 * ```
 */

export { BreathingProgressRing } from './BreathingProgressRing';
export { PhaseArcLabels } from './PhaseArcLabels';
export { PhaseMarkers } from './PhaseMarkers';
export { PresenceConstellation } from './PresenceConstellation';
export { TimerRibbon } from './TimerRibbon';

interface HolographicBreathingUIProps {
  /** Globe radius for positioning all elements @default 1.5 */
  globeRadius?: number;
  /** Number of users breathing together @default 0 */
  presenceCount?: number;
  /** Show progress ring @default true */
  showProgressRing?: boolean;
  /** Show phase labels @default true */
  showPhaseLabels?: boolean;
  /** Show countdown timer @default true */
  showTimer?: boolean;
  /** Show 4·7·8 markers @default true */
  showPhaseMarkers?: boolean;
  /** Show presence constellation @default true */
  showPresence?: boolean;
  /** Override phase index for testing (0-2) */
  testPhaseIndex?: number;
  /** Override phase progress for testing (0-1) */
  testPhaseProgress?: number;
  /** Override breath phase for testing (0-1) */
  testBreathPhase?: number;
  /** Override timer seconds for testing */
  testSeconds?: number;
  /** Use test values instead of live UTC */
  useTestValues?: boolean;
}

import { BreathingProgressRing } from './BreathingProgressRing';
import { PhaseArcLabels } from './PhaseArcLabels';
import { PhaseMarkers } from './PhaseMarkers';
import { PresenceConstellation } from './PresenceConstellation';
import { TimerRibbon } from './TimerRibbon';

/**
 * Complete holographic breathing UI system
 *
 * Combines all holographic elements into a unified component.
 * Position this as a sibling to the globe in your scene.
 */
export function HolographicBreathingUI({
  globeRadius = 1.5,
  presenceCount = 0,
  showProgressRing = true,
  showPhaseLabels = true,
  showTimer = true,
  showPhaseMarkers = true,
  showPresence = true,
  testPhaseIndex,
  testPhaseProgress,
  testBreathPhase,
  testSeconds,
  useTestValues = false,
}: HolographicBreathingUIProps) {
  // Debug log to verify component mounting
  console.log('[HolographicBreathingUI] Mounted with globeRadius:', globeRadius);

  return (
    <group name="holographic-breathing-ui">
      {/* Debug sphere to verify rendering */}
      <mesh position={[0, globeRadius + 1, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color="red" />
      </mesh>

      {/* Progress ring around equator */}
      {showProgressRing && (
        <BreathingProgressRing
          globeRadius={globeRadius}
          testProgress={testPhaseProgress}
          testPhaseType={testPhaseIndex}
          useTestValues={useTestValues}
        />
      )}

      {/* Phase labels above globe */}
      {showPhaseLabels && (
        <PhaseArcLabels
          globeRadius={globeRadius}
          height={globeRadius + 0.4}
          testPhaseIndex={testPhaseIndex}
          testPhaseProgress={testPhaseProgress}
          useTestValues={useTestValues}
        />
      )}

      {/* Countdown timer below globe */}
      {showTimer && (
        <TimerRibbon
          globeRadius={globeRadius}
          height={-(globeRadius + 0.2)}
          testSeconds={testSeconds}
          testPhaseIndex={testPhaseIndex}
          useTestValues={useTestValues}
        />
      )}

      {/* 4·7·8 markers */}
      {showPhaseMarkers && (
        <PhaseMarkers
          globeRadius={globeRadius}
          height={globeRadius * 0.5}
          testPhaseIndex={testPhaseIndex}
          testPhaseProgress={testPhaseProgress}
          useTestValues={useTestValues}
        />
      )}

      {/* Presence constellation */}
      {showPresence && presenceCount > 0 && (
        <PresenceConstellation
          count={presenceCount}
          globeRadius={globeRadius}
          testBreathPhase={testBreathPhase}
          useTestValues={useTestValues}
        />
      )}
    </group>
  );
}
