/**
 * Quality Context
 *
 * Manages adaptive quality settings with localStorage persistence.
 * Allows users to override automatic quality detection or use auto mode.
 */

import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import { QUALITY_PRESETS, type QualityLevel } from '../constants';
import type { PerformanceState } from '../hooks/usePerformanceMonitor';

type QualityPreset = 'auto' | QualityLevel;

export interface QualityContextValue {
  /** Currently selected preset (auto or explicit) */
  preset: QualityPreset;

  /** Update the preset (persisted to localStorage) */
  setPreset: (preset: QualityPreset) => void;

  /** Configuration for current preset */
  config: (typeof QUALITY_PRESETS)[QualityLevel];

  /** Performance metrics from monitor (may be null during initial render) */
  performanceMetrics: PerformanceState | null;

  /** Set performance metrics (called from inside Canvas) */
  setPerformanceMetrics: (metrics: PerformanceState) => void;
}

const QualityContext = createContext<QualityContextValue | null>(null);

/**
 * Hook to access quality context
 * Must be used within QualityProvider
 */
export function useQuality(): QualityContextValue {
  const ctx = useContext(QualityContext);
  if (!ctx) {
    throw new Error('useQuality must be used within QualityProvider');
  }
  return ctx;
}

const STORAGE_KEY = 'breathe-together:quality-preset';

/**
 * Provider for quality settings
 * Wraps app with quality context and localStorage persistence
 */
export function QualityProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetState] = useState<QualityPreset>(() => {
    // Load from localStorage or default to 'auto'
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return (stored as QualityPreset) || 'auto';
    } catch {
      return 'auto';
    }
  });

  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceState | null>(null);

  // Determine effective quality level
  const effectiveLevel: QualityLevel = useMemo(() => {
    if (preset === 'auto' && performanceMetrics) {
      return performanceMetrics.qualityLevel;
    }
    return (preset === 'auto' ? 'medium' : preset) as QualityLevel;
  }, [preset, performanceMetrics?.qualityLevel, performanceMetrics]);

  const config = useMemo(() => QUALITY_PRESETS[effectiveLevel], [effectiveLevel]);

  // Persist preset changes to localStorage
  const setPreset = (newPreset: QualityPreset) => {
    setPresetState(newPreset);
    try {
      localStorage.setItem(STORAGE_KEY, newPreset);
    } catch {
      // Silently fail if localStorage unavailable (e.g., private browsing)
    }
  };

  return (
    <QualityContext.Provider
      value={{ preset, setPreset, config, performanceMetrics, setPerformanceMetrics }}
    >
      {children}
    </QualityContext.Provider>
  );
}
