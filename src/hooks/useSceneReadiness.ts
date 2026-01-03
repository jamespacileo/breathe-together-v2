import { useMemo } from 'react';
import type { IntroPhase } from '../components/cinematic';

/**
 * Scene readiness states - single source of truth for visibility
 */
export type SceneReadiness = 'intro' | 'transitioning' | 'ready';

/**
 * Scene readiness state object
 */
export interface SceneReadinessState {
  /** Current readiness state */
  readiness: SceneReadiness;

  /** Current intro phase (for fine-grained control) */
  introPhase: IntroPhase;

  /** Whether user can interact with UI elements */
  canInteract: boolean;

  /** Whether main UI (HUD, controls) should be visible */
  shouldShowUI: boolean;

  /** Whether 3D entities (globe, particles) should be visible */
  shouldShowEntities: boolean;

  /** Whether cinematic overlays (letterbox, title) should be visible */
  shouldShowOverlays: boolean;

  /** Whether welcome/onboarding flows should run */
  shouldRunOnboarding: boolean;

  /** Whether inspirational text should play */
  shouldPlayText: boolean;
}

/**
 * Hook for centralized scene readiness state.
 *
 * This is the single source of truth for all visibility and interaction
 * decisions in the app. Instead of checking intro phase in multiple places,
 * components should use this hook's derived booleans.
 *
 * @param introPhase - Current cinematic intro phase
 * @returns Scene readiness state with derived visibility flags
 *
 * @example
 * ```tsx
 * const { shouldShowUI, canInteract } = useSceneReadiness(introPhase);
 *
 * return (
 *   <>
 *     {shouldShowUI && <SimpleGaiaUI canInteract={canInteract} />}
 *   </>
 * );
 * ```
 */
export function useSceneReadiness(introPhase: IntroPhase): SceneReadinessState {
  return useMemo(() => {
    // Determine overall readiness
    const readiness: SceneReadiness =
      introPhase === 'complete' ? 'ready' : introPhase === 'cta' ? 'transitioning' : 'intro';

    // Derive all visibility flags from readiness
    const isReady = readiness === 'ready';
    const isTransitioning = readiness === 'transitioning';
    const isIntro = readiness === 'intro';

    return {
      readiness,
      introPhase,

      // User can interact only when fully ready
      canInteract: isReady,

      // UI shows when ready (after user clicks CTA)
      shouldShowUI: isReady,

      // Entities visible during transition and ready (after CTA appears)
      // This creates the reveal effect where scene appears behind CTA
      shouldShowEntities: isTransitioning || isReady,

      // Overlays visible during intro and transition
      shouldShowOverlays: isIntro || isTransitioning,

      // Onboarding (welcome modal, mood select) only after fully ready
      shouldRunOnboarding: isReady,

      // Inspirational text only after fully ready
      shouldPlayText: isReady,
    };
  }, [introPhase]);
}
