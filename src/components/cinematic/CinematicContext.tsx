import { createContext, type ReactNode, useContext, useState } from 'react';
import type { IntroPhase } from './types';

interface CinematicState {
  /** Current intro phase */
  phase: IntroPhase;
  /** Progress within current phase (0-1) */
  progress: number;
  /** Whether intro is complete */
  isComplete: boolean;
  /** Update phase (used by CinematicIntro) */
  setPhase: (phase: IntroPhase) => void;
  /** Update progress (used by CinematicIntro) */
  setProgress: (progress: number) => void;
  /** Mark intro as complete */
  setComplete: (complete: boolean) => void;
}

const CinematicContext = createContext<CinematicState | null>(null);

/**
 * Provider for sharing cinematic intro state with 3D components.
 */
export function CinematicProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<IntroPhase>('reveal');
  const [progress, setProgress] = useState(0);
  const [isComplete, setComplete] = useState(false);

  return (
    <CinematicContext.Provider
      value={{
        phase,
        progress,
        isComplete,
        setPhase,
        setProgress,
        setComplete,
      }}
    >
      {children}
    </CinematicContext.Provider>
  );
}

/**
 * Hook for accessing cinematic intro state.
 * Returns null if used outside CinematicProvider.
 */
export function useCinematicState(): CinematicState | null {
  return useContext(CinematicContext);
}

/**
 * Hook for accessing cinematic intro state (throws if not in provider).
 */
export function useCinematicStateRequired(): CinematicState {
  const state = useContext(CinematicContext);
  if (!state) {
    throw new Error('useCinematicStateRequired must be used within CinematicProvider');
  }
  return state;
}
